use uuid::Uuid;

/// Validated request context extracted from a verified JWT.
///
/// Guarantees `user_id` and `tenant_id` are present and valid UUIDs.
/// Obtain this in a handler by declaring it as a parameter — the `FromRequestParts`
/// implementation lives in `api-server/src/extractors.rs` where `AppState` is available.
///
/// `role` is the legacy single role from the JWT claims (kept for backward
/// compatibility with handlers that still gate on a single role string).
/// `roles` is the authoritative multi-role vector loaded from
/// `public.user_roles` per Workstream A0; policy evaluation MUST prefer
/// `roles` so that a user with `TEACHER + WALI_KELAS` can satisfy any policy
/// entry listing either role.
#[derive(Debug, Clone)]
pub struct TenantContext {
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub role: String,
    pub roles: Vec<String>,
    pub email: String,
}
