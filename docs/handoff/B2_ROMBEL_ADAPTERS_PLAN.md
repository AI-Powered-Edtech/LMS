# B2 — FE Service Rombel-Preference Rewiring (PLAN)

**Status**: PLAN. `classSectionAdapter.ts` sudah ada sebagai shim. Implementasi luas (3 service file × ~500 LOC each) butuh sweep regression check yang tidak tersedia di sandbox audit ini.

## State sekarang

- `src/features/classroom/api/classSectionAdapter.ts` — shim ringan untuk normalize class vs rombel
- `src/features/classroom/api/classroomService.ts` — main classroom service, masih query `classes` table
- `src/features/gradebook/api/gradebookApi.ts` — query `gradebook_entries` joined `classes` (untuk per-rombel grades)
- `src/features/attendance/api/attendanceService.ts` — legacy attendance (per-class)
- `src/features/attendance/api/rombelAttendanceService.ts` — sudah pakai `rombel_attendance` table dari migrasi 063 ✓
- `src/features/rombel/api/rombelService.ts` — service rombel native ✓

## Goal

Semua FE service yang membaca "section/class membership" prefer `rombel` row ketika ada, fallback ke `classes` row saat data lama. Flag-gated (`VITE_USE_ROMBEL_ADAPTER=true`) supaya bisa rollback cepat.

## Steps

### Step 1 — Extend `classSectionAdapter.ts`

Tambah `listClassSections({ tenantId, courseId? })` yang:
1. Query `rombel` + `rombel_members` dulu
2. Kalau kosong, fallback ke `classes` + `course_classes` + `enrollments`
3. Return shape unified `ClassSection { id, name, kind: 'rombel' | 'class', members: User[], course_id?: string }`
4. Log telemetry: `console.debug('[classSection] served from', kind, 'count=', n)` — feeds observability

### Step 2 — Wrap `classroomService.ts`

- `getMyClasses()` → call `listClassSections()` first, only kalau flag `VITE_USE_ROMBEL_ADAPTER=true`
- `getClassMembers(id)` → adapter lookup
- `getClassDetails(id)` → adapter
- 4 unit test baru: prefer-rombel-when-both / fallback-when-no-rombel / flag-off-uses-legacy / mixed-tenant-isolation

### Step 3 — Wrap `gradebookApi.ts`

Fungsi yang query "students of a class" pakai adapter member list. Gradebook entry sendiri tetap by `course_id`, tidak terpengaruh.

### Step 4 — Wrap `attendanceService.ts` legacy path

Kalau adapter return rombel kind, redirect ke `rombelAttendanceService` (yang sudah ada). Kalau class kind, lanjut path lama.

### Step 5 — Sweep regression

Run `pnpm test:e2e tests/e2e/sweep.spec.ts` untuk semua 9 persona. Issue count harus tidak naik. Test wali_kelas + teacher harus tetap 0.

### Step 6 — Flip flag default

Setelah 1 minggu observasi telemetri (semua hit dari `kind=rombel`), set default `VITE_USE_ROMBEL_ADAPTER=true` di production env.

## Risk

- Surface area besar; setiap component yang import dari 3 service tersebut perlu retest manual
- `classroomService.getMyClasses` dipakai di sidebar nav — kalau salah, seluruh navigasi rusak
- Mitigasi: flag-gated, tunggu staging soak ≥3 hari

## DoD (gate untuk I1-I4 unblock)

1. Flag aktif di staging selama 1 minggu
2. Telemetry: 100% read served via `kind=rombel` untuk dev school nusantara
3. Sweep issue count tidak naik
4. Roll-back path tested (flip flag back → semua kembali ke legacy)
