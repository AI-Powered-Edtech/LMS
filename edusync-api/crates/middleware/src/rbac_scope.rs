//! RBAC scope resolver — Workstream A1, shadow-only.
//!
//! Where `rbac_policy.rs` answers "is this *role* allowed for this route?",
//! the scope resolver answers the next question: "is this user allowed for
//! the *specific resource* the request is touching?".
//!
//! Currently produces verdicts but does NOT block. Verdicts are logged at
//! `target = "rbac_scope"` so we can audit drift before flipping enforcement.
//!
//! Scopes:
//! - `public`     — no scope check; anyone with the right role passes.
//! - `tenant`     — actor.tenant_id must equal resource.tenant_id.
//! - `self`       — actor.user_id must equal resource.user_id (e.g. `/me`,
//!                  parent reading own child is `rombel` not `self`).
//! - `rombel`     — actor must be wali_kelas of the rombel that contains
//!                  the resource's student, OR principal/admin tenant-wide,
//!                  OR a teacher who teaches a course for that rombel.
//! - `foundation` — actor must belong to the foundation/yayasan that owns
//!                  the resource's tenant. Reserved; verdict = Unmatched
//!                  until foundation membership table lands.
//!
//! ### Why shadow-only
//! Real-world endpoints don't yet pass enough resource metadata for a hard
//! verdict on every route. Until A2 (matrix E2E) confirms `unmatched = 0`
//! for the canonical persona x endpoint matrix, denying live traffic on
//! `Verdict::Deny` would lock out legitimate users. Shadow logs surface the
//! gaps; A3 flips low-risk modules first (finance / BK / audit / admin).

use sqlx::PgPool;
use uuid::Uuid;

use crate::tenant::TenantContext;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScopeVerdict {
    Allow,
    Deny,
    /// Cannot decide — required resource metadata not available, OR resolver
    /// for this scope kind is not implemented yet. Treated as "do nothing"
    /// in shadow mode; A3 hard-enforce paths must treat this as Deny for
    /// the modules they cover.
    Unmatched,
}

/// Identifies the resource a request is touching, to the extent the handler
/// can declare it. All fields are optional — the resolver picks the
/// strongest signal available.
#[derive(Debug, Clone, Default)]
pub struct ResourceRef {
    pub tenant_id: Option<Uuid>,
    pub owner_user_id: Option<Uuid>,
    pub student_id: Option<Uuid>,
    pub rombel_id: Option<Uuid>,
}

/// Tenant-wide bypass roles. Members allow on any same-tenant resource.
const TENANT_WIDE_ROLES: &[&str] = &["admin", "principal", "kepsek", "yayasan", "pengawas"];

fn has_role(ctx: &TenantContext, role: &str) -> bool {
    let needle = role.to_ascii_lowercase();
    ctx.roles.iter().any(|r| r.to_ascii_lowercase() == needle)
}

fn has_any_role(ctx: &TenantContext, roles: &[&str]) -> bool {
    roles.iter().any(|r| has_role(ctx, r))
}

/// Public scope: trivially allow.
pub fn resolve_public() -> ScopeVerdict {
    ScopeVerdict::Allow
}

/// Tenant scope: same tenant_id wins.
pub fn resolve_tenant(ctx: &TenantContext, res: &ResourceRef) -> ScopeVerdict {
    match res.tenant_id {
        Some(t) if t == ctx.tenant_id => ScopeVerdict::Allow,
        Some(_) => ScopeVerdict::Deny,
        None => ScopeVerdict::Unmatched,
    }
}

/// Self scope: actor must be the resource owner. Tenant-wide roles bypass.
pub fn resolve_self(ctx: &TenantContext, res: &ResourceRef) -> ScopeVerdict {
    if has_any_role(ctx, TENANT_WIDE_ROLES) {
        return ScopeVerdict::Allow;
    }
    match res.owner_user_id {
        Some(u) if u == ctx.user_id => ScopeVerdict::Allow,
        Some(_) => ScopeVerdict::Deny,
        None => ScopeVerdict::Unmatched,
    }
}

