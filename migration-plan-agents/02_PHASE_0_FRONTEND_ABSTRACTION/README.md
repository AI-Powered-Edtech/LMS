# Phase 0 — Frontend Abstraction Layer

**EduSync LMS: Supabase → VIL Backend Migration**

**Status:** ⚠️ **DITUNDA** — 0B/0C/0D frozen until Gate RS + Gate 0A passed
**Execution Readiness:** 68/100 → Target: 88/100

## Overview

Phase 0 establishes the **Frontend Abstraction Layer** that decouples all React code from Supabase. This enables a seamless backend swap without touching the UI layer.

## State When You Arrive

Before Phase 0 begins, these facts are true about the codebase:

- **129 files** import Supabase directly (breakdown: 120 in `src/features/`, 1 in `src/contexts/`, 7 in `src/utils/`, 2 in `src/components/`)
- `src/services/api/` **does NOT exist yet** — Phase 0A creates it
- `src/services/supabase/client.ts` is the single Supabase client instance used everywhere
- `src/config/env.schema.ts` exists but does NOT yet have `VITE_API_BACKEND` — task 0A-6 adds it
- ESLint `no-restricted-imports` rule exists at **WARN** level — Phase 0F escalates to ERROR
- 30 Edge Functions exist in `supabase/functions/` (these are NOT touched by Phase 0)
- All feature modules live under `src/features/{domain}/` with `api/` subdirectories containing service files

### Key existing files

| Path | Purpose |
| --- | --- |
| `src/services/supabase/client.ts` | Current Supabase client singleton |
| `src/config/env.schema.ts` | Env var validation schema |
| `eslint.config.js` | ESLint config (has `no-restricted-imports` at WARN) |
| `src/main.tsx` | App entry point (Phase 0A-6 adds provider init here) |

## Timeline

- **Duration:** Weeks 1-10 (~150 hours)
- **Goal:** Zero direct Supabase imports in `src/features/`, `src/contexts/`, `src/utils/`, `src/components/`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Components                          │
│                    (features/, contexts/)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     Feature Services                             │
│              (courseService, authService, etc.)                 │
│                     Uses: getApiClient()                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│               Frontend Abstraction Layer (Phase 0)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  ApiClient   │  │ AuthProvider │  │ RealtimeProv │        │
│  │  getApiClient│  │ getAuthProv  │  │ getRealtime  │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                  │                  │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐        │
│  │ Supabase Impl│  │ Supabase Impl│  │ Supabase Impl│        │
│  │   (active)   │  │   (active)   │  │   (active)   │        │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤        │
│  │   VIL Stub   │  │   VIL Stub   │  │   VIL Stub   │        │
│  │  (not impl)  │  │  (not impl)  │  │  (not impl)  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                    Backend (Swappable)                          │
│              Supabase (Phase 0) → VIL (Phase 1+)              │
└─────────────────────────────────────────────────────────────────┘
```

## Waves

| Wave   | Focus                              | Duration   | Status        |
| ------ | ---------------------------------- | ---------- | ------------- |
| **0A** | API Client Abstraction             | Weeks 1-4  | ✅ **ACTIVE** |
| **0B** | Service Files Refactoring          | Weeks 2-6  | 🚫 DEFERRED   |
| **0C** | Auth Abstraction                   | Weeks 6-8  | 🚫 DEFERRED   |
| **0D** | Realtime Abstraction               | Weeks 8-9  | 🚫 DEFERRED   |
| **0E** | Compatibility Contract Freeze      | Weeks 8-9  | 🚫 DEFERRED   |
| **0F** | Direct Dependency Audit + CI Guard | Weeks 9-10 | 🚫 DEFERRED   |
| **0G** | Verification                       | Week 10    | 🚫 DEFERRED   |

> **NOTE:** Only Wave 0A is allowed for execution. Waves 0B-0G are frozen until:
>
> - Gate RS (Reality Sync) passed
> - Gate 0A passed
> - Execution readiness reaches 88/100

## Wave 0A: API Client Abstraction (Week 1-4)

**Foundation:** Module-level singleton pattern (`getApiClient()`)

| Task | Description                                                       |
| ---- | ----------------------------------------------------------------- |
| 0A-1 | Type Definitions (`src/services/api/types.ts`)                    |
| 0A-2 | ApiClient Interface + Singleton (`src/services/api/apiClient.ts`) |
| 0A-3 | Supabase Implementation                                           |
| 0A-4 | VIL Stub Implementation                                           |
| 0A-5 | Barrel Export (`src/services/api/index.ts`)                       |
| 0A-6 | Initialize in `main.tsx`                                          |
| 0A-7 | Add env vars (`VITE_API_BACKEND`, `VITE_API_URL`)                 |
| 0A-8 | Refactor `courseService.ts` (POC)                                 |
| 0A-9 | End-to-End Verify                                                 |

### Week 2-4: Service File Refactoring

| Cluster | Files                                                                 | Priority  |
| ------- | --------------------------------------------------------------------- | --------- |
| A       | `lessonService.ts`, `moduleService.ts`, `builder/lessonService.ts`    | Highest   |
| B       | `classroomService.ts`, `attendanceService.ts`                         | High      |
| C       | `discussionService.ts`, `commentService.ts`, `notificationService.ts` | Medium    |
| D       | `parentApi.ts`, `calendarService.ts`, `announcementService.ts`        | Medium    |
| E       | Cross-Cluster Verification                                            | After all |
| F       | `offlineQueue.ts` + ESLint CI Guard                                   | Final     |

**Pattern for each refactor:**

```typescript
// BEFORE
import { supabase } from '@/services/supabase/client'
const { data } = await supabase.from('courses').select('*')

