# Phase 0 — Frontend Abstraction Layer

**EduSync LMS: Supabase → VIL Backend Migration**

**Status:** ⚠️ **DITUNDA** — 0B/0C/0D frozen until Gate RS + Gate 0A passed
**Execution Readiness:** 68/100 → Target: 88/100

## Overview

Phase 0 establishes the **Frontend Abstraction Layer** that decouples all React code from Supabase. This enables a seamless backend swap without touching the UI layer.

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

| Wave   | Focus                   | Duration  | Status        |
| ------ | ----------------------- | --------- | ------------- |
| **0A** | API Client Abstraction  | Weeks 1-4 | ✅ **ACTIVE** |
| **0B** | Auth Abstraction        | Weeks 5-6 | 🚫 DEFERRED   |
| **0C** | Realtime Abstraction    | Weeks 6-8 | 🚫 DEFERRED   |
| **0D** | Storage Abstraction     | Weeks 8-9 | 🚫 DEFERRED   |
| **0E** | Verification & CI Guard | Week 10   | 🚫 DEFERRED   |

> **NOTE:** Only Wave 0A is allowed for execution. Waves 0B-0E are frozen until:
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

## Wave 0B: Auth Abstraction (Weeks 5-6)

**Most sensitive area** — 48 feature modules depend on `useAuth()`

| Task   | Description                                    |
| ------ | ---------------------------------------------- |
| 0B-1   | AuthProvider Interface + Types                 |
| 0B-2   | SupabaseAuthProvider Implementation            |
| 0B-3   | VilAuthProvider Stub                           |
| 0B-4   | Auth Singleton + Barrel Export + main.tsx init |
| 0B-5   | Refactor `authService.ts`                      |
| 0B-6   | Refactor `mfaService.ts`                       |
| 0B-6.5 | Refactor `useRoleResolution.ts`                |
| 0B-7   | Refactor `useSessionManagement.ts`             |
| 0B-8   | Refactor `AuthContext.tsx`                     |
| 0B-9   | Auth Verification                              |

## Wave 0C: Realtime Abstraction (Weeks 6-8)

**9 consumer files** — 3 patterns: `postgres_changes`, `broadcast`, `presence`

| Task | Description                                            |
| ---- | ------------------------------------------------------ |
| 0C-0 | Scan actual realtime consumer paths                    |
| 0C-1 | RealtimeProvider Interface + Types                     |
| 0C-2 | SupabaseRealtimeProvider                               |
| 0C-3 | VilRealtimeProvider + Singleton                        |
| 0C-4 | Refactor `useBuilderChannel.ts` (broadcast + presence) |
| 0C-5 | Refactor `useBuilderPresence.ts`                       |
| 0C-6 | Refactor notification hooks                            |
| 0C-7 | Refactor discussion/messaging files                    |
| 0C-8 | Refactor classroom/assignment files                    |
| 0C-9 | Realtime Verification                                  |

## Wave 0D: Storage Abstraction (Weeks 8-9)

**5 consumer files** — buckets: `videos`, `submissions`, `avatars`, `documents`, `certificates`

| Task         | Description                       |
| ------------ | --------------------------------- |
| 0D-1         | StorageProvider Interface + Types |
| 0D-2         | SupabaseStorageProvider           |
| 0D-3         | VilStorageProvider + Singleton    |
| 0D-4 to 0D-7 | Refactor storage consumers        |
| 0D-8         | Storage Verification              |

## Wave 0E: Verification (Week 10)

| Task | Description                           |
| ---- | ------------------------------------- |
| 0E-1 | Full import audit                     |
| 0E-2 | CI Guard enforce (ESLint error level) |
| 0E-3 | E2E test verification                 |
| 0E-4 | Phase 1 handoff                       |

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
- Wave 0B (Auth) should be done last — highest blast radius

---

## Catatan Status Terkini

### Allowed Scope

- ✅ Phase -1: Reality Sync
- ✅ Phase 0A only (API Client Abstraction)

### Frozen Scope (DO NOT EXECUTE)

- 🚫 Phase 0B (Auth Abstraction)
- 🚫 Phase 0C (Realtime Abstraction)
- 🚫 Phase 0D (Storage Abstraction)
- 🚫 Phase 0E (Verification)
- 🚫 Phase 1 (Auth + Scaffold)

### Entry Criteria untuk Unfreeze

Execution readiness harus mencapai 88/100 terlebih dahulu.
