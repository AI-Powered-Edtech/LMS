use axum::{
    extract::{Extension, Path},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use edusync_auth::AuthError;
use edusync_middleware::errors::AppError;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use sqlx::{postgres::PgRow, PgPool, Postgres, QueryBuilder, Row, Transaction};
use std::{collections::BTreeMap, sync::Arc};

use crate::{
    extractors::AuthedRequest,
    observability::request_id_from_headers,
    state::AppState,
};

const ALLOWED_TABLES: &[&str] = &[
    "activity_events",
    "assignment_group_members",
    "assignment_groups",
    "assignment_submissions",
    "assignments",
    "attendance_records",
    "badges",
    "classes",
    "course_action_logs",
    "course_classes",
    "course_collaborators",
    "course_enrollments",
    "course_modules",
    "course_versions",
    "courses",
    "enrollments",
    "gradebook_columns",
    "gradebook_entries",
    "gradebook_settings",
    "group_messages",
    "group_tasks",
    "interactive_block_progress",
    "lesson_progress",
    "lesson_resources",
    "lessons",
    "notification_preferences",
    "notifications",
    "onboarding_progress",
    "parent_notification_preferences",
    "parent_notifications",
    "parent_digest_settings",
    "parent_teacher_messages",
    "parent_teacher_threads",
    "principal_settings",
    "profiles",
    "question_bank",
    "question_bank_options",
    "quiz_answers",
    "quiz_assignments",
    "quiz_attempt_questions_v2",
    "quiz_attempts_v2",
    "quiz_cheating_signals",
    "quiz_options",
    "quiz_questions",
    "quiz_stats",
    "quizzes",
    "satisfaction_surveys",
    "scorm_packages",
    "scorm_runtime_data",
    "school_baseline_metrics",
    "submission_annotations",
    "surveys",
    "survey_responses",
    "tenant_memberships",
    "user_badges",
    "user_points",
];

const ALLOWED_RPCS: &[&str] = &[
    "add_user_points",
    "award_quiz_xp",
    "batch_save_answers",
    "complete_onboarding_step",
    "create_assignment_groups",
    "create_notification",
    "delete_funnel_definition",
    "enroll_student",
    "get_activity_timeline",
    "get_assignment_analytics",
    "get_assignment_grading_queue",
    "get_assignment_submission_bundle",
    "get_at_risk_students",
    "get_attempt_detail",
    "get_course_analytics",
    "get_course_engagement",
    "get_engagement_summary",
    "get_engagement_trend",
    "get_executive_overview",
    "get_funnel_results",
    "get_gradebook_students",
    "get_group_settings",
    "get_learning_paths",
    "get_lesson_analytics",
    "get_my_children",
    "get_parent_dashboard_snapshot",
    "get_principal_monthly_trend_cached",
    "get_principal_overview_cached",
    "get_prediction_summary",
    "get_question_difficulty",
    "get_quiz_live_status",
    "get_retention_matrix",
    "get_student_group_assignment",
    "get_student_path",
    "get_student_prediction",
    "get_student_signals",
    "get_survey_results",
    "get_teacher_analytics",
    "get_teacher_group_overview",
    "get_tenant_activity_counts",
    "grade_attempt_question",
    "grade_group_submission",
    "insert_learning_events",
    "list_funnel_definitions",
    "pause_quiz_attempt",
    "record_cheating_signal",
    "record_quiz_heartbeat",
    "refresh_all_course_stats",
    "refresh_course_stats",
    "resume_quiz_attempt",
    "rpc_check_builder_access",
    "rpc_publish_course",
    "rpc_reorder_course_modules",
    "rpc_reorder_lesson_resources",
    "rpc_reorder_module_lessons",
    "save_content_template",
    "save_course_version",
    "save_funnel_definition",
    "save_quiz_builder",
    "send_assignment_reminders",
    "submit_assignment_attempt",
    "submit_group_assignment",
    "sync_gradebook_entries",
    "update_lesson_progress_monotonic",
    "update_group_settings",
    "upsert_scorm_runtime",
    "v1_get_assignment_results",
    "v1_start_quiz_attempt",
    "v1_submit_quiz_attempt",
    "import_content_template",
    "get_student_progress_bundle",
];

#[derive(Debug)]
pub enum DataPlaneError {
    Auth(AuthError),
    App(AppError),
}

impl From<AuthError> for DataPlaneError {
    fn from(value: AuthError) -> Self {
        Self::Auth(value)
    }
}

impl From<AppError> for DataPlaneError {
    fn from(value: AppError) -> Self {
        Self::App(value)
    }
}

impl From<sqlx::Error> for DataPlaneError {
    fn from(value: sqlx::Error) -> Self {
        Self::App(AppError::from(value))
    }
}

impl IntoResponse for DataPlaneError {
    fn into_response(self) -> Response {
        match self {
            Self::Auth(error) => error.into_response(),
            Self::App(error) => error.into_response(),
        }
    }
}

#[derive(Debug, Clone)]
struct ColumnMeta {
    name: String,
    data_type: String,
    udt_name: String,
}

impl ColumnMeta {
    fn sql_type(&self) -> String {
        match self.data_type.as_str() {
            "ARRAY" => {
                let base = self.udt_name.trim_start_matches('_');
                format!("{}[]", quote_type_ident(base))
            }
            "USER-DEFINED" => format!("public.{}", quote_type_ident(&self.udt_name)),
            "character varying" => "text".to_string(),
            "timestamp with time zone" => "timestamptz".to_string(),
            "timestamp without time zone" => "timestamp".to_string(),
            "double precision" => "double precision".to_string(),
            other => other.to_string(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct QueryRequest {
    pub action: String,
    #[serde(default)]
    pub select: Option<String>,
    #[serde(default)]
    pub filters: Vec<QueryFilter>,
    #[serde(default)]
    pub order: Vec<QueryOrder>,
    #[serde(default)]
    pub range: Option<QueryRange>,
    #[serde(default)]
    pub limit: Option<i64>,
    #[serde(default)]
    pub values: Option<Value>,
    #[serde(default)]
    pub options: Option<QueryOptions>,
    #[serde(default)]
    pub single: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QueryFilter {
    pub column: String,
    pub op: String,
    #[serde(default)]
    pub value: Value,
    #[serde(default)]
    pub comparator: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QueryOrder {
    pub column: String,
    #[serde(default)]
    pub ascending: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QueryRange {
    pub from: i64,
    pub to: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QueryOptions {
    #[serde(default)]
    pub count: Option<String>,
    #[serde(default)]
    pub head: Option<bool>,
    #[serde(rename = "onConflict", default)]
    pub on_conflict: Option<String>,
    #[serde(rename = "allowFullTenantWrite", default)]
    pub allow_full_tenant_write: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct QueryResponse {
    pub data: Value,
    pub count: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct RpcRequest {
    #[serde(default)]
    pub args: Value,
}

#[derive(Debug, Serialize)]
pub struct RpcResponse {
    pub data: Value,
    pub returns_set: bool,
}

#[derive(Debug)]
struct ResolvedRpc {
    returns_set: bool,
    return_type: String,
    arg_types: BTreeMap<String, String>,
}

fn is_allowed_identifier(value: &str) -> bool {
    let trimmed = value.trim_matches('"');
    !trimmed.is_empty()
        && trimmed
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
}

fn quote_ident(value: &str) -> String {
    format!("\"{}\"", value.trim_matches('"'))
}

fn quote_type_ident(value: &str) -> String {
    if value
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
    {
        format!("\"{}\"", value)
    } else {
        value.to_string()
    }
}

fn normalize_select_columns(
    select: Option<&str>,
    columns: &[ColumnMeta],
) -> Result<Vec<String>, DataPlaneError> {
    if let Some(raw) = select {
        let trimmed = raw.trim();
        if trimmed.is_empty() || trimmed == "*" {
            return Ok(columns.iter().map(|column| column.name.clone()).collect());
        }

        if trimmed.contains('(') || trimmed.contains(')') || trimmed.contains(':') || trimmed.contains('!') {
            return Err(AppError::BadRequest(
                "Select relasional belum didukung oleh generic VIL query".to_string(),
            )
            .into());
        }

        let available = columns
            .iter()
            .map(|column| column.name.as_str())
            .collect::<Vec<_>>();

        let mut selected = Vec::new();
        for part in trimmed.split(',') {
            let column = part.trim().trim_matches('"');
            if !is_allowed_identifier(column) || !available.contains(&column) {
                return Err(AppError::BadRequest(format!(
                    "Kolom `{column}` tidak valid untuk query VIL"
                ))
                .into());
            }
            selected.push(column.to_string());
        }
        return Ok(selected);
    }

    Ok(columns.iter().map(|column| column.name.clone()).collect())
}

async fn fetch_table_columns(pool: &PgPool, table: &str) -> Result<Vec<ColumnMeta>, DataPlaneError> {
    let columns = sqlx::query(
        r#"
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
        "#,
    )
    .bind(table)
    .fetch_all(pool)
    .await?;

    if columns.is_empty() {
        return Err(AppError::NotFound.into());
    }

    Ok(columns
        .into_iter()
        .map(|row| ColumnMeta {
            name: row.get::<String, _>("column_name"),
            data_type: row.get::<String, _>("data_type"),
            udt_name: row.get::<String, _>("udt_name"),
        })
        .collect())
}

fn column_map(columns: &[ColumnMeta]) -> BTreeMap<String, ColumnMeta> {
    columns
        .iter()
        .cloned()
        .map(|column| (column.name.clone(), column))
        .collect()
}

fn normalize_json_rows(value: Option<Value>) -> Result<Vec<Map<String, Value>>, DataPlaneError> {
    match value {
        Some(Value::Object(object)) => Ok(vec![object]),
        Some(Value::Array(items)) => items
            .into_iter()
            .map(|item| match item {
                Value::Object(object) => Ok(object),
                _ => Err(AppError::BadRequest(
                    "Payload values harus object atau array of object".to_string(),
                )
                .into()),
            })
            .collect(),
        _ => Err(AppError::BadRequest(
            "Payload values wajib diisi untuk operasi mutasi".to_string(),
        )
        .into()),
    }
}

fn ensure_allowed_table(table: &str) -> Result<(), DataPlaneError> {
    if !is_allowed_identifier(table) || !ALLOWED_TABLES.contains(&table) {
        return Err(AppError::Forbidden.into());
    }
    Ok(())
}

fn ensure_allowed_rpc(name: &str) -> Result<(), DataPlaneError> {
    if !is_allowed_identifier(name) || !ALLOWED_RPCS.contains(&name) {
        return Err(AppError::Forbidden.into());
    }
    Ok(())
}

fn coerce_filter_value(filter: &QueryFilter, _column: &ColumnMeta) -> Result<Value, DataPlaneError> {
    if filter.op == "in" {
        if !filter.value.is_array() {
            return Err(AppError::BadRequest(format!(
                "Filter IN untuk kolom `{}` wajib array",
                filter.column
            ))
            .into());
        }
        return Ok(filter.value.clone());
    }
    Ok(filter.value.clone())
}

fn push_filter(
    builder: &mut QueryBuilder<'_, Postgres>,
    filter: &QueryFilter,
    column: &ColumnMeta,
) -> Result<(), DataPlaneError> {
    let column_name = quote_ident(&column.name);
    let value = coerce_filter_value(filter, column)?;

    match filter.op.as_str() {
        "eq" => {
            if value.is_null() {
                builder.push(column_name).push(" IS NULL");
            } else {
                builder.push(column_name).push(" = ");
                push_scalar_cast(builder, &value, column)?;
            }
        }
        "neq" => {
            if value.is_null() {
                builder.push(column_name).push(" IS NOT NULL");
            } else {
                builder.push(column_name).push(" <> ");
                push_scalar_cast(builder, &value, column)?;
            }
        }
        "ilike" => {
            builder.push(column_name).push(" ILIKE ");
            push_scalar_cast(builder, &value, column)?;
        }
        "lt" => {
            builder.push(column_name).push(" < ");
            push_scalar_cast(builder, &value, column)?;
        }
        "lte" => {
            builder.push(column_name).push(" <= ");
            push_scalar_cast(builder, &value, column)?;
        }
        "gt" => {
            builder.push(column_name).push(" > ");
            push_scalar_cast(builder, &value, column)?;
        }
        "gte" => {
            builder.push(column_name).push(" >= ");
            push_scalar_cast(builder, &value, column)?;
        }
        "in" => {
            let items = value.as_array().cloned().unwrap_or_default();
            if items.is_empty() {
                builder.push("FALSE");
            } else {
                builder.push(column_name).push(" IN (");
                for (index, item) in items.iter().enumerate() {
                    if index > 0 {
                        builder.push(", ");
                    }
                    push_scalar_cast(builder, item, column)?;
                }
                builder.push(")");
            }
        }
        "is" => match value {
            Value::Null => {
                builder.push(column_name).push(" IS NULL");
            }
            Value::Bool(flag) => {
                builder.push(column_name).push(" IS ").push(if flag { "TRUE" } else { "FALSE" });
            }
            _ => {
                return Err(AppError::BadRequest(format!(
                    "Filter IS untuk kolom `{}` hanya mendukung null/boolean",
                    filter.column
                ))
                .into());
            }
        },
        "not" => {
            let comparator = filter
                .comparator
                .as_deref()
                .ok_or_else(|| AppError::BadRequest("Comparator NOT wajib diisi".to_string()))?;
            match comparator {
                "is" => match value {
                    Value::Null => {
                        builder.push(column_name).push(" IS NOT NULL");
                    }
                    Value::Bool(flag) => {
                        builder
                            .push(column_name)
                            .push(" IS NOT ")
                            .push(if flag { "TRUE" } else { "FALSE" });
                    }
                    _ => {
                        return Err(AppError::BadRequest(format!(
                            "Comparator NOT IS untuk kolom `{}` hanya mendukung null/boolean",
                            filter.column
                        ))
                        .into());
                    }
                },
                _ => {
                    return Err(AppError::BadRequest(format!(
                        "Comparator NOT `{comparator}` belum didukung"
                    ))
                    .into())
                }
            }
        }
        other => {
            return Err(AppError::BadRequest(format!(
                "Operator filter `{other}` belum didukung"
            ))
            .into())
        }
    }

    Ok(())
}

fn push_scalar_cast(
    builder: &mut QueryBuilder<'_, Postgres>,
    value: &Value,
    column: &ColumnMeta,
) -> Result<(), DataPlaneError> {
    match value {
        Value::Null => {
            builder.push("NULL");
        }
        Value::Bool(flag) => {
            builder.push_bind(*flag);
        }
        Value::Number(number) => {
            if let Some(int_value) = number.as_i64() {
                builder.push_bind(int_value);
            } else if let Some(float_value) = number.as_f64() {
                builder.push_bind(float_value);
            } else {
                return Err(AppError::BadRequest("Angka payload tidak valid".to_string()).into());
            }
        }
        Value::String(text) => {
            builder.push_bind(text.clone());
        }
        Value::Array(_) | Value::Object(_) => {
            builder.push_bind(sqlx::types::Json(value.clone()));
            builder.push("::jsonb");
            return Ok(());
        }
    }

    builder.push("::").push(column.sql_type());
    Ok(())
}

fn apply_filters(
    builder: &mut QueryBuilder<'_, Postgres>,
    request_filters: &[QueryFilter],
    ctx: &crate::extractors::AuthedRequest,
    columns: &BTreeMap<String, ColumnMeta>,
) -> Result<(), DataPlaneError> {
    let mut filters = request_filters.to_vec();
    if columns.contains_key("tenant_id") {
        let tenant_id = ctx.0.tenant_id.to_string();
        let mut saw_tenant_filter = false;

        for filter in filters.iter_mut() {
            if filter.column.trim_matches('"') != "tenant_id" {
                continue;
            }

            saw_tenant_filter = true;

            match (&*filter.op, &filter.value) {
                ("eq", Value::String(value)) if value == &tenant_id => {}
                ("in", Value::Array(values))
                    if values.iter().all(|value| value.as_str() == Some(tenant_id.as_str())) => {}
                _ => {
                    return Err(AppError::Forbidden.into());
                }
            }

            filter.value = Value::String(tenant_id.clone());
            filter.op = "eq".to_string();
            filter.comparator = None;
        }

        if !saw_tenant_filter {
            filters.push(QueryFilter {
                column: "tenant_id".to_string(),
                op: "eq".to_string(),
                value: Value::String(tenant_id),
                comparator: None,
            });
        }
    }

    if !filters.is_empty() {
        builder.push(" WHERE ");
        for (index, filter) in filters.iter().enumerate() {
            if index > 0 {
                builder.push(" AND ");
            }

            let column_name = filter.column.trim_matches('"');
            let column = columns.get(column_name).ok_or_else(|| {
                AppError::BadRequest(format!("Kolom filter `{column_name}` tidak valid"))
            })?;
            push_filter(builder, filter, column)?;
        }
    }

    Ok(())
}

fn ensure_safe_mutation_filters(
    filters: &[QueryFilter],
    columns: &BTreeMap<String, ColumnMeta>,
    options: &QueryOptions,
) -> Result<(), DataPlaneError> {
    if options.allow_full_tenant_write.unwrap_or(false) {
        return Ok(());
    }

    let requires_non_tenant_filter = columns.contains_key("tenant_id");
    let has_non_tenant_filter = filters
        .iter()
        .any(|filter| filter.column.trim_matches('"') != "tenant_id");

    if requires_non_tenant_filter && !has_non_tenant_filter {
        return Err(AppError::BadRequest(
            "Mutasi VIL membutuhkan minimal satu filter bisnis selain tenant_id".to_string(),
        )
        .into());
    }

    if !requires_non_tenant_filter && filters.is_empty() {
        return Err(AppError::BadRequest(
            "Mutasi VIL membutuhkan filter eksplisit atau allowFullTenantWrite=true".to_string(),
        )
        .into());
    }

    Ok(())
}

fn push_ordering(
    builder: &mut QueryBuilder<'_, Postgres>,
    orders: &[QueryOrder],
    columns: &BTreeMap<String, ColumnMeta>,
) -> Result<(), DataPlaneError> {
    if orders.is_empty() {
        return Ok(());
    }

    builder.push(" ORDER BY ");
    for (index, order) in orders.iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        let column_name = order.column.trim_matches('"');
        if !columns.contains_key(column_name) {
            return Err(AppError::BadRequest(format!(
                "Kolom order `{column_name}` tidak valid"
            ))
            .into());
        }
        builder
            .push(quote_ident(column_name))
            .push(if order.ascending.unwrap_or(true) {
                " ASC"
            } else {
                " DESC"
            });
    }

    Ok(())
}

fn selected_sql(columns: &[String]) -> String {
    columns
        .iter()
        .map(|column| quote_ident(column))
        .collect::<Vec<_>>()
        .join(", ")
}

fn map_rows(rows: Vec<PgRow>) -> Result<Value, DataPlaneError> {
    let mut payload = Vec::with_capacity(rows.len());
    for row in rows {
        payload.push(row.try_get::<Value, _>("data").unwrap_or(Value::Null));
    }
    Ok(Value::Array(payload))
}

fn single_payload(payload: Value, mode: Option<&str>) -> Result<Value, DataPlaneError> {
    match mode {
        Some("single") => match payload {
            Value::Array(items) => match items.len() {
                0 => Err(AppError::NotFound.into()),
                1 => Ok(items.into_iter().next().unwrap_or(Value::Null)),
                _ => Err(AppError::BadRequest(
                    "single() mengharapkan tepat satu baris, tetapi menerima lebih dari satu hasil"
                        .to_string(),
                )
                .into()),
            },
            other => Ok(other),
        },
        Some("maybeSingle") => match payload {
            Value::Array(items) => match items.len() {
                0 => Ok(Value::Null),
                1 => Ok(items.into_iter().next().unwrap_or(Value::Null)),
                _ => Err(AppError::BadRequest(
                    "maybeSingle() mengharapkan nol atau satu baris, tetapi menerima lebih dari satu hasil"
                        .to_string(),
                )
                .into()),
            },
            other => Ok(other),
        },
        _ => Ok(payload),
    }
}

async fn set_request_claims(
    tx: &mut Transaction<'_, Postgres>,
    user_id: uuid::Uuid,
    tenant_id: uuid::Uuid,
    role: &str,
    email: &str,
) -> Result<(), DataPlaneError> {
    let claims = json!({
        "sub": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "email": email,
    });

    sqlx::query(
        r#"
        SELECT
            set_config('request.jwt.claims', $1, true),
            set_config('request.jwt.claim.sub', $2, true),
            set_config('request.jwt.claim.tenant_id', $3, true),
            set_config('request.jwt.claim.role', $4, true)
        "#,
    )
    .bind(claims.to_string())
    .bind(user_id.to_string())
    .bind(tenant_id.to_string())
    .bind(role)
    .execute(&mut **tx)
    .await?;

    if !email.is_empty() {
        sqlx::query("SELECT set_config('request.jwt.claim.email', $1, true)")
            .bind(email)
            .execute(&mut **tx)
            .await?;
    }

    Ok(())
}

fn push_rpc_call(
    builder: &mut QueryBuilder<'_, Postgres>,
    name: &str,
    entries: &[(String, Value)],
    arg_types: &BTreeMap<String, String>,
) -> Result<(), DataPlaneError> {
    builder.push("public.").push(quote_ident(name)).push("(");
    for (index, (key, value)) in entries.iter().enumerate() {
        if index > 0 {
            builder.push(", ");
        }
        if !is_allowed_identifier(key) {
            return Err(AppError::BadRequest(format!("Arg RPC `{key}` tidak valid")).into());
        }
        builder.push(key).push(" := ");
        let arg_type = arg_types
            .get(key)
            .ok_or_else(|| AppError::BadRequest(format!("Arg RPC `{key}` tidak dikenal")))?;
        match value {
            Value::Null => {
                builder.push("NULL");
            }
            _ => {
                push_rpc_arg(builder, value, arg_type);
            }
        }
    }
    builder.push(")");
    Ok(())
}

fn push_rpc_arg(builder: &mut QueryBuilder<'_, Postgres>, value: &Value, sql_type: &str) {
    match value {
        Value::Null => {
            builder.push("NULL");
        }
        Value::Bool(flag) => {
            builder.push_bind(*flag);
            builder.push("::").push(sql_type);
        }
        Value::Number(number) => {
            if let Some(int_value) = number.as_i64() {
                builder.push_bind(int_value);
            } else if let Some(float_value) = number.as_f64() {
                builder.push_bind(float_value);
            } else {
                builder.push_bind(number.to_string());
            }
            builder.push("::").push(sql_type);
        }
        Value::String(text) => {
            builder.push_bind(text.clone());
            builder.push("::").push(sql_type);
        }
        Value::Array(_) | Value::Object(_) => {
            builder.push_bind(sqlx::types::Json(value.clone()));
            builder.push("::jsonb");
            if sql_type != "jsonb" {
                builder.push("::").push(sql_type);
            }
        }
    }
}

async fn resolve_rpc_signature(
    pool: &PgPool,
    name: &str,
    provided_arg_names: &[String],
) -> Result<ResolvedRpc, DataPlaneError> {
    let rows = sqlx::query(
        r#"
        SELECT
            p.oid::text AS oid,
            p.proretset AS returns_set,
            pg_catalog.format_type(p.prorettype, NULL) AS return_type,
            COALESCE(p.proargnames, ARRAY[]::text[]) AS arg_names,
            COALESCE(
                ARRAY(
                    SELECT pg_catalog.format_type(arg_type, NULL)
                    FROM unnest(p.proargtypes::oid[]) AS arg_type
                ),
                ARRAY[]::text[]
            ) AS arg_types
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = $1
        ORDER BY p.oid DESC
        "#,
    )
    .bind(name)
    .fetch_all(pool)
    .await?;

    let provided = provided_arg_names
        .iter()
        .map(|value| value.as_str())
        .collect::<std::collections::BTreeSet<_>>();

    let mut matches = rows
        .into_iter()
        .filter_map(|row| {
            let arg_names = row.get::<Vec<String>, _>("arg_names");
            let arg_types = row.get::<Vec<String>, _>("arg_types");

            if arg_names.len() != arg_types.len() {
                return None;
            }

            let candidate_names = arg_names
                .iter()
                .map(|value| value.as_str())
                .filter(|value| !value.is_empty())
                .collect::<std::collections::BTreeSet<_>>();

            if !provided.is_subset(&candidate_names) {
                return None;
            }

            let arg_types = arg_names
                .into_iter()
                .zip(arg_types.into_iter())
                .filter(|(arg_name, _)| !arg_name.is_empty())
                .collect::<BTreeMap<_, _>>();

            Some(ResolvedRpc {
                returns_set: row.get::<bool, _>("returns_set"),
                return_type: row.get::<String, _>("return_type"),
                arg_types,
            })
        })
        .collect::<Vec<_>>();

    match matches.len() {
        0 => Err(AppError::BadRequest(format!(
            "Tidak ada signature RPC `{name}` yang cocok dengan argumen yang diberikan"
        ))
        .into()),
        1 => Ok(matches.remove(0)),
        _ => Err(AppError::BadRequest(format!(
            "Signature RPC `{name}` ambigu untuk argumen yang diberikan"
        ))
        .into()),
    }
}

pub async fn query_table_handler(
    Extension(state): Extension<Arc<AppState>>,
    headers: HeaderMap,
    ctx: AuthedRequest,
    Path(table): Path<String>,
    Json(body): Json<QueryRequest>,
) -> Result<Json<QueryResponse>, DataPlaneError> {
    let request_id = request_id_from_headers(&headers);
    ensure_allowed_table(&table)?;

    let all_columns = fetch_table_columns(&state.db, &table).await?;
    let columns_by_name = column_map(&all_columns);
    let selected_columns = normalize_select_columns(body.select.as_deref(), &all_columns)?;
    let selected_sql = selected_sql(&selected_columns);
    let options = body.options.unwrap_or(QueryOptions {
        count: None,
        head: None,
        on_conflict: None,
        allow_full_tenant_write: None,
    });

    match body.action.as_str() {
        "select" => {
            tracing::info!(
                target: "edusync_api_server::data_plane",
                request_id = %request_id,
                action = %body.action,
                table = %table,
                tenant_id = %ctx.0.tenant_id,
                user_id = %ctx.0.user_id,
                "data_plane_select"
            );
            let mut count = None;
            if options.count.as_deref() == Some("exact") {
                let mut count_builder = QueryBuilder::new("SELECT COUNT(*)::bigint AS count FROM public.");
                count_builder.push(quote_ident(&table));
                apply_filters(&mut count_builder, &body.filters, &ctx, &columns_by_name)?;
                let row = count_builder.build().fetch_one(&state.db).await?;
                count = Some(row.try_get::<i64, _>("count")?);
            }

            if options.head.unwrap_or(false) {
                return Ok(Json(QueryResponse { data: Value::Null, count }));
            }

            let mut builder = QueryBuilder::new("SELECT row_to_json(item)::jsonb AS data FROM (SELECT ");
            builder.push(selected_sql).push(" FROM public.").push(quote_ident(&table));
            apply_filters(&mut builder, &body.filters, &ctx, &columns_by_name)?;
            push_ordering(&mut builder, &body.order, &columns_by_name)?;

            if let Some(range) = body.range {
                let limit = (range.to - range.from + 1).max(0);
                builder.push(" LIMIT ").push_bind(limit);
                builder.push(" OFFSET ").push_bind(range.from.max(0));
            } else if let Some(limit) = body.limit {
                builder.push(" LIMIT ").push_bind(limit.max(0));
            }
            builder.push(") item");

            let rows = builder.build().fetch_all(&state.db).await?;
            let data = single_payload(map_rows(rows)?, body.single.as_deref())?;

            Ok(Json(QueryResponse { data, count }))
        }
        "insert" | "upsert" => {
            tracing::info!(
                target: "edusync_api_server::data_plane",
                request_id = %request_id,
                action = %body.action,
                table = %table,
                tenant_id = %ctx.0.tenant_id,
                user_id = %ctx.0.user_id,
                "data_plane_write"
            );
            let mut rows = normalize_json_rows(body.values)?;
            for row in rows.iter_mut() {
                if columns_by_name.contains_key("tenant_id") {
                    row.insert(
                        "tenant_id".to_string(),
                        Value::String(ctx.0.tenant_id.to_string()),
                    );
                }
                if columns_by_name.contains_key("created_by") && !row.contains_key("created_by") {
                    row.insert(
                        "created_by".to_string(),
                        Value::String(ctx.0.user_id.to_string()),
                    );
                }
                if columns_by_name.contains_key("user_id") && !row.contains_key("user_id") {
                    row.insert(
                        "user_id".to_string(),
                        Value::String(ctx.0.user_id.to_string()),
                    );
                }
                if columns_by_name.contains_key("sender_id") && !row.contains_key("sender_id") {
                    row.insert(
                        "sender_id".to_string(),
                        Value::String(ctx.0.user_id.to_string()),
                    );
                }
                if columns_by_name.contains_key("respondent_id")
                    && !row.contains_key("respondent_id")
                {
                    row.insert(
                        "respondent_id".to_string(),
                        Value::String(ctx.0.user_id.to_string()),
                    );
                }
            }

            let allowed_input_columns = rows
                .iter()
                .flat_map(|row| row.keys().cloned())
                .collect::<std::collections::BTreeSet<_>>()
                .into_iter()
                .map(|column| {
                    columns_by_name
                        .get(&column)
                        .cloned()
                        .ok_or_else(|| AppError::BadRequest(format!("Kolom `{column}` tidak valid").to_string()))
                })
                .collect::<Result<Vec<_>, AppError>>()?;

            if allowed_input_columns.is_empty() {
                return Err(AppError::BadRequest("Tidak ada kolom yang bisa disimpan".to_string()).into());
            }

            let payload = Value::Array(rows.into_iter().map(Value::Object).collect());
            let record_columns = allowed_input_columns
                .iter()
                .map(|column| format!("{} {}", quote_ident(&column.name), column.sql_type()))
                .collect::<Vec<_>>()
                .join(", ");
            let insert_columns = allowed_input_columns
                .iter()
                .map(|column| quote_ident(&column.name))
                .collect::<Vec<_>>()
                .join(", ");

            let mut builder = QueryBuilder::new("WITH payload AS (SELECT ");
            builder.push(insert_columns.clone());
            builder.push(" FROM jsonb_to_recordset(");
            builder.push_bind(sqlx::types::Json(payload));
            builder.push("::jsonb) AS item(");
            builder.push(record_columns);
            builder.push(")), mutated AS (INSERT INTO public.");
            builder.push(quote_ident(&table));
            builder.push(" (").push(insert_columns.clone()).push(") SELECT ");
            builder.push(insert_columns.clone()).push(" FROM payload");

            if body.action == "upsert" {
                let on_conflict = options
                    .on_conflict
                    .clone()
                    .ok_or_else(|| AppError::BadRequest("Upsert VIL membutuhkan onConflict".to_string()))?;
                let conflict_columns = on_conflict
                    .split(',')
                    .map(|value| value.trim().trim_matches('"'))
                    .filter(|value| !value.is_empty())
                    .collect::<Vec<_>>();

                if conflict_columns.is_empty() {
                    return Err(AppError::BadRequest("onConflict tidak valid".to_string()).into());
                }

                builder.push(" ON CONFLICT (");
                for (index, column) in conflict_columns.iter().enumerate() {
                    if index > 0 {
                        builder.push(", ");
                    }
                    if !columns_by_name.contains_key(*column) {
                        return Err(AppError::BadRequest(format!(
                            "Kolom conflict `{column}` tidak valid"
                        ))
                        .into());
                    }
                    builder.push(quote_ident(column));
                }
                let update_columns = allowed_input_columns
                    .iter()
                    .filter(|column| !conflict_columns.contains(&column.name.as_str()))
                    .collect::<Vec<_>>();

                if update_columns.is_empty() {
                    builder.push(") DO NOTHING");
                } else {
                    builder.push(") DO UPDATE SET ");
                    let mut separated = builder.separated(", ");
                    for column in update_columns {
                        separated
                            .push(quote_ident(&column.name))
                            .push(" = EXCLUDED.")
                            .push(quote_ident(&column.name));
                    }
                    separated.push_unseparated("");
                }
            }

            builder.push(" RETURNING ").push(selected_sql).push(") SELECT row_to_json(item)::jsonb AS data FROM mutated item");

            let rows = builder.build().fetch_all(&state.db).await?;
            let data = if body.select.is_some() || body.single.is_some() {
                single_payload(map_rows(rows)?, body.single.as_deref())?
            } else {
                Value::Null
            };

            Ok(Json(QueryResponse { data, count: None }))
        }
        "update" => {
            tracing::info!(
                target: "edusync_api_server::data_plane",
                request_id = %request_id,
                action = %body.action,
                table = %table,
                tenant_id = %ctx.0.tenant_id,
                user_id = %ctx.0.user_id,
                "data_plane_write"
            );
            let row = normalize_json_rows(body.values)?.into_iter().next().ok_or_else(|| {
                AppError::BadRequest("Payload update wajib object".to_string())
            })?;

            if row.is_empty() {
                return Err(AppError::BadRequest("Tidak ada kolom update".to_string()).into());
            }

            if row.contains_key("tenant_id") {
                return Err(AppError::Forbidden.into());
            }

            ensure_safe_mutation_filters(&body.filters, &columns_by_name, &options)?;

            let update_columns = row
                .keys()
                .map(|column| {
                    columns_by_name
                        .get(column)
                        .cloned()
                        .ok_or_else(|| AppError::BadRequest(format!("Kolom `{column}` tidak valid").to_string()))
                })
                .collect::<Result<Vec<_>, AppError>>()?;

            let record_columns = update_columns
                .iter()
                .map(|column| format!("{} {}", quote_ident(&column.name), column.sql_type()))
                .collect::<Vec<_>>()
                .join(", ");

            let payload = Value::Object(row);

            let mut builder = QueryBuilder::new("WITH payload AS (SELECT ");
            builder.push(
                update_columns
                    .iter()
                    .map(|column| quote_ident(&column.name))
                    .collect::<Vec<_>>()
                    .join(", "),
            );
            builder.push(" FROM jsonb_populate_record(NULL::public.");
            builder.push(quote_ident(&table));
            builder.push(", ");
            builder.push_bind(sqlx::types::Json(payload));
            builder.push("::jsonb) AS item(");
            builder.push(record_columns);
            builder.push(")), mutated AS (UPDATE public.");
            builder.push(quote_ident(&table));
            builder.push(" AS target SET ");

            let mut separated = builder.separated(", ");
            for column in update_columns.iter() {
                separated
                    .push(quote_ident(&column.name))
                    .push(" = payload.")
                    .push(quote_ident(&column.name));
            }
            separated.push_unseparated("");
            builder.push(" FROM payload");
            apply_filters(&mut builder, &body.filters, &ctx, &columns_by_name)?;
            builder.push(" RETURNING ").push(selected_sql).push(") SELECT row_to_json(item)::jsonb AS data FROM mutated item");

            let rows = builder.build().fetch_all(&state.db).await?;
            let data = if body.select.is_some() || body.single.is_some() {
                single_payload(map_rows(rows)?, body.single.as_deref())?
            } else {
                Value::Null
            };

            Ok(Json(QueryResponse { data, count: None }))
        }
        "delete" => {
            tracing::info!(
                target: "edusync_api_server::data_plane",
                request_id = %request_id,
                action = %body.action,
                table = %table,
                tenant_id = %ctx.0.tenant_id,
                user_id = %ctx.0.user_id,
                "data_plane_write"
            );
            ensure_safe_mutation_filters(&body.filters, &columns_by_name, &options)?;
            let mut builder = QueryBuilder::new("WITH mutated AS (DELETE FROM public.");
            builder.push(quote_ident(&table));
            apply_filters(&mut builder, &body.filters, &ctx, &columns_by_name)?;
            builder.push(" RETURNING ").push(selected_sql).push(") SELECT row_to_json(item)::jsonb AS data FROM mutated item");

            let rows = builder.build().fetch_all(&state.db).await?;
            let data = if body.select.is_some() || body.single.is_some() {
                single_payload(map_rows(rows)?, body.single.as_deref())?
            } else {
                Value::Null
            };

            Ok(Json(QueryResponse { data, count: None }))
        }
        other => Err(AppError::BadRequest(format!(
            "Aksi query `{other}` belum didukung"
        ))
        .into()),
    }
}

pub async fn rpc_proxy_handler(
    Extension(state): Extension<Arc<AppState>>,
    headers: HeaderMap,
    AuthedRequest(ctx): AuthedRequest,
    Path(name): Path<String>,
    Json(body): Json<RpcRequest>,
) -> Result<Json<RpcResponse>, DataPlaneError> {
    let request_id = request_id_from_headers(&headers);
    ensure_allowed_rpc(&name)?;

    let args_object = match body.args {
        Value::Null => Map::new(),
        Value::Object(object) => object,
        _ => {
            return Err(
                AppError::BadRequest("Args RPC wajib object atau null".to_string()).into(),
            )
        }
    };

    let mut tx = state.db.begin().await?;
    set_request_claims(
        &mut tx,
        ctx.user_id,
        ctx.tenant_id,
        &ctx.role,
        &ctx.email,
    )
    .await?;

    let mut entries = args_object.into_iter().collect::<Vec<_>>();
    entries.sort_by(|left, right| left.0.cmp(&right.0));
    let resolved = resolve_rpc_signature(
        &state.db,
        &name,
        &entries.iter().map(|(key, _)| key.clone()).collect::<Vec<_>>(),
    )
    .await?;
    tracing::info!(
        target: "edusync_api_server::data_plane",
        request_id = %request_id,
        action = "rpc",
        rpc = %name,
        tenant_id = %ctx.tenant_id,
        user_id = %ctx.user_id,
        "data_plane_rpc"
    );

    let payload = if resolved.return_type == "void" {
        let mut builder = QueryBuilder::new("SELECT ");
        push_rpc_call(&mut builder, &name, &entries, &resolved.arg_types)?;
        builder.build().execute(&mut *tx).await?;
        Value::Null
    } else if resolved.returns_set {
        let mut builder =
            QueryBuilder::new("SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) AS payload FROM ");
        push_rpc_call(&mut builder, &name, &entries, &resolved.arg_types)?;
        builder.push(" q");
        let row = builder.build().fetch_one(&mut *tx).await?;
        row.try_get::<Value, _>("payload").unwrap_or(Value::Array(Vec::new()))
    } else {
        let mut builder = QueryBuilder::new("SELECT to_jsonb(");
        push_rpc_call(&mut builder, &name, &entries, &resolved.arg_types)?;
        builder.push(") AS payload");
        let row = builder.build().fetch_one(&mut *tx).await?;
        row.try_get::<Value, _>("payload").unwrap_or(Value::Null)
    };

    tx.commit().await?;

    Ok(Json(RpcResponse {
        data: payload,
        returns_set: resolved.returns_set,
    }))
}
