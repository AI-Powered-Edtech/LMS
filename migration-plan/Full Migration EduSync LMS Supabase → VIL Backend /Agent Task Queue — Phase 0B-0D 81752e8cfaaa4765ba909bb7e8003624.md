# Agent Task Queue — Phase 0B-0D

<aside>
🤖

**Untuk AI Coding Agents — Phase 0B (Auth Abstraction), 0C (Realtime Abstraction), 0D (Storage Abstraction).**

Setiap task adalah **self-contained** — agent tinggal copas kode dan execute. Setiap task punya dependency jelas, code siap copas, verify commands, dan stop criteria.

**Source of truth:** Spec 1 (Auth & Session Parity Contract), Spec 2 (Frontend Runtime Compatibility Contract), Spec 4 (Infrastructure Gaps), Agent Bootstrap Context, Phase 0 Detail.

</aside>

---

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — gunakan `pnpm`
3. **Semua teks UI** harus Bahasa Indonesia
4. **Semua komponen** harus punya `dark:` Tailwind variants
5. Jalankan `pnpm typecheck && pnpm lint` setelah setiap task
6. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
7. **Module-level singleton** pattern — BUKAN React Context (Spec 2 §1 FINAL)
8. **Jangan ubah behavior kontrak** — jika shape berubah, tandai BLOCKED
9. **Error shape harus PostgREST-compatible:** `{ code, message, details, hint }` (Spec 2 §5)
10. **Role datang dari `user_roles` table**, BUKAN `profiles.role` (Spec 1 §1.2)

<aside>
📝

**Source of Truth:** **6 Execution Contracts** di [Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](../Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20%20ace54d0159584b0c8330eaad52e6e05b.md). Contract 2 (Auth State Side-Effects Matrix) mendefinisikan SEMUA side-effects yang harus di-replicate saat auth abstraction. Contract 1 (Routing) mengkonfirmasi path-based routing untuk OAuth callback.

</aside>

---

## Dependency Graph

```
Phase 0A (DONE) ───┐
                   ├── 0-INIT: Provider Init di main.tsx (HARUS PERTAMA)
                   │
                   ├── Phase 0B: Auth Abstraction (setelah 0-INIT)
                   │     0B-1 → 0B-2 → 0B-3 → 0B-4 → 0B-5 → 0B-5t → 0B-6 → 0B-6t
                   │     → 0B-6.5 → 0B-7 → 0B-7t → 0B-8 → 0B-8t → 0B-9
                   │
                   ├── Phase 0C: Realtime Abstraction (parallel dengan 0B, setelah 0-INIT)
                   │     0C-0 → 0C-1 → 0C-2 → 0C-3 → 0C-4 → 0C-5 → 0C-6a → 0C-6b
                   │     → 0C-7a → 0C-7b → 0C-7c → 0C-8a → 0C-8b → 0C-9
                   │
                   ├── Phase 0D: Storage Abstraction (parallel dengan 0B & 0C, setelah 0-INIT)
                   │     0D-1 → 0D-2 → 0D-3 → 0D-4 → 0D-5 → 0D-6 → 0D-7 → 0D-8
                   │
                   └── Phase 0X: Cross-Cutting (setelah 0B + 0C + 0D selesai)
                         0X-1 (offlineQueue) → 0X-2 (Edge Function consumers)
                         → 0X-3 (CI Guard) → 0X-4 (full verification)

Parallel: 0B, 0C, 0D bisa dikerjakan bersamaan oleh agent berbeda.
Serial: Di DALAM tiap wave, task harus berurutan.
KRITIKAL: 0-INIT harus selesai SEBELUM 0B-4, 0C-3, atau 0D-3.
```

<aside>
⚠️

**Gap Fix #10 — Rollback Rule (berlaku untuk SEMUA task):**

Jika agent gagal di tengah task (sudah ganti import tapi typecheck gagal):

1. `git stash` atau `git checkout -- <files>` untuk revert semua perubahan task ini
2. Report `BLOCKED` dengan detail error
3. JANGAN lanjut ke task berikutnya dengan state setengah jadi
</aside>

<aside>
🌿

**Gap Fix #11 — Git Branch Strategy:**

- `feat/phase-0b-auth-abstraction` — semua task 0B
- `feat/phase-0c-realtime-abstraction` — semua task 0C
- `feat/phase-0d-storage-abstraction` — semua task 0D
- `feat/phase-0-init-providers` — task 0-INIT (merge PERTAMA)
- `feat/phase-0x-cross-cutting` — task 0X
- **Merge order:** 0-INIT → (0B, 0C, 0D parallel merge) → 0X
</aside>

<aside>
📊

**Gap Fix #15 — Progress Tracking:**

Setelah setiap task selesai, agent HARUS update status di halaman ini:

- Tambahkan `✅` di depan heading task yang DONE
- Tambahkan `🚫 BLOCKED: [alasan]` untuk task yang blocked
- Contoh: `## ✅ Task 0B-1: Buat AuthProvider Interface + Types`
</aside>

---

# 🛠️ Task 0-INIT: Consolidated Provider Init di main.tsx

<aside>
🛠️

**Gap Fix #12 — main.tsx Conflict Resolution.** Tasks 0B-4, 0C-3, dan 0D-3 semua mengedit `main.tsx`. Untuk menghindari merge conflict, SEMUA provider init digabung di satu task ini. Task 0B-4, 0C-3, dan 0D-3 TIDAK BOLEH mengedit main.tsx — hanya buat files provider.

</aside>

**TASK ID:** `0-INIT`

**OWNER TYPE:** refactor-agent

**GOAL:** Tambahkan init code untuk Auth, Realtime, DAN Storage providers di `main.tsx` sekaligus. Task ini HARUS selesai SEBELUM tasks 0B-4, 0C-3, atau 0D-3 dimulai.

**DEPENDENCY:** Task 0B-4 (auth singleton), 0C-3 (realtime singleton), 0D-3 (storage singleton) harus sudah CREATE files-nya. Task ini hanya mengedit main.tsx.

**EDIT ONLY:** `src/main.tsx`

**DO NOT TOUCH:** Semua file lain

**COPY-PASTE STARTER:**

```tsx
// === TAMBAHKAN DI main.tsx SETELAH setApiClient() block ===

// Auth Provider
import { setAuthProvider } from '@/services/auth'
import { createSupabaseAuthProvider } from '@/services/auth/supabaseAuthProvider'
import { createVilAuthProvider } from '@/services/auth/vilAuthProvider'

if (apiBackend === 'vil') {
  setAuthProvider(createVilAuthProvider(import.meta.env.VITE_API_URL || 'http://localhost:8080'))
} else {
  setAuthProvider(createSupabaseAuthProvider())
}

// Realtime Provider
import { setRealtimeProvider } from '@/services/realtime'
import { createSupabaseRealtimeProvider } from '@/services/realtime/supabaseRealtimeProvider'
import { createVilRealtimeProvider } from '@/services/realtime/vilRealtimeProvider'

if (apiBackend === 'vil') {
  setRealtimeProvider(
    createVilRealtimeProvider(import.meta.env.VITE_API_URL || 'http://localhost:8080')
  )
} else {
  setRealtimeProvider(createSupabaseRealtimeProvider())
}

// Storage Provider
import { setStorageProvider } from '@/services/storage'
import { createSupabaseStorageProvider } from '@/services/storage/supabaseStorageProvider'
import { createVilStorageProvider } from '@/services/storage/vilStorageProvider'

if (apiBackend === 'vil') {
  setStorageProvider(
    createVilStorageProvider(import.meta.env.VITE_API_URL || 'http://localhost:8080')
  )
} else {
  setStorageProvider(createSupabaseStorageProvider())
}
// === END TAMBAHAN ===
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:** `apiBackend` variable tidak ada → BLOCKED (dependency 0A-6)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# 🔑 Phase 0B — Auth Abstraction

<aside>
⚠️

**Area paling sensitif.** AuthContext.tsx adalah jantung app — 48 feature modules bergantung pada `useAuth()`. Semua keputusan HARUS mengikuti Spec 1: Auth & Session Parity Contract. Zero improvisasi.

</aside>

---

## Task 0B-1: Buat AuthProvider Interface + Types

**TASK ID:** `0B-1`

**OWNER TYPE:** refactor-agent

**GOAL:** Definisikan `AuthProvider` interface yang mengabstraksi semua auth operations. Interface HARUS cover semua 25+ fields di `AuthContextType` (Spec 1 §1) dan semua auth methods (Spec 1 §1.4), termasuk MFA (Spec 1 §7).

**READ FIRST:**

- `src/contexts/AuthContext.tsx`
- `src/contexts/auth/useSessionManagement.ts`
- `src/features/auth/api/authService.ts`
- `src/features/auth/api/mfaService.ts`
- Spec 1: Auth & Session Parity Contract (§1, §2, §3, §4, §7, §8)

**EDIT ONLY:** `src/services/auth/types.ts` (CREATE NEW)

**DO NOT TOUCH:** `src/contexts/AuthContext.tsx`, `src/contexts/auth/*`, `src/features/auth/*`, `src/services/api/*`

**IMPLEMENTATION STEPS:**

1. Buat directory `src/services/auth/` jika belum ada
2. Buat file `src/services/auth/types.ts`
3. Definisikan semua type: `AuthUser`, `AuthSession`, `AuthResponse`, `AuthError`, `AuthEvent`, `AuthSubscription`, `OAuthSignInOptions`, `SignUpMetadata`
4. Definisikan MFA types: `MFAEnrollResult`, `MFAChallengeResult`, `MFAVerifyResult`, `MFAFactor`, `MFAListFactorsResult`
5. Definisikan `AuthProvider` interface dengan SEMUA methods
6. Return types HARUS IDENTIK dengan shape Supabase GoTrue

**COPY-PASTE STARTER:**

```tsx
// src/services/auth/types.ts
// =============================================================================
// Auth Abstraction Layer — Type Definitions
// =============================================================================
// SEMUA types HARUS match dengan Supabase GoTrue response shapes.
// Lihat Spec 1: Auth & Session Parity Contract untuk kontrak lengkap.
// 48 feature modules depend on shapes ini via useAuth().
// =============================================================================

/** User object — must match Supabase User shape */
export interface AuthUser {
  id: string
  email?: string
  email_confirmed_at?: string | null
  phone?: string
  created_at: string
  updated_at: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
  aud: string
  role?: string
}

