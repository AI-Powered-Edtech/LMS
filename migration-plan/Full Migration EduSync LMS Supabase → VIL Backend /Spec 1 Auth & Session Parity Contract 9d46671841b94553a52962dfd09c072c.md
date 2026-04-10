# Spec 1: Auth & Session Parity Contract

<aside>
🔑

**WAJIB BACA sebelum implement auth VIL (Phase 1B).** Dokumen ini mendefinisikan behavioral contract yang harus dipenuhi VIL auth agar 48 feature modules tetap berfungsi identik. Lulus "login works" TIDAK cukup — semua field, timing, dan side-effect harus match.

</aside>

---

# 1. AuthContextType Contract (25+ Fields)

Frontend `useAuth()` hook dipakai oleh **seluruh 48 feature modules**. VIL auth response harus menghasilkan state identik untuk semua field berikut:

## 1.1 Core Identity

| Field           | Type        | Source                                          | Contract                 |
| --------------- | ----------- | ----------------------------------------------- | ------------------------ |
| `user`          | `User \     | null`                                           | JWT decode + DB          |
| `session`       | `Session \  | null`                                           | Login/refresh response   |
| `profile`       | `Profile \  | null`                                           | `get_auth_bootstrap` RPC |
| `emailVerified` | `boolean`   | Derived from `user.email_confirmed_at !== null` | Must be reactive         |

## 1.2 Tenant & Role Resolution

| Field          | Type                 | Source                                 | Contract                                                                                            |
| -------------- | -------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `tenantId`     | `string \            | null`                                  | Active tenant from localStorage + validation                                                        |
| `memberships`  | `TenantMembership[]` | `get_auth_bootstrap` → `.memberships`  | Array of `{ tenant_id, tenant_name, tenant_logo, tenant_slug, role, status, is_active, joined_at }` |
| `activeTenant` | `Tenant \            | null`                                  | Derived from `memberships` • `tenantId`                                                             |
| `activeRole`   | `Role \              | null`                                  | From active membership                                                                              |
| `roles`        | `Role[]`             | All roles across memberships           | May have multiple                                                                                   |
| `role`         | `Role`               | `getPrimaryRole()` — highest privilege | Single primary role                                                                                 |
| `permissions`  | `Permissions`        | `getPermissions(role)`                 | Derived client-side from role                                                                       |

**⚠️ CRITICAL:** Role comes from `user_roles` table, NOT `profiles.role`.

## 1.3 Auth State Machine

| Field             | Type              | Values                                  | Contract                       |                       |
| ----------------- | ----------------- | --------------------------------------- | ------------------------------ | --------------------- |
| `loading`         | `boolean`         | true during auth operations             | Must match timing              |                       |
| `authStatus`      | `AuthStatus`      | `'initializing' \                       | 'callback_processing' \        | 'authenticated' \     |
| `workspaceStatus` | `WorkspaceStatus` | `'idle' \                               | 'loading' \                    | 'needs_onboarding' \  |
| `bootstrapReady`  | `boolean`         | true after profile + memberships loaded | Gates feature module rendering |                       |
| `sessionExpired`  | `boolean`         | true when refresh fails                 | Triggers toast + redirect      |                       |
| `authError`       | `string \         | null`                                   | Error message                  | Shown in UI           |

## 1.4 Auth Methods

| Method                               | Contract                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `signIn(email, password)`            | Return `AuthResponse` compatible shape. Set session + trigger bootstrap.          |
| `signUp(email, password, metadata?)` | Same as signIn + create user.                                                     |
| `signInWithGoogle()`                 | Redirect to OAuth → callback → set session.                                       |
| `signOut()`                          | **Clear React state FIRST**, then call backend. Clear localStorage keys (see §3). |
| `clearAuthError()`                   | Reset `authError` to null.                                                        |
| `refreshAuthBootstrap()`             | Re-call `get_auth_bootstrap`, update profile/memberships/tenant.                  |
| `hasRole(role)`                      | Check against `roles` array.                                                      |

