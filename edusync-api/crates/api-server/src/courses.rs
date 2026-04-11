use axum::{
    extract::{Extension, Path, Query},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use edusync_auth::AuthError;
use edusync_middleware::errors::AppError;
use edusync_models::{course::Course, lesson::Lesson};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, QueryBuilder, Row};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    extractors::{AuthedRequest, RbacGuard},
    observability::request_id_from_headers,
    state::AppState,
};

#[derive(Debug)]
pub enum CourseApiError {
    Auth(AuthError),
    App(AppError),
}

impl From<AuthError> for CourseApiError {
    fn from(value: AuthError) -> Self {
        Self::Auth(value)
    }
}

impl From<AppError> for CourseApiError {
    fn from(value: AppError) -> Self {
        Self::App(value)
    }
}

impl From<sqlx::Error> for CourseApiError {
    fn from(value: sqlx::Error) -> Self {
        Self::App(AppError::from(value))
    }
}

impl IntoResponse for CourseApiError {
    fn into_response(self) -> Response {
        match self {
            Self::Auth(error) => error.into_response(),
            Self::App(error) => error.into_response(),
        }
    }
}

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

#[derive(Serialize)]
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
    Extension(state): Extension<Arc<AppState>>,
    headers: HeaderMap,
    AuthedRequest(ctx): AuthedRequest,
    Query(params): Query<CourseListQuery>,
) -> Result<Json<CourseListResponse>, CourseApiError> {
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
    .await?;

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
    .await?;

    let mut courses = Vec::with_capacity(rows.len());
    for row in rows {
        courses.push(map_course(row)?);
    }

    Ok(Json(CourseListResponse { courses, count }))
}

pub async fn get_course_handler(
    Extension(state): Extension<Arc<AppState>>,
    headers: HeaderMap,
    AuthedRequest(ctx): AuthedRequest,
    Path(course_id): Path<Uuid>,
) -> Result<Json<Course>, CourseApiError> {
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
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(map_course(row)?))
}

pub async fn create_course_handler(
    Extension(state): Extension<Arc<AppState>>,
    rbac: RbacGuard,
    Json(body): Json<CreateCourseRequest>,
) -> Result<Json<Course>, CourseApiError> {
    rbac.require("teacher")?;

    let title = body.title.trim();
    if title.is_empty() {
        return Err(AppError::BadRequest("Judul kursus wajib diisi".to_string()).into());
    }
    if title.len() > 255 {
        return Err(AppError::BadRequest("Judul kursus maksimum 255 karakter".to_string()).into());
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
    .await?;

    Ok(Json(map_course(row)?))
}

pub async fn update_course_handler(
    Extension(state): Extension<Arc<AppState>>,
    rbac: RbacGuard,
    Path(course_id): Path<Uuid>,
    Json(body): Json<UpdateCourseRequest>,
) -> Result<Json<Course>, CourseApiError> {
    rbac.require("teacher")?;

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
        return Err(AppError::BadRequest("Tidak ada perubahan untuk disimpan".to_string()).into());
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
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(map_course(row)?))
}

pub async fn delete_course_handler(
    Extension(state): Extension<Arc<AppState>>,
    rbac: RbacGuard,
    Path(course_id): Path<Uuid>,
) -> Result<Response, CourseApiError> {
    rbac.require("teacher")?;

    let result = sqlx::query("DELETE FROM public.courses WHERE id = $1 AND tenant_id = $2")
        .bind(course_id)
        .bind(rbac.ctx().tenant_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound.into());
    }

    Ok(axum::http::StatusCode::NO_CONTENT.into_response())
}

pub async fn get_course_modules_handler(
    Extension(state): Extension<Arc<AppState>>,
    headers: HeaderMap,
    AuthedRequest(ctx): AuthedRequest,
    Path(course_id): Path<Uuid>,
) -> Result<Json<Vec<CourseModuleWithLessons>>, CourseApiError> {
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
    .await?;

    let lessons = sqlx::query_as::<_, Lesson>(
        r#"SELECT id, module_id, title, content, "order" AS "order", tenant_id, created_at, updated_at, type AS lesson_type, passing_score, is_published, duration_minutes
           FROM public.lessons
           WHERE tenant_id = $1 AND module_id IN (
             SELECT id FROM public.course_modules WHERE tenant_id = $1 AND course_id = $2
           )
           ORDER BY "order" ASC"#,
    )
    .bind(ctx.tenant_id)
    .bind(course_id)
    .fetch_all(&state.db)
    .await?;

    let data = modules
        .into_iter()
        .map(|module| {
            let module_id: Uuid = module.try_get("id").unwrap_or_default();
            CourseModuleWithLessons {
                id: module_id,
                title: module.try_get("title").unwrap_or_default(),
                order: module.try_get("order").unwrap_or_default(),
                course_id: module.try_get("course_id").unwrap_or(course_id),
                lessons: lessons
                    .iter()
                    .filter(|lesson| lesson.module_id == module_id)
                    .map(|lesson| CourseLessonSummary {
                        id: lesson.id,
                        duration_minutes: lesson.duration_minutes,
                    })
                    .collect(),
            }
        })
        .collect();

    Ok(Json(data))
}
