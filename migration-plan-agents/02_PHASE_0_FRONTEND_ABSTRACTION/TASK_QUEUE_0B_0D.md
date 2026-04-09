# Task Queue — Waves 0B-0D: Auth, Realtime & Storage Abstraction

**Timeline:** Weeks 5-9 (~80 hours)
**Goal:** Abstract Auth, Realtime, and Storage from Supabase

## Prerequisites

- [ ] Phase 0A complete (all service files refactored)
- [ ] `getApiClient()` singleton working
- [ ] ESLint CI Guard active

## Parallel Execution

Waves 0B, 0C, and 0D can run in parallel with different agents:

- **0B:** `feat/phase-0b-auth-abstraction`
- **0C:** `feat/phase-0c-realtime-abstraction`
- **0D:** `feat/phase-0d-storage-abstraction`

**Critical:** Task `0-INIT` (Provider Init) must complete BEFORE 0B-4, 0C-3, or 0D-3.

---

# 🔑 Wave 0B: Auth Abstraction

**Most sensitive area** — 48 feature modules depend on `useAuth()`

## Dependency Graph

```
0A (DONE) → 0-INIT → 0B-1 → 0B-2 → 0B-3 → 0B-4 → 0B-5 → 0B-6 → 0B-6.5
                                                              ↓
                                                         0B-7 → 0B-8 → 0B-9
```

## Task 0-INIT: Consolidated Provider Init in main.tsx

**CRITICAL:** Tasks 0B-4, 0C-3, and 0D-3 all edit `main.tsx`. Consolidate all init here to avoid merge conflicts.

**Output:** Edit `src/main.tsx` (add after `setApiClient()` block)

```typescript
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
// ... similar pattern

// Storage Provider
import { setStorageProvider } from '@/services/storage'
// ... similar pattern
```

---

## Task 0B-1: AuthProvider Interface + Types

**Output:** `src/services/auth/types.ts`

```typescript
export interface AuthUser {
  id: string
  email?: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
  // ... full Supabase User shape
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: AuthUser
}

export interface AuthProvider {
  getSession(): Promise<{ data: { session: AuthSession | null }; error: AuthError | null }>
  getUser(): Promise<{ data: { user: AuthUser | null }; error: AuthError | null }>
  onAuthStateChange(callback): { data: { subscription: AuthSubscription } }

  signInWithPassword(credentials): Promise<AuthResponse>
  signUp(credentials): Promise<AuthResponse>
  signInWithOAuth(options): Promise<...>
  signOut(): Promise<...>

  refreshSession(): Promise<AuthResponse>
  exchangeCodeForSession(code): Promise<AuthResponse>
  resetPasswordForEmail(email): Promise<...>
  updateUser(attributes): Promise<...>

  mfa: {
    enroll(params): Promise<MFAEnrollResult>
    challenge(params): Promise<MFAChallengeResult>
    verify(params): Promise<MFAVerifyResult>
    unenroll(params): Promise<...>
    listFactors(): Promise<MFAListFactorsResult>
    getAuthenticatorAssuranceLevel(): Promise<...>
  }
}
```

---

## Task 0B-2: SupabaseAuthProvider

**Output:** `src/services/auth/supabaseAuthProvider.ts`

Thin wrapper — delegate to existing `supabase.auth`:

```typescript
export function createSupabaseAuthProvider(): AuthProvider {
  const auth = supabase.auth
  return {
    getSession() {
      return auth.getSession()
    },
    signInWithPassword(c) {
      return auth.signInWithPassword(c)
    },
    // ... all methods delegate
    mfa: {
      enroll(p) {
        return auth.mfa.enroll(p)
      },
      // ... all MFA methods delegate
    },
  }
}
```

---

## Task 0B-3: VilAuthProvider Stub

**Output:** `src/services/auth/vilAuthProvider.ts`

All methods throw "Not implemented":

```typescript
export function createVilAuthProvider(_baseUrl: string): AuthProvider {
  return {
    getSession() {
      return NOT_IMPL('getSession')
    },
    signInWithPassword() {
      return NOT_IMPL('signInWithPassword')
    },
    // ... all methods throw
  }
}
```

---

## Task 0B-4: Auth Singleton + Barrel + main.tsx Init

**Output:**

- `src/services/auth/authProvider.ts` (singleton)
- `src/services/auth/index.ts` (barrel)
- `src/main.tsx` (init — or use 0-INIT)

```typescript
// src/services/auth/authProvider.ts
let _authProvider: AuthProvider | null = null

export function setAuthProvider(provider: AuthProvider): void {
  _authProvider = provider
}

export function getAuthProvider(): AuthProvider {
  if (!_authProvider) throw new Error('[AuthProvider] Not initialized')
  return _authProvider
}
```