---

# 2. `get_auth_bootstrap` RPC Contract

**This is the single most critical RPC for auth parity.** Called on every login and session refresh.

## Request

```
RPC: get_auth_bootstrap()
-- No parameters (uses JWT claims for user identity)
```

## Response Shape (MUST match exactly)

```tsx
interface AuthBootstrap {
  profile: {
    id: string // UUID
    email: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    tenant_id: string // UUID — default tenant
  }
  memberships: Array<{
    tenant_id: string
    tenant_name: string
    tenant_logo: string | null
    tenant_slug: string
    role: 'student' | 'teacher' | 'admin' | 'parent' | 'principal'
    status: string
    is_active: boolean
    joined_at: string // ISO-8601
  }>
  default_tenant_id: string // UUID
}
```

## VIL Implementation

```rust
// Must return IDENTICAL shape — frontend destructures this directly
#[get("/api/v1/auth/bootstrap")]
async fn get_auth_bootstrap(
    State(ctx): State<AppState>,
    claims: Claims,
) -> Result<Json<AuthBootstrap>, VilError> {
    // 1. Load profile from public.profiles WHERE id = claims.sub
    // 2. Load memberships from tenant_memberships JOIN tenants
    //    WHERE user_id = claims.sub
    //    Role from user_roles table, NOT profiles.role!
    // 3. Get default_tenant_id from profile or first active membership
}
```

## Parity Test

```tsx
// Golden test: call Supabase AND VIL, compare
const supabaseResult = await supabase.rpc('get_auth_bootstrap')
const vilResult = await fetch('/api/v1/auth/bootstrap', {
  headers: { Authorization: `Bearer ${jwt}` },
})
assert.deepStrictEqual(supabaseResult.data, await vilResult.json())
```

---

# 3. SignOut Side Effects Contract

Frontend `signOut()` performs these steps IN ORDER. VIL must not break any:

1. **Clear React state** (synchronous, before API call)
2. **Clear localStorage keys:**
   - `activeTenantId`
   - `pendingInviteToken`
   - `pendingJoinCode`
   - `pendingInviteRetryCount`
3. **Clear AI tutor sessions:**
   - All keys matching `ai_tutor_session_*`
4. **Call backend signout** (best-effort, after state cleared)
5. **Navigate to login page**

**VIL contract:** Backend `/api/v1/auth/signout` must:

- Invalidate refresh token in DB
- Return `204 No Content`
- NOT depend on request succeeding (frontend already cleared state)

---

# 4. Token Refresh Semantics

## Proactive Refresh

- **Interval:** Every `60_000ms` (60 seconds)
- **Condition:** If `session.expires_at - now() <= 300` seconds (5 minutes)
- **Action:** Call `/api/v1/auth/refresh` with refresh token
- **On success:** Update `session` with new tokens
- **On failure:** Set `sessionExpired = true`, show toast "Sesi Anda telah berakhir", redirect to login

## VIL Refresh Endpoint

```
POST /api/v1/auth/refresh
Body: { refresh_token: string }
Response: {
  access_token: string,
  refresh_token: string,  // Rotated
  expires_in: number,     // Seconds (3600)
  user: UserResponse
}
```

## Session Shape

```tsx
interface Session {
  access_token: string
  refresh_token: string
  expires_at: number // Unix timestamp (seconds)
  token_type: 'bearer'
  user: User
}
```

---

# 5. Routing Source-of-Truth Audit

<aside>
⚠️

**UNRESOLVED:** Codebase menunjukkan `BrowserRouter` tapi dokumentasi menyebut hash routing `/#/`. Ini HARUS di-resolve sebelum Phase 1B.

</aside>

## Audit Tasks (Execute Week 1 Phase 1)

