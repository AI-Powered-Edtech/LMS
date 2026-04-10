# Gap Analysis & Codebase Findings dari Deep Dive

<aside>
⚠️

**KRITIS: Temuan dari deep dive ke codebase yang BELUM ada di plan saat ini.** Harus di-address sebelum agent mulai kerja.

</aside>

---

## Gap 1: `get_auth_bootstrap` RPC Tidak Ada di Plan

**Severity:** 🔴 CRITICAL

**File:** `src/contexts/auth/useRoleResolution.ts` line ~90

**Temuan:** `useRoleResolution` memanggil `authService.getAuthBootstrap()` yang return:

- `profile` (id, email, first_name, last_name, avatar_url, tenant_id)
- `memberships[]` (tenant_id, tenant_name, tenant_logo, tenant_slug, role, status, is_active, joined_at)
- `default_tenant_id`

Ini adalah **RPC paling kritis** karena dipanggil setiap kali user login/refresh. Plan hanya menyebut 8 auth RPCs tapi **tidak include `get_auth_bootstrap`**.

**Fix:** Tambahkan sebagai RPC ke-9 di Phase 1B.

---

## Gap 2: OAuth Callback BUKAN Hash Routing

**Severity:** 🔴 CRITICAL

**File:** `src/contexts/auth/useSessionManagement.ts` line ~48, ~120

**Temuan:**

```tsx
// OAuth redirect URL menggunakan PATH routing, BUKAN hash routing!
redirectTo: `${window.location.origin}/auth/callback` // /auth/callback, NOT /#/auth/callback

// Detection di session management:
window.location.pathname === '/auth/callback' // pathname check, not hash
```

Ini berarti OAuth callback TIDAK pakai hash routing meskipun app pakai hash routing. VIL harus handle `/auth/callback` sebagai path, bukan `/#/auth/callback`.

**Fix:** VIL OAuth callback endpoint harus di `/auth/callback` (path-based), bukan hash.

---

## Gap 3: `signOut()` Clear Specific localStorage Keys

**Severity:** 🟡 MEDIUM

**File:** `src/contexts/auth/useSessionManagement.ts` line ~55

**Temuan:**

```tsx
const AUTH_KEYS = [
  'activeTenantId',
  'pendingInviteToken',
  'pendingJoinCode',
  'pendingInviteRetryCount',
]
// Also clears: ai_tutor_session_* keys
Object.keys(localStorage)
  .filter((k) => k.startsWith('ai_tutor_session_'))
  .forEach((k) => localStorage.removeItem(k))
```

VIL auth signOut harus clear exact same keys. Plan tidak menyebut ini.

---

## Gap 4: Proactive Token Refresh Logic

**Severity:** 🟡 MEDIUM

**File:** `src/contexts/auth/useSessionManagement.ts` line ~145

**Temuan:** Frontend checks setiap 60 detik apakah token expires dalam 5 menit, lalu call `supabase.auth.refreshSession()`. Jika refresh gagal → signOut + toast "Sesi Anda telah berakhir".

VIL harus expose refresh endpoint yang compatible dengan pola ini:

- Check `session.expires_at` (Unix timestamp)
- Refresh jika `remaining <= 300 seconds`
- Interval: `60_000 ms`

---

## Gap 5: Tenant Switching via localStorage

**Severity:** 🟡 MEDIUM

**File:** `src/contexts/auth/useTenantSwitching.ts`

**Temuan:** Active tenant di-persist di `localStorage.activeTenantId`, di-validate terhadap `rawTenants` dari server, dan di-fallback ke `defaultTenantId`. Ini bukan simple state — ada validation chain:

1. Load cached tenant from localStorage
2. Validate against memberships from bootstrap
3. If invalid → fallback to default
4. If no default → show workspace selector

VIL JWT harus include `tenant_id` tapi frontend juga does client-side tenant switching tanpa re-auth.

---

## Gap 6: OAuth Redirect Pending Flag

**Severity:** 🟢 LOW

**File:** `src/features/auth/utils/authFlow.ts`

**Temuan:** `markOAuthRedirectPending()` dan `isOAuthRedirectPending()` menggunakan localStorage flag untuk track apakah user sedang di-redirect ke Google. Ini mencegah flash of unauthenticated content.

