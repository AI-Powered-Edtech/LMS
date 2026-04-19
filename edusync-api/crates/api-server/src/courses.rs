use axum::{
    extract::{Path, Query},
    http::HeaderMap,
};
use edusync_middleware::errors::from_sqlx_error;
use edusync_models::{course::Course, lesson::Lesson};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, QueryBuilder, Row};
use std::sync::Arc;
use uuid::Uuid;
use vil_server::prelude::{
    HandlerResult, NoContent, ServiceCtx, ShmSlice, VilError, VilResponse,
};

use crate::{
    extractors::{AuthedRequest, RbacGuard},
    observability::request_id_from_headers,
    state::AppState,
};

#[derive(Deserialize)]
pub struct CourseListQuery {
    pub search: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct CourseListResponse {
    pub courses: Vec<Course>,
    pub count: i64,
}

#[derive(Deserialize)]
pub struct CreateCourseRequest {
    pub title: String,
    pub description: Option<String>,
    pub subject: Option<String>,
    pub level: Option<String>,
    pub status: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateCourseRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub subject: Option<String>,
    pub level: Option<String>,
    pub status: Option<String>,
}

#[derive(Serialize)]
pub struct CourseModuleWithLessons {
    pub id: Uuid,
    pub title: String,
    pub order: i32,
    pub course_id: Uuid,
    pub lessons: Vec<CourseLessonSummary>,
}

#[derive(Serialize, Clone)]
pub struct CourseLessonSummary {
    pub id: Uuid,
    pub duration_minutes: Option<i32>,
}

fn map_course(row: PgRow) -> Result<Course, sqlx::Error> {
    Ok(Course {
        id: row.try_get("id")?,
        title: row.try_get("title")?,
        description: row.try_get("description")?,
        subject: row.try_get("subject")?,
        level: row.try_get("level")?,
        created_by: row.try_get("created_by")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
        tenant_id: row.try_get("tenant_id")?,
        status: row.try_get::<String, _>("status")?,
        published_at: row.try_get("published_at")?,
    })
}

pub async fn list_courses_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
    AuthedRequest(ctx): AuthedRequest,
    Query(params): Query<CourseListQuery>,
) -> HandlerResult<VilResponse<CourseListResponse>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let request_id = request_id_from_headers(&headers);
    tracing::info!(
        target: "edusync_api_server::courses",
        request_id = %request_id,
        flow = "courses.list",
        tenant_id = %ctx.tenant_id,
        user_id = %ctx.user_id,
        "list_courses_request"
    );
    let limit = params.limit.unwrap_or(10).clamp(1, 100);
    let page = params.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;

    let search_pattern = params.search.as_ref().map(|search| format!("%{search}%"));

    let count: i64 = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*)
           FROM public.courses
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR title ILIKE $2)"#,
    )
    .bind(ctx.tenant_id)
    .bind(search_pattern.as_deref())
    .fetch_one(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    let rows = sqlx::query(
        r#"SELECT id, title, description, subject, level, created_by, created_at, updated_at, tenant_id, status::text AS status, published_at
           FROM public.courses
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR title ILIKE $2)
           ORDER BY created_at DESC
           LIMIT $3 OFFSET $4"#,
    )
    .bind(ctx.tenant_id)
    .bind(search_pattern.as_deref())
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    let mut courses = Vec::with_capacity(rows.len());
    for row in rows {
        courses.push(map_course(row).map_err(from_sqlx_error)?);
    }

    Ok(VilResponse::ok(CourseListResponse { courses, count }))
}

pub async fn get_course_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
    AuthedRequest(ctx): AuthedRequest,
    Path(course_id): Path<Uuid>,
) -> HandlerResult<VilResponse<Course>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let request_id = request_id_from_headers(&headers);
    tracing::info!(
        target: "edusync_api_server::courses",
        request_id = %request_id,
        flow = "courses.get",
        course_id = %course_id,
        tenant_id = %ctx.tenant_id,
        user_id = %ctx.user_id,
        "get_course_request"
    );
    let row = sqlx::query(
        r#"SELECT id, title, description, subject, level, created_by, created_at, updated_at, tenant_id, status::text AS status, published_at
           FROM public.courses
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(course_id)
    .bind(ctx.tenant_id)
    .fetch_optional(&state.db)
    .await
    .map_err(from_sqlx_error)?
    .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?;

    Ok(VilResponse::ok(map_course(row).map_err(from_sqlx_error)?))
}

pub async fn create_course_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    body: ShmSlice,
) -> HandlerResult<VilResponse<Course>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    rbac.require("teacher")?;

    let body: CreateCourseRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let title = body.title.trim();
    if title.is_empty() {
        return Err(VilError::bad_request("Judul kursus wajib diisi"));
    }
    if title.len() > 255 {
        return Err(VilError::bad_request("Judul kursus maksimum 255 karakter"));
    }

    let row = sqlx::query(
        r#"INSERT INTO public.courses (id, title, description, subject, level, created_by, tenant_id, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::course_status, now(), now())
           RETURNING id, title, description, subject, level, created_by, created_at, updated_at, tenant_id, status::text AS status, published_at"#,
    )
    .bind(Uuid::new_v4())
    .bind(title)
    .bind(body.description)
    .bind(body.subject)
    .bind(body.level)
    .bind(rbac.ctx().user_id)
    .bind(rbac.ctx().tenant_id)
    .bind(body.status.unwrap_or_else(|| "draft".to_string()))
    .fetch_one(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    Ok(VilResponse::ok(map_course(row).map_err(from_sqlx_error)?))
}