// AFTER
import { getApiClient } from '@/services/api'
const db = getApiClient()
const { data } = await db.from('courses').select('*')
```

## Wave 0B: Service Files Refactoring (Weeks 2-6)

**Bulk refactor of ~30 service files** — replace `supabase` import with `getApiClient()`.

See `TASK_QUEUE_0B_0D.md` for the frozen prebuilt task queue.

## Wave 0C: Auth Abstraction (Weeks 6-8)

**Most sensitive area** — 48 feature modules depend on `useAuth()`

| Task   | Description                                    |
| ------ | ---------------------------------------------- |
| 0C-1   | AuthProvider Interface + Types                 |
| 0C-2   | SupabaseAuthProvider Implementation            |
| 0C-3   | VilAuthProvider Stub                           |
| 0C-4   | Auth Singleton + Barrel Export + main.tsx init |
| 0C-5   | Refactor `authService.ts`                      |
| 0C-6   | Refactor `mfaService.ts`                       |
| 0C-6.5 | Refactor `useRoleResolution.ts`                |
| 0C-7   | Refactor `useSessionManagement.ts`             |
| 0C-8   | Refactor `AuthContext.tsx`                     |
| 0C-9   | Auth Verification                              |

## Wave 0D: Realtime Abstraction (Weeks 8-9)

**9 consumer files** — 3 patterns: `postgres_changes`, `broadcast`, `presence`

| Task | Description                                            |
| ---- | ------------------------------------------------------ |
| 0D-0 | Scan actual realtime consumer paths                    |
| 0D-1 | RealtimeProvider Interface + Types                     |
| 0D-2 | SupabaseRealtimeProvider                               |
| 0D-3 | VilRealtimeProvider + Singleton                        |
| 0D-4 | Refactor `useBuilderChannel.ts` (broadcast + presence) |
| 0D-5 | Refactor `useBuilderPresence.ts`                       |
| 0D-6 | Refactor notification hooks                            |
| 0D-7 | Refactor discussion/messaging files                    |
| 0D-8 | Refactor classroom/assignment files                    |
| 0D-9 | Realtime Verification                                  |

## Wave 0E: Compatibility Contract Freeze (Weeks 8-9)

**5 consumer files** — buckets: `videos`, `submissions`, `avatars`, `documents`, `certificates`

| Task         | Description                       |
| ------------ | --------------------------------- |
| 0E-1         | StorageProvider Interface + Types |
| 0E-2         | SupabaseStorageProvider           |
| 0E-3         | VilStorageProvider + Singleton    |
| 0E-4 to 0E-7 | Refactor storage consumers        |
| 0E-8         | Storage Verification              |

## Wave 0F: Direct Dependency Audit + CI Guard (Weeks 9-10)

| Task | Description                                        |
| ---- | -------------------------------------------------- |
| 0F-1 | Full import audit across all `src/` directories    |
| 0F-2 | ESLint `no-restricted-imports` escalated to ERROR  |
| 0F-3 | CI pipeline blocks on any direct Supabase import   |

## Wave 0G: Verification (Week 10)

| Task | Description                           |
| ---- | ------------------------------------- |
| 0G-1 | Full import audit (final)             |
| 0G-2 | E2E test verification                 |
| 0G-3 | `pnpm build` clean                   |
| 0G-4 | Phase 1 handoff document finalized    |

## Key Design Decisions

### 1. Module-Level Singleton (NOT React Context)

Service files are plain functions, not React hooks — they can't use `useContext()`. The singleton pattern (`getApiClient()`) works everywhere.

### 2. Thin Wrappers

Abstraction implementations delegate to existing Supabase client. Zero business logic added.

### 3. PostgREST Error Shape

```typescript
interface PostgrestError {
  message: string
  details: string | null
  hint: string | null
  code: string
}
```

### 4. Feature Flag for Backend Switching

```typescript
const apiBackend = (import.meta.env.VITE_API_BACKEND as 'supabase' | 'vil') ?? 'supabase'
```

## Exit Criteria

See [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md)

## Dependencies

- Phase 0 must complete before Phase 1 (VIL Backend Implementation)
- Phase 0A Week 1 must complete before Week 2-4 tasks
- Wave 0C (Auth) should be done last — highest blast radius

---

## Catatan Status Terkini

### Allowed Scope

- ✅ Phase -1: Reality Sync
- ✅ Phase 0A only (API Client Abstraction)

### Frozen Scope (DO NOT EXECUTE)

- 🚫 Phase 0B (Service Files Refactoring)
- 🚫 Phase 0C (Auth Abstraction)
- 🚫 Phase 0D (Realtime Abstraction)
- 🚫 Phase 0E (Compatibility Contract Freeze)
- 🚫 Phase 0F (Direct Dependency Audit + CI Guard)
- 🚫 Phase 0G (Verification)
- 🚫 Phase 1 (Auth + Scaffold)

### Entry Criteria untuk Unfreeze

Execution readiness harus mencapai 88/100 terlebih dahulu.
