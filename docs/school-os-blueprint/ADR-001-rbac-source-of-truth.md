# ADR-001 — RBAC Source-of-Truth

**Status**: Accepted
**Date**: 2026-04-24
**Relates to**: 07-remaining-execution-plan.md U06.1, U06.2
**Deciders**: Operator session autonomous; open to override

## Context

Three role-related data structures exist in the schema, each populated and read by different code paths:

| Table | Shape | Writers | Readers |
|---|---|---|---|
| `public.user_roles` | `(user_id, tenant_id, role app_role ENUM)` | dev_seed, migration 046, registration | `rbac.rs` middleware (partial), RPC handlers |
| `public.tenant_memberships` | `(user_id, tenant_id, role TEXT, status)` | tenant_admin handlers, invitation redeem | auth bootstrap, tenant UI |
| `public.role_capabilities` | `(role TEXT, module TEXT, action TEXT, scope TEXT, is_granted)` | migration 046 | none wired yet |

Current `edusync-api/crates/middleware/src/rbac.rs` uses a hardcoded 6-role hierarchy (student/parent/teacher/reviewer/principal/admin) with simple linear privilege ordering. It does not consult any table.

`app_role` enum now has 12 values (post-migration 066): STUDENT, TEACHER, ADMIN, REVIEWER, WALI_KELAS, WAKASEK, GURU_BK, TU, YAYASAN, PENGAWAS, PRINCIPAL, PARENT.

**Problem**: with 3 possible authoritative sources and no decision, subsequent work (U06.2 `rbac_policy.yaml`, U06.3 middleware, U06.4 scope checks) will drift.

## Decision

**Authoritative source = `user_roles` enum (multi-value per user per tenant).**

`tenant_memberships.role` is **DEPRECATED** for authorization checks — kept only for membership lifecycle (status=active/invited/removed) and display.

`role_capabilities` is **promoted** to the policy matrix source — loaded into memory at server boot, queried at middleware to answer "does role X allow action Y on module Z with scope W?"

## Rationale

1. **Enum over text**: `user_roles.role app_role` enforces domain integrity at DB level. `tenant_memberships.role TEXT` allows typos (`TEACHER` vs `teacher` vs `Teacher`) that have already caused bugs (U04 dev_seed case sensitivity).
2. **Multi-role per user**: `user_roles` is a table (many-to-one), allowing 1 user to have multiple roles (a teacher can also be wali_kelas and wakasek kurikulum). `tenant_memberships` is effectively 1 row per (tenant, user).
3. **Capabilities table future-proofs policy**: adding a new module/action doesn't require code change — just insert rows. In-memory cache refreshes on SIGHUP or periodic poll.
4. **Minimal migration burden**: existing handlers already often query `user_roles`; shift is one-way.

## Consequences

### Positive
- Clear contract for all future RBAC code
- Per-tenant per-user multi-role supported (wali_kelas + teacher simultaneously)
- Policy matrix changes deploy as data, not code
- Dev school seed already populates `user_roles` correctly

### Negative
- `tenant_memberships.role` becomes legacy/read-only; requires audit to find any write site that still uses it as authz source
- `rbac.rs` needs rewrite: replace `ROLE_ORDER` hierarchy with policy-based check
- Every handler currently checking `ctx.role` (single string from middleware) needs upgrade to "has any of these roles" pattern

### Neutral
- `app_role` enum maintenance: adding new role = migration. Low frequency event.

## Implementation plan (handed off to U06.2, U06.3)

### U06.2 — `rbac_policy.yaml`
- File at `edusync-api/config/rbac_policy.yaml`
- Each entry: `{ module, action, scope, roles: [] }`
- Shipped as code (version-controlled), loaded at boot
- Covers top 30 endpoints initially; grow incrementally

### U06.3 — Middleware refactor (rbac.rs)
- Replace `role_has_permission(user_role, required_role)` with `role_allows(user_roles[], module, action, scope)`
- Load policy at boot; `watch` for SIGHUP
- Extractor change: `AuthedRequest.roles: Vec<String>` (not single string)

### U06.4 — Scope predicates
- Policy entries can specify scope: `self`, `rombel`, `tenant`, `foundation`
- Middleware resolves scope at request: e.g. `rombel` → cross-check if resource's rombel_id is in user's wali_kelas assignments
- Default scope `tenant` for backward compat

### Migration path for data
1. Audit `tenant_memberships.role` values in production — ensure all users have corresponding `user_roles` entries
2. Add PG trigger: on `tenant_memberships` insert/update, sync to `user_roles`
3. Deprecate write to `tenant_memberships.role` in next release
4. Remove column in release+2

## Open questions (not blocking)

- Policy override per-tenant? (enterprise tenants might want custom capabilities beyond global matrix). Defer until real need.
- Role inheritance? (E.g. admin "inherits" principal+wakasek+teacher capabilities). Decision: NO inheritance — explicit grants in capabilities table.
- Revocation time: how fast can a role revoke take effect? Current: depends on JWT TTL. Decision: acceptable for now; add `role_version` in claims for instant revocation later.

## Revocability

Reversible: if this decision turns out wrong, `tenant_memberships.role` still exists and can be re-promoted. Code changes in rbac.rs + extractors are isolated to middleware crate. Policy YAML can be swapped back for hardcoded matrix in `rbac.rs`.
