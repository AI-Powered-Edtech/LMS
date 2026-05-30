use crate::extractors::IntoVilError;
use std::sync::Arc;
use uuid::Uuid;
use edusync_auth::{password::{verify_password, maybe_rehash}, session::create_session};
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use super::types::{LoginRequest, AuthResponse, TenantMembershipPayload, UserPayload, Validatable};
use super::tenant_selection::{select_active_role, select_active_tenant};

#[derive(sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    email: String,
    encrypted_password: Option<String>,
    banned_until: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(sqlx::FromRow)]
struct MembershipRow {
    role: String,
    tenant_id: Uuid,
    created_at: chrono::DateTime<chrono::Utc>,
    tenant_name: String,
    tenant_slug: String,
    tenant_logo: Option<String>,
}

pub async fn login_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<AuthResponse>> {
    let state = svc.state::<AppState>().map(|s| Arc::new(s.clone()))?;
    let body: LoginRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    body.validate().map_err(|e| VilError::bad_request(e))?;

    // Brute force check before any DB query
    if state.brute_force.is_locked(&body.email) {
        let mut err = VilError::rate_limited();
        err.detail = "Terlalu banyak percobaan, coba lagi nanti".to_string();
        return Err(err);
    }

    let user: UserRow = sqlx::query_as::<_, UserRow>(
        r#"SELECT id, email, encrypted_password,
                  banned_until
           FROM public.users WHERE email = $1"#,
    )
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error in login");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .ok_or_else(|| {
        state.brute_force.record_failure(&body.email);
        VilError::bad_request("Email atau password salah")
    })?;

    // Cek banned
    if let Some(banned_until) = user.banned_until {
        let now_utc = chrono::Utc::now();
        if banned_until > now_utc {
            return Err(VilError::forbidden("Akun diblokir"));
        }
    }

    let hash = user.encrypted_password.as_deref().unwrap_or("");
    if !verify_password(&body.password, hash)
        .map_err(|e| VilError::internal(format!("Password verify error: {e}")))?
    {
        state.brute_force.record_failure(&body.email);
        return Err(VilError::bad_request("Email atau password salah"));
    }

    // Rehash bcrypt → argon2 async (don't block response)
    let pool = state.db.clone();
    let user_id = user.id;
    let plain = body.password.clone();
    let hash_clone = hash.to_string();
    tokio::spawn(async move {
        let _ = maybe_rehash(&pool, user_id, &plain, &hash_clone).await;
    });

    let memberships_rows: Vec<MembershipRow> = sqlx::query_as::<_, MembershipRow>(
        r#"SELECT ur.role::text as role, ur.tenant_id, ur.created_at,
                  t.name as tenant_name, t.slug as tenant_slug,
                  NULL::text as tenant_logo
           FROM public.user_roles ur
           JOIN public.tenants t ON t.id = ur.tenant_id
           WHERE ur.user_id = $1
           ORDER BY ur.created_at ASC"#,
    )
    .bind(user.id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching memberships");
        VilError::internal("Terjadi kesalahan pada database")
    })?;

    if memberships_rows.is_empty() {
        return Err(VilError::forbidden("Pengguna belum terdaftar pada tenant mana pun"));
    }

    let memberships: Vec<TenantMembershipPayload> = memberships_rows
        .iter()
        .map(|m| TenantMembershipPayload {
            tenant_id: m.tenant_id,
            tenant_name: m.tenant_name.clone(),
            tenant_slug: m.tenant_slug.clone(),
            tenant_logo: m.tenant_logo.clone(),
            role: m.role.to_lowercase(),
            status: "active".to_string(),
            is_active: true,
            joined_at: Some(m.created_at.to_rfc3339()),
        })
        .collect();

    let profile_tenant_id: Option<Uuid> =
        sqlx::query_scalar("SELECT tenant_id FROM public.profiles WHERE id = $1")
            .bind(user.id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error fetching profile tenant_id");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .flatten();

    let active_tenant_id = select_active_tenant(profile_tenant_id, &memberships);
    let active_role = select_active_role(active_tenant_id, &memberships);

    if profile_tenant_id != Some(active_tenant_id) {
        let _ = sqlx::query(
            r#"INSERT INTO public.profiles (id, email, first_name, last_name, tenant_id, created_at, updated_at)
               VALUES ($1, $2, '', '', $3, now(), now())
               ON CONFLICT (id) DO UPDATE
               SET tenant_id = EXCLUDED.tenant_id, updated_at = now()"#,
        )
        .bind(user.id)
        .bind(&user.email)
        .bind(active_tenant_id)
        .execute(&state.db)
        .await;
    }

    // Check MFA enrollment
    let mfa_enrolled: bool = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM public.mfa_factors WHERE user_id = $1 AND status = 'verified')",
    )
    .bind(user.id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error checking MFA");
        VilError::internal("Terjadi kesalahan pada database")
    })?;

    let tokens = create_session(
        &state.db,
        user.id,
        &user.email,
        &active_role,
        Some(active_tenant_id),
        !mfa_enrolled,  // mfa_verified = true if no MFA enrolled
    )
    .await
    .map_err(IntoVilError::into_vil_error)?;

    // Successful login — clear brute force counter
    state.brute_force.record_success(&body.email);

    // Update last_sign_in_at
    let _ = sqlx::query("UPDATE public.users SET last_sign_in_at = now() WHERE id = $1")
        .bind(user.id)
        .execute(&state.db)
        .await;

    Ok(VilResponse::ok(AuthResponse {
        access_token: tokens.access_token,
        token_type: "bearer".to_string(),
        expires_in: 3600,
        refresh_token: tokens.refresh_token,
        user: UserPayload {
            id: user.id,
            email: user.email,
            role: active_role,
            tenant_id: Some(active_tenant_id),
        },
        active_tenant_id: Some(active_tenant_id),
        memberships,
    }))
}
