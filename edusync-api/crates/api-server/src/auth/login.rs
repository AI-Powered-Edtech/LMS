use crate::extractors::IntoVilError;
use std::sync::Arc;
use uuid::Uuid;
use edusync_auth::{password::{verify_password, maybe_rehash}, session::create_session};
use vil_server::prelude::{ServiceCtx, ShmSlice, VilResponse, VilError, HandlerResult};
use crate::state::AppState;
use super::types::{LoginRequest, AuthResponse, TenantMembershipPayload, UserPayload};
use super::tenant_selection::{select_active_role, select_active_tenant};

pub async fn login_handler(
    svc: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<AuthResponse>> {
    let state = svc.state::<Arc<AppState>>()?.clone();
    let body: LoginRequest = body.json().map_err(|e| VilError::bad_request(e.to_string()))?;

    // Brute force check before any DB query
    if state.brute_force.is_locked(&body.email) {
        let mut err = VilError::rate_limited();
        err.detail = "Terlalu banyak percobaan, coba lagi nanti".to_string();
        return Err(err);
    }

    let user = sqlx::query!(
        r#"SELECT id, email, encrypted_password,
                  banned_until,
                  email_confirmed_at
           FROM public.users WHERE email = $1"#,
        body.email
    )
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
        let now_utc = time::OffsetDateTime::now_utc();
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

    let memberships_rows = sqlx::query!(
        r#"SELECT ur.role::text as "role!", ur.tenant_id, ur.created_at,
                  t.name as tenant_name, t.slug as tenant_slug,
                  NULL::text as tenant_logo
           FROM public.user_roles ur
           JOIN public.tenants t ON t.id = ur.tenant_id
           WHERE ur.user_id = $1
           ORDER BY ur.created_at ASC"#,
        user.id
    )
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
            joined_at: Some(
                m.created_at
                    .format(&time::format_description::well_known::Rfc3339)
                    .unwrap_or_default(),
            ),
        })
        .collect();

    let profile_tenant_id: Option<Uuid> = sqlx::query_scalar!(
        "SELECT tenant_id FROM public.profiles WHERE id = $1",
        user.id
    )
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
        let _ = sqlx::query!(
            r#"INSERT INTO public.profiles (id, email, first_name, last_name, tenant_id, created_at, updated_at)
               VALUES ($1, $2, '', '', $3, now(), now())
               ON CONFLICT (id) DO UPDATE
               SET tenant_id = EXCLUDED.tenant_id, updated_at = now()"#,
            user.id,
            user.email,
            active_tenant_id
        )
        .execute(&state.db)
        .await;
    }

    // Check MFA enrollment
    let mfa_enrolled: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM public.mfa_factors WHERE user_id = $1 AND status = 'verified')",
        user.id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = ?e, "DB error checking MFA");
        VilError::internal("Terjadi kesalahan pada database")
    })?
    .unwrap_or(false);

    let tokens = create_session(
        &state.db,
        user.id,
        &user.email,
        &active_role,
        Some(active_tenant_id),
        !mfa_enrolled,  // mfa_verified = true if no MFA enrolled
        &state.jwt_secret,
    )
    .await
    .map_err(IntoVilError::into_vil_error)?;

    // Successful login — clear brute force counter
    state.brute_force.record_success(&body.email);

    // Update last_sign_in_at
    let _ = sqlx::query!(
        "UPDATE public.users SET last_sign_in_at = now() WHERE id = $1",
        user.id
    )
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
