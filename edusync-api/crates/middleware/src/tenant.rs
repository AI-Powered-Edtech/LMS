use uuid::Uuid;

/// Validated request context extracted from a verified JWT.
///
/// Guarantees `user_id` and `tenant_id` are present and valid UUIDs.
/// Obtain this in a handler by declaring it as a parameter — the `FromRequestParts`
/// implementation lives in `api-server/src/extractors.rs` where `AppState` is available.
#[derive(Debug, Clone)]
pub struct TenantContext {
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub role: String,
    pub email: String,
}
