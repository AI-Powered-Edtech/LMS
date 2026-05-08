//! Tenant-level invite management (P2.2 & P2.8).
//!
//! Ekstensi di atas `tenant_invites` + RPC `redeem_tenant_invite`:
//! - POST /api/v1/tenant-invites — admin buat invite (opsional `email`, `class_id`,
//!   `expires_in_hours`). Jika `email` diisi, kita mencoba dispatch email via
//!   SMTP (jika dikonfigurasi); gagal SMTP tidak menghapus invite — kode tetap
//!   valid dan bisa dibagikan manual.
//! - GET /api/v1/tenant-invites — list invite milik tenant aktif.
//! - DELETE /api/v1/tenant-invites/:id — cabut invite (hanya yang belum dipakai).
//!
//! Catatan: dispatch email sengaja dibuat best-effort. Jika SMTP tidak tersedia,
//! response tetap 201 dengan field `email_dispatched=false` — frontend bisa
//! menampilkan kode invite supaya admin bisa copy manual.

use edusync_middleware::errors::from_sqlx_error;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;
use vil_server::prelude::{HandlerResult, NoContent, ServiceCtx, ShmSlice, VilError, VilResponse};

use crate::{
    extractors::{AuthedRequest, RbacGuard},
    state::AppState,
};

#[derive(Deserialize)]
pub struct CreateInviteRequest {
    /// 'TEACHER' (default), 'STUDENT', atau 'ADMIN'.
    pub role: Option<String>,
    pub email: Option<String>,
    pub class_id: Option<Uuid>,
    pub expires_in_hours: Option<i64>,
}

#[derive(Serialize)]
pub struct InviteResponse {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub code: String,
    pub role: String,
    pub email: Option<String>,
    pub class_id: Option<Uuid>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub used_at: Option<chrono::DateTime<chrono::Utc>>,
    pub used_by: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub email_dispatched: bool,
}

fn generate_invite_code() -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    use uuid::Uuid;
    let raw = Uuid::new_v4().as_bytes().to_vec();
    let mut out = String::with_capacity(9);
    for (i, byte) in raw.iter().take(9).enumerate() {
        out.push(ALPHABET[(*byte as usize + i) % ALPHABET.len()] as char);
    }
    out
}

/// P3.2: best-effort email dispatch via lettre SMTP.
///
/// Behaviour:
/// - Jika `SMTP_HOST` kosong / tidak di-set → log-only (untuk dev/CI tetap deterministik).
/// - Jika host terisi tapi connect/send gagal → log error + return false, tidak menggagalkan request.
/// - Username/password opsional (mendukung relay tanpa auth seperti mailhog).
async fn try_dispatch_invite_email(
    state: &AppState,
    email: &str,
    code: &str,
    role: &str,
) -> bool {
    use lettre::message::header::ContentType;
    use lettre::transport::smtp::authentication::Credentials;
    use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

    let smtp = &state.smtp;
    let host = match smtp.host.as_deref() {
        Some(h) if !h.is_empty() => h.to_string(),
        _ => {
            tracing::warn!(
                target: "edusync_api_server::tenant_invites",
                email = %email,
                "SMTP belum dikonfigurasi — invite email di-skip (best-effort)"
            );
            return false;
        }
    };
    if smtp.from_email.is_empty() {
        tracing::warn!(
            target: "edusync_api_server::tenant_invites",
            email = %email,
            "SMTP from_email kosong — invite email di-skip"
        );
        return false;
    }

    let from: lettre::message::Mailbox = match smtp.from_email.parse() {
        Ok(m) => m,
        Err(e) => {
            tracing::error!(
                target: "edusync_api_server::tenant_invites",
                err = %e,
                from = %smtp.from_email,
                "SMTP from_email tidak valid"
            );
            return false;
        }
    };
    let to: lettre::message::Mailbox = match email.parse() {
        Ok(m) => m,
        Err(e) => {
            tracing::warn!(
                target: "edusync_api_server::tenant_invites",
                err = %e,
                to = %email,
                "Alamat email invite tidak valid"
            );
            return false;
        }
    };

    let subject = format!("Undangan bergabung di EduSync ({role})");
    let body_text = format!(
        "Halo!\n\nAnda diundang bergabung di EduSync sebagai {role}.\n\n\
         Kode undangan: {code}\n\n\
         Buka aplikasi EduSync lalu masukkan kode ini pada halaman \"Gabung Tenant\".\n\n\
         Jika Anda tidak mengenali undangan ini, abaikan email ini.\n"
    );
    let msg = match Message::builder()
        .from(from)
        .to(to)
        .subject(subject)
        .header(ContentType::TEXT_PLAIN)
        .body(body_text)
    {
        Ok(m) => m,
        Err(e) => {
            tracing::error!(
                target: "edusync_api_server::tenant_invites",
                err = %e,
                "Gagal membangun pesan invite"
            );
            return false;
        }
    };

    let default_port: u16 = if smtp.implicit_tls { 465 } else { 587 };
    let port = if smtp.port == 0 { default_port } else { smtp.port };
    let build_result = if smtp.implicit_tls {
        AsyncSmtpTransport::<Tokio1Executor>::relay(&host)
    } else {
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&host)
    };
    let builder = match build_result {
        Ok(b) => b.port(port),
        Err(e) => {
            tracing::error!(
                target: "edusync_api_server::tenant_invites",
                err = %e,
                host = %host,
                "Gagal inisialisasi relay SMTP"
            );
            return false;
        }
    };
    let transport = match (&smtp.username, &smtp.password) {
        (Some(u), Some(p)) if !u.is_empty() && !p.is_empty() => {
            builder.credentials(Credentials::new(u.clone(), p.clone())).build()
        }
        _ => builder.build(),
    };

    match transport.send(msg).await {
        Ok(_) => {
            tracing::info!(
                target: "edusync_api_server::tenant_invites",
                flow = "invite.email.dispatch",
                to = %email,
                code = %code,
                role = %role,
                smtp_host = %host,
                "invite_email_sent"
            );
            true
        }
        Err(e) => {
            tracing::error!(
                target: "edusync_api_server::tenant_invites",
                err = %e,
                to = %email,
                smtp_host = %host,
                "invite_email_failed"
            );
            false
        }
    }
}

