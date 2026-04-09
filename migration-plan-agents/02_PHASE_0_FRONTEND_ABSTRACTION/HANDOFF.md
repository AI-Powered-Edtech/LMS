# Phase 0 → Phase 1 Handoff Document

**EduSync LMS: Supabase → VIL Backend Migration**

---

## Phase 0 Summary

### What Was Built

Phase 0 established the **Frontend Abstraction Layer** that decouples React from Supabase:

| Component         | Files Created                                                                                                 | Status      |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | ----------- |
| API Client        | `src/services/api/` (types.ts, apiClient.ts, supabaseApiClient.ts, vilApiClient.ts)                           | ✅ Complete |
| Auth Provider     | `src/services/auth/` (types.ts, authProvider.ts, supabaseAuthProvider.ts, vilAuthProvider.ts)                 | ✅ Complete |
| Realtime Provider | `src/services/realtime/` (types.ts, realtimeProvider.ts, supabaseRealtimeProvider.ts, vilRealtimeProvider.ts) | ✅ Complete |
| Storage Provider  | `src/services/storage/` (types.ts, storageProvider.ts, supabaseStorageProvider.ts, vilStorageProvider.ts)     | ✅ Complete |
| Provider Init     | `src/main.tsx`                                                                                                | ✅ Complete |

### What Was Refactored

| Category           | Files Refactored                                                                | Status      |
| ------------------ | ------------------------------------------------------------------------------- | ----------- |
| Service Files      | ~30 files in `src/features/*/api/`                                              | ✅ Complete |
| Auth Files         | `authService.ts`, `mfaService.ts`, `AuthContext.tsx`, `useSessionManagement.ts` | ✅ Complete |
| Realtime Consumers | 9 hooks/queries                                                                 | ✅ Complete |
| Storage Consumers  | 5 files                                                                         | ✅ Complete |
| Utilities          | `offlineQueue.ts`                                                               | ✅ Complete |

### Key Files

```
src/
├── services/
│   ├── api/
│   │   ├── types.ts           # QueryResult, ApiClient interface
│   │   ├── apiClient.ts       # getApiClient(), setApiClient() singleton
│   │   ├── supabaseApiClient.ts  # Supabase implementation
│   │   ├── vilApiClient.ts    # VIL stub (throws "Not implemented")
│   │   └── index.ts           # Barrel export
│   ├── auth/
│   │   ├── types.ts           # AuthProvider, AuthUser, AuthSession
│   │   ├── authProvider.ts    # getAuthProvider(), setAuthProvider()
│   │   ├── supabaseAuthProvider.ts
│   │   └── vilAuthProvider.ts
│   ├── realtime/
│   │   ├── types.ts           # RealtimeProvider, RealtimeChannel
│   │   ├── realtimeProvider.ts
│   │   ├── supabaseRealtimeProvider.ts
│   │   └── vilRealtimeProvider.ts
│   └── storage/
│       ├── types.ts           # StorageProvider, StorageBucketClient
│       ├── storageProvider.ts
│       ├── supabaseStorageProvider.ts
│       └── vilStorageProvider.ts
└── main.tsx                   # Provider initialization
```

---

## Phase 0 Exit State

### Verified Working

- ✅ `getApiClient()` callable from hooks and service files
- ✅ Full vertical slice (courses) verified
- ✅ Zero Supabase imports in `features/`, `contexts/`, `utils/`, `components/`
- ✅ ESLint CI Guard active (error level)
- ✅ All E2E tests pass
- ✅ `pnpm build` succeeds

### Feature Flag

```bash
# .env or .env.local
VITE_API_BACKEND=supabase   # Current (Supabase active)
VITE_API_BACKEND=vil        # After Phase 1 (VIL active)
VITE_API_URL=http://localhost:8080
```

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
2. **Implement Edge Function replacements** — most Edge Functions will be VIL endpoints
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
pnpm typecheck && pnpm lint && pnpm test:ci && pnpm build
```

---

## Contacts & Documentation

### Key Files for Phase 1

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

### Source Documents

| Document          | Path                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Main Plan         | `migration-plan/Full Migration EduSync LMS Supabase → VIL Backend ...Plan & Strategi...ace54d0159584b0c8330eaad52e6e05b.md` |
| Phase 0A Week 1   | `migration-plan/.../Agent Task Queue — Phase 0A Week 1...73757d6162304c67b9452ba0088cf01a.md`                               |
| Phase 0A Week 2-4 | `migration-plan/.../Agent Task Queue — Phase 0A Week 2-4...5d66d1c594bf41f0ace3a07445777b8a.md`                             |
| Phase 0B-0D       | `migration-plan/.../Agent Task Queue — Phase 0B-0D...81752e8cfaaa4765ba909bb7e8003624.md`                                   |

---

## Sign-Off

| Role         | Name | Date | Signature |
| ------------ | ---- | ---- | --------- |
| Phase 0 Lead |      |      |           |
| Phase 1 Lead |      |      |           |
| Tech Lead    |      |      |           |

**Phase 0 is considered complete when all acceptance criteria are met and this document is signed.**
