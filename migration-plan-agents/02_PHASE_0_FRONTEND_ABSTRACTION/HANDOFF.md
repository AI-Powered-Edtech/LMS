# Phase 0 → Phase 1 Handoff Document

**EduSync LMS: Supabase → VIL Backend Migration**

---

## What Phase 0 Produces

Phase 0 creates the **Frontend Abstraction Layer** — new files that decouple React from Supabase.

### New files created by Phase 0A (API Client)

These files do NOT exist before Phase 0A runs. Phase 0A creates them:

| File | Purpose |
| --- | --- |
| `src/services/api/types.ts` | `QueryResult`, `ApiClient` interface, error shapes |
| `src/services/api/apiClient.ts` | `getApiClient()` / `setApiClient()` singleton |
| `src/services/api/supabaseApiClient.ts` | Supabase implementation of `ApiClient` |
| `src/services/api/vilApiClient.ts` | VIL stub (all methods throw "Not implemented") |
| `src/services/api/index.ts` | Barrel export — `getApiClient` re-exported |

### New files created by Phase 0C (Auth)

| File | Purpose |
| --- | --- |
| `src/services/auth/types.ts` | `AuthProvider`, `AuthUser`, `AuthSession` |
| `src/services/auth/authProvider.ts` | `getAuthProvider()` / `setAuthProvider()` singleton |
| `src/services/auth/supabaseAuthProvider.ts` | Supabase implementation |
| `src/services/auth/vilAuthProvider.ts` | VIL stub |

### New files created by Phase 0D (Realtime)

| File | Purpose |
| --- | --- |
| `src/services/realtime/types.ts` | `RealtimeProvider`, `RealtimeChannel` |
| `src/services/realtime/realtimeProvider.ts` | Singleton |
| `src/services/realtime/supabaseRealtimeProvider.ts` | Supabase implementation |
| `src/services/realtime/vilRealtimeProvider.ts` | VIL stub |

### New files created by Phase 0E (Storage)

| File | Purpose |
| --- | --- |
| `src/services/storage/types.ts` | `StorageProvider`, `StorageBucketClient` |
| `src/services/storage/storageProvider.ts` | Singleton |
| `src/services/storage/supabaseStorageProvider.ts` | Supabase implementation |
| `src/services/storage/vilStorageProvider.ts` | VIL stub |

### Modified files

| File | Change |
| --- | --- |
| `src/main.tsx` | Provider initialization added (calls `setApiClient()` etc.) |
| `src/config/env.schema.ts` | `VITE_API_BACKEND` and `VITE_API_URL` added |
| `eslint.config.js` | `no-restricted-imports` escalated from WARN to ERROR |
| ~30 service files in `src/features/*/api/` | `supabase` import replaced with `getApiClient()` |
| Auth files (`authService.ts`, `mfaService.ts`, `AuthContext.tsx`, `useSessionManagement.ts`) | Refactored to use `getAuthProvider()` |
| 9 realtime consumer hooks | Refactored to use `getRealtimeProvider()` |
| 5 storage consumer files | Refactored to use `getStorageProvider()` |

---

## Known State After Phase 0 Completion

### Verified working

- `getApiClient()` callable from both hooks and service files (module-level singleton)
- Full vertical slice (courses CRUD) verified end-to-end
- Zero direct Supabase imports in `src/features/`, `src/contexts/`, `src/utils/`, `src/components/`
- ESLint CI Guard active at ERROR level — CI blocks on violations
- `pnpm build` succeeds
- `pnpm typecheck` succeeds

### Feature flag

```bash
# .env or .env.local
VITE_API_BACKEND=supabase   # Current (Supabase active)
VITE_API_BACKEND=vil        # After Phase 1 (VIL active)
VITE_API_URL=http://localhost:8080
```

### Supabase imports still permitted in

These are the ONLY files allowed to import from `@/services/supabase/client`:

- `src/services/api/supabaseApiClient.ts`
- `src/services/auth/supabaseAuthProvider.ts`
- `src/services/realtime/supabaseRealtimeProvider.ts`
- `src/services/storage/supabaseStorageProvider.ts`

---

## Entry Criteria for Phase 1

Before any Phase 1 work begins, run these checks to confirm Phase 0 is complete:

```bash
# 1. Abstraction layer files exist
ls src/services/api/types.ts \
   src/services/api/apiClient.ts \
   src/services/api/supabaseApiClient.ts \
   src/services/api/vilApiClient.ts \
   src/services/api/index.ts \
  && echo "PASS: API abstraction files exist" || echo "FAIL: missing files"

# 2. Zero direct Supabase imports in protected dirs
count=$(grep -rn "from '@/services/supabase/client'" src/features/ src/contexts/ src/utils/ src/components/ 2>/dev/null | wc -l)
echo "Direct Supabase imports: $count (must be 0)"
[ "$count" -eq "0" ] && echo "PASS" || echo "FAIL"

# 3. ESLint guard at error level
grep -A5 "no-restricted-imports" eslint.config.js | grep -q "error" \
  && echo "PASS: CI guard at error" || echo "FAIL: CI guard not at error"

# 4. Build and typecheck pass
pnpm typecheck && pnpm build && echo "PASS: build clean" || echo "FAIL: build broken"
```

All four checks must PASS before starting Phase 1.

---

## Phase 1 Entry Requirements

