//! Template gallery (P2.5).
//!
//! Template adalah snapshot course (modules + lessons) yang bisa diduplikasi
//! menjadi course draft baru. Template bisa `is_public=true` (terlihat di semua
//! tenant) atau scope tenant-only.

use axum::extract::{Path, Query};
use edusync_middleware::errors::from_sqlx_error;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, NoContent, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::{
    extractors::{AuthedRequest, RbacGuard},
    state::AppState,
};

#[derive(Serialize)]
pub struct TemplateSummary {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub subject: Option<String>,
    pub level: Option<String>,
    pub cover_image_url: Option<String>,
    pub is_public: bool,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
pub struct TemplateDetail {
    #[serde(flatten)]
    pub summary: TemplateSummary,
    pub payload: serde_json::Value,
}

#[derive(Deserialize)]
pub struct CreateTemplateFromCourseRequest {
    pub course_id: Uuid,
    pub title: Option<String>,
    pub description: Option<String>,
    pub is_public: Option<bool>,
    pub cover_image_url: Option<String>,
}

#[derive(Deserialize)]
pub struct InstantiateTemplateRequest {
    pub title: Option<String>,
}

#[derive(Deserialize)]
pub struct ListTemplatesQuery {
    pub scope: Option<String>, // "tenant" | "public" | "all" (default)
    pub limit: Option<i64>,
}

async fn snapshot_course_payload(
    db: &sqlx::PgPool,
    course_id: Uuid,
    tenant_id: Uuid,
) -> Result<serde_json::Value, VilError> {
    let course = sqlx::query(
        r#"SELECT title, description, subject, level
             FROM public.courses WHERE id=$1 AND tenant_id=$2"#,
    )
    .bind(course_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .map_err(from_sqlx_error)?
    .ok_or_else(|| VilError::not_found("Kursus tidak ditemukan"))?;

    let modules = sqlx::query(
        r#"SELECT id, title, "order"
             FROM public.course_modules
            WHERE course_id=$1 AND tenant_id=$2
            ORDER BY "order" ASC"#,
    )
    .bind(course_id)
    .bind(tenant_id)
    .fetch_all(db)
    .await
    .map_err(from_sqlx_error)?;

    let module_ids: Vec<Uuid> = modules.iter().map(|r| r.get("id")).collect();

    let lessons = if module_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query(
            r#"SELECT id, module_id, title, content, "order", type, passing_score,
                      is_published, duration_minutes
                 FROM public.lessons
                WHERE module_id = ANY($1) AND tenant_id=$2
                ORDER BY "order" ASC"#,
        )
        .bind(&module_ids)
        .bind(tenant_id)
        .fetch_all(db)
        .await
        .map_err(from_sqlx_error)?
    };

    let mut modules_json = Vec::new();
    for m in &modules {
        let mid: Uuid = m.get("id");
        let mut lessons_json = Vec::new();
        for l in &lessons {
            let lm: Uuid = l.get("module_id");
            if lm != mid {
                continue;
            }
            lessons_json.push(serde_json::json!({
                "title": l.try_get::<String, _>("title").unwrap_or_default(),
                "content": l.try_get::<Option<String>, _>("content").unwrap_or(None),
                "order": l.try_get::<i32, _>("order").unwrap_or(0),
                "type": l.try_get::<Option<String>, _>("type").unwrap_or(None),
                "passing_score": l.try_get::<Option<i32>, _>("passing_score").unwrap_or(None),
                "is_published": l.try_get::<Option<bool>, _>("is_published").unwrap_or(Some(false)),
                "duration_minutes": l.try_get::<Option<i32>, _>("duration_minutes").unwrap_or(None),
            }));
        }
        modules_json.push(serde_json::json!({
            "title": m.try_get::<String, _>("title").unwrap_or_default(),
            "order": m.try_get::<i32, _>("order").unwrap_or(0),
            "lessons": lessons_json,
        }));
    }

    Ok(serde_json::json!({
        "course": {
            "title": course.try_get::<String, _>("title").unwrap_or_default(),
            "description": course.try_get::<Option<String>, _>("description").unwrap_or(None),
            "subject": course.try_get::<Option<String>, _>("subject").unwrap_or(None),
            "level": course.try_get::<Option<String>, _>("level").unwrap_or(None),
        },
        "modules": modules_json,
    }))
}

pub async fn create_template_from_course_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    body: ShmSlice,
) -> HandlerResult<VilResponse<TemplateDetail>> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("teacher")?;
    let body: CreateTemplateFromCourseRequest = body
        .json()
        .map_err(|e| VilError::bad_request(e.to_string()))?;

    let payload = snapshot_course_payload(&state.db, body.course_id, rbac.ctx().tenant_id).await?;
    let course_title = payload
        .get("course")
        .and_then(|c| c.get("title"))
        .and_then(|t| t.as_str())
        .unwrap_or("Untitled")
        .to_string();
    let title = body.title.unwrap_or(course_title);
    let description = body.description.or_else(|| {
        payload
            .get("course")
            .and_then(|c| c.get("description"))
            .and_then(|v| v.as_str().map(String::from))
    });
    let subject = payload
        .get("course")
        .and_then(|c| c.get("subject"))
        .and_then(|v| v.as_str().map(String::from));
    let level = payload
        .get("course")
        .and_then(|c| c.get("level"))
        .and_then(|v| v.as_str().map(String::from));

    let row = sqlx::query(
        r#"INSERT INTO public.course_templates
               (tenant_id, title, description, subject, level, cover_image_url,
                is_public, payload, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, tenant_id, title, description, subject, level,
                     cover_image_url, is_public, payload, created_by, created_at"#,
    )
    .bind(rbac.ctx().tenant_id)
    .bind(&title)
    .bind(&description)
    .bind(&subject)
    .bind(&level)
    .bind(&body.cover_image_url)
    .bind(body.is_public.unwrap_or(false))
    .bind(&payload)
    .bind(rbac.ctx().user_id)
    .fetch_one(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    Ok(VilResponse::ok(TemplateDetail {
        summary: TemplateSummary {
            id: row.try_get("id").map_err(from_sqlx_error)?,
            tenant_id: row.try_get("tenant_id").map_err(from_sqlx_error)?,
            title: row.try_get("title").map_err(from_sqlx_error)?,
            description: row.try_get("description").ok(),
            subject: row.try_get("subject").ok(),
            level: row.try_get("level").ok(),
            cover_image_url: row.try_get("cover_image_url").ok(),
            is_public: row.try_get("is_public").unwrap_or(false),
            created_by: row.try_get("created_by").map_err(from_sqlx_error)?,
            created_at: row.try_get("created_at").map_err(from_sqlx_error)?,
        },
        payload: row
            .try_get::<serde_json::Value, _>("payload")
            .unwrap_or_else(|_| serde_json::json!({})),
    }))
}

pub async fn list_templates_handler(
    svc: ServiceCtx,
    AuthedRequest(ctx): AuthedRequest,
    Query(params): Query<ListTemplatesQuery>,
) -> HandlerResult<VilResponse<Vec<TemplateSummary>>> {
    let state = svc.state::<AppState>()?.clone();
    let scope = params.scope.as_deref().unwrap_or("all");
    let limit = params.limit.unwrap_or(50).clamp(1, 200);

    let query_str = match scope {
        "tenant" => r#"SELECT id, tenant_id, title, description, subject, level,
                              cover_image_url, is_public, created_by, created_at
                         FROM public.course_templates
                        WHERE tenant_id = $1
                        ORDER BY created_at DESC LIMIT $2"#,
        "public" => r#"SELECT id, tenant_id, title, description, subject, level,
                              cover_image_url, is_public, created_by, created_at
                         FROM public.course_templates
                        WHERE is_public = true
                        ORDER BY created_at DESC LIMIT $2"#,
        _ => r#"SELECT id, tenant_id, title, description, subject, level,
                       cover_image_url, is_public, created_by, created_at
                  FROM public.course_templates
                 WHERE tenant_id = $1 OR is_public = true
                 ORDER BY created_at DESC LIMIT $2"#,
    };

    let rows = sqlx::query(query_str)
        .bind(ctx.tenant_id)
        .bind(limit)
        .fetch_all(&state.db)
        .await
        .map_err(from_sqlx_error)?;

    let list = rows
        .into_iter()
        .map(|r| TemplateSummary {
            id: r.try_get("id").unwrap_or_default(),
            tenant_id: r.try_get("tenant_id").unwrap_or_default(),
            title: r.try_get("title").unwrap_or_default(),
            description: r.try_get("description").ok(),
            subject: r.try_get("subject").ok(),
            level: r.try_get("level").ok(),
            cover_image_url: r.try_get("cover_image_url").ok(),
            is_public: r.try_get("is_public").unwrap_or(false),
            created_by: r.try_get("created_by").unwrap_or_default(),
            created_at: r
                .try_get("created_at")
                .unwrap_or_else(|_| chrono::Utc::now()),
        })
        .collect();
    Ok(VilResponse::ok(list))
}

pub async fn get_template_handler(
    svc: ServiceCtx,
    AuthedRequest(ctx): AuthedRequest,
    Path(template_id): Path<Uuid>,
) -> HandlerResult<VilResponse<TemplateDetail>> {
    let state = svc.state::<AppState>()?.clone();
    let row = sqlx::query(
        r#"SELECT id, tenant_id, title, description, subject, level,
                  cover_image_url, is_public, payload, created_by, created_at
             FROM public.course_templates
            WHERE id = $1 AND (tenant_id = $2 OR is_public = true)"#,
    )
    .bind(template_id)
    .bind(ctx.tenant_id)
    .fetch_optional(&state.db)
    .await
    .map_err(from_sqlx_error)?
    .ok_or_else(|| VilError::not_found("Template tidak ditemukan"))?;

    Ok(VilResponse::ok(TemplateDetail {
        summary: TemplateSummary {
            id: row.try_get("id").map_err(from_sqlx_error)?,
            tenant_id: row.try_get("tenant_id").map_err(from_sqlx_error)?,
            title: row.try_get("title").map_err(from_sqlx_error)?,
            description: row.try_get("description").ok(),
            subject: row.try_get("subject").ok(),
            level: row.try_get("level").ok(),
            cover_image_url: row.try_get("cover_image_url").ok(),
            is_public: row.try_get("is_public").unwrap_or(false),
            created_by: row.try_get("created_by").map_err(from_sqlx_error)?,
            created_at: row.try_get("created_at").map_err(from_sqlx_error)?,
        },
        payload: row
            .try_get::<serde_json::Value, _>("payload")
            .unwrap_or_else(|_| serde_json::json!({})),
    }))
}

pub async fn instantiate_template_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    Path(template_id): Path<Uuid>,
    body: ShmSlice,
) -> HandlerResult<VilResponse<serde_json::Value>> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("teacher")?;
    let body: InstantiateTemplateRequest = body
        .json()
        .unwrap_or(InstantiateTemplateRequest { title: None });

    let tpl_row = sqlx::query(
        r#"SELECT title, payload
             FROM public.course_templates
            WHERE id = $1 AND (tenant_id = $2 OR is_public = true)"#,
    )
    .bind(template_id)
    .bind(rbac.ctx().tenant_id)
    .fetch_optional(&state.db)
    .await
    .map_err(from_sqlx_error)?
    .ok_or_else(|| VilError::not_found("Template tidak ditemukan"))?;

    let default_title: String = tpl_row.try_get("title").map_err(from_sqlx_error)?;
    let title = body.title.unwrap_or(default_title);
    let payload: serde_json::Value = tpl_row
        .try_get("payload")
        .unwrap_or_else(|_| serde_json::json!({}));
    let course_obj = payload.get("course").cloned().unwrap_or_default();
    let modules = payload
        .get("modules")
        .and_then(|m| m.as_array())
        .cloned()
        .unwrap_or_default();

    let mut tx = state.db.begin().await.map_err(from_sqlx_error)?;

    let course_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO public.courses
               (id, title, description, subject, level, created_by, tenant_id, status,
                created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft'::course_status, now(), now())"#,
    )
    .bind(course_id)
    .bind(&title)
    .bind(course_obj.get("description").and_then(|v| v.as_str()))
    .bind(course_obj.get("subject").and_then(|v| v.as_str()))
    .bind(course_obj.get("level").and_then(|v| v.as_str()))
    .bind(rbac.ctx().user_id)
    .bind(rbac.ctx().tenant_id)
    .execute(&mut *tx)
    .await
    .map_err(from_sqlx_error)?;

    for (m_order, m) in modules.iter().enumerate() {
        let module_id = Uuid::new_v4();
        sqlx::query(
            r#"INSERT INTO public.course_modules (id, course_id, title, "order", tenant_id)
               VALUES ($1, $2, $3, $4, $5)"#,
        )
        .bind(module_id)
        .bind(course_id)
        .bind(m.get("title").and_then(|v| v.as_str()).unwrap_or("Modul"))
        .bind(
            m.get("order")
                .and_then(|v| v.as_i64())
                .unwrap_or(m_order as i64) as i32,
        )
        .bind(rbac.ctx().tenant_id)
        .execute(&mut *tx)
        .await
        .map_err(from_sqlx_error)?;

        if let Some(lessons) = m.get("lessons").and_then(|l| l.as_array()) {
            for (l_order, l) in lessons.iter().enumerate() {
                sqlx::query(
                    r#"INSERT INTO public.lessons
                           (id, module_id, title, content, "order", tenant_id, type,
                            passing_score, is_published, duration_minutes)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)"#,
                )
                .bind(Uuid::new_v4())
                .bind(module_id)
                .bind(l.get("title").and_then(|v| v.as_str()).unwrap_or("Pelajaran"))
                .bind(l.get("content").and_then(|v| v.as_str()))
                .bind(
                    l.get("order")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(l_order as i64) as i32,
                )
                .bind(rbac.ctx().tenant_id)
                .bind(l.get("type").and_then(|v| v.as_str()).unwrap_or("article"))
                .bind(l.get("passing_score").and_then(|v| v.as_i64()).map(|v| v as i32))
                .bind(l.get("duration_minutes").and_then(|v| v.as_i64()).map(|v| v as i32))
                .execute(&mut *tx)
                .await
                .map_err(from_sqlx_error)?;
            }
        }
    }

    tx.commit().await.map_err(from_sqlx_error)?;

    Ok(VilResponse::ok(serde_json::json!({
        "course_id": course_id,
        "title": title,
        "modules_count": modules.len(),
    })))
}

pub async fn delete_template_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    Path(template_id): Path<Uuid>,
) -> HandlerResult<NoContent> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("teacher")?;
    let result = sqlx::query(
        "DELETE FROM public.course_templates WHERE id=$1 AND tenant_id=$2",
    )
    .bind(template_id)
    .bind(rbac.ctx().tenant_id)
    .execute(&state.db)
    .await
    .map_err(from_sqlx_error)?;
    if result.rows_affected() == 0 {
        return Err(VilError::not_found("Template tidak ditemukan"));
    }
    Ok(NoContent)
}