---

## Gap 7: `AuthContextType` Interface Sangat Besar

**Severity:** 🟡 MEDIUM

**File:** `src/contexts/AuthContext.tsx`

**Temuan:** `useAuth()` returns 25+ fields. VIL auth harus return format yang **identik** agar 48 feature modules yang consume `useAuth()` tidak perlu diubah.

Key fields yang HARUS ada:

```tsx
interface AuthContextType {
  user: User | null // Must have .id, .email, .email_confirmed_at
  session: Session | null // Must have .access_token, .expires_at
  profile: Profile | null // From get_auth_bootstrap
  tenantId: string | null // Active tenant
  memberships: TenantMembership[]
  activeTenant: Tenant | null
  setActiveTenant: (tenantId: string) => void
  activeRole: Role | null
  roles: Role[]
  role: Role // Primary role from getPrimaryRole()
  permissions: Permissions // From getPermissions(role)
  loading: boolean
  authStatus: AuthStatus // 'initializing' | 'callback_processing' | 'authenticated' | ...
  authError: string | null
  workspaceStatus: '...' // 'idle' | 'loading' | 'needs_onboarding' | 'needs_selection' | 'resolved' | 'error'
  bootstrapReady: boolean
  emailVerified: boolean
  sessionExpired: boolean
  signIn
  signUp
  signOut
  signInWithGoogle
  clearAuthError
  refreshAuthBootstrap
  hasRole
}
```

---

## Gap 8: Supabase Client Super Simple

**Severity:** 🟢 LOW (tapi penting untuk abstraction)

**File:** `src/services/supabase/client.ts`

**Temuan:** Client hanya 4 baris:

```tsx
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

VIL client harus equally simple. Abstraction layer di Phase 0 harus wrap ini tanpa menambah complexity.

---

## Gap 9: Course Module Lebih Complex dari Plan

**Severity:** 🟡 MEDIUM

**File:** `src/features/courses/`

**Temuan:** Course module bukan hanya `courseService.ts`. Ada:

- `api/courseService.ts` — CRUD
- `api/templateService.ts` — import/export templates
- `api/versionService.ts` — version history, snapshot, restore, diff
- `queries/courseKeys.ts` — React Query key factory (tenant-scoped)
- `queries/courseQueries.ts` — useCourses, useInfiniteCoursesQuery
- `queries/useCourseEnrollmentCount.ts`
- `queries/useCourseVersions.ts`
- `queries/useTemplates.ts`
- `hooks/useCourse.ts`, `useCourseReadiness.ts`, `useCourseSettings.ts`

Phase 0 POC hanya refactor `courseService.ts`, tapi agent juga harus tahu bahwa `queries/` layer calls `courseService` — jadi refactor harus propagate.

---

## Gap 10: Plan Tidak Spesifik tentang Bagaimana ApiClient Diinject

**Severity:** 🟡 MEDIUM

**Temuan:** Plan menunjukkan `useApiClient()` hook, tapi banyak service files BUKAN hooks — mereka plain functions yang di-import di hooks/queries. Contoh:

```tsx
// courseService.ts — ini BUKAN hook, ini plain object
export const courseService = {
  async fetchCourses(tenantId, options) { ... }
}

// courseQueries.ts — ini HOOK yang memanggil courseService
export function useCourses(tenantId) {
  return useQuery({
    queryKey: courseKeys.all(tenantId),
    queryFn: () => courseService.fetchCourses(tenantId, {}),
  })
}
```

Jadi ApiClient TIDAK bisa diinject via React context ke service files. Harus pakai **module-level singleton** atau **parameter injection**.

**Fix yang benar:**

```tsx
// src/services/api/apiClient.ts
let _client: ApiClient = supabaseApiClient // default

export function setApiClient(client: ApiClient) {
  _client = client
}
export function getApiClient(): ApiClient {
  return _client
}

// Usage in service files (non-hook):
import { getApiClient } from '@/services/api/apiClient'
const client = getApiClient()
```

Ini JAUH lebih practical daripada React context untuk service layer.
