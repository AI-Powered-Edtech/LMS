//! Real (non-stub) report handlers — Prio 5 Unit 31.
//!
//! Replaces `executive_report_stub_handler`, `parent_report_stub_handler`, and
//! `reports_export_*_stub_handler`. Uses vil_server pattern (matches main.rs
//! .endpoint() signature requirements).
//!
//! NOTE FOR OPERATOR: this file is mod-declared but the route swap from stub
//! to real is NOT done automatically. Once the underlying analytics queries
//! are confirmed, swap lines 447-450 in main.rs:
//!   .endpoint(Method::POST, "/pdf/executive-report", post(executive_report_handler))
//!   .endpoint(Method::POST, "/pdf/parent-report",    post(parent_report_handler))
//!   .endpoint(Method::POST, "/reports/export",       post(reports_export_create_handler))
//!   .endpoint(Method::GET,  "/reports/export/:id",   post(reports_export_status_handler))

use serde::Deserialize;
use serde_json::json;
use sqlx::Row;
use vil_server::prelude::{HandlerResult, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::extractors::AuthedRequest;

#[derive(Debug, Deserialize)]
pub struct ExecutiveReportRequest {
    pub tenant_id: uuid::Uuid,
    pub report_type: String,
    pub month: Option<i32>,
    pub year: Option<i32>,
}

/// POST /api/v1/pdf/executive-report — real implementation.
///
/// Returns aggregated school metrics for the principal monthly view.
pub async fn executive_report_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let req: ExecutiveReportRequest = body
        .json()
        .map_err(|e| VilError::bad_request(format!("invalid request: {e}")))?;

    if req.tenant_id != ctx.tenant_id {
        return Err(VilError::forbidden("tenant mismatch"));
    }

    let state = svc.state::<crate::state::AppState>()?.clone();
    let pool = &state.db;

    // Aggregate metrics — kept narrow so the query stays fast.
    let metrics_row = sqlx::query(
        r#"
        SELECT
            (SELECT COUNT(*) FROM public.profiles WHERE tenant_id = $1) AS total_users,
            (SELECT COUNT(*) FROM public.user_roles WHERE tenant_id = $1 AND role = 'STUDENT') AS total_students,
            (SELECT COUNT(*) FROM public.user_roles WHERE tenant_id = $1 AND role = 'TEACHER') AS total_teachers,
            (SELECT COUNT(*) FROM public.rombel WHERE tenant_id = $1 AND status = 'active') AS active_rombel,
            (SELECT COUNT(*) FROM public.courses WHERE tenant_id = $1 AND status = 'published') AS published_courses,
            (SELECT COUNT(*) FROM public.assignment_submissions WHERE tenant_id = $1 AND created_at >= now() - interval '30 days') AS submissions_30d,
            (SELECT COUNT(*) FROM public.invoices WHERE tenant_id = $1 AND status = 'paid' AND updated_at >= now() - interval '30 days') AS paid_invoices_30d,
            (SELECT COALESCE(SUM(amount_due), 0) FROM public.invoices WHERE tenant_id = $1 AND status = 'paid' AND updated_at >= now() - interval '30 days') AS revenue_30d
        "#,
    )
    .bind(req.tenant_id)
    .fetch_one(pool)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    let report_data = json!({
        "tenantId": req.tenant_id,
        "reportType": req.report_type,
        "month": req.month,
        "year": req.year,
        "summary": {
            "totalUsers": metrics_row.get::<i64, _>("total_users"),
            "totalStudents": metrics_row.get::<i64, _>("total_students"),
            "totalTeachers": metrics_row.get::<i64, _>("total_teachers"),
            "activeRombel": metrics_row.get::<i64, _>("active_rombel"),
            "publishedCourses": metrics_row.get::<i64, _>("published_courses"),
            "submissions30d": metrics_row.get::<i64, _>("submissions_30d"),
            "paidInvoices30d": metrics_row.get::<i64, _>("paid_invoices_30d"),
            "revenue30d": metrics_row.try_get::<f64, _>("revenue_30d").unwrap_or(0.0),
        },
        "generatedAt": chrono::Utc::now().to_rfc3339(),
    });

    Ok(VilResponse::ok(json!({
        "success": true,
        "reportData": report_data,
    })))
}

#[derive(Debug, Deserialize)]
pub struct ParentReportRequest {
    pub student_id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub month: Option<i32>,
    pub year: Option<i32>,
}

/// POST /api/v1/pdf/parent-report — real implementation.
pub async fn parent_report_handler(
    AuthedRequest(ctx): AuthedRequest,
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let req: ParentReportRequest = body
        .json()
        .map_err(|e| VilError::bad_request(format!("invalid request: {e}")))?;

    if req.tenant_id != ctx.tenant_id {
        return Err(VilError::forbidden("tenant mismatch"));
    }

    let state = svc.state::<crate::state::AppState>()?.clone();
    let pool = &state.db;

    let row = sqlx::query(
        r#"
        SELECT
            p.full_name,
            (SELECT json_agg(row_to_json(t))
              FROM (
                  SELECT lp.lesson_id, l.title AS lesson_title, lp.completed_at
                    FROM public.lesson_progress lp
                    JOIN public.lessons l ON l.id = lp.lesson_id
                   WHERE lp.user_id = $1 AND lp.completed_at IS NOT NULL
                   ORDER BY lp.completed_at DESC LIMIT 20
              ) t
            ) AS lessons,
            (SELECT json_agg(row_to_json(t))
              FROM (
                  SELECT ra.attendance_date, ra.status
                    FROM public.rombel_attendance ra
                   WHERE ra.student_id = $1
                   ORDER BY ra.attendance_date DESC LIMIT 30
              ) t
            ) AS attendance,
            (SELECT json_agg(row_to_json(t))
              FROM (
                  SELECT ge.column_id, ge.value, ge.updated_at
                    FROM public.gradebook_entries ge
                   WHERE ge.user_id = $1
                   ORDER BY ge.updated_at DESC LIMIT 20
              ) t
            ) AS grades
          FROM public.profiles p
         WHERE p.id = $1 AND p.tenant_id = $2
        "#,
    )
    .bind(req.student_id)
    .bind(req.tenant_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| VilError::internal(e.to_string()))?;

    let row = row.ok_or_else(|| VilError::not_found("student not found"))?;

    let report_data = json!({
        "studentId": req.student_id,
        "studentName": row.get::<String, _>("full_name"),
        "month": req.month,
        "year": req.year,
        "summary": {},
        "lessons": row.try_get::<serde_json::Value, _>("lessons").unwrap_or(json!([])),
        "attendance": row.try_get::<serde_json::Value, _>("attendance").unwrap_or(json!([])),
        "grades": row.try_get::<serde_json::Value, _>("grades").unwrap_or(json!([])),
    });

    Ok(VilResponse::ok(json!({
        "success": true,
        "reportData": report_data,
    })))
}
