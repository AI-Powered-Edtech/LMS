# ADR-002 — `classes` vs `rombel` Split

**Status**: Partially Implemented (U08.1 done, U08.2–5 deferred)
**Date**: 2026-04-24
**Relates to**: 07-remaining-execution-plan.md U08

## Audit finding (U08.1)

In dev school (4 classes), **every row is both**:
- a class-section (has 30/28/26/30 students enrolled via `enrollments`)
- a course-instance (linked to a course via `course_classes`)

This is the ambiguity the ADR must resolve.

```
classes             │  enrollments             │  course_classes
 X-IPA-1  ────┐     │   student_id → class_id   │   class_id → course_id
 X-IPA-2      │─────┼─── both tables point to ──┘
 X-IPS-1      │     │   the same `classes` row
 XI-IPA-1  ───┘     │
```

## Decision

**Split into two distinct entities, additive migration path:**

| Concern | Table | Lifecycle |
|---|---|---|
| **Class section** (rombongan belajar, "X-IPA-1" with wali_kelas + 30 siswa tetap) | `rombel` + `rombel_members` | 1 academic year; reused for multiple courses |
| **Course instance** (specific "Matematika X-IPA-1 semester ganjil" — has assignments, grades, schedule) | `classes` (or renamed `course_instances`) + `enrollments` | 1 course × 1 rombel × 1 semester |

Relationship: `classes.rombel_id → rombel.id` (each course-instance is taught to one rombel).

## Status after U08.1

- ✅ Audit complete — 4/4 dev school classes are ambiguous both-role
- ✅ `rombel` + `rombel_members` schema exists (migration 042) and is populated by `dev_seed_content.sql` (114 members)
- ✅ Existing `classes` + `enrollments` continues to work (backward compat)
- ❌ `classes.rombel_id` FK column — not added yet (needed for U08.3)
- ❌ FE read adapters prefer `rombel` — not implemented (U08.2)
- ❌ Write migration (copy/clone) — not executed (U08.3)
- ❌ FE service cleanup — not done (U08.4)

## Why U08.2–5 deferred

Full split is **multi-file FE refactor** touching:
- `src/features/classroom/api/classroomService.ts`
- `src/features/gradebook/api/gradebookApi.ts`
- `src/features/attendance/api/attendanceService.ts`
- `src/features/administration/api/administrationService.ts`
- `src/pages/RombelAttendance.tsx`, `RombelManagement.tsx`
- `edusync-api/crates/api-server/src/data_plane.rs` allowlist
- `edusync-api/crates/api-server/src/report_real.rs` queries
- Every query that joins `classes` with gradebook/attendance

Risk without full E2E test coverage: breaking existing features. Current sweep passes on unified `classes`; swapping to rombel without carefully staged adapters = regression cascade.

## Recommended sequence (next operator/agent)

### U08.2 — Read adapters (backward compat)
Add service layer that tries `rombel` first, falls back to `classes` ambiguity. **Ship this alone + verify no sweep regression.** 3-5 day effort.

### U08.3 — Write migration
Migration 069: add `classes.rombel_id uuid REFERENCES rombel(id)`, backfill by matching `classes.name = rombel.code`. Nullable until all rows mapped.

### U08.4 — FE cleanup
Once read adapters verified stable, remove fallback to `classes` for section semantics. `classes` becomes course-instance only. Update allowlist docs.

### U08.5 — Regression + rapor re-verify
Full sweep 9-persona + rapor generation (once U11 lands) with per-rombel aggregation.

## Why this ADR now

Block downstream work is minimized by documenting the decision. Even without implementing U08.2-5:
- U11 (Rapor PDF) can query `rombel` + `rombel_members` directly (already populated)
- U06.4 (scope check for wali_kelas) can resolve via `rombel.wali_kelas_id`
- U13 (event bus attendance.marked) can reference `rombel` context

So U11/U06.4/U13 are **not blocked** on U08.2-5; they use rombel directly for new writes while `classes` continues serving legacy reads.

## Reversibility

If split turns out wrong, `rombel` + `rombel_members` tables can be dropped and data recomputed from `classes` + `enrollments`. Low regret.