---

## Task 0B-5: Refactor authService.ts

**Output:** Edit `src/features/auth/api/authService.ts`

```typescript
// Replace
import { supabase } from '@/services/supabase/client'

// With
import { getAuthProvider } from '@/services/auth'
import { getApiClient } from '@/services/api'

// Replace
supabase.auth.signInWithPassword(...) → getAuthProvider().signInWithPassword(...)
supabase.rpc('get_auth_bootstrap')  → getApiClient().rpc('get_auth_bootstrap')
supabase.from('profiles')           → getApiClient().from('profiles')
```

---

## Task 0B-6: Refactor mfaService.ts

**Output:** Edit `src/features/auth/api/mfaService.ts`

```typescript
// Replace
supabase.auth.mfa.enroll(...)  → getAuthProvider().mfa.enroll(...)
supabase.auth.mfa.verify(...) → getAuthProvider().mfa.verify(...)
// ... all MFA methods
```

---

## Task 0B-6.5: Refactor useRoleResolution.ts

**Output:** Edit `src/contexts/auth/useRoleResolution.ts`

```typescript
// Replace supabase.from/rpc with getApiClient()
// Replace supabase.auth.* with getAuthProvider()
```

---

## Task 0B-7: Refactor useSessionManagement.ts

**Output:** Edit `src/contexts/auth/useSessionManagement.ts`

**CRITICAL:** Keep timing constants unchanged:

- Refresh interval: `60_000ms`
- Expiry threshold: `300` seconds (5 minutes)

```typescript
// Replace
supabase.auth.getSession()        → getAuthProvider().getSession()
supabase.auth.onAuthStateChange() → getAuthProvider().onAuthStateChange()
supabase.auth.refreshSession()    → getAuthProvider().refreshSession()
```

---

## Task 0B-8: Refactor AuthContext.tsx

**Output:** Edit `src/contexts/AuthContext.tsx`

**CRITICAL:** Do NOT change:

- `AuthContextType` shape (25+ fields)
- `useAuth()` hook return value
- SignOut localStorage clearing order
- Tenant switching behavior
- `bootstrapReady` gate logic

```typescript
// Replace all
supabase.auth.* → getAuthProvider().*
supabase.rpc()  → getApiClient().rpc()
supabase.from() → getApiClient().from()
```

---

## Task 0B-9: Auth Verification

```bash
# Zero supabase imports in auth files
grep -rn "from '@/services/supabase/client'" \
  src/features/auth/ src/contexts/auth/ src/contexts/AuthContext.tsx
# Expected: 0 results

pnpm typecheck && pnpm lint && pnpm test:ci && pnpm build
```

---

# 📡 Wave 0C: Realtime Abstraction

**9 consumer files** — 3 patterns: `postgres_changes`, `broadcast`, `presence`

## Task 0C-0: Scan Realtime Consumers

**Output:** Documented list of actual files using `supabase.channel()`

```bash
grep -rn "supabase\.channel\|supabase\.removeChannel" \
  src/ | grep -v node_modules | grep -v __tests__
```

---

## Task 0C-1: RealtimeProvider Interface + Types

**Output:** `src/services/realtime/types.ts`

```typescript
export interface RealtimeChannel {
  on(type: 'postgres_changes', config, handler): RealtimeChannel
  on(type: 'broadcast', config, handler): RealtimeChannel
  on(type: 'presence', config, handler): RealtimeChannel
  subscribe(callback?): RealtimeChannel
  unsubscribe(): Promise<void>
  send(payload): Promise<'ok' | 'error' | 'timed out'>
  track(state): Promise<...>
  untrack(): Promise<...>
  presenceState(): PresenceState
}

export interface RealtimeProvider {
  channel(name, options?): RealtimeChannel
  removeChannel(channel): Promise<void>
  removeAllChannels(): Promise<void>
}
```

---

## Task 0C-2: SupabaseRealtimeProvider

**Output:** `src/services/realtime/supabaseRealtimeProvider.ts`

```typescript
export function createSupabaseRealtimeProvider(): RealtimeProvider {
  return {
    channel(name, options) {
      return supabase.channel(name, options)
    },
    removeChannel(channel) {
      return supabase.removeChannel(channel)
    },
    removeAllChannels() {
      return supabase.removeAllChannels()
    },
  }
}
```

---

## Task 0C-3: VilRealtimeProvider + Singleton + Barrel

**Output:**

- `src/services/realtime/vilRealtimeProvider.ts`
- `src/services/realtime/realtimeProvider.ts`
- `src/services/realtime/index.ts`