/** Session object — Spec 1 §4 */
export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at: number // Unix timestamp (seconds)
  expires_in: number // Seconds until expiry
  token_type: 'bearer'
  user: AuthUser
}

/** Auth response for sign-in/sign-up */
export interface AuthResponse {
  data: {
    user: AuthUser | null
    session: AuthSession | null
  }
  error: AuthError | null
}

/** Auth error — PostgREST-compatible (Spec 1 §8, Spec 2 §5) */
export interface AuthError {
  message: string
  status?: number
  code?: string
  details?: string | null
  hint?: string | null
}

/** Auth state change events */
export type AuthEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'MFA_CHALLENGE_VERIFIED'

export interface AuthSubscription {
  unsubscribe: () => void
}

export interface OAuthSignInOptions {
  provider: 'google'
  options?: {
    redirectTo?: string
    scopes?: string
    queryParams?: Record<string, string>
  }
}

export interface SignUpMetadata {
  first_name?: string
  last_name?: string
  [key: string]: unknown
}

/** MFA types — Spec 1 §7 */
export interface MFAEnrollResult {
  data: {
    id: string
    type: 'totp'
    totp: {
      qr_code: string
      secret: string
      uri: string
    }
  } | null
  error: AuthError | null
}

export interface MFAChallengeResult {
  data: { id: string } | null
  error: AuthError | null
}

export interface MFAVerifyResult {
  data: {
    access_token: string
    refresh_token: string
    expires_at: number
    expires_in: number
    token_type: 'bearer'
    user: AuthUser
  } | null
  error: AuthError | null
}

export interface MFAFactor {
  id: string
  type: 'totp'
  friendly_name?: string
  status: 'verified' | 'unverified'
  created_at: string
  updated_at: string
}

export interface MFAListFactorsResult {
  data: {
    totp: MFAFactor[]
    all: MFAFactor[]
  } | null
  error: AuthError | null
}

// ---------------------------------------------------------------------------
// AuthProvider Interface
// ---------------------------------------------------------------------------

export interface AuthProvider {
  // --- Session ---
  getSession(): Promise<{ data: { session: AuthSession | null }; error: AuthError | null }>
  getUser(): Promise<{ data: { user: AuthUser | null }; error: AuthError | null }>

  // --- Auth state listener ---
  onAuthStateChange(callback: (event: AuthEvent, session: AuthSession | null) => void): {
    data: { subscription: AuthSubscription }
  }

  // --- Sign in / Sign up / Sign out (Spec 1 §1.4) ---
  signInWithPassword(credentials: { email: string; password: string }): Promise<AuthResponse>

  signUp(credentials: {
    email: string
    password: string
    options?: { data?: SignUpMetadata }
  }): Promise<AuthResponse>

  signInWithOAuth(options: OAuthSignInOptions): Promise<{
    data: { provider: string; url: string } | null
    error: AuthError | null
  }>

  signOut(): Promise<{ error: AuthError | null }>

  // --- Token management (Spec 1 §4) ---
  refreshSession(): Promise<AuthResponse>

  // --- OAuth callback ---
  exchangeCodeForSession(code: string): Promise<AuthResponse>

  // --- Password reset (Spec 4 §2) ---
  resetPasswordForEmail(
    email: string,
    options?: {
      redirectTo?: string
    }
  ): Promise<{ data: object | null; error: AuthError | null }>

  updateUser(attributes: {
    password?: string
    email?: string
    data?: Record<string, unknown>
  }): Promise<{ data: { user: AuthUser | null }; error: AuthError | null }>

