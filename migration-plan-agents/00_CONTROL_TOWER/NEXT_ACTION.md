# Next Action: Phase 0A - API Client Abstraction

**Priority:** START IMMEDIATELY  
**Estimated Duration:** Weeks 1-4 (~40 hours)  
**Goal:** Establish `getApiClient()` singleton pattern, refactor courseService as POC

---

## What is Phase 0A?

Phase 0A creates an API client abstraction layer that allows the frontend to switch between Supabase and VIL backends without changing calling code. The key pattern is:

```ts
// BEFORE (direct Supabase)
import { supabase } from '@/services/supabase/client'
const { data } = await supabase.from('courses').select('*')

// AFTER (abstracted)
import { getApiClient } from '@/services/api'
const db = getApiClient()
const { data } = await db.from('courses').select('*')
```

---

## Phase 0A Prerequisites

- [x] Phase -1 Reality Sync COMPLETE (2026-04-09)
- [x] `src/services/supabase/client.ts` exists
- [x] Project uses React 19 + Vite + TypeScript
- [x] `pnpm` available (NOT npm/yarn)
- [x] All user-visible text in Bahasa Indonesia

---

## Phase 0A Task List

| ID   | Task                   | Goal                                         |
| ---- | ---------------------- | -------------------------------------------- |
| 0A-1 | Create api/types.ts    | API client interfaces                        |
| 0A-2 | Create api/client.ts   | getApiClient() singleton                     |
| 0A-3 | Create api/database.ts | Database methods (from, insert, update, etc) |
| 0A-4 | Create api/realtime.ts | Realtime subscription methods                |
| 0A-5 | Create api/auth.ts     | Auth methods                                 |
| 0A-6 | Wrap courseService.ts  | First service refactor as POC                |
| 0A-7 | TypeScript check       | Verify no errors                             |
| 0A-8 | Smoke test             | Basic functionality works                    |

**EDIT ONLY FILES (DO NOT touch others):**

- `src/services/api/` (NEW - entire directory)
- `src/features/courses/api/courseService.ts` (refactor ONLY)
- `.kilo/agents.yaml` (if needed)

---

## Phase 0A Exit Criteria

Before proceeding to Phase 0B, ALL must be true:

- [ ] `getApiClient()` returns Supabase client by default
- [ ] `db.from('courses').select('*')` works identically to direct Supabase call
- [ ] No TypeScript errors in `src/services/api/`
- [ ] courseService refactored as POC with no runtime errors
- [ ] All UI text remains Bahasa Indonesia

### No-Go Conditions

**DO NOT proceed to Phase 0B if:**

- Phase 0A exit criteria not met
- Any regression in existing functionality
- New Supabase dependencies introduced outside api/ layer

---

## Phase 0A Timeline

| Week | Focus           | Deliverable                      |
| ---- | --------------- | -------------------------------- |
| 1    | Types + Core    | api/types.ts, api/client.ts      |
| 2    | Database API    | api/database.ts                  |
| 3    | Auth + Realtime | api/auth.ts, api/realtime.ts     |
| 4    | Integration     | courseService POC + verification |

---

## Key Files Created

```
src/services/api/
├── types.ts      # ApiClient, ApiDatabase, ApiAuth interfaces
├── client.ts     # getApiClient() singleton
├── database.ts   # Database CRUD methods
├── realtime.ts   # Realtime subscription
└── auth.ts      # Auth methods
```

---

## Related Documents

- [TASK_QUEUE_0A.md](../02_PHASE_0_FRONTEND_ABSTRACTION/TASK_QUEUE_0A.md)
- [CONTROL_TOWER](./)
- [Architecture Doc](../../docs/ARCHITECTURE.md)

---

## Status

**Current Phase:** Phase 0A (ACTIVE)
**Execution Readiness:** 88/100

**FROZEN:**

- Phase 0B, 0C, 0D, 0E, 0F, 0G - DITUNDA hingga Gate 0A passed
- Phase 1 (1A, 1B, 1C, 1D) - DITUNDA hingga Gate 1A passed

**ALLOWED NOW:**

- Phase 0A only