pub async fn create_tenant_invite_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    body: ShmSlice,
) -> HandlerResult<VilResponse<InviteResponse>> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("admin")?;

    let body: CreateInviteRequest = body
        .json()
        .unwrap_or(CreateInviteRequest {
            role: None,
            email: None,
            class_id: None,
            expires_in_hours: None,
        });

    let role = body
        .role
        .unwrap_or_else(|| "TEACHER".to_string())
        .to_uppercase();
    if !matches!(role.as_str(), "TEACHER" | "STUDENT" | "ADMIN") {
        return Err(VilError::bad_request(
            "role harus salah satu dari TEACHER, STUDENT, ADMIN",
        ));
    }

    let tenant_id = rbac.ctx().tenant_id;
    let created_by = rbac.ctx().user_id;
    let code = generate_invite_code();
    let expires_at = body
        .expires_in_hours
        .map(|h| chrono::Utc::now() + chrono::Duration::hours(h));

    // Validasi class_id kalau diisi: harus milik tenant aktif.
    if let Some(class_id) = body.class_id {
        let class_tenant: Option<Uuid> =
            sqlx::query_scalar("SELECT tenant_id FROM public.classes WHERE id = $1")
                .bind(class_id)
                .fetch_optional(&state.db)
                .await
                .map_err(from_sqlx_error)?;
        match class_tenant {
            None => return Err(VilError::bad_request("class_id tidak ditemukan")),
            Some(t) if t != tenant_id => {
                return Err(VilError::forbidden("class_id bukan milik tenant Anda"))
            }
            _ => {}
        }
    }

    let row = sqlx::query(
        r#"INSERT INTO public.tenant_invites
               (tenant_id, code, role, email, class_id, created_by, expires_at)
           VALUES ($1, $2, $3::app_role, $4, $5, $6, $7)
           RETURNING id, tenant_id, code, role::text AS role, email, class_id,
                     expires_at, used_at, used_by, created_at"#,
    )
    .bind(tenant_id)
    .bind(&code)
    .bind(&role)
    .bind(body.email.as_deref())
    .bind(body.class_id)
    .bind(created_by)
    .bind(expires_at)
    .fetch_one(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    let mut email_dispatched = false;
    if let Some(email) = body.email.as_deref() {
        email_dispatched = try_dispatch_invite_email(&state, email, &code, &role).await;
    }

    Ok(VilResponse::ok(InviteResponse {
        id: row.try_get("id").map_err(from_sqlx_error)?,
        tenant_id: row.try_get("tenant_id").map_err(from_sqlx_error)?,
        code: row.try_get("code").map_err(from_sqlx_error)?,
        role: row.try_get("role").map_err(from_sqlx_error)?,
        email: row.try_get("email").ok(),
        class_id: row.try_get("class_id").ok(),
        expires_at: row.try_get("expires_at").ok(),
        used_at: row.try_get("used_at").ok(),
        used_by: row.try_get("used_by").ok(),
        created_at: row.try_get("created_at").map_err(from_sqlx_error)?,
        email_dispatched,
    }))
}

pub async fn list_tenant_invites_handler(
    svc: ServiceCtx,
    AuthedRequest(ctx): AuthedRequest,
) -> HandlerResult<VilResponse<Vec<InviteResponse>>> {
    let state = svc.state::<AppState>()?.clone();
    let rows = sqlx::query(
        r#"SELECT id, tenant_id, code, role::text AS role, email, class_id,
                  expires_at, used_at, used_by, created_at
             FROM public.tenant_invites
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 200"#,
    )
    .bind(ctx.tenant_id)
    .fetch_all(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    let list = rows
        .into_iter()
        .map(|row| InviteResponse {
            id: row.try_get("id").unwrap_or_default(),
            tenant_id: row.try_get("tenant_id").unwrap_or_default(),
            code: row.try_get("code").unwrap_or_default(),
            role: row.try_get("role").unwrap_or_default(),
            email: row.try_get("email").ok(),
            class_id: row.try_get("class_id").ok(),
            expires_at: row.try_get("expires_at").ok(),
            used_at: row.try_get("used_at").ok(),
            used_by: row.try_get("used_by").ok(),
            created_at: row
                .try_get("created_at")
                .unwrap_or_else(|_| chrono::Utc::now()),
            email_dispatched: false,
        })
        .collect();
    Ok(VilResponse::ok(list))
}

pub async fn revoke_tenant_invite_handler(
    svc: ServiceCtx,
    rbac: RbacGuard,
    axum::extract::Path(invite_id): axum::extract::Path<Uuid>,
) -> HandlerResult<NoContent> {
    let state = svc.state::<AppState>()?.clone();
    rbac.require("admin")?;

    let result = sqlx::query(
        r#"DELETE FROM public.tenant_invites
            WHERE id = $1 AND tenant_id = $2 AND used_at IS NULL"#,
    )
    .bind(invite_id)
    .bind(rbac.ctx().tenant_id)
    .execute(&state.db)
    .await
    .map_err(from_sqlx_error)?;

    if result.rows_affected() == 0 {
        return Err(VilError::not_found(
            "Invite tidak ditemukan atau sudah digunakan",
        ));
    }
    Ok(NoContent)
}