  // --- MFA (Spec 1 §7) ---
  mfa: {
    enroll(params: { factorType: 'totp'; friendlyName?: string }): Promise<MFAEnrollResult>
    challenge(params: { factorId: string }): Promise<MFAChallengeResult>
    verify(params: {
      factorId: string
      challengeId: string
      code: string
    }): Promise<MFAVerifyResult>
    unenroll(params: {
      factorId: string
    }): Promise<{ data: { id: string } | null; error: AuthError | null }>
    listFactors(): Promise<MFAListFactorsResult>
    getAuthenticatorAssuranceLevel(): Promise<{
      data: {
        currentLevel: 'aal1' | 'aal2' | null
        nextLevel: 'aal1' | 'aal2' | null
        currentAuthenticationMethods: Array<{ method: string; timestamp: number }>
      } | null
      error: AuthError | null
    }>
  }
}
```

**VERIFY:**

```
pnpm typecheck
```

**STOP IF:**

- `pnpm typecheck` gagal pada file baru
- Ada auth method di codebase yang belum ada di interface → tambahkan, jangan skip
- Menemukan Supabase-specific type yang tidak bisa diabstraksi → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0B-2: Buat SupabaseAuthProvider

**TASK ID:** `0B-2`

**OWNER TYPE:** refactor-agent

**GOAL:** Implement `AuthProvider` yang wrap Supabase GoTrue client. THIN WRAPPER — zero logic baru.

**READ FIRST:**

- `src/services/auth/types.ts` (Task 0B-1)
- `src/services/supabase/client.ts`
- `src/features/auth/api/mfaService.ts`

**EDIT ONLY:** `src/services/auth/supabaseAuthProvider.ts` (CREATE NEW)

**DO NOT TOUCH:** `src/contexts/AuthContext.tsx`, `src/services/supabase/client.ts`, `src/features/auth/*`

**COPY-PASTE STARTER:**

```tsx
// src/services/auth/supabaseAuthProvider.ts
import { supabase } from '@/services/supabase/client'
import type { AuthProvider } from './types'

export function createSupabaseAuthProvider(): AuthProvider {
  const auth = supabase.auth
  return {
    getSession() {
      return auth.getSession() as ReturnType<AuthProvider['getSession']>
    },
    getUser() {
      return auth.getUser() as ReturnType<AuthProvider['getUser']>
    },
    onAuthStateChange(callback) {
      return auth.onAuthStateChange(
        callback as Parameters<typeof auth.onAuthStateChange>[0]
      ) as ReturnType<AuthProvider['onAuthStateChange']>
    },
    signInWithPassword(credentials) {
      return auth.signInWithPassword(credentials) as ReturnType<AuthProvider['signInWithPassword']>
    },
    signUp(credentials) {
      return auth.signUp(credentials) as ReturnType<AuthProvider['signUp']>
    },
    signInWithOAuth(options) {
      return auth.signInWithOAuth(options) as ReturnType<AuthProvider['signInWithOAuth']>
    },
    signOut() {
      return auth.signOut() as ReturnType<AuthProvider['signOut']>
    },
    refreshSession() {
      return auth.refreshSession() as ReturnType<AuthProvider['refreshSession']>
    },
    exchangeCodeForSession(code: string) {
      return auth.exchangeCodeForSession(code) as ReturnType<AuthProvider['exchangeCodeForSession']>
    },
    resetPasswordForEmail(email, options) {
      return auth.resetPasswordForEmail(email, options) as ReturnType<
        AuthProvider['resetPasswordForEmail']
      >
    },
    updateUser(attributes) {
      return auth.updateUser(attributes) as ReturnType<AuthProvider['updateUser']>
    },
    mfa: {
      enroll(params) {
        return auth.mfa.enroll(params) as ReturnType<AuthProvider['mfa']['enroll']>
      },
      challenge(params) {
        return auth.mfa.challenge(params) as ReturnType<AuthProvider['mfa']['challenge']>
      },
      verify(params) {
        return auth.mfa.verify(params) as ReturnType<AuthProvider['mfa']['verify']>
      },
      unenroll(params) {
        return auth.mfa.unenroll(params) as ReturnType<AuthProvider['mfa']['unenroll']>
      },
      listFactors() {
        return auth.mfa.listFactors() as ReturnType<AuthProvider['mfa']['listFactors']>
      },
      getAuthenticatorAssuranceLevel() {
        return auth.mfa.getAuthenticatorAssuranceLevel() as ReturnType<
          AuthProvider['mfa']['getAuthenticatorAssuranceLevel']
        >
      },
    },
  }
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- Type mismatch antara Supabase auth dan AuthProvider → perbaiki interface di 0B-1
- Ada method yang tidak bisa di-cast → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0B-3: Buat VilAuthProvider Stub

**TASK ID:** `0B-3`

**OWNER TYPE:** refactor-agent

**GOAL:** VIL auth stub — semua methods throw "not implemented". Diisi di Phase 1B.

**READ FIRST:** `src/services/auth/types.ts`

**EDIT ONLY:** `src/services/auth/vilAuthProvider.ts` (CREATE NEW)

**DO NOT TOUCH:** Semua file lain

**COPY-PASTE STARTER:**

```tsx
// src/services/auth/vilAuthProvider.ts
import type { AuthProvider } from './types'

const NOT_IMPL = (method: string): never => {
  throw new Error(`[VIL Auth] ${method} not yet implemented.`)
}

export function createVilAuthProvider(_baseUrl: string): AuthProvider {
  return {
    getSession() {
      return NOT_IMPL('getSession')
    },
    getUser() {
      return NOT_IMPL('getUser')
    },
    onAuthStateChange() {
      return NOT_IMPL('onAuthStateChange')
    },
    signInWithPassword() {
      return NOT_IMPL('signInWithPassword')
    },
    signUp() {
      return NOT_IMPL('signUp')
    },
    signInWithOAuth() {
      return NOT_IMPL('signInWithOAuth')
    },
    signOut() {
      return NOT_IMPL('signOut')
    },
    refreshSession() {
      return NOT_IMPL('refreshSession')
    },
    exchangeCodeForSession() {
      return NOT_IMPL('exchangeCodeForSession')
    },
    resetPasswordForEmail() {
      return NOT_IMPL('resetPasswordForEmail')
    },
    updateUser() {
      return NOT_IMPL('updateUser')
    },
    mfa: {
      enroll() {
        return NOT_IMPL('mfa.enroll')
      },
      challenge() {
        return NOT_IMPL('mfa.challenge')
      },
      verify() {
        return NOT_IMPL('mfa.verify')
      },
      unenroll() {
        return NOT_IMPL('mfa.unenroll')
      },
      listFactors() {
        return NOT_IMPL('mfa.listFactors')
      },
      getAuthenticatorAssuranceLevel() {
        return NOT_IMPL('mfa.getAuthenticatorAssuranceLevel')
      },
    },
  }
}
```

**VERIFY:**

```
pnpm typecheck
```

**STOP IF:** `pnpm typecheck` gagal

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0B-4: Auth Singleton + Barrel Export + Init di main.tsx

**TASK ID:** `0B-4`

**OWNER TYPE:** refactor-agent

**GOAL:** Buat module-level singleton `getAuthProvider()`/`setAuthProvider()` (pattern IDENTIK dengan `getApiClient()` — Spec 2 §1 FINAL), barrel export, dan init di `main.tsx`.

**READ FIRST:**

- `src/services/api/apiClient.ts` (pattern referensi)
- `src/main.tsx` (current state setelah Task 0A-6)

**EDIT ONLY:**

- `src/services/auth/authProvider.ts` (CREATE NEW)
- `src/services/auth/index.ts` (CREATE NEW)
- `src/main.tsx` (EDIT — tambah init)

**DO NOT TOUCH:** `src/services/api/*`, `src/contexts/*`

**COPY-PASTE STARTER:**

```tsx
// src/services/auth/authProvider.ts
import type { AuthProvider } from './types'

let _authProvider: AuthProvider | null = null

export function setAuthProvider(provider: AuthProvider): void {
  _authProvider = provider
}

export function getAuthProvider(): AuthProvider {
  if (!_authProvider) {
    throw new Error('[AuthProvider] Not initialized. Call setAuthProvider() in main.tsx.')
  }
  return _authProvider
}
```

```tsx
// src/services/auth/index.ts
export type {
  AuthProvider,
  AuthUser,
  AuthSession,
  AuthResponse,
  AuthError,
  AuthEvent,
  AuthSubscription,
  OAuthSignInOptions,
  SignUpMetadata,
  MFAEnrollResult,
  MFAChallengeResult,
  MFAVerifyResult,
  MFAFactor,
  MFAListFactorsResult,
} from './types'
export { getAuthProvider, setAuthProvider } from './authProvider'
export { createSupabaseAuthProvider } from './supabaseAuthProvider'
export { createVilAuthProvider } from './vilAuthProvider'
```

**Tambahkan di `main.tsx` SETELAH `setApiClient()` block:**

```tsx
import { setAuthProvider } from '@/services/auth'
import { createSupabaseAuthProvider } from '@/services/auth/supabaseAuthProvider'
import { createVilAuthProvider } from '@/services/auth/vilAuthProvider'

if (apiBackend === 'vil') {
  setAuthProvider(createVilAuthProvider(import.meta.env.VITE_API_URL || 'http://localhost:8080'))
} else {
  setAuthProvider(createSupabaseAuthProvider())
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:**

- Variable `apiBackend` tidak ditemukan di main.tsx → BLOCKED (dependency 0A-6)
- `pnpm typecheck` gagal

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

<aside>
🧪

**Gap Fix #1 — Test File Updates.** Setiap refactor task (0B-5 s/d 0B-8) HARUS juga update test files yang mock `supabase.auth`. Tambahkan ke VERIFY di setiap task:

```
# Cari test files yang mock supabase untuk file yang direfactor:
grep -rn "vi.mock.*supabase\|jest.mock.*supabase" src/features/auth/__tests__/ src/contexts/__tests__/ src/contexts/auth/__tests__/
# Untuk setiap test file yang ditemukan: update mock dari supabase.auth → getAuthProvider()
# Jalankan scoped test: pnpm vitest run <test-file> --reporter=verbose
```

Jika test file mock `supabase.auth.signInWithPassword()`, ganti ke mock `getAuthProvider().signInWithPassword()`.

Jika >3 test files perlu diubah untuk satu refactor task → buat sub-task terpisah.

</aside>

<aside>
🔑

**Gap Fix #8 — Scoped Tests per Task.** Setiap refactor task (0B-5 s/d 0B-8, 0C-4 s/d 0C-8, 0D-4 s/d 0D-7) HARUS menambahkan ke VERIFY:

```
# Run scoped tests for affected files:
pnpm vitest run --reporter=verbose -- <pattern>
# Contoh: pnpm vitest run --reporter=verbose -- authService
```

Jangan tunggu verification task di akhir — catch failures lebih awal.

</aside>

## Task 0B-5: Refactor authService.ts → getAuthProvider() + getApiClient()

**TASK ID:** `0B-5`

**OWNER TYPE:** refactor-agent

**GOAL:** Hapus SEMUA direct `supabase.auth.*` dan `supabase.rpc()` calls dari `authService.ts`.

**READ FIRST:**

- `src/features/auth/api/authService.ts` (current file)
- `src/services/auth/types.ts` (AuthProvider interface)
- Spec 1 §2 (`get_auth_bootstrap` RPC contract)
- Spec 1 §3 (signOut side effects — provider hanya handle backend call)

**EDIT ONLY:** `src/features/auth/api/authService.ts`

**DO NOT TOUCH:** `src/contexts/AuthContext.tsx`, `src/services/auth/*`, `src/services/api/*`

**IMPLEMENTATION STEPS:**

1. Ganti `import { supabase } from '@/services/supabase/client'`
2. Tambahkan `import { getAuthProvider } from '@/services/auth'`
3. Tambahkan `import { getApiClient } from '@/services/api'`
4. Ganti semua `supabase.auth.*` → `getAuthProvider().*`
5. Ganti semua `supabase.rpc(...)` → `getApiClient().rpc(...)`
6. Ganti semua `supabase.from(...)` → `getApiClient().from(...)`
7. JANGAN ubah business logic, error handling, atau return shapes

**COPY-PASTE STARTER:**

```tsx
// SEBELUM:
import { supabase } from '@/services/supabase/client'
// GANTI DENGAN:
import { getAuthProvider } from '@/services/auth'
import { getApiClient } from '@/services/api'

// Pattern:
// supabase.auth.signInWithPassword(...)  → getAuthProvider().signInWithPassword(...)
// supabase.auth.signUp(...)              → getAuthProvider().signUp(...)
// supabase.auth.signInWithOAuth(...)     → getAuthProvider().signInWithOAuth(...)
// supabase.auth.signOut()                → getAuthProvider().signOut()
// supabase.auth.getSession()             → getAuthProvider().getSession()
// supabase.auth.refreshSession()         → getAuthProvider().refreshSession()
// supabase.rpc('get_auth_bootstrap')     → getApiClient().rpc('get_auth_bootstrap')
// supabase.rpc('ensure_profile_exists')  → getApiClient().rpc('ensure_profile_exists', params)
// supabase.from('profiles')              → getApiClient().from('profiles')
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/auth/api/authService.ts
# Harus return ZERO results
```

**STOP IF:**

- Ada method `supabase.auth.*` yang tidak ada di AuthProvider → BLOCKED, update 0B-1
- Ada coupling ke Supabase-specific type yang tidak ada di types.ts → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0B-6: Refactor mfaService.ts → getAuthProvider().mfa.\*

**TASK ID:** `0B-6`

**OWNER TYPE:** refactor-agent

**GOAL:** Hapus SEMUA direct `supabase.auth.mfa.*` calls dari `mfaService.ts`.

**READ FIRST:**

- `src/features/auth/api/mfaService.ts`
- `src/services/auth/types.ts` (AuthProvider.mfa)
- Spec 1 §7 (MFA contract)

**EDIT ONLY:** `src/features/auth/api/mfaService.ts`

**DO NOT TOUCH:** `src/contexts/AuthContext.tsx`, `src/services/auth/*`

**IMPLEMENTATION STEPS:**

1. Ganti `import { supabase } from '@/services/supabase/client'`
2. Ganti semua `supabase.auth.mfa.*` → `getAuthProvider().mfa.*`
3. JANGAN ubah return shapes atau error handling

**COPY-PASTE STARTER:**

```tsx
// SEBELUM:
import { supabase } from '@/services/supabase/client'
// GANTI DENGAN:
import { getAuthProvider } from '@/services/auth'

// supabase.auth.mfa.enroll(...)     → getAuthProvider().mfa.enroll(...)
// supabase.auth.mfa.challenge(...)  → getAuthProvider().mfa.challenge(...)
// supabase.auth.mfa.verify(...)     → getAuthProvider().mfa.verify(...)
// supabase.auth.mfa.unenroll(...)   → getAuthProvider().mfa.unenroll(...)
// supabase.auth.mfa.listFactors()   → getAuthProvider().mfa.listFactors()
// supabase.auth.mfa.getAuthenticatorAssuranceLevel() → getAuthProvider().mfa.getAuthenticatorAssuranceLevel()
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/auth/api/mfaService.ts
# Harus return ZERO results
```

**STOP IF:**

- Ada method MFA yang belum ada di AuthProvider.mfa → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0B-6.5: Refactor useRoleResolution.ts → getAuthProvider() / getApiClient()

<aside>
🚨

**Gap Fix #2 — Missing File.** `useRoleResolution.ts` disebut di main plan Gap Analysis sebagai file auth yang penting. Kemungkinan besar import `supabase` langsung untuk resolve roles dari `user_roles` table.

</aside>

**TASK ID:** `0B-6.5`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor `useRoleResolution.ts` — hapus semua direct supabase imports. Roles HARUS datang dari `user_roles` table (Spec 1 §1.2).

**READ FIRST:**

- `src/contexts/auth/useRoleResolution.ts` (cari actual path dulu!)
- Spec 1 §1.2 (Role comes from `user_roles` table)

**EDIT ONLY:** `src/contexts/auth/useRoleResolution.ts` (atau lokasi actual)

**DO NOT TOUCH:** `src/contexts/AuthContext.tsx`, `src/services/auth/*`

**IMPLEMENTATION STEPS:**

1. **PERTAMA:** Cari file: `grep -rn "useRoleResolution\|RoleResolution" src/`
2. Jika file import `supabase` langsung:
   - Ganti `supabase.from(...)` → `getApiClient().from(...)`
   - Ganti `supabase.rpc(...)` → `getApiClient().rpc(...)`
   - Ganti `supabase.auth.*` → `getAuthProvider().*`
3. Jika file TIDAK import supabase → DONE (skip)

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/contexts/auth/useRoleResolution.ts
# Harus return ZERO results (atau file not found jika path berbeda)
pnpm vitest run --reporter=verbose -- useRoleResolution
```

**STOP IF:**

- File tidak ditemukan → DONE (file mungkin sudah inline di AuthContext.tsx)
- File punya coupling yang tidak bisa dipisahkan dari AuthContext → BLOCKED, gabungkan ke 0B-8

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0B-7: Refactor useSessionManagement.ts → getAuthProvider()

**TASK ID:** `0B-7`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor `useSessionManagement.ts` (287 lines, 8+ direct Supabase auth calls). File PALING SENSITIF — mengelola proactive token refresh (Spec 1 §4).

**READ FIRST:**

- `src/contexts/auth/useSessionManagement.ts` (287 lines)
- Spec 1 §4 (Token Refresh: proactive setiap 60s, check 5min before expiry)
- Spec 1 §3 (SignOut side effects order)

**EDIT ONLY:** `src/contexts/auth/useSessionManagement.ts`

**DO NOT TOUCH:** `src/contexts/AuthContext.tsx`, `src/services/auth/*`, `src/services/supabase/*`

**IMPLEMENTATION STEPS:**

1. Ganti `import { supabase } from '@/services/supabase/client'`
2. Tambahkan `import { getAuthProvider } from '@/services/auth'`
3. Ganti semua `supabase.auth.*` → `getAuthProvider().*`
4. **KRITIKAL:** Pastikan timing constants TIDAK BERUBAH:
   - Refresh interval: `60_000ms` (60 detik)
   - Expiry threshold: `300` seconds (5 menit)
5. **KRITIKAL:** Pastikan `onAuthStateChange` callback shape TIDAK BERUBAH
6. **KRITIKAL:** Pastikan signOut flow order TIDAK BERUBAH

**COPY-PASTE STARTER:**

```tsx
// SEBELUM:
import { supabase } from '@/services/supabase/client'
// GANTI DENGAN:
import { getAuthProvider } from '@/services/auth'

// supabase.auth.getSession()             → getAuthProvider().getSession()
// supabase.auth.onAuthStateChange(...)   → getAuthProvider().onAuthStateChange(...)
// supabase.auth.refreshSession()         → getAuthProvider().refreshSession()
// supabase.auth.signOut()                → getAuthProvider().signOut()
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/contexts/auth/useSessionManagement.ts
# Harus return ZERO results

# Verify timing constants:
grep -n "60000\|60_000\|REFRESH_INTERVAL" src/contexts/auth/useSessionManagement.ts
grep -n "300\|EXPIRY_THRESHOLD" src/contexts/auth/useSessionManagement.ts
```

**STOP IF:**

- Timing constants berubah → REVERT IMMEDIATELY
- `onAuthStateChange` callback signature berubah → BLOCKED
- SignOut side-effect order berubah → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0B-8: Refactor AuthContext.tsx → getAuthProvider() + getApiClient()

**TASK ID:** `0B-8`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor `AuthContext.tsx` — file TERAKHIR dan PALING COMPLEX di auth wave. Hapus semua direct `supabase` calls.

**READ FIRST:**

- `src/contexts/AuthContext.tsx` (full file)
- Spec 1 §1 (AuthContextType — 25+ fields)
- Spec 1 §2 (`get_auth_bootstrap` RPC)
- Spec 1 §3 (SignOut side effects)
- Spec 1 §6 (Tenant Switching — client-side only)

**EDIT ONLY:** `src/contexts/AuthContext.tsx`

**DO NOT TOUCH:** `src/services/auth/*`, `src/services/api/*`, `src/services/supabase/*`, `src/contexts/auth/useSessionManagement.ts` (sudah di-refactor di 0B-7)

**IMPLEMENTATION STEPS:**

1. Ganti `import { supabase } from '@/services/supabase/client'`
2. Tambahkan `import { getAuthProvider } from '@/services/auth'` dan `import { getApiClient } from '@/services/api'`
3. Ganti SEMUA `supabase.auth.*` → `getAuthProvider().*`
4. Ganti SEMUA `supabase.rpc(...)` → `getApiClient().rpc(...)`
5. Ganti SEMUA `supabase.from(...)` → `getApiClient().from(...)`
6. **JANGAN UBAH** `AuthContextType` shape (25+ fields)
7. **JANGAN UBAH** `useAuth()` hook return value
8. **JANGAN UBAH** signOut localStorage clearing order (Spec 1 §3)
9. **JANGAN UBAH** tenant switching behavior (Spec 1 §6)
10. **JANGAN UBAH** `bootstrapReady` gate logic

**COPY-PASTE STARTER:**

```tsx
// SEBELUM:
import { supabase } from '@/services/supabase/client'
// GANTI DENGAN:
import { getAuthProvider } from '@/services/auth'
import { getApiClient } from '@/services/api'

// SEMUA occurrences:
// supabase.auth.*            → getAuthProvider().*
// supabase.rpc(...)          → getApiClient().rpc(...)
// supabase.from(...)         → getApiClient().from(...)
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/contexts/AuthContext.tsx
# Harus return ZERO results

grep -n "AuthContextType" src/contexts/AuthContext.tsx  # Harus ada
grep -n "export.*useAuth" src/contexts/AuthContext.tsx   # Harus ada
```

**STOP IF:**

- `AuthContextType` shape berubah (field ditambah/dihapus/diubah type) → REVERT
- `useAuth()` return type berubah → REVERT
-

> 5 typecheck errors → BLOCKED

- File >500 lines berubah → split menjadi sub-tasks

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0B-9: Auth Abstraction Verification

**TASK ID:** `0B-9`

**OWNER TYPE:** test-agent

**GOAL:** Verifikasi SEMUA auth files sudah direfactor. Zero direct Supabase imports di auth layer.

**READ FIRST:** Semua files yang direfactor di 0B-5 sampai 0B-8

**EDIT ONLY:** Tidak ada file baru

**DO NOT TOUCH:** Semua file

**VERIFY:**

```
# 1. Zero supabase imports di auth files
grep -rn "from '@/services/supabase/client'" src/features/auth/ src/contexts/auth/ src/contexts/AuthContext.tsx
# Expected: ZERO results

# 2. Auth provider hanya dipakai di abstraction layer
grep -rn "from '@/services/supabase/client'" src/services/auth/
# Expected: 1 result ONLY (supabaseAuthProvider.ts)

# 3. Full validation
pnpm typecheck
pnpm lint
pnpm test:ci

# 4. Build check
pnpm build
```

**STOP IF:**

- Ditemukan supabase import di auth files → kembali ke task yang sesuai
- `pnpm test:ci` gagal pada auth-related tests → BLOCKED
- `pnpm build` gagal → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# 📡 Phase 0C — Realtime Abstraction

<aside>
📡

**9 consumer files** harus direfactor. 3 patterns: `postgres_changes` (DB notifications), `broadcast` (ephemeral messaging), `presence` (user tracking). EduSync sudah minimize WebSocket (polling preference) — abstraction layer harus support both.

</aside>

---

## Task 0C-0: Scan Actual Realtime Consumer Paths

<aside>
🔍

**Gap Fix #7 — File Paths Mungkin Salah.** Main plan menyebut file names tanpa full path. Feature folder structure bisa berbeda dari yang diasumsikan. Scan dulu sebelum mulai refactor.

</aside>

**TASK ID:** `0C-0`

**OWNER TYPE:** refactor-agent

**GOAL:** Scan codebase untuk menemukan SEMUA files yang pakai `supabase.channel()` / `supabase.removeChannel()`. Dokumentasikan actual paths.

**EDIT ONLY:** Tidak ada (scan only)

**IMPLEMENTATION STEPS:**

1. Jalankan scan:

```
grep -rn "supabase\.channel\|supabase\.removeChannel\|removeAllChannels" src/ | grep -v node_modules | grep -v __tests__ | grep -v supabaseRealtimeProvider
```

1. Dokumentasikan output: actual file paths + line numbers
2. Bandingkan dengan list 9 files di main plan
3. Jika ada file BARU yang tidak di list → tambahkan ke task queue
4. Jika file di list TIDAK ADA di codebase → hapus dari task queue
5. Update task 0C-4 s/d 0C-8 dengan actual paths

**VERIFY:** Documented list of actual consumer files

**STOP IF:** >15 files ditemukan → BLOCKED (scope lebih besar dari expected)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0C-1: Buat RealtimeProvider Interface + Types

**TASK ID:** `0C-1`

**OWNER TYPE:** refactor-agent

**GOAL:** Definisikan `RealtimeProvider` interface yang mengabstraksi Supabase Realtime channels.

**READ FIRST:**

- `src/features/course-builder/hooks/useBuilderChannel.ts` (broadcast + presence)
- `src/features/course-builder/hooks/useBuilderPresence.ts`
- `src/features/notifications/hooks/useNotifications.ts` (postgres_changes)
- `src/features/discussions/queries/discussionQueries.ts`
- `src/features/messaging/hooks/useMessages.ts` (broadcast)
- `src/features/messaging/components/MessageThread.tsx`
- `src/features/classroom/api/classroomService.ts`
- `src/features/assignments/api/groupAssignmentService.ts`
- `src/features/notifications/hooks/useAdminNotifications.ts`

**EDIT ONLY:** `src/services/realtime/types.ts` (CREATE NEW)

**DO NOT TOUCH:** Semua consumer files

**COPY-PASTE STARTER:**

```tsx
// src/services/realtime/types.ts
// =============================================================================
// Realtime Abstraction — Type Definitions
// =============================================================================
// 3 patterns EduSync: postgres_changes, broadcast, presence
// 9 consumer files depend on shapes ini.
// =============================================================================

export type ChannelStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'

export interface PresenceState {
  [key: string]: Array<{ presence_ref: string; [key: string]: unknown }>
}

export interface RealtimeChannel {
  on(
    type: 'postgres_changes',
    config: { event: string; schema: string; table: string; filter?: string },
    handler: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      new: Record<string, unknown>
      old: Record<string, unknown>
      table: string
      schema: string
    }) => void
  ): RealtimeChannel

  on(
    type: 'broadcast',
    config: { event: string },
    handler: (payload: { event: string; payload: unknown; type: string }) => void
  ): RealtimeChannel

  on(
    type: 'presence',
    config: { event: 'sync' | 'join' | 'leave' },
    handler: (payload: {
      currentPresences?: PresenceState
      newPresences?: Array<{ presence_ref: string; [key: string]: unknown }>
      leftPresences?: Array<{ presence_ref: string; [key: string]: unknown }>
      key?: string
    }) => void
  ): RealtimeChannel

  subscribe(callback?: (status: ChannelStatus, err?: Error) => void): RealtimeChannel
  unsubscribe(): Promise<void>
  send(payload: {
    type: 'broadcast'
    event: string
    payload: unknown
  }): Promise<'ok' | 'error' | 'timed out'>
  track(state: Record<string, unknown>): Promise<'ok' | 'error' | 'timed out'>
  untrack(): Promise<'ok' | 'error' | 'timed out'>
  presenceState(): PresenceState
}

export interface RealtimeProvider {
  channel(
    name: string,
    options?: {
      config?: {
        broadcast?: { self?: boolean; ack?: boolean }
        presence?: { key?: string }
      }
    }
  ): RealtimeChannel
  removeChannel(channel: RealtimeChannel): Promise<void>
  removeAllChannels(): Promise<void>
}
```

**VERIFY:**

```
pnpm typecheck
```

**STOP IF:**

- Ada pattern di 9 consumer files yang tidak representable → tambahkan ke interface

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0C-2: Buat SupabaseRealtimeProvider

**TASK ID:** `0C-2`

**OWNER TYPE:** refactor-agent

**GOAL:** Thin wrapper → `supabase.channel()` / `supabase.removeChannel()`.

**READ FIRST:** `src/services/realtime/types.ts`, `src/services/supabase/client.ts`

**EDIT ONLY:** `src/services/realtime/supabaseRealtimeProvider.ts` (CREATE NEW)

**DO NOT TOUCH:** Semua file lain

**COPY-PASTE STARTER:**

```tsx
// src/services/realtime/supabaseRealtimeProvider.ts
import { supabase } from '@/services/supabase/client'
import type { RealtimeProvider, RealtimeChannel } from './types'

export function createSupabaseRealtimeProvider(): RealtimeProvider {
  return {
    channel(name, options) {
      return supabase.channel(name, options) as unknown as RealtimeChannel
    },
    removeChannel(channel) {
      return supabase.removeChannel(
        channel as Parameters<typeof supabase.removeChannel>[0]
      ) as Promise<void>
    },
    removeAllChannels() {
      return supabase.removeAllChannels() as Promise<void>
    },
  }
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:** Supabase `.channel()` API tidak match → BLOCKED, update 0C-1

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0C-3: VilRealtimeProvider Stub + Singleton + Barrel + Init

**TASK ID:** `0C-3`

**OWNER TYPE:** refactor-agent

**GOAL:** VIL stub, singleton `getRealtimeProvider()`, barrel export, init di `main.tsx`.

**READ FIRST:** `src/services/auth/authProvider.ts` (singleton pattern reference)

**EDIT ONLY:**

- `src/services/realtime/vilRealtimeProvider.ts` (CREATE NEW)
- `src/services/realtime/realtimeProvider.ts` (CREATE NEW — singleton)
- `src/services/realtime/index.ts` (CREATE NEW — barrel)
- `src/main.tsx` (EDIT — tambah init)

**COPY-PASTE STARTER:**

```tsx
// src/services/realtime/vilRealtimeProvider.ts
import type { RealtimeProvider } from './types'

const NOT_IMPL = (m: string): never => {
  throw new Error(`[VIL Realtime] ${m} not yet implemented.`)
}

export function createVilRealtimeProvider(_baseUrl: string): RealtimeProvider {
  return {
    channel() {
      return NOT_IMPL('channel')
    },
    removeChannel() {
      return NOT_IMPL('removeChannel')
    },
    removeAllChannels() {
      return NOT_IMPL('removeAllChannels')
    },
  }
}
```

```tsx
// src/services/realtime/realtimeProvider.ts
import type { RealtimeProvider } from './types'

let _provider: RealtimeProvider | null = null

export function setRealtimeProvider(provider: RealtimeProvider): void {
  _provider = provider
}
export function getRealtimeProvider(): RealtimeProvider {
  if (!_provider)
    throw new Error('[RealtimeProvider] Not initialized. Call setRealtimeProvider() in main.tsx.')
  return _provider
}
```

```tsx
// src/services/realtime/index.ts
export type { RealtimeProvider, RealtimeChannel, PresenceState, ChannelStatus } from './types'
export { getRealtimeProvider, setRealtimeProvider } from './realtimeProvider'
export { createSupabaseRealtimeProvider } from './supabaseRealtimeProvider'
export { createVilRealtimeProvider } from './vilRealtimeProvider'
```

**Tambahkan di `main.tsx` SETELAH `setAuthProvider()` block:**

```tsx
import { setRealtimeProvider } from '@/services/realtime'
import { createSupabaseRealtimeProvider } from '@/services/realtime/supabaseRealtimeProvider'
import { createVilRealtimeProvider } from '@/services/realtime/vilRealtimeProvider'

if (apiBackend === 'vil') {
  setRealtimeProvider(
    createVilRealtimeProvider(import.meta.env.VITE_API_URL || 'http://localhost:8080')
  )
} else {
  setRealtimeProvider(createSupabaseRealtimeProvider())
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:** `pnpm typecheck` gagal

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0C-4: Refactor useBuilderChannel.ts (Broadcast + Presence)

**TASK ID:** `0C-4`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor — PALING COMPLEX dari 9 consumers. Pakai broadcast + presence.

**READ FIRST:** `src/features/course-builder/hooks/useBuilderChannel.ts`, `src/services/realtime/types.ts`

**EDIT ONLY:** `src/features/course-builder/hooks/useBuilderChannel.ts`

**DO NOT TOUCH:** `src/services/realtime/*`, `src/services/supabase/*`

**IMPLEMENTATION STEPS:**

1. Ganti `import { supabase } from '@/services/supabase/client'`
2. Tambahkan `import { getRealtimeProvider } from '@/services/realtime'`
3. Ganti `supabase.channel(...)` → `getRealtimeProvider().channel(...)`
4. Ganti `supabase.removeChannel(...)` → `getRealtimeProvider().removeChannel(...)`
5. Pastikan `.on('broadcast', ...)`, `.on('presence', ...)`, `.track(...)`, `.send(...)` chains tetap sama

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/course-builder/hooks/useBuilderChannel.ts
# Harus return ZERO results
```

**STOP IF:** Channel API pattern tidak match interface → BLOCKED, update 0C-1

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0C-5: Refactor useBuilderPresence.ts

**TASK ID:** `0C-5`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor presence hook.

**EDIT ONLY:** `src/features/course-builder/hooks/useBuilderPresence.ts`

**Pattern:** Sama dengan 0C-4. Ganti `supabase` → `getRealtimeProvider()`.

**VERIFY:**

```
pnpm typecheck
grep -n "from '@/services/supabase/client'" src/features/course-builder/hooks/useBuilderPresence.ts
```

**STOP IF:** Pattern tidak match → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0C-6: Refactor useNotifications.ts + useAdminNotifications.ts

**TASK ID:** `0C-6`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor notification hooks (postgres_changes pattern).

**EDIT ONLY:**

- `src/features/notifications/hooks/useNotifications.ts`
- `src/features/notifications/hooks/useAdminNotifications.ts`

**Pattern:** Ganti `supabase.channel(...)` → `getRealtimeProvider().channel(...)`. Pattern `postgres_changes` dengan `.on('postgres_changes', { event: '*', schema: 'public', table: '...', filter: '...' }, handler)`.

**VERIFY:**

```
pnpm typecheck
grep -rn "from '@/services/supabase/client'" src/features/notifications/hooks/useNotifications.ts src/features/notifications/hooks/useAdminNotifications.ts
```

**STOP IF:** postgres_changes pattern tidak match → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0C-7: Refactor discussionQueries.ts + useMessages.ts + MessageThread.tsx

**TASK ID:** `0C-7`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor discussion/messaging realtime consumers.

**EDIT ONLY:**

- `src/features/discussions/queries/discussionQueries.ts`
- `src/features/messaging/hooks/useMessages.ts`
- `src/features/messaging/components/MessageThread.tsx`

**Pattern:** Sama — ganti `supabase` → `getRealtimeProvider()`. discussionQueries pakai `postgres_changes`, useMessages dan MessageThread pakai `broadcast`.

**VERIFY:**

```
pnpm typecheck
grep -rn "from '@/services/supabase/client'" src/features/discussions/queries/discussionQueries.ts src/features/messaging/hooks/useMessages.ts src/features/messaging/components/MessageThread.tsx
```

**STOP IF:** >5 files perlu diubah bersamaan → split

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0C-8: Refactor classroomService.ts + groupAssignmentService.ts

**TASK ID:** `0C-8`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor remaining realtime consumers.

**EDIT ONLY:**

- `src/features/classroom/api/classroomService.ts`
- `src/features/assignments/api/groupAssignmentService.ts`

**⚠️ CATATAN:** File ini mungkin juga punya `supabase.from(...)` calls (CRUD). Untuk task ini, HANYA refactor realtime calls (`supabase.channel(...)`, `supabase.removeChannel(...)`). CRUD refactor akan dilakukan di wave service refactor terpisah.

**VERIFY:**

```
pnpm typecheck
# Verify HANYA realtime imports hilang, CRUD imports mungkin masih ada:
grep -n "supabase\.channel\|supabase\.removeChannel" src/features/classroom/api/classroomService.ts src/features/assignments/api/groupAssignmentService.ts
# Harus return ZERO results
```

**STOP IF:** File mixed CRUD + realtime dan tidak bisa dipisahkan → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0C-9: Realtime Abstraction Verification

**TASK ID:** `0C-9`

**OWNER TYPE:** test-agent

**GOAL:** Verifikasi SEMUA 9 realtime consumer files sudah direfactor.

**EDIT ONLY:** Tidak ada

**VERIFY:**

```
# Zero direct supabase.channel() calls di consumer files
grep -rn "supabase\.channel\|supabase\.removeChannel" \
  src/features/course-builder/hooks/ \
  src/features/notifications/hooks/ \
  src/features/discussions/queries/ \
  src/features/messaging/ \
  src/features/classroom/api/ \
  src/features/assignments/api/
# Expected: ZERO results

# Supabase realtime hanya di abstraction layer
grep -rn "from '@/services/supabase/client'" src/services/realtime/
# Expected: 1 result ONLY (supabaseRealtimeProvider.ts)

pnpm typecheck
pnpm lint
pnpm test:ci
```

**STOP IF:** Ditemukan supabase realtime calls → kembali ke task yang sesuai

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# 📦 Phase 0D — Storage Abstraction

<aside>
📦

**5 consumer files** harus direfactor. Pattern: upload, download, remove, getPublicUrl, createSignedUrl. Buckets: `videos`, `submissions`, `avatars`, `documents`, `certificates`.

</aside>

---

## Task 0D-1: Buat StorageProvider Interface + Types

**TASK ID:** `0D-1`

**OWNER TYPE:** refactor-agent

**GOAL:** Definisikan `StorageProvider` interface yang mengabstraksi Supabase Storage.

**READ FIRST:**

- `src/services/storage/storageService.ts` (jika ada) ATAU `src/features/*/api/*` files yang pakai `supabase.storage`
- `src/features/courses/api/videoUploadService.ts`
- `src/features/courses/api/videoCaptionService.ts`
- `src/features/assignments/api/assignmentService.ts`
- `src/features/documents/api/documentApi.ts`

**EDIT ONLY:** `src/services/storage/types.ts` (CREATE NEW)

**DO NOT TOUCH:** Semua consumer files

**COPY-PASTE STARTER:**

```tsx
// src/services/storage/types.ts
// =============================================================================
// Storage Abstraction — Type Definitions
// =============================================================================
// Match Supabase Storage API shapes. 5 consumer files depend on ini.
// =============================================================================

export interface StorageUploadResult {
  path: string
  id?: string
  fullPath?: string
}

export interface StorageError {
  message: string
  statusCode?: string
}

export interface StorageUploadResponse {
  data: StorageUploadResult | null
  error: StorageError | null
}

export interface StorageRemoveResponse {
  data: unknown[] | null
  error: StorageError | null
}

export interface StorageBucketClient {
  upload(
    path: string,
    file: File | Blob | ArrayBuffer,
    options?: { contentType?: string; upsert?: boolean; cacheControl?: string }
  ): Promise<StorageUploadResponse>

  download(path: string): Promise<{ data: Blob | null; error: StorageError | null }>

  remove(paths: string[]): Promise<StorageRemoveResponse>

  getPublicUrl(path: string): { data: { publicUrl: string } }

  createSignedUrl(
    path: string,
    expiresIn: number
  ): Promise<{ data: { signedUrl: string } | null; error: StorageError | null }>

  list(
    path?: string,
    options?: { limit?: number; offset?: number; sortBy?: { column: string; order: string } }
  ): Promise<{
    data: Array<{ name: string; id?: string; metadata?: Record<string, unknown> }> | null
    error: StorageError | null
  }>
}

export interface StorageProvider {
  from(bucket: string): StorageBucketClient
}
```

**VERIFY:**

```
pnpm typecheck
```

**STOP IF:** Ada storage method di codebase yang belum ada di interface → tambahkan

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0D-2: Buat SupabaseStorageProvider

**TASK ID:** `0D-2`

**OWNER TYPE:** refactor-agent

**GOAL:** Thin wrapper → `supabase.storage.from(bucket)`.

**READ FIRST:** `src/services/storage/types.ts`, `src/services/supabase/client.ts`

**EDIT ONLY:** `src/services/storage/supabaseStorageProvider.ts` (CREATE NEW)

**COPY-PASTE STARTER:**

```tsx
// src/services/storage/supabaseStorageProvider.ts
import { supabase } from '@/services/supabase/client'
import type { StorageProvider } from './types'

export function createSupabaseStorageProvider(): StorageProvider {
  return {
    from(bucket) {
      return supabase.storage.from(bucket) as unknown as ReturnType<StorageProvider['from']>
    },
  }
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:** Supabase storage API tidak match → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0D-3: VilStorageProvider Stub + Singleton + Barrel + Init

**TASK ID:** `0D-3`

**OWNER TYPE:** refactor-agent

**GOAL:** VIL stub, singleton, barrel, init di main.tsx.

**EDIT ONLY:**

- `src/services/storage/vilStorageProvider.ts` (CREATE NEW)
- `src/services/storage/storageProvider.ts` (CREATE NEW — singleton)
- `src/services/storage/index.ts` (CREATE NEW — barrel)
- `src/main.tsx` (EDIT — tambah init)

**COPY-PASTE STARTER:**

```tsx
// src/services/storage/vilStorageProvider.ts
import type { StorageProvider } from './types'

const NOT_IMPL = (m: string): never => {
  throw new Error(`[VIL Storage] ${m} not yet implemented.`)
}

export function createVilStorageProvider(_baseUrl: string): StorageProvider {
  return {
    from() {
      return NOT_IMPL('from')
    },
  }
}
```

```tsx
// src/services/storage/storageProvider.ts
import type { StorageProvider } from './types'

let _provider: StorageProvider | null = null

export function setStorageProvider(provider: StorageProvider): void {
  _provider = provider
}
export function getStorageProvider(): StorageProvider {
  if (!_provider)
    throw new Error('[StorageProvider] Not initialized. Call setStorageProvider() in main.tsx.')
  return _provider
}
```

```tsx
// src/services/storage/index.ts
export type {
  StorageProvider,
  StorageBucketClient,
  StorageUploadResponse,
  StorageRemoveResponse,
  StorageError,
} from './types'
export { getStorageProvider, setStorageProvider } from './storageProvider'
export { createSupabaseStorageProvider } from './supabaseStorageProvider'
export { createVilStorageProvider } from './vilStorageProvider'
```

**Tambahkan di `main.tsx` SETELAH `setRealtimeProvider()` block:**

```tsx
import { setStorageProvider } from '@/services/storage'
import { createSupabaseStorageProvider } from '@/services/storage/supabaseStorageProvider'
import { createVilStorageProvider } from '@/services/storage/vilStorageProvider'

if (apiBackend === 'vil') {
  setStorageProvider(
    createVilStorageProvider(import.meta.env.VITE_API_URL || 'http://localhost:8080')
  )
} else {
  setStorageProvider(createSupabaseStorageProvider())
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
```

**STOP IF:** `pnpm typecheck` gagal

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0D-4: Refactor storageService.ts

**TASK ID:** `0D-4`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor generic storage service.

**READ FIRST:** `src/services/storage/storageService.ts` (atau lokasi actual file)

**EDIT ONLY:** Storage service file yang ada

**IMPLEMENTATION STEPS:**

1. Ganti `import { supabase } from '@/services/supabase/client'`
2. Tambahkan `import { getStorageProvider } from '@/services/storage'`
3. Ganti `supabase.storage.from(...)` → `getStorageProvider().from(...)`

**VERIFY:**

```
pnpm typecheck
grep -rn "supabase\.storage" src/services/storage/storageService.ts
# Harus return ZERO results
```

**STOP IF:** File tidak ada di path expected → cari dulu dengan `grep -rn "supabase.storage" src/`

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0D-5: Refactor videoUploadService.ts + videoCaptionService.ts

**TASK ID:** `0D-5`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor video storage consumers.

**EDIT ONLY:**

- `src/features/courses/api/videoUploadService.ts`
- `src/features/courses/api/videoCaptionService.ts`

**Pattern:** `supabase.storage.from('videos')` → `getStorageProvider().from('videos')`

**⚠️ CATATAN:** File mungkin juga punya `supabase.from(...)` CRUD calls. Untuk task ini, HANYA refactor `.storage.from(...)` calls.

**VERIFY:**

```
pnpm typecheck
grep -rn "supabase\.storage" src/features/courses/api/videoUploadService.ts src/features/courses/api/videoCaptionService.ts
# Harus ZERO
```

**STOP IF:** Mixed storage + CRUD dan tidak bisa dipisahkan → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0D-6: Refactor assignmentService.ts + documentApi.ts

**TASK ID:** `0D-6`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor remaining storage consumers.

**EDIT ONLY:**

- `src/features/assignments/api/assignmentService.ts`
- `src/features/documents/api/documentApi.ts`

**Pattern:** `supabase.storage.from('submissions')` → `getStorageProvider().from('submissions')`, etc.

**⚠️ CATATAN SAMA:** Hanya refactor `.storage.from(...)` calls.

**VERIFY:**

```
pnpm typecheck
grep -rn "supabase\.storage" src/features/assignments/api/assignmentService.ts src/features/documents/api/documentApi.ts
# Harus ZERO
```

**STOP IF:** Mixed storage + CRUD → BLOCKED

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0D-7: Scan + Refactor Additional Storage Consumers

**TASK ID:** `0D-7`

**OWNER TYPE:** refactor-agent

**GOAL:** Cari dan refactor storage consumers yang mungkin terlewat.

**EDIT ONLY:** File-file yang ditemukan

**IMPLEMENTATION STEPS:**

1. Jalankan scan:

```
grep -rn "supabase\.storage" src/features/ src/services/ src/contexts/ src/utils/ src/components/ | grep -v node_modules | grep -v __tests__
```

1. Untuk setiap file yang ditemukan (selain `supabaseStorageProvider.ts`):
   - Ganti `supabase.storage.from(...)` → `getStorageProvider().from(...)`
2. Jika ditemukan >5 file tambahan → split menjadi sub-tasks

**VERIFY:**

```
grep -rn "supabase\.storage" src/features/ src/services/ src/contexts/ src/utils/ src/components/ | grep -v supabaseStorageProvider | grep -v __tests__ | wc -l
# Harus return ZERO
pnpm typecheck
```

**STOP IF:** >5 file tambahan → split sub-tasks

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0D-8: Storage Abstraction Verification

**TASK ID:** `0D-8`

**OWNER TYPE:** test-agent

**GOAL:** Verifikasi SEMUA storage consumers sudah direfactor.

**VERIFY:**

```
# Zero direct supabase.storage calls di consumer files
grep -rn "supabase\.storage" src/ | grep -v supabaseStorageProvider | grep -v node_modules | grep -v __tests__ | wc -l
# Expected: ZERO

# Supabase storage hanya di abstraction layer
grep -rn "from '@/services/supabase/client'" src/services/storage/
# Expected: 1 result ONLY (supabaseStorageProvider.ts)

pnpm typecheck
pnpm lint
pnpm test:ci
pnpm build
```

**STOP IF:** Ditemukan supabase storage calls → kembali ke task yang sesuai

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

# ✅ Phase 0B-0D Completion Gate

<aside>
🚪

**SEMUA criteria di bawah harus pass sebelum lanjut ke Phase 0E/0F (CI Guard + Compatibility Contract Freeze).**

</aside>

| **Criteria**                       | **Command**                                                                                                    | **Expected**                 | **Status** |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------- |
| Auth abstracted (incl. MFA)        | `grep -rn "supabase.auth" src/contexts/ src/features/auth/`                                                    | 0 results                    | ⬜         |
| Realtime abstracted (9 consumers)  | `grep -rn "supabase.channel" src/features/`                                                                    | 0 results                    | ⬜         |
| Storage abstracted (all consumers) | `grep -rn "supabase.storage" src/ \| grep -v supabaseStorage`                                                  | 0 results                    | ⬜         |
| Supabase ONLY in abstraction layer | `grep -rn "from '@/services/supabase/client'" src/services/auth/ src/services/realtime/ src/services/storage/` | 3 results (one per provider) | ⬜         |
| AuthContextType shape unchanged    | `grep "AuthContextType" src/contexts/AuthContext.tsx`                                                          | Present, 25+ fields          | ⬜         |
| useAuth() export unchanged         | `grep "export.*useAuth" src/contexts/AuthContext.tsx`                                                          | Present                      | ⬜         |
| Token refresh timing unchanged     | `grep "60000\|60_000" src/contexts/auth/`                                                                      | Present                      | ⬜         |
| `pnpm typecheck`                   | `pnpm typecheck`                                                                                               | 0 errors                     | ⬜         |
| `pnpm lint`                        | `pnpm lint`                                                                                                    | No new errors                | ⬜         |
| `pnpm test:ci`                     | `pnpm test:ci`                                                                                                 | All pass                     | ⬜         |
| `pnpm build`                       | `pnpm build`                                                                                                   | Success                      | ⬜         |
| Zero behavioral changes            | Manual test: login, browse, realtime, upload                                                                   | Identical                    | ⬜         |

---

## Files Created (Phase 0B-0D)

```
src/services/auth/
├── types.ts                    # Auth types + AuthProvider interface (0B-1)
├── authProvider.ts             # Singleton getAuthProvider/setAuthProvider (0B-4)
├── supabaseAuthProvider.ts     # Supabase implementation (0B-2)
├── vilAuthProvider.ts          # VIL stub (0B-3)
└── index.ts                    # Barrel export (0B-4)

src/services/realtime/
├── types.ts                    # Realtime types + RealtimeProvider interface (0C-1)
├── realtimeProvider.ts         # Singleton (0C-3)
├── supabaseRealtimeProvider.ts # Supabase implementation (0C-2)
├── vilRealtimeProvider.ts      # VIL stub (0C-3)
└── index.ts                    # Barrel export (0C-3)

src/services/storage/
├── types.ts                    # Storage types + StorageProvider interface (0D-1)
├── storageProvider.ts          # Singleton (0D-3)
├── supabaseStorageProvider.ts  # Supabase implementation (0D-2)
├── vilStorageProvider.ts       # VIL stub (0D-3)
└── index.ts                    # Barrel export (0D-3)
```

---

# 🔀 Phase 0X — Cross-Cutting (Setelah 0B + 0C + 0D Selesai)

<aside>
🔀

**Gap Fix #3, #5, #6, #14.** Files yang tidak masuk di auth, realtime, atau storage — tapi masih import `supabase` langsung. HARUS diselesaikan sebelum Phase 0 Gate 1.

</aside>

---

## Task 0X-1: Refactor offlineQueue.ts → getApiClient()

<aside>
🚨

**Gap Fix #3 — offlineQueue.ts.** Main plan CC6 secara eksplisit menyebut file ini pakai `supabase.from()` / `supabase.rpc()`. Bukan auth, bukan realtime, bukan storage — tapi HARUS direfactor.

</aside>

**TASK ID:** `0X-1`

**OWNER TYPE:** refactor-agent

**GOAL:** Refactor `offlineQueue.ts` dan related offline files — hapus semua direct supabase imports.

**READ FIRST:**

- `src/utils/offlineQueue.ts`
- `src/utils/offlineStorage.ts` (jika ada)
- `src/features/xapi/api/xapiQueue.ts` (jika ada)
- Main plan CC6 (Offline & Queue Semantics)

**EDIT ONLY:** Files yang ditemukan oleh scan

**DO NOT TOUCH:** `src/services/*` (abstraction layer sudah selesai)

**IMPLEMENTATION STEPS:**

1. Scan: `grep -rn "from '@/services/supabase/client'" src/utils/offline* src/features/xapi/`
2. Ganti `supabase.from(...)` → `getApiClient().from(...)`
3. Ganti `supabase.rpc(...)` → `getApiClient().rpc(...)`
4. JANGAN ubah retry policy, idempotency keys, atau delivery semantics
5. JANGAN ubah IndexedDB / sessionStorage queue formats

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -rn "from '@/services/supabase/client'" src/utils/offline*
# Harus ZERO
pnpm vitest run --reporter=verbose -- offlineQueue
```

**STOP IF:**

- File pakai `supabase` pattern yang tidak ada di `ApiClient` interface → BLOCKED
- Queue format berubah → REVERT

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0X-2: Refactor Edge Function Consumers (digestApi, notificationApi, etc.)

<aside>
🚨

**Gap Fix #5 & #6 — `supabase.functions.invoke()` pattern.** EduSync punya files yang call Edge Functions via `supabase.functions.invoke()`. Pattern ini sudah di-cover di `ApiClient.functions.invoke()` dari Phase 0A — tapi consumer files belum direfactor.

</aside>

**TASK ID:** `0X-2`

**OWNER TYPE:** refactor-agent

**GOAL:** Scan dan refactor SEMUA files yang pakai `supabase.functions.invoke()`.

**READ FIRST:**

- `src/services/api/apiClient.ts` (verifikasi bahwa `functions.invoke()` ada di interface)
- Main plan Phase 0G (menyebut `digestApi.ts`, `notificationApi.ts`)

**EDIT ONLY:** Files yang ditemukan oleh scan

**IMPLEMENTATION STEPS:**

1. **PERTAMA:** Verifikasi `ApiClient` interface punya `functions.invoke()`:

   `grep -n "functions" src/services/api/apiClient.ts`

   Jika TIDAK ADA → BLOCKED (harus tambahkan ke ApiClient dulu)

2. Scan semua consumers:

```
grep -rn "supabase\.functions\.invoke\|functions\.invoke" src/features/ src/utils/ | grep -v __tests__ | grep -v node_modules
```

1. Untuk setiap file:
   - Ganti `supabase.functions.invoke(...)` → `getApiClient().functions.invoke(...)`
   - Pastikan import `supabase` diganti ke `getApiClient`
2. Jika >5 files → split menjadi sub-tasks

**VERIFY:**

```
grep -rn "supabase\.functions" src/features/ src/utils/ | grep -v __tests__ | wc -l
# Harus ZERO
pnpm typecheck
pnpm lint
```

**STOP IF:**

- `ApiClient` interface tidak punya `functions.invoke()` → BLOCKED (harus update ApiClient di Phase 0A dulu)
-

> 10 files ditemukan → split sub-tasks

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0X-3: CI Guard — Enforce Zero Supabase Imports

<aside>
🛡️

**Gap Fix #14 — Phase 0E/0F/0G Taskified.** CI guard yang memastikan tidak ada regresi setelah Phase 0 selesai.

</aside>

**TASK ID:** `0X-3`

**OWNER TYPE:** refactor-agent

**GOAL:** Upgrade ESLint `no-restricted-imports` dari warn → error dan tambahkan grep CI check.

**READ FIRST:** `eslint.config.js` (current rule)

**EDIT ONLY:**

- `eslint.config.js` (upgrade warn → error)
- `package.json` (tambahkan script `check:supabase-imports`)

**IMPLEMENTATION STEPS:**

1. Di `eslint.config.js`, ubah `no-restricted-imports` rule untuk `@/services/supabase/client` dari `warn` ke `error`
2. Tambahkan script di `package.json`:

```json
"check:supabase-imports": "bash -c 'FOUND=$(grep -rn \"from .@/services/supabase/client.\" src/features/ src/contexts/ src/utils/ src/components/ | grep -v __tests__ | wc -l); echo \"Direct supabase imports: $FOUND\"; [ $FOUND -eq 0 ]'"
```

1. Tambahkan ke `pnpm validate` chain jika ada

**VERIFY:**

```
pnpm lint  # Harus error (bukan warn) jika ada direct supabase import
pnpm check:supabase-imports  # Harus return 0
pnpm typecheck
```

**STOP IF:**

- Masih ada direct supabase imports di feature files → kembali ke task sebelumnya

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

## Task 0X-4: Final Phase 0 Verification

**TASK ID:** `0X-4`

**OWNER TYPE:** test-agent

**GOAL:** Full verification bahwa Phase 0 selesai. Semua supabase imports hanya di abstraction layer.

**VERIFY:**

```
# 1. ZERO direct supabase imports di semua consumer code
grep -rn "from '@/services/supabase/client'" src/features/ src/contexts/ src/utils/ src/components/ | grep -v __tests__ | wc -l
# Expected: ZERO

# 2. Supabase ONLY in 4 abstraction files
grep -rn "from '@/services/supabase/client'" src/services/
# Expected: 4 results ONLY:
#   supabaseApiClient.ts
#   supabaseAuthProvider.ts
#   supabaseRealtimeProvider.ts
#   supabaseStorageProvider.ts

# 3. Zero supabase.functions.invoke in features
grep -rn "supabase\.functions" src/features/ src/utils/ | grep -v __tests__ | wc -l
# Expected: ZERO

# 4. Full validation
pnpm typecheck
pnpm lint
pnpm test:ci
pnpm build
pnpm check:supabase-imports

# 5. VITE_API_BACKEND=supabase functionally identical
# Manual test: login, browse courses, realtime notifications, file upload
```

**STOP IF:**

- ANY of the above checks fail → kembali ke task yang sesuai

**OUTPUT FORMAT:** DONE / BLOCKED / FILES / VERIFY

---

<aside>
🏁

**Setelah 0X-4 DONE → Phase 0 Gate 1 Review.**

Jika semua pass: proceed ke Phase 1 (VIL Server Scaffold + Auth).

Jika regressions > 2 minggu: evaluasi ulang scope migrasi.

</aside>
