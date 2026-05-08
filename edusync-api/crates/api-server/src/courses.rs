use axum::{
    extract::{Path, Query},
    http::HeaderMap,
};
use edusync_middleware::errors::from_sqlx_error;
use edusync_models::{course::Course, lesson::Lesson};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, QueryBuilder, Row};
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

#[derive(Deserialize)]
pub struct SubmitReviewRequest {
    pub note: Option<String>,
}

#[derive(Deserialize)]
pub struct ReviewCourseRequest {
    /// 'approved' | 'rejected' | 'changes_requested'
    pub verdict: String,
    pub note: Option<String>,
}

/// Quorum reviewer (P2.3): kursus hanya naik ke 'approved' setelah ada minimal
/// dua approval dari reviewer yang berbeda dalam siklus review saat ini
/// (siklus dimulai dari nilai submitted_for_review_at).
pub const REQUIRED_APPROVALS: i64 = 2;

/// P3.1: jumlah persetujuan minimum per tenant. Dibaca dari
/// `tenants.settings->>'required_approvals'` (default 2, floor 1).
pub async fn tenant_required_approvals(db: &sqlx::PgPool, tenant_id: uuid::Uuid) -> i64 {
    let row: Option<(i32,)> = sqlx::query_as(
        r#"SELECT GREATEST(1, COALESCE((settings ->> 'required_approvals')::int, 2))
             FROM public.tenants WHERE id = $1"#,
    )
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .ok()
    .flatten();
    row.map(|(n,)| n as i64).unwrap_or(REQUIRED_APPROVALS)
}

/// P3.1: role minimum yang boleh me-review kursus, dibaca dari
/// `tenants.settings->>'reviewer_role'` (default 'reviewer').
pub async fn tenant_reviewer_role(db: &sqlx::PgPool, tenant_id: uuid::Uuid) -> String {
    let row: Option<(Option<String>,)> = sqlx::query_as(
        r#"SELECT settings ->> 'reviewer_role' FROM public.tenants WHERE id = $1"#,
    )
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .ok()
    .flatten();
    row.and_then(|(r,)| r)
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "reviewer".to_string())
}

#[derive(Deserialize)]
pub struct CopyCourseRequest {
    pub target_tenant_id: uuid::Uuid,
    pub title: Option<String>,
}

#[derive(Serialize)]
pub struct CopyCourseResponse {
    pub course_id: uuid::Uuid,
    pub target_tenant_id: uuid::Uuid,
    pub modules_count: i64,
    pub lessons_count: i64,
}

#[derive(Deserialize)]
pub struct ReorderItem {
    pub id: uuid::Uuid,
    pub order: i32,
}

#[derive(Deserialize)]
pub struct ReorderRequest {
    pub items: Vec<ReorderItem>,
}

#[derive(Serialize)]
pub struct CourseReviewEntry {
    pub id: Uuid,
    pub course_id: Uuid,
    pub reviewer_id: Uuid,
    pub verdict: String,
    pub note: Option<String>,
    pub from_status: String,
    pub to_status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
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

/// Publish guard: kursus hanya boleh naik ke status 'published' jika punya
/// minimal 1 lesson dengan is_published=true (via salah satu module-nya).
/// Dipakai oleh create_course_handler (saat body.status=published) dan
/// update_course_handler (saat body.status berubah ke published).
async fn ensure_course_publishable(
    db: &sqlx::PgPool,
    course_id: Uuid,
    tenant_id: Uuid,
) -> Result<(), VilError> {
    let row: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*)::bigint
           FROM public.lessons l
           JOIN public.course_modules m ON m.id = l.module_id
           WHERE m.course_id = $1
             AND l.tenant_id = $2
             AND l.is_published = true"#,
    )
    .bind(course_id)
    .bind(tenant_id)
    .fetch_one(db)
    .await
    .map_err(from_sqlx_error)?;
    if row.0 == 0 {
        return Err(VilError::bad_request(
            "Kursus belum bisa dipublikasikan: tambahkan minimal satu pelajaran terpublikasi di salah satu modul terlebih dahulu.",
        ));
    }
    Ok(())
}

