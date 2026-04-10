# Task Queue — Waves 0B-0D (FROZEN PREBUILT QUEUE)

# Auth, Realtime, and Storage Abstraction

**Status:** FROZEN  
**Execution Status:** DO NOT EXECUTE YET  
**Purpose:** Menyiapkan queue siap-eksekusi untuk fase setelah Gate RS + Gate 0A pass  
**Current Program Rule:** Phase 0A only. 0B–0E tetap freeze.

---

## Freeze Rules

Queue ini **bole h dipopulate**, **tidak boleh dieksekusi** sampai semua syarat berikut benar:

- [ ] Phase -1 Reality Sync sudah CLOSED
- [ ] Phase 0A sudah PASSED
- [ ] `src/services/api/*` sudah stabil
- [ ] proving path `courseService` sudah hijau
- [ ] CI workflow sudah diverifikasi
- [ ] readiness program sudah dinaikkan sesuai gate aktif

**NO-GO:**  
Jangan buka 0B/0C/0D saat 0A belum pass.

---

## Shared Assumptions

Semua wave 0B–0D mengasumsikan Phase 0A sudah menghasilkan:

- `src/services/api/types.ts`
- `src/services/api/apiClient.ts`
- `src/services/api/supabaseApiClient.ts`
- `src/services/api/vilApiClient.ts`
- `src/services/api/index.ts`
- `initApiClient(...)` di `src/main.tsx`

---

## Merge / Branch Strategy

- `feat/phase-0b-auth-abstraction`
- `feat/phase-0c-realtime-abstraction`
- `feat/phase-0d-storage-abstraction`

**Recommended order after unfreeze:**

1. 0B Auth
2. 0C Realtime
3. 0D Storage

**Do not run 0C/0D first** unless 0B singleton/provider foundation is already proven.

---

# Wave 0B — Auth Abstraction

**Blast radius:** Very High  
**Reason:** `authService.ts`, `mfaService.ts`, `useSessionManagement.ts`, `useRoleResolution.ts`, dan `AuthContext.tsx` masih coupled ke Supabase secara langsung.

## 0B Entry Conditions

- [ ] Phase 0A PASS
- [ ] `getApiClient()` proven working
- [ ] No scope widening into Phase 1
- [ ] Routing compatibility note already exists
- [ ] Auth parity test plan drafted

---

## 0B-0: Auth Provider Foundation

**Output:**

- `src/services/auth/types.ts`
- `src/services/auth/authProvider.ts`
- `src/services/auth/index.ts`

### Required interfaces

- `AuthUser`
- `AuthSession`
- `AuthError`
- `AuthSubscription`
- `AuthProvider`

### Required provider capabilities

- `getSession()`
- `getUser()`
- `onAuthStateChange()`
- `signInWithPassword()`
- `signUp()`
- `signInWithOAuth()`
- `signOut()`
- `refreshSession()`
- `exchangeCodeForSession()`
- `resetPasswordForEmail()`
- `updateUser()`
- `mfa.enroll()`
- `mfa.challenge()`
- `mfa.challengeAndVerify()`
- `mfa.verify()`
- `mfa.unenroll()`
- `mfa.listFactors()`
- `mfa.getAuthenticatorAssuranceLevel()`

### Singleton contract

```ts
let activeAuthProvider: AuthProvider | null = null

export function setAuthProvider(provider: AuthProvider): void {
  activeAuthProvider = provider
}

export function getAuthProvider(): AuthProvider {
  if (!activeAuthProvider) {
    throw new Error('[AuthProvider] Not initialized')
  }
  return activeAuthProvider
}
```

---

## 0B-1: SupabaseAuthProvider

**Output:** `src/services/auth/supabaseAuthProvider.ts`

**Rule:** thin wrapper only. Delegate ke `supabase.auth` dari `src/services/supabase/client.ts`.

**Do not:**

- tambah business logic baru
- ubah error semantics
- ubah timing/redirect behavior

---

## 0B-2: VilAuthProvider Stub

**Output:** `src/services/auth/vilAuthProvider.ts`

**Rule:** semua method boleh return `NOT_IMPLEMENTED`, tapi shape response harus tetap konsisten dengan `AuthProvider`.

**Do not:**

- panggil endpoint VIL sungguhan dulu
- invent auth flow baru

---

## 0B-3: Init Auth Provider in `src/main.tsx`

`src/main.tsx` sekarang sudah punya `initApiClient(apiBackend)` saat boot, jadi auth provider harus mengikuti pola yang sama, bukan `setApiClient()` seperti draft lama.