/// Rombel scope: wali_kelas of resource's rombel, OR teacher teaching a
/// course in that rombel, OR tenant-wide bypass. `guru_bk` is allowed only
/// for counseling/struggle-alert paths — caller filters by route prefix.
pub async fn resolve_rombel(
    pool: &PgPool,
    ctx: &TenantContext,
    res: &ResourceRef,
) -> ScopeVerdict {
    if has_any_role(ctx, TENANT_WIDE_ROLES) {
        return ScopeVerdict::Allow;
    }

    let rombel_id = match resolve_rombel_id(pool, res).await {
        Some(id) => id,
        None => return ScopeVerdict::Unmatched,
    };

    // Wali kelas of this rombel?
    if has_role(ctx, "wali_kelas") {
        let row: Result<Option<(Uuid,)>, _> = sqlx::query_as(
            "SELECT id FROM public.rombel \
             WHERE id = $1 AND wali_kelas_id = $2 AND tenant_id = $3",
        )
        .bind(rombel_id)
        .bind(ctx.user_id)
        .bind(ctx.tenant_id)
        .fetch_optional(pool)
        .await;
        if matches!(row, Ok(Some(_))) {
            return ScopeVerdict::Allow;
        }
    }

    // Teacher of any class linked to this rombel?
    if has_role(ctx, "teacher") {
        let row: Result<Option<(Uuid,)>, _> = sqlx::query_as(
            "SELECT id FROM public.classes \
             WHERE rombel_id = $1 AND teacher_id = $2 AND tenant_id = $3 \
             LIMIT 1",
        )
        .bind(rombel_id)
        .bind(ctx.user_id)
        .bind(ctx.tenant_id)
        .fetch_optional(pool)
        .await;
        if matches!(row, Ok(Some(_))) {
            return ScopeVerdict::Allow;
        }
    }

    ScopeVerdict::Deny
}

async fn resolve_rombel_id(pool: &PgPool, res: &ResourceRef) -> Option<Uuid> {
    if let Some(id) = res.rombel_id {
        return Some(id);
    }
    if let Some(student_id) = res.student_id {
        let row: Result<Option<(Uuid,)>, _> = sqlx::query_as(
            "SELECT rombel_id FROM public.rombel_members \
             WHERE student_id = $1 AND left_at IS NULL \
             ORDER BY joined_at DESC LIMIT 1",
        )
        .bind(student_id)
        .fetch_optional(pool)
        .await;
        if let Ok(Some((id,))) = row {
            return Some(id);
        }
    }
    None
}

/// Foundation scope: reserved. Returns Unmatched until membership table exists.
pub fn resolve_foundation(_ctx: &TenantContext, _res: &ResourceRef) -> ScopeVerdict {
    ScopeVerdict::Unmatched
}

/// Top-level dispatch by scope name (matches `rbac_policy.yaml` `scope:` field).
pub async fn evaluate(
    pool: &PgPool,
    scope: &str,
    ctx: &TenantContext,
    res: &ResourceRef,
) -> ScopeVerdict {
    match scope {
        "public" => resolve_public(),
        "tenant" => resolve_tenant(ctx, res),
        "self" => resolve_self(ctx, res),
        "rombel" => resolve_rombel(pool, ctx, res).await,
        "foundation" => resolve_foundation(ctx, res),
        _ => ScopeVerdict::Unmatched,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ctx_with(roles: &[&str], user_id: Uuid, tenant_id: Uuid) -> TenantContext {
        TenantContext {
            user_id,
            tenant_id,
            role: roles.first().map(|r| r.to_string()).unwrap_or_default(),
            roles: roles.iter().map(|r| r.to_string()).collect(),
            email: "x@y.z".into(),
        }
    }

    #[test]
    fn tenant_scope_allow_same_tenant() {
        let t = Uuid::new_v4();
        let ctx = ctx_with(&["teacher"], Uuid::new_v4(), t);
        let res = ResourceRef { tenant_id: Some(t), ..Default::default() };
        assert_eq!(resolve_tenant(&ctx, &res), ScopeVerdict::Allow);
    }

    #[test]
    fn tenant_scope_deny_cross_tenant() {
        let ctx = ctx_with(&["teacher"], Uuid::new_v4(), Uuid::new_v4());
        let res = ResourceRef { tenant_id: Some(Uuid::new_v4()), ..Default::default() };
        assert_eq!(resolve_tenant(&ctx, &res), ScopeVerdict::Deny);
    }

    #[test]
    fn tenant_scope_unmatched_when_no_resource_tenant() {
        let ctx = ctx_with(&["teacher"], Uuid::new_v4(), Uuid::new_v4());
        let res = ResourceRef::default();
        assert_eq!(resolve_tenant(&ctx, &res), ScopeVerdict::Unmatched);
    }

    #[test]
    fn self_scope_owner_allowed() {
        let u = Uuid::new_v4();
        let ctx = ctx_with(&["student"], u, Uuid::new_v4());
        let res = ResourceRef { owner_user_id: Some(u), ..Default::default() };
        assert_eq!(resolve_self(&ctx, &res), ScopeVerdict::Allow);
    }

    #[test]
    fn self_scope_admin_bypass() {
        let ctx = ctx_with(&["admin"], Uuid::new_v4(), Uuid::new_v4());
        let res = ResourceRef { owner_user_id: Some(Uuid::new_v4()), ..Default::default() };
        assert_eq!(resolve_self(&ctx, &res), ScopeVerdict::Allow);
    }

    #[test]
    fn self_scope_denies_other_user() {
        let ctx = ctx_with(&["student"], Uuid::new_v4(), Uuid::new_v4());
        let res = ResourceRef { owner_user_id: Some(Uuid::new_v4()), ..Default::default() };
        assert_eq!(resolve_self(&ctx, &res), ScopeVerdict::Deny);
    }
}