- [ ] `grep -r 'HashRouter\|createHashRouter' src/` — ada hash router?
- [ ] `grep -r 'BrowserRouter\|createBrowserRouter' src/` — ada path router?
- [ ] Verify `window.location.pathname` vs `window.location.hash` di `useSessionManagement.ts`
- [ ] Verify OAuth callback: `redirectTo` di `signInWithOAuth` — path atau hash?
- [ ] Verify semua `navigate()` calls di auth flow
- [ ] Verify Nginx reverse proxy rules match actual router

## Decision

After audit, document:

- **Router type:** `BrowserRouter` / `HashRouter` / mixed
- **OAuth callback path:** exact URL
- **Post-login redirect:** exact URL
- **Post-signup redirect:** exact URL
- **Session expired redirect:** exact URL
- **All protected route patterns**

## Impact on Plan

If routing is **path-based** (likely based on `BrowserRouter` import):

- Remove all `/#/` references in plan
- VIL reverse proxy must handle path routes
- Service worker cache rules use path patterns
- OAuth callback at `/auth/callback` (not `/#/auth/callback`)

---

# 6. Tenant Switching Contract

## Flow

1. User selects tenant from dropdown
2. `setActiveTenant(tenantId)` called
3. `localStorage.activeTenantId` updated
4. `tenantId` validated against `memberships` from bootstrap
5. If invalid → fallback to `defaultTenantId`
6. If no default → show workspace selector (`workspaceStatus = 'needs_selection'`)
7. All React Query caches invalidated (key factories are tenant-scoped)

## VIL Contract

- Tenant switching is **client-side only** (no backend call)
- JWT `tenant_id` claim is set at login/refresh time
- VIL must accept requests where JWT `tenant_id` matches one of user's memberships
- All data queries must filter by `tenant_id` from JWT (TenantGuard middleware)

---

# 7. MFA Contract

## Enrollment Flow

1. `POST /api/v1/auth/mfa/enroll` → `{ factor_id, qr_code_base64, secret_uri, recovery_codes[] }`
2. User scans QR code in authenticator app
3. `POST /api/v1/auth/mfa/verify` with `{ factor_id, code }` → updated session with `mfa_verified: true`

## Login with MFA

1. Normal login → returns session WITHOUT `mfa_verified`
2. Frontend detects MFA enrolled → shows TOTP input
3. `POST /api/v1/auth/mfa/verify` → returns session WITH `mfa_verified: true`
4. Frontend proceeds with bootstrap

## Unenroll

- `DELETE /api/v1/auth/mfa/:factor_id` → removes factor, session downgraded

---

# 8. Error Response Shape Contract

All VIL auth endpoints must return errors in PostgREST-compatible format:

```tsx
interface AuthError {
  code: string // e.g. 'invalid_credentials', 'user_not_found'
  message: string // Human-readable (Bahasa Indonesia for UI-facing)
  details: string | null
  hint: string | null
}
```

Frontend `handleSupabaseError()` in `supabaseUtils.ts` depends on this exact shape.

---

# 9. Auth Parity Test Suite

Before passing Gate 2, these tests must ALL pass:

- [ ] Register → login → bootstrap → profile loaded
- [ ] Login → `AuthContextType` has all 25+ fields populated
- [ ] Token refresh at 5-min-before-expiry works
- [ ] Session expired → toast + redirect to login
- [ ] SignOut → all localStorage keys cleared
- [ ] Google OAuth → callback → session established
- [ ] MFA enroll → verify → login with MFA
- [ ] Tenant switching → React Query cache invalidated
- [ ] Role resolution → correct permissions
- [ ] `workspaceStatus` transitions: idle → loading → resolved
- [ ] `get_auth_bootstrap` response shape identical Supabase vs VIL
- [ ] Error response shape identical Supabase vs VIL
- [ ] 3 dev accounts (teacher/student/admin @[edusync.dev](http://edusync.dev)) login with password123
- [ ] Multi-tenant isolation: user A cannot see user B's data
- [ ] Flash unauthenticated state: no visible during OAuth callback processing