**Output:** patch `src/main.tsx`

**Pattern:**

```ts
import { initApiClient } from './services/api'
import { setAuthProvider } from './services/auth'
import { createSupabaseAuthProvider } from './services/auth/supabaseAuthProvider'
import { createVilAuthProvider } from './services/auth/vilAuthProvider'

const env = validateEnv()
const apiBackend = env.VITE_API_BACKEND === 'vil' ? 'vil' : 'supabase'

initApiClient(apiBackend)

if (apiBackend === 'vil') {
  setAuthProvider(createVilAuthProvider(import.meta.env.VITE_API_URL || 'http://localhost:8080'))
} else {
  setAuthProvider(createSupabaseAuthProvider())
}
```

**Do not:**

- ubah urutan `validateEnv()` → init services → render
- ubah auth redirect handler global

---

## 0B-4: Refactor `src/features/auth/api/authService.ts`

File ini sekarang memakai kombinasi:

- `supabase.auth.*`
- `supabase.rpc(...)`
- `supabase.functions.invoke(...)`

### Refactor rules

- `supabase.auth.*` → `getAuthProvider().*`
- `supabase.rpc(...)` → `getApiClient().rpc(...)`
- `supabase.from(...)` → `getApiClient().from(...)`
- `supabase.functions.invoke(...)` **BELUM disentuh** di 0B
  tetap dibiarkan untuk fase edge-function migration yang terpisah

### Critical invariants

- shape `AuthBootstrap` tidak berubah
- `resolvePostAuthDestination(...)` tidak berubah
- rate limit fail-open/fail-closed behavior tidak berubah

---

## 0B-5: Refactor `src/features/auth/api/mfaService.ts`

File ini masih memakai `supabase.auth.mfa.*` langsung

### Replace

- `supabase.auth.mfa.enroll(...)` → `getAuthProvider().mfa.enroll(...)`
- `supabase.auth.mfa.challengeAndVerify(...)` → provider equivalent
- `supabase.auth.mfa.listFactors()` → provider equivalent
- `supabase.auth.mfa.unenroll(...)` → provider equivalent

### Critical invariants

- QRCode generation tetap local/browser-side
- error capture via Sentry tetap ada
- return shape `MFAEnrollResult`, `MFAVerifyResult`, `MFAFactor[]` tetap sama

---

## 0B-6: Refactor `src/contexts/auth/useRoleResolution.ts`

File ini masih indirectly bergantung pada auth bootstrap flow dan user shape Supabase

### Replace

- semua kebutuhan RPC / DB access harus lewat:
  - `getApiClient()`
  - `authService` yang sudah direfactor

### Critical invariants

- `Role`, `Permissions`, `Tenant` types tetap
- `getPrimaryRole()` tidak berubah
- `fetchUserData()`, `processPendingInvite()`, `processPendingJoinCode()` flow tidak berubah
- timeout 12s tetap

---

## 0B-7: Refactor `src/contexts/auth/useSessionManagement.ts`

File ini sangat sensitif karena masih langsung memakai:

- `Session`, `User` dari `@supabase/supabase-js`
- `supabase.auth.*` untuk lifecycle session

### Replace

- Supabase SDK types → auth abstraction types
- `supabase.auth.getSession()` → `getAuthProvider().getSession()`
- `supabase.auth.onAuthStateChange()` → `getAuthProvider().onAuthStateChange()`
- `supabase.auth.refreshSession()` → `getAuthProvider().refreshSession()`
- `supabase.auth.signInWithPassword()` → `getAuthProvider().signInWithPassword()`
- `supabase.auth.signUp()` → `getAuthProvider().signUp()`
- `supabase.auth.signInWithOAuth()` → `getAuthProvider().signInWithOAuth()`
- `supabase.auth.signOut()` → `getAuthProvider().signOut()`

### CRITICAL: do not change

- `INTERVAL_MS = 60_000`
- refresh threshold = `5 * 60`
- callback processing status behavior
- localStorage cleanup order inside signOut
- session expired toast behavior
- redirect target for OAuth callback

---

## 0B-8: Refactor `src/contexts/AuthContext.tsx`

File ini expose contract yang dipakai hampir seluruh app

### Do not change

- `AuthContextType` field names
- `useAuth()` public API
- `workspaceStatus` semantics
- `refreshAuthBootstrap()` signature
- `role`, `permissions`, `hasRole()` behavior