pub async fn update_course_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    Path(course_id): Path<Uuid>,
    body: ShmSlice,
) -> HandlerResult<VilResponse<Course>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    rbac.require("teacher")?;

    let body: UpdateCourseRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let mut builder = QueryBuilder::new("UPDATE public.courses SET ");
    let mut separated = builder.separated(", ");
    let mut has_updates = false;

    if let Some(title) = body.title.as_deref() {
        has_updates = true;
        separated.push("title = ").push_bind(title.trim());
    }
    if let Some(description) = body.description {
        has_updates = true;
        separated.push("description = ").push_bind(description);
    }
    if let Some(subject) = body.subject {
        has_updates = true;
        separated.push("subject = ").push_bind(subject);
    }
    if let Some(level) = body.level {
        has_updates = true;
        separated.push("level = ").push_bind(level);
    }
    if let Some(status) = body.status {
        has_updates = true;
        separated.push("status = ").push_bind(status).push("::course_status");
    }

    if !has_updates {
        return Err(VilError::bad_request("Tidak ada perubahan untuk disimpan"));
    }

    separated.push("updated_at = now()");
    builder.push(
        " WHERE id = ",
    );
    builder.push_bind(course_id);
    builder.push(" AND tenant_id = ");
    builder.push_bind(rbac.ctx().tenant_id);
    builder.push(
        " RETURNING id, title, description, subject, level, created_by, created_at, updated_at, tenant_id, status::text AS status, published_at",
    );

    let row = builder
        .build()
        .fetch_optional(&state.db)
        .await
        .map_err(from_sqlx_error)?
        .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?;

    Ok(VilResponse::ok(map_course(row).map_err(from_sqlx_error)?))
}

pub async fn delete_course_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    Path(course_id): Path<Uuid>,
) -> HandlerResult<NoContent> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    rbac.require("teacher")?;

    let result = sqlx::query("DELETE FROM public.courses WHERE id = $1 AND tenant_id = $2")
        .bind(course_id)
        .bind(rbac.ctx().tenant_id)
        .execute(&state.db)
        .await
        .map_err(from_sqlx_error)?;

    if result.rows_affected() == 0 {
        return Err(VilError::not_found("Kursus tidak ditemukan"));
    }

    Ok(NoContent)
}

pub async fn get_course_modules_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
    AuthedRequest(ctx): AuthedRequest,
    Path(course_id): Path<Uuid>,
) -> HandlerResult<VilResponse<Vec<CourseModuleWithLessons>>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let request_id = request_id_from_headers(&headers);
    tracing::info!(
        target: "edusync_api_server::courses",
        request_id = %request_id,
        flow = "courses.modules",
        course_id = %course_id,
        tenant_id = %ctx.tenant_id,
        user_id = %ctx.user_id,
        "get_course_modules_request"
    );
    let modules = sqlx::query(
        r#"SELECT id, title, "order", course_id
           FROM public.course_modules
           WHERE tenant_id = $1 AND course_id = $2
           ORDER BY "order" ASC"#,
    )
    .bind(ctx.tenant_id)
    .bind(course_id)
    .fetch_all(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    let module_ids: Vec<Uuid> = modules
        .iter()
        .map(|row| row.get("id"))
        .collect();

    let lessons = if module_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query_as::<_, Lesson>(
            r#"SELECT id, module_id, title, content, "order" AS "order", tenant_id, created_at, updated_at, type AS lesson_type, passing_score, is_published, duration_minutes
               FROM public.lessons
               WHERE tenant_id = $1 AND module_id = ANY($2)
               ORDER BY "order" ASC"#,
        )
        .bind(ctx.tenant_id)
        .bind(&module_ids)
        .fetch_all(&state.db)
        .await
        .map_err(from_sqlx_error)?
    };

    // Build a map of module_id to lessons for efficient lookup
    use std::collections::HashMap;
    let lessons_by_module: HashMap<Uuid, Vec<CourseLessonSummary>> = lessons
        .into_iter()
        .fold(HashMap::new(), |mut map, lesson| {
            let summary = CourseLessonSummary {
                id: lesson.id,
                duration_minutes: lesson.duration_minutes,
            };
            map.entry(lesson.module_id).or_default().push(summary);
            map
        });

    let data = modules
        .into_iter()
        .map(|module| {
            let module_id: Uuid = module.try_get("id").unwrap_or_default();
            CourseModuleWithLessons {
                id: module_id,
                title: module.try_get("title").unwrap_or_default(),
                order: module.try_get("order").unwrap_or_default(),
                course_id: module.try_get("course_id").unwrap_or(course_id),
                lessons: lessons_by_module.get(&module_id).cloned().unwrap_or_else(|| Vec::new()),
            }
        })
        .collect();

    Ok(VilResponse::ok(data))
}
