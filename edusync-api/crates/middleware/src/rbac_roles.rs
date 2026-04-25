//! Multi-role loader for RBAC (Workstream A0).
//!
//! Loads the *current set* of roles a user holds in a tenant from
//! `public.user_roles`. The result populates `TenantContext.roles`, which
//! the policy evaluator consumes — replacing the legacy single-role `ctx.role`
//! evaluation. `ctx.role` is preserved for backward compatibility with older
//! handlers that still gate on a string.
//!
//! ## Failure mode
//!
//! - DB pool not initialised → fall back to `vec![claims.role]` and log
//!   `rbac_roles_fallback`. Shadow mode keeps logging the verdict; nothing
//!   blocks.
//! - Query error → same fallback. The user does not get locked out because
//!   of a transient DB issue mid-request.
//! - Empty result (user_roles row missing) → fall back to `vec![claims.role]`
//!   so the JWT-derived role is at least present. Logged so seed drift is
//!   visible.

use once_cell::sync::OnceCell;
use sqlx::PgPool;
use uuid::Uuid;

static DB_POOL: OnceCell<PgPool> = OnceCell::new();

/// Initialise the global DB pool used by request extractors. Idempotent —
/// only the first call wins. Call this once from `main.rs` after the pool
/// is created.
pub fn init_db_pool(pool: PgPool) {
    let _ = DB_POOL.set(pool);
}

pub fn db_pool() -> Option<&'static PgPool> {
    DB_POOL.get()
}

/// Load all roles the user currently holds in the given tenant.
///
/// Returns an empty `Vec` when the pool is uninitialised or the query fails;
/// callers should merge with the JWT-derived single role to guarantee at
/// least one role is present.
pub async fn load_roles(user_id: Uuid, tenant_id: Uuid) -> Vec<String> {
    let Some(pool) = DB_POOL.get() else {
        tracing::warn!(
            target: "rbac_roles_fallback",
            %user_id, %tenant_id,
            reason = "db_pool_not_initialised",
            "rbac_roles_fallback"
        );
        return Vec::new();
    };

    let result: Result<Vec<(String,)>, sqlx::Error> = sqlx::query_as(
        "SELECT role::text FROM public.user_roles \
         WHERE user_id = $1 AND tenant_id = $2",
    )
    .bind(user_id)
    .bind(tenant_id)
    .fetch_all(pool)
    .await;

    match result {
        Ok(rows) => rows.into_iter().map(|(r,)| r).collect(),
        Err(e) => {
            tracing::warn!(
                target: "rbac_roles_fallback",
                %user_id, %tenant_id,
                error = %e,
                "rbac_roles_fallback"
            );
            Vec::new()
        }
    }
}

/// Merge the JWT single role with the DB-loaded role vector. Guarantees the
/// returned vector contains at least the JWT role and is de-duplicated
/// (case-insensitive: lower-case canonical form).
pub fn merge_roles(jwt_role: &str, db_roles: Vec<String>) -> Vec<String> {
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut out: Vec<String> = Vec::with_capacity(db_roles.len() + 1);

    let mut push = |r: String| {
        let key = r.to_ascii_lowercase();
        if !key.is_empty() && seen.insert(key) {
            out.push(r);
        }
    };

    push(jwt_role.to_string());
    for r in db_roles {
        push(r);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn merge_dedupes_case_insensitive() {
        let merged = merge_roles("teacher", vec!["TEACHER".into(), "wali_kelas".into()]);
        assert_eq!(merged.len(), 2);
        assert_eq!(merged[0], "teacher");
        assert_eq!(merged[1], "wali_kelas");
    }

    #[test]
    fn merge_preserves_jwt_role_when_db_empty() {
        let merged = merge_roles("admin", vec![]);
        assert_eq!(merged, vec!["admin"]);
    }

    #[test]
    fn merge_keeps_extra_db_roles() {
        let merged = merge_roles(
            "teacher",
            vec!["wali_kelas".into(), "guru_bk".into()],
        );
        assert_eq!(merged, vec!["teacher", "wali_kelas", "guru_bk"]);
    }
}