### Task

- hanya ubah typing/import agar tidak tergantung ke Supabase SDK langsung
- source data tetap dari hooks yang sudah direfactor

---

## 0B-9: Auth Verification

```bash
grep -rn "from '@supabase/supabase-js'" \
  src/features/auth/ src/contexts/auth/ src/contexts/AuthContext.tsx

grep -rn "from '@/services/supabase/client'" \
  src/features/auth/ src/contexts/auth/ src/contexts/AuthContext.tsx

pnpm typecheck
pnpm lint
pnpm test:ci
pnpm build
```

**Expected:**

- direct SDK imports di auth surface = 0
- direct `supabase client` imports di auth surface = 0
- build/test/lint/typecheck green

---

# Wave 0C — Realtime Abstraction

**Blast radius:** High
**Status after unfreeze:** only after 0B stable

## 0C Entry Conditions

- [ ] 0B complete
- [ ] provider init pattern already established
- [ ] no auth regression from 0B
- [ ] realtime consumer list re-scanned before edit

---

## 0C-0: Scan Actual Realtime Consumers

**Do this first before editing queue.**

```bash
grep -rn "supabase\.channel\|supabase\.removeChannel" src/ \
  | grep -v node_modules \
  | grep -v __tests__
```

**Use actual paths found in current repo, not stale draft paths.**

Known drift from old draft:

- builder channel file in repo is `src/features/course-builder/useBuilderChannel.ts`, not `src/features/course-builder/hooks/useBuilderChannel.ts`

---

## 0C-1: RealtimeProvider Foundation

**Output:**

- `src/services/realtime/types.ts`
- `src/services/realtime/realtimeProvider.ts`
- `src/services/realtime/index.ts`

### Required contracts

- `RealtimeProvider`
- `RealtimeChannel`
- `RealtimeSubscriptionStatus`
- `PresenceState`

### Required methods

- `channel(name, options?)`
- `removeChannel(channel)`
- `removeAllChannels()`
- channel `.on(...)`
- channel `.subscribe(...)`
- channel `.unsubscribe()`
- channel `.send(...)`
- channel `.track(...)`
- channel `.untrack()`
- channel `.presenceState()`

---

## 0C-2: SupabaseRealtimeProvider

**Output:** `src/services/realtime/supabaseRealtimeProvider.ts`

**Rule:** thin wrapper only around `supabase.channel(...)`, `supabase.removeChannel(...)`, `supabase.removeAllChannels(...)`.

---

## 0C-3: VilRealtimeProvider Stub

**Output:** `src/services/realtime/vilRealtimeProvider.ts`

**Rule:** stub only. Return consistent shape, not working websocket implementation.

---

## 0C-4: Init Realtime Provider in `src/main.tsx`

Add after API/auth init pattern is stable.

```ts
if (apiBackend === 'vil') {
  setRealtimeProvider(
    createVilRealtimeProvider(import.meta.env.VITE_API_URL || 'http://localhost:8080')
  )
} else {
  setRealtimeProvider(createSupabaseRealtimeProvider())
}
```

**Do not change:**

- `initApiClient(...)`
- auth init order
- app render order

---

## 0C-5: Refactor realtime consumers

Use actual files from scan result, but seed list from current migration findings:

- `src/features/course-builder/useBuilderChannel.ts`
- `src/features/course-builder/useBuilderPresence.ts`
- `src/features/notifications/hooks/useNotifications.ts`
- `src/features/notifications/hooks/useAdminNotifications.ts`
- `src/features/discussions/queries/discussionQueries.ts`
- `src/features/parent/hooks/useMessages.ts`
- `src/features/parent/components/MessageThread.tsx`
- `src/features/classroom/api/classroomService.ts`
- `src/features/assignments/api/groupAssignmentService.ts`

### Replace pattern

- `import { supabase } from '@/services/supabase/client'`
- `supabase.channel(...)`
- `supabase.removeChannel(...)`

with:

- `import { getRealtimeProvider } from '@/services/realtime'`
- `getRealtimeProvider().channel(...)`
- `getRealtimeProvider().removeChannel(...)`

### Critical invariants

- event names unchanged
- channel names unchanged
- presence semantics unchanged
- cleanup/unsubscribe semantics unchanged

---

## 0C-6: Realtime Verification

```bash
grep -rn "supabase\.channel\|supabase\.removeChannel" \
  src/features/course-builder/ \
  src/features/notifications/ \
  src/features/discussions/ \
  src/features/parent/ \
  src/features/classroom/ \
  src/features/assignments/

pnpm typecheck
pnpm lint
pnpm test:ci
```