/// Ambil status kursus saat ini dalam tenant. None bila kursus tidak ada.
async fn current_course_status(
    db: &sqlx::PgPool,
    course_id: Uuid,
    tenant_id: Uuid,
) -> Result<Option<String>, VilError> {
    let row: Option<(String,)> = sqlx::query_as(
        r#"SELECT status::text FROM public.courses WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(course_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .map_err(from_sqlx_error)?;
    Ok(row.map(|r| r.0))
}

/// Validator transisi state machine kursus (Opsi B).
/// Ijinkan transisi yang diinginkan; tolak yang lain agar update_course_handler
/// tidak bisa dipakai untuk lompat langsung draft -> published.
fn validate_status_transition(from: &str, to: &str) -> Result<(), VilError> {
    let allowed = match from {
        "draft" => matches!(to, "in_review" | "archived" | "draft"),
        "in_review" => matches!(to, "approved" | "draft" | "archived"),
        "approved" => matches!(to, "published" | "draft" | "archived"),
        "published" => matches!(to, "archived" | "draft"),
        "archived" => matches!(to, "draft"),
        _ => false,
    };
    if !allowed {
        return Err(VilError::bad_request(format!(
            "Transisi status kursus dari '{from}' ke '{to}' tidak diizinkan"
        )));
    }
    Ok(())
}

/// P2.6 helper: broadcast in-app notification ke semua student yang terdaftar
/// di class-class yang memakai kursus ini. Best-effort; error dipropagasi ke
/// caller untuk di-log (tidak dijadikan bad_request).
async fn dispatch_publish_notifications(
    db: &sqlx::PgPool,
    tenant_id: Uuid,
    course_id: Uuid,
    actor_id: Uuid,
    course_title: &str,
) -> Result<u64, sqlx::Error> {
    let message = format!("Kursus \"{}\" telah dipublikasikan.", course_title);
    let link = format!("/courses/{}", course_id);
    let res = sqlx::query(
        r#"INSERT INTO public.notifications
               (user_id, title, message, type, tenant_id, actor_id, entity_id, link)
           SELECT DISTINCT e.student_id, $1, $2, 'INFO'::notification_type,
                  $3, $4, $5, $6
             FROM public.enrollments e
             JOIN public.classes c ON c.id = e.class_id
            WHERE c.course_id = $5
              AND e.tenant_id = $3
              AND e.status = 'ACTIVE'::enrollment_status"#,
    )
    .bind("Kursus baru dipublikasikan")
    .bind(&message)
    .bind(tenant_id)
    .bind(actor_id)
    .bind(course_id)
    .bind(&link)
    .execute(db)
    .await?;
    Ok(res.rows_affected())
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
    let state = svc.state::<AppState>()?.clone();
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
    let state = svc.state::<AppState>()?.clone();
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
    let state = svc.state::<AppState>()?.clone();
    rbac.require("teacher")?;

    let body: CreateCourseRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    let title = body.title.trim();
    if title.is_empty() {
        return Err(VilError::bad_request("Judul kursus wajib diisi"));
    }
    if title.len() > 255 {
        return Err(VilError::bad_request("Judul kursus maksimum 255 karakter"));
    }

    // Kursus baru tidak mungkin punya lesson terpublikasi, jadi tolak
    // upaya membuat langsung dalam status 'published'.
    let requested_status = body.status.clone().unwrap_or_else(|| "draft".to_string());
    if requested_status == "published" {
        return Err(VilError::bad_request(
            "Kursus baru harus dibuat sebagai draft. Tambahkan modul dan minimal satu pelajaran terpublikasi sebelum mengubah status menjadi 'published'.",
        ));
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
    let state = svc.state::<AppState>()?.clone();
    rbac.require("teacher")?;

    let body: UpdateCourseRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    // State machine guard (Opsi B). Transisi status hanya boleh melalui
    // jalur resmi: draft -> in_review -> approved -> published. Update
    // generik ini memvalidasi transisi yang diminta relatif status saat
    // ini; publikasi tetap membutuhkan minimal 1 lesson terpublikasi.
    if let Some(new_status) = body.status.as_deref() {
        let current = current_course_status(&state.db, course_id, rbac.ctx().tenant_id)
            .await?
            .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?;
        validate_status_transition(&current, new_status)?;
        if new_status == "published" {
            ensure_course_publishable(&state.db, course_id, rbac.ctx().tenant_id).await?;
        }
    }

    let mut builder = QueryBuilder::new("UPDATE public.courses SET ");
    let mut separated = builder.separated(", ");
    let mut has_updates = false;

    if let Some(title) = body.title.as_deref() {
        has_updates = true;
        separated.push("title = ").push_bind_unseparated(title.trim().to_string());
    }
    if let Some(description) = body.description {
        has_updates = true;
        separated.push("description = ").push_bind_unseparated(description);
    }
    if let Some(subject) = body.subject {
        has_updates = true;
        separated.push("subject = ").push_bind_unseparated(subject);
    }
    if let Some(level) = body.level {
        has_updates = true;
        separated.push("level = ").push_bind_unseparated(level);
    }
    if let Some(status) = body.status {
        has_updates = true;
        let is_publish = status == "published";
        separated
            .push("status = ")
            .push_bind_unseparated(status)
            .push_unseparated("::course_status");
        if is_publish {
            // Set published_at only on first publish; idempotent republish keeps the original timestamp.
            separated.push("published_at = COALESCE(published_at, now())");
        }
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

    // P2.6 Post-publish notification dispatch: jika status baru 'published',
    // kirim notifikasi ke seluruh student yang sudah enroll di class yang
    // memakai kursus ini. Best-effort: jika gagal, log saja.
    let new_status: String = row.try_get("status").unwrap_or_default();
    if new_status == "published" {
        let course_title: String = row.try_get("title").unwrap_or_default();
        let tenant_id = rbac.ctx().tenant_id;
        let actor_id = rbac.ctx().user_id;
        if let Err(err) = dispatch_publish_notifications(
            &state.db,
            tenant_id,
            course_id,
            actor_id,
            &course_title,
        )
        .await
        {
            tracing::warn!(
                target: "edusync_api_server::courses",
                flow = "courses.publish.notify",
                error = %err,
                course_id = %course_id,
                "post_publish_notify_failed"
            );
        }
    }

    Ok(VilResponse::ok(map_course(row).map_err(from_sqlx_error)?))
}

pub async fn delete_course_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    Path(course_id): Path<Uuid>,
) -> HandlerResult<NoContent> {
    let state = svc.state::<AppState>()?.clone();
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

/// POST /api/v1/courses/:id/submit-review
/// Guru men-submit kursus draft untuk direview.
/// Transisi yang diizinkan: draft -> in_review. Kursus harus memenuhi syarat
/// publikasi (minimal 1 lesson terpublikasi) agar reviewer punya sesuatu
/// untuk diverifikasi.
pub async fn submit_for_review_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    Path(course_id): Path<Uuid>,
    body: ShmSlice,
) -> HandlerResult<VilResponse<Course>> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("teacher")?;

    // Body opsional: reviewer boleh lihat note yang dikirim guru via riwayat.
    let body: SubmitReviewRequest = body
        .json()
        .unwrap_or(SubmitReviewRequest { note: None });

    let tenant_id = rbac.ctx().tenant_id;
    let user_id = rbac.ctx().user_id;

    let current = current_course_status(&state.db, course_id, tenant_id)
        .await?
        .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?;
    validate_status_transition(&current, "in_review")?;
    ensure_course_publishable(&state.db, course_id, tenant_id).await?;

    let mut tx = state.db.begin().await.map_err(from_sqlx_error)?;

    let row = sqlx::query(
        r#"UPDATE public.courses
              SET status = 'in_review'::course_status,
                  submitted_for_review_at = now(),
                  updated_at = now()
            WHERE id = $1 AND tenant_id = $2
         RETURNING id, title, description, subject, level, created_by, created_at, updated_at, tenant_id, status::text AS status, published_at"#,
    )
    .bind(course_id)
    .bind(tenant_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(from_sqlx_error)?
    .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?;

    // Catat entry "submitted" di course_reviews (verdict=changes_requested
    // dipakai sebagai marker submission-by-teacher agar riwayat linier).
    // Untuk membedakan, kita pakai to_status = 'in_review' + note opsional.
    sqlx::query(
        r#"INSERT INTO public.course_reviews
               (tenant_id, course_id, reviewer_id, verdict, note, from_status, to_status)
           VALUES ($1, $2, $3, 'changes_requested', $4, $5::course_status, 'in_review'::course_status)"#,
    )
    .bind(tenant_id)
    .bind(course_id)
    .bind(user_id)
    .bind(body.note.as_deref())
    .bind(&current)
    .execute(&mut *tx)
    .await
    .map_err(from_sqlx_error)?;

    tx.commit().await.map_err(from_sqlx_error)?;

    Ok(VilResponse::ok(map_course(row).map_err(from_sqlx_error)?))
}

/// POST /api/v1/courses/:id/review
/// Reviewer (admin) memberi verdict untuk kursus yang sedang in_review.
/// - verdict='approved'           -> status naik ke 'approved'
/// - verdict='changes_requested'  -> status kembali ke 'draft'
/// - verdict='rejected'           -> status kembali ke 'draft'
pub async fn review_course_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    Path(course_id): Path<Uuid>,
    body: ShmSlice,
) -> HandlerResult<VilResponse<Course>> {
    let state = svc.state::<AppState>()?.clone();

    let body: ReviewCourseRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let tenant_id = rbac.ctx().tenant_id;
    let reviewer_id = rbac.ctx().user_id;

    // P3.5: role minimum yang boleh me-review dibaca dari tenant settings.
    // Default 'reviewer' (di bawah admin), bisa di-override per-tenant via
    // tenants.settings->>'reviewer_role'.
    let required_role = tenant_reviewer_role(&state.db, tenant_id).await;
    rbac.require(&required_role)?;

    // Quorum (P2.3): verdict 'approved' hanya mencatat review. Kursus naik ke
    // 'approved' setelah distinct_reviewers(approved) pada siklus ini
    // mencapai REQUIRED_APPROVALS. verdict lain tetap langsung revert ke draft.
    let is_approve = body.verdict == "approved";
    let verdict_ok = matches!(
        body.verdict.as_str(),
        "approved" | "rejected" | "changes_requested"
    );
    if !verdict_ok {
        return Err(VilError::bad_request(format!(
            "Verdict tidak dikenal: '{}'. Gunakan 'approved', 'rejected', atau 'changes_requested'.",
            body.verdict
        )));
    }

    let current = current_course_status(&state.db, course_id, tenant_id)
        .await?
        .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?;
    if current != "in_review" {
        return Err(VilError::bad_request(format!(
            "Kursus hanya bisa direview ketika status 'in_review' (status saat ini: '{current}')"
        )));
    }

    let mut tx = state.db.begin().await.map_err(from_sqlx_error)?;

    // Log review entry dulu; to_status-nya ditentukan setelah cek quorum.
    let provisional_target = if is_approve { "in_review" } else { "draft" };
    sqlx::query(
        r#"INSERT INTO public.course_reviews
               (tenant_id, course_id, reviewer_id, verdict, note, from_status, to_status)
           VALUES ($1, $2, $3, $4, $5, $6::course_status, $7::course_status)"#,
    )
    .bind(tenant_id)
    .bind(course_id)
    .bind(reviewer_id)
    .bind(&body.verdict)
    .bind(body.note.as_deref())
    .bind(&current)
    .bind(provisional_target)
    .execute(&mut *tx)
    .await
    .map_err(from_sqlx_error)?;

    let row = if !is_approve {
        // rejected / changes_requested → langsung balik draft.
        validate_status_transition(&current, "draft")?;
        sqlx::query(
            r#"UPDATE public.courses
                  SET status = 'draft'::course_status,
                      submitted_for_review_at = NULL,
                      updated_at = now()
                WHERE id = $1 AND tenant_id = $2
             RETURNING id, title, description, subject, level, created_by, created_at, updated_at, tenant_id, status::text AS status, published_at"#,
        )
        .bind(course_id)
        .bind(tenant_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(from_sqlx_error)?
        .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?
    } else {
        // Hitung distinct reviewer yang sudah approve di siklus ini.
        let approvals: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(DISTINCT reviewer_id)
                 FROM public.course_reviews cr
                 JOIN public.courses c ON c.id = cr.course_id
                WHERE cr.course_id = $1
                  AND cr.tenant_id = $2
                  AND cr.verdict = 'approved'
                  AND (c.submitted_for_review_at IS NULL
                       OR cr.created_at >= c.submitted_for_review_at)"#,
        )
        .bind(course_id)
        .bind(tenant_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(from_sqlx_error)?;

        let required_approvals = tenant_required_approvals(&state.db, tenant_id).await;
        if approvals >= required_approvals {
            validate_status_transition(&current, "approved")?;
            // Promote: status → approved.
            let promoted = sqlx::query(
                r#"UPDATE public.courses
                      SET status = 'approved'::course_status,
                          approved_at = now(),
                          approved_by = $3,
                          updated_at = now()
                    WHERE id = $1 AND tenant_id = $2
                 RETURNING id, title, description, subject, level, created_by, created_at, updated_at, tenant_id, status::text AS status, published_at"#,
            )
            .bind(course_id)
            .bind(tenant_id)
            .bind(reviewer_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(from_sqlx_error)?
            .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?;

            // Update baris review terakhir agar to_status mencerminkan hasil.
            // (PG tidak support ORDER BY langsung di UPDATE — pakai subquery.)
            sqlx::query(
                r#"UPDATE public.course_reviews
                      SET to_status = 'approved'::course_status
                    WHERE id = (
                        SELECT id FROM public.course_reviews
                         WHERE course_id = $1 AND tenant_id = $2 AND reviewer_id = $3
                           AND verdict = 'approved'
                         ORDER BY created_at DESC LIMIT 1
                    )"#,
            )
            .bind(course_id)
            .bind(tenant_id)
            .bind(reviewer_id)
            .execute(&mut *tx)
            .await
            .map_err(from_sqlx_error)?;

            promoted
        } else {
            // Belum kuorum: kursus tetap in_review, tapi response masih
            // pakai row terkini.
            sqlx::query(
                r#"SELECT id, title, description, subject, level, created_by, created_at, updated_at, tenant_id, status::text AS status, published_at
                     FROM public.courses WHERE id = $1 AND tenant_id = $2"#,
            )
            .bind(course_id)
            .bind(tenant_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(from_sqlx_error)?
            .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?
        }
    };

    tx.commit().await.map_err(from_sqlx_error)?;

    Ok(VilResponse::ok(map_course(row).map_err(from_sqlx_error)?))
}

/// GET /api/v1/courses/:id/reviews
/// Riwayat review untuk sebuah kursus.
pub async fn list_course_reviews_handler(
    svc: ServiceCtx,
    AuthedRequest(ctx): AuthedRequest,
    Path(course_id): Path<Uuid>,
) -> HandlerResult<VilResponse<Vec<CourseReviewEntry>>> {
    let state = svc.state::<AppState>()?.clone();

    let rows = sqlx::query(
        r#"SELECT id, course_id, reviewer_id, verdict, note,
                  from_status::text AS from_status,
                  to_status::text   AS to_status,
                  created_at
             FROM public.course_reviews
            WHERE course_id = $1 AND tenant_id = $2
            ORDER BY created_at DESC"#,
    )
    .bind(course_id)
    .bind(ctx.tenant_id)
    .fetch_all(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    let entries = rows
        .into_iter()
        .map(|row| CourseReviewEntry {
            id: row.try_get("id").unwrap_or_default(),
            course_id: row.try_get("course_id").unwrap_or_default(),
            reviewer_id: row.try_get("reviewer_id").unwrap_or_default(),
            verdict: row.try_get("verdict").unwrap_or_default(),
            note: row.try_get("note").ok(),
            from_status: row.try_get("from_status").unwrap_or_default(),
            to_status: row.try_get("to_status").unwrap_or_default(),
            created_at: row.try_get("created_at").unwrap_or_else(|_| chrono::Utc::now()),
        })
        .collect();

    Ok(VilResponse::ok(entries))
}

/// POST /api/v1/courses/:id/copy?target_tenant=...
/// Clone kursus (course + modules + lessons) ke tenant lain sebagai draft.
/// Syarat: user harus punya peran teacher/admin pada tenant target.
pub async fn copy_course_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    Path(course_id): Path<Uuid>,
    body: ShmSlice,
) -> HandlerResult<VilResponse<CopyCourseResponse>> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("teacher")?;

    let body: CopyCourseRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let source_tenant = rbac.ctx().tenant_id;
    let target_tenant = body.target_tenant_id;
    let actor_id = rbac.ctx().user_id;

    if source_tenant == target_tenant {
        return Err(VilError::bad_request(
            "target_tenant_id harus berbeda dari tenant sumber. Duplikasi dalam tenant yang sama silakan pakai template gallery.",
        ));
    }

    // Validasi: user punya peran teacher/admin di target tenant.
    let has_target_role: Option<String> = sqlx::query_scalar(
        r#"SELECT role::text FROM public.user_roles
            WHERE user_id = $1 AND tenant_id = $2
              AND role IN ('TEACHER'::app_role, 'ADMIN'::app_role)
            LIMIT 1"#,
    )
    .bind(actor_id)
    .bind(target_tenant)
    .fetch_optional(&state.db)
    .await
    .map_err(from_sqlx_error)?;
    if has_target_role.is_none() {
        return Err(VilError::forbidden(
            "Anda tidak memiliki peran teacher/admin di tenant target",
        ));
    }

    // Ambil source course.
    let src = sqlx::query(
        r#"SELECT title, description, subject, level
             FROM public.courses WHERE id=$1 AND tenant_id=$2"#,
    )
    .bind(course_id)
    .bind(source_tenant)
    .fetch_optional(&state.db)
    .await
    .map_err(from_sqlx_error)?
    .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?;

    let src_title: String = src.try_get("title").map_err(from_sqlx_error)?;
    let new_title = body.title.unwrap_or_else(|| format!("{} (Copy)", src_title));
    let description: Option<String> = src.try_get("description").ok();
    let subject: Option<String> = src.try_get("subject").ok();
    let level: Option<String> = src.try_get("level").ok();

    let mut tx = state.db.begin().await.map_err(from_sqlx_error)?;

    let new_course_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO public.courses
               (id, title, description, subject, level, created_by, tenant_id, status,
                created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft'::course_status, now(), now())"#,
    )
    .bind(new_course_id)
    .bind(&new_title)
    .bind(&description)
    .bind(&subject)
    .bind(&level)
    .bind(actor_id)
    .bind(target_tenant)
    .execute(&mut *tx)
    .await
    .map_err(from_sqlx_error)?;

    let src_modules = sqlx::query(
        r#"SELECT id, title, "order" FROM public.course_modules
            WHERE course_id = $1 AND tenant_id = $2 ORDER BY "order" ASC"#,
    )
    .bind(course_id)
    .bind(source_tenant)
    .fetch_all(&mut *tx)
    .await
    .map_err(from_sqlx_error)?;

    let mut modules_count: i64 = 0;
    let mut lessons_count: i64 = 0;
    for m in &src_modules {
        let src_module_id: Uuid = m.get("id");
        let new_module_id = Uuid::new_v4();
        sqlx::query(
            r#"INSERT INTO public.course_modules (id, course_id, title, "order", tenant_id)
               VALUES ($1, $2, $3, $4, $5)"#,
        )
        .bind(new_module_id)
        .bind(new_course_id)
        .bind(m.try_get::<String, _>("title").unwrap_or_default())
        .bind(m.try_get::<i32, _>("order").unwrap_or(0))
        .bind(target_tenant)
        .execute(&mut *tx)
        .await
        .map_err(from_sqlx_error)?;
        modules_count += 1;

        let src_lessons = sqlx::query(
            r#"SELECT title, content, "order", type, passing_score, is_published, duration_minutes
                 FROM public.lessons
                WHERE module_id = $1 AND tenant_id = $2
                ORDER BY "order" ASC"#,
        )
        .bind(src_module_id)
        .bind(source_tenant)
        .fetch_all(&mut *tx)
        .await
        .map_err(from_sqlx_error)?;

        for l in src_lessons {
            sqlx::query(
                r#"INSERT INTO public.lessons
                       (id, module_id, title, content, "order", tenant_id, type,
                        passing_score, is_published, duration_minutes)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)"#,
            )
            .bind(Uuid::new_v4())
            .bind(new_module_id)
            .bind(l.try_get::<String, _>("title").unwrap_or_default())
            .bind(l.try_get::<Option<String>, _>("content").unwrap_or(None))
            .bind(l.try_get::<i32, _>("order").unwrap_or(0))
            .bind(target_tenant)
            .bind(l.try_get::<Option<String>, _>("type").unwrap_or(Some("article".to_string())))
            .bind(l.try_get::<Option<i32>, _>("passing_score").unwrap_or(None))
            .bind(l.try_get::<Option<i32>, _>("duration_minutes").unwrap_or(None))
            .execute(&mut *tx)
            .await
            .map_err(from_sqlx_error)?;
            lessons_count += 1;
        }
    }

    tx.commit().await.map_err(from_sqlx_error)?;

    Ok(VilResponse::ok(CopyCourseResponse {
        course_id: new_course_id,
        target_tenant_id: target_tenant,
        modules_count,
        lessons_count,
    }))
}

/// POST /api/v1/courses/:id/modules/reorder  (P2.7)
/// Body: { items: [{ id, order }] }
pub async fn reorder_modules_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    Path(course_id): Path<Uuid>,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("teacher")?;
    let body: ReorderRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;
    if body.items.is_empty() {
        return Err(VilError::bad_request("items tidak boleh kosong"));
    }
    let tenant_id = rbac.ctx().tenant_id;
    let mut tx = state.db.begin().await.map_err(from_sqlx_error)?;
    let mut updated = 0i64;
    for item in &body.items {
        let res = sqlx::query(
            r#"UPDATE public.course_modules
                  SET "order" = $1, updated_at = now()
                WHERE id = $2 AND course_id = $3 AND tenant_id = $4"#,
        )
        .bind(item.order)
        .bind(item.id)
        .bind(course_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await
        .map_err(from_sqlx_error)?;
        updated += res.rows_affected() as i64;
    }
    tx.commit().await.map_err(from_sqlx_error)?;
    Ok(VilResponse::ok(serde_json::json!({ "updated": updated })))
}

/// POST /api/v1/modules/:id/lessons/reorder  (P2.7)
pub async fn reorder_lessons_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    Path(module_id): Path<Uuid>,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("teacher")?;
    let body: ReorderRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;
    if body.items.is_empty() {
        return Err(VilError::bad_request("items tidak boleh kosong"));
    }
    let tenant_id = rbac.ctx().tenant_id;
    let mut tx = state.db.begin().await.map_err(from_sqlx_error)?;
    let mut updated = 0i64;
    for item in &body.items {
        let res = sqlx::query(
            r#"UPDATE public.lessons
                  SET "order" = $1, updated_at = now()
                WHERE id = $2 AND module_id = $3 AND tenant_id = $4"#,
        )
        .bind(item.order)
        .bind(item.id)
        .bind(module_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await
        .map_err(from_sqlx_error)?;
        updated += res.rows_affected() as i64;
    }
    tx.commit().await.map_err(from_sqlx_error)?;
    Ok(VilResponse::ok(serde_json::json!({ "updated": updated })))
}

pub async fn get_course_modules_handler(
    svc: ServiceCtx,
    headers: HeaderMap,
    AuthedRequest(ctx): AuthedRequest,
    Path(course_id): Path<Uuid>,
) -> HandlerResult<VilResponse<Vec<CourseModuleWithLessons>>> {
    let state = svc.state::<AppState>()?.clone();
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