---

## Consumer File Refactoring

| Task  | File                                                        | Pattern              |
| ----- | ----------------------------------------------------------- | -------------------- |
| 0C-4  | `src/features/course-builder/hooks/useBuilderChannel.ts`    | broadcast + presence |
| 0C-5  | `src/features/course-builder/hooks/useBuilderPresence.ts`   | presence             |
| 0C-6  | `src/features/notifications/hooks/useNotifications.ts`      | postgres_changes     |
| 0C-6b | `src/features/notifications/hooks/useAdminNotifications.ts` | postgres_changes     |
| 0C-7a | `src/features/discussions/queries/discussionQueries.ts`     | postgres_changes     |
| 0C-7b | `src/features/messaging/hooks/useMessages.ts`               | broadcast            |
| 0C-7c | `src/features/messaging/components/MessageThread.tsx`       | broadcast            |
| 0C-8a | `src/features/classroom/api/classroomService.ts`            | (realtime only)      |
| 0C-8b | `src/features/assignments/api/groupAssignmentService.ts`    | (realtime only)      |

**Pattern:**

```typescript
// Replace
import { supabase } from '@/services/supabase/client'
supabase.channel(...) → getRealtimeProvider().channel(...)
```

---

## Task 0C-9: Realtime Verification

```bash
# Zero supabase.channel() calls in consumer files
grep -rn "supabase\.channel\|supabase\.removeChannel" \
  src/features/course-builder/hooks/ \
  src/features/notifications/hooks/ \
  src/features/discussions/queries/ \
  src/features/messaging/ \
  src/features/classroom/api/ \
  src/features/assignments/api/
# Expected: 0 results

pnpm typecheck && pnpm lint && pnpm test:ci
```

---

# 📦 Wave 0D: Storage Abstraction

**5 consumer files** — buckets: `videos`, `submissions`, `avatars`, `documents`, `certificates`

## Task 0D-1: StorageProvider Interface + Types

**Output:** `src/services/storage/types.ts`

```typescript
export interface StorageBucketClient {
  upload(path, file, options?): Promise<StorageUploadResponse>
  download(path): Promise<{ data: Blob | null; error: StorageError | null }>
  remove(paths): Promise<StorageRemoveResponse>
  getPublicUrl(path): { data: { publicUrl: string } }
  createSignedUrl(path, expiresIn): Promise<...>
  list(path?, options?): Promise<...>
}

export interface StorageProvider {
  from(bucket: string): StorageBucketClient
}
```

---

## Task 0D-2: SupabaseStorageProvider

**Output:** `src/services/storage/supabaseStorageProvider.ts`

```typescript
export function createSupabaseStorageProvider(): StorageProvider {
  return {
    from(bucket) {
      return supabase.storage.from(bucket)
    },
  }
}
```

---

## Task 0D-3: VilStorageProvider + Singleton + Barrel

**Output:**

- `src/services/storage/vilStorageProvider.ts`
- `src/services/storage/storageProvider.ts`
- `src/services/storage/index.ts`

---

## Consumer File Refactoring

| Task | File                                                | Notes |
| ---- | --------------------------------------------------- | ----- |
| 0D-4 | `src/features/courses/api/videoUploadService.ts`    |       |
| 0D-5 | `src/features/courses/api/videoCaptionService.ts`   |       |
| 0D-6 | `src/features/assignments/api/assignmentService.ts` |       |
| 0D-7 | `src/features/documents/api/documentApi.ts`         |       |

**Pattern:**

```typescript
// Replace
import { supabase } from '@/services/supabase/client'
supabase.storage.from('videos').upload(...) → getStorageProvider().from('videos').upload(...)
```

---

## Task 0D-8: Storage Verification

```bash
# Zero supabase.storage imports in consumer files
grep -rn "supabase\.storage" src/features/
# Expected: 0 results (only in abstraction layer)

pnpm typecheck && pnpm lint && pnpm test:ci
```

---

# Wave 0X: Cross-Cutting Tasks

After all 0B, 0C, 0D complete:

| Task | Description                                  |
| ---- | -------------------------------------------- |
| 0X-1 | Refactor `offlineQueue.ts` if not done in 0A |
| 0X-2 | Refactor Edge Function consumers             |
| 0X-3 | CI Guard enforce (ESLint error level)        |
| 0X-4 | Full verification + E2E tests                |

---

## Merge Order

```
main ← feat/phase-0-init-providers ← feat/phase-0b-auth-abstraction
                          ↓
              feat/phase-0c-realtime-abstraction
              feat/phase-0d-storage-abstraction
                          ↓
              feat/phase-0x-cross-cutting
```