**Expected:**

- consumer files = 0 direct realtime calls
- abstraction layer only remains

---

# Wave 0D — Storage Abstraction

**Blast radius:** High
**Status after unfreeze:** only after 0C stable or as separate gated branch

## 0D Entry Conditions

- [ ] 0A complete
- [ ] API/provider pattern proven
- [ ] actual storage consumer list re-scanned
- [ ] no storage migration/cutover; abstraction only

---

## 0D-0: Scan Actual Storage Consumers

```bash
grep -rn "supabase\.storage" src/ \
  | grep -v node_modules \
  | grep -v __tests__
```

Use actual files, not stale draft paths.

Known current paths from repo/migration findings:

- `src/features/storage/api/storageService.ts`
- `src/features/video/api/videoUploadService.ts`
- `src/features/courses/services/videoCaptionService.ts`
- `src/features/assignments/api/assignmentService.ts`
- `src/features/administration/api/documentApi.ts`

---

## 0D-1: StorageProvider Foundation

**Output:**

- `src/services/storage/types.ts`
- `src/services/storage/storageProvider.ts`
- `src/services/storage/index.ts`

### Required contracts

- `StorageProvider`
- `StorageBucketClient`
- `StorageError`
- `StorageUploadResponse`

### Required methods

- `upload(path, file, options?)`
- `download(path)`
- `remove(paths)`
- `getPublicUrl(path)`
- `createSignedUrl(path, expiresIn)`
- `list(path?, options?)`

---

## 0D-2: SupabaseStorageProvider

**Output:** `src/services/storage/supabaseStorageProvider.ts`

**Rule:** thin wrapper around `supabase.storage.from(bucket)`.

---

## 0D-3: VilStorageProvider Stub

**Output:** `src/services/storage/vilStorageProvider.ts`

**Rule:** stub only. Do not build real storage adapter yet.

---

## 0D-4: Init Storage Provider in `src/main.tsx`

```ts
if (apiBackend === 'vil') {
  setStorageProvider(
    createVilStorageProvider(import.meta.env.VITE_API_URL || 'http://localhost:8080')
  )
} else {
  setStorageProvider(createSupabaseStorageProvider())
}
```

---

## 0D-5: Refactor storage consumers

Start from general abstraction first:

- `src/features/storage/api/storageService.ts`

Then bucket-specific consumers:

- `src/features/video/api/videoUploadService.ts`
- `src/features/courses/services/videoCaptionService.ts`
- `src/features/assignments/api/assignmentService.ts`
- `src/features/administration/api/documentApi.ts`

### Replace pattern

- `supabase.storage.from('bucket').upload(...)`
- `supabase.storage.from('bucket').remove(...)`
- `supabase.storage.from('bucket').getPublicUrl(...)`

with:

- `getStorageProvider().from('bucket').upload(...)`
- `getStorageProvider().from('bucket').remove(...)`
- `getStorageProvider().from('bucket').getPublicUrl(...)`

### Critical invariants

- bucket names unchanged
- file path conventions unchanged
- public URL semantics unchanged
- no bucket migration/copy in this wave

---

## 0D-6: Storage Verification

```bash
grep -rn "supabase\.storage" src/features/

pnpm typecheck
pnpm lint
pnpm test:ci
pnpm build
```

**Expected:**

- consumer files = 0 direct storage calls
- only abstraction layer may still wrap Supabase storage

---

# Wave 0X — Cross-Cutting (Still Deferred)

These stay deferred even after 0B–0D docs are ready:

- offline queue refactor
- edge function consumer refactor
- ESLint CI guard hard-enforcement
- full E2E sweep

**Reason:** these belong to later gates and should not be mixed into 0B–0D execution.

---

## Hard No-Go List

Even after this queue is populated, agent must NOT:

- touch Phase 1 auth scaffold
- cut over auth to VIL
- cut over realtime to VIL
- cut over storage to VIL
- move offline queue in this wave
- rewrite routing model
- widen scope beyond listed files

---

## Ready-to-Execute Checklist (for future unfreeze)

- [ ] 0A PASS
- [ ] provider abstractions in `src/services/api/*` stable
- [ ] auth/realtime/storage provider directories created
- [ ] actual consumer lists re-scanned before refactor
- [ ] CI green before and after each wave
- [ ] each wave merged separately