### For Backend Team (VIL)

The VIL backend must implement the following APIs:

#### 1. PostgREST-compatible REST API

The `ApiClient` expects:

- `GET /{table}?select=*&eq.tenant_id={id}` — query with filters
- `POST /{table}` — insert
- `PATCH /{table}?eq.id={id}` — update
- `DELETE /{table}?eq.id={id}` — delete
- `POST /rpc/{function}` — RPC calls
- Storage endpoints for file operations

#### 2. Auth Endpoints

The `AuthProvider` expects:

- `POST /auth/v1/token?grant_type=password` — sign in
- `POST /auth/v1/signup` — sign up
- `POST /auth/v1/token?grant_type=refresh_token` — refresh session
- `POST /auth/v1/logout` — sign out
- `POST /auth/v1/oauth/token` — OAuth exchange
- MFA endpoints (enroll, challenge, verify)

#### 3. Realtime (WebSocket)

The `RealtimeProvider` expects:

- WebSocket connection for postgres_changes
- Broadcast channels
- Presence tracking

#### 4. Storage

The `StorageProvider` expects:

- `POST /storage/v1/object/{bucket}/{path}` — upload
- `GET /storage/v1/object/{bucket}/{path}` — download
- `DELETE /storage/v1/object/{bucket}/{path}` — remove
- Signed URL generation

### For Frontend Team (Continuing Migration)

After VIL backend is ready, Phase 1 will:

1. **Fill in VIL stubs** — replace "Not implemented" throws with actual implementations
2. **Implement Edge Function replacements** — 30 Edge Functions will become VIL endpoints
3. **Keep Supabase Auth for MVP** — auth is complex, may stay with Supabase initially
4. **Enable feature flag** — `VITE_API_BACKEND=vil` to switch backends

---

## Phase 1 Task Overview

| Task | Description                                | Priority |
| ---- | ------------------------------------------ | -------- |
| 1-1  | VIL REST API implementation (tables + RLS) | Critical |
| 1-2  | VIL Auth endpoints (or keep Supabase Auth) | High     |
| 1-3  | VIL Realtime (WebSocket)                   | Medium   |
| 1-4  | VIL Storage                                | Medium   |
| 1-5  | Replace Edge Functions with VIL endpoints  | High     |
| 1-6  | Fill in `vilApiClient.ts` implementation   | Critical |
| 1-7  | Fill in `vilAuthProvider.ts` if needed     | High     |
| 1-8  | Fill in `vilRealtimeProvider.ts`           | Medium   |
| 1-9  | Fill in `vilStorageProvider.ts`            | Medium   |
| 1-10 | E2E testing with VIL backend               | Critical |
| 1-11 | Performance testing                        | Medium   |

---

## Known Gaps & Technical Debt

### From Phase 0 (Left for Phase 1 or Later)

| Issue           | Description                          | Impact                     |
| --------------- | ------------------------------------ | -------------------------- |
| Edge Functions  | Still using Supabase Edge Functions  | Need VIL replacements      |
| Auth Hybrid     | May keep Supabase Auth initially     | Simpler than full refactor |
| Realtime Hybrid | May keep Supabase Realtime initially | WebSocket complexity       |
| Storage Hybrid  | May keep Supabase Storage initially  | File handling complexity   |

### Recommendations

1. **Auth:** Keep Supabase Auth for MVP (Phase 1-2), migrate later
2. **Storage:** Keep Supabase Storage (Phase 1), migrate later
3. **Realtime:** Keep Supabase Realtime (Phase 1), migrate later
4. **Focus Phase 1 on:** REST API + VIL implementation for `ApiClient`

---

## Testing Checklist for Phase 1

Before declaring Phase 1 complete:

### API Client Tests

```bash
# Test with VIL backend
VITE_API_BACKEND=vil pnpm dev

# Verify:
# - Course list loads
# - Course create works
# - Course edit works
# - Module CRUD works
# - All API calls go to VIL (check network tab)
```

### Import Audit (Re-verify)

```bash
# Should still be clean from Phase 0
grep -rn "from '@/services/supabase/client'" src/features/ src/contexts/ src/utils/ src/components/
# Expected: 0 results
```

### CI/CD

```bash
# Ensure CI still passes
pnpm typecheck && pnpm lint && pnpm build
```

---

## Key Files for Phase 1

| File                                           | Purpose                   |
| ---------------------------------------------- | ------------------------- |
| `docs/ARCHITECTURE.md`                         | System architecture       |
| `docs/DATABASE.md`                             | Table/RPC reference       |
| `docs/AUTH.md`                                 | Auth flow and setup       |
| `docs/SECURITY.md`                             | Security model            |
| `src/services/api/vilApiClient.ts`             | VIL API stub to fill      |
| `src/services/auth/vilAuthProvider.ts`         | VIL Auth stub to fill     |
| `src/services/realtime/vilRealtimeProvider.ts` | VIL Realtime stub to fill |
| `src/services/storage/vilStorageProvider.ts`   | VIL Storage stub to fill  |

---

## Sign-Off

| Role         | Name | Date | Signature |
| ------------ | ---- | ---- | --------- |
| Phase 0 Lead |      |      |           |
| Phase 1 Lead |      |      |           |
| Tech Lead    |      |      |           |

**Phase 0 is considered complete when all acceptance criteria are met and this document is signed.**
