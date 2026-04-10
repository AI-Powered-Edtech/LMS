# Reality Sync Baseline

## STATUS: Historical Snapshot (2026-04-09)

> **Catatan Penting:** Dokumen ini menangkap kondisi repo pada SAAT Reality Sync berlangsung (2026-04-09). Ini adalah catatan historis, BUKAN dokumen status live. Nilai readiness 68/100 adalah skor PADA SAAT ITU, bukan kondisi saat ini.

## Metadata

- **Tanggal:** 2026-04-10
- **Branch:** main
- **Commit:** 45bce882
- **Author:** Agent (Migration Planning)
- **Sources Used:**
  - `migration-plan-agents/00_CONTROL_TOWER/CURRENT_STATUS.md`
  - `docs/PRODUCTION_READINESS_STATUS.md`
  - `docs/ARCHITECTURE.md`
  - `package.json`
  - `.github/workflows/ci.yml`

---

## Current Program Truth

| Aspek                         | Nilai                                                       | Keterangan                             |
| ----------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| Repository Readiness          | **81/100**                                                  | Production Candidate                   |
| Migration Execution Readiness | **68/100**                                                  | Target: 88/100                         |
| Program Status                | **Conditional Go**                                          | Hanya Phase -1 + 0A yang diperbolehkan |
| Allowed Scope                 | Phase -1 (Reality Sync) + Phase 0A (API Client Abstraction) |                                        |
| Frozen Scope                  | Phase 0B, 0C, 0D, 0E, Phase 1+                              | Sampai gate lulus                      |

**Catatan Penting:**

- Repo readiness (81/100) adalah maturitas produk, bukan kesiapan migrasi
- Migration execution readiness (68/100) adalah kesiapan untuk eksekusi migrasi
- Kedua metrik harus dibedakan secara eksplisit

---

## Architecture Truth

**Realitas Arsitektur Repo Saat Ini:**

- Aplikasi adalah **Supabase-centric SaaS LMS** — tidak ada traditional backend server tradisional
- Business logic hidup di:
  - PostgreSQL database
  - RLS (Row Level Security) policies
  - SQL functions / RPCs
  - Supabase Edge Functions (30 functions)
- Frontend adalah **React SPA** dengan:
  - **BrowserRouter** aktif dengan hash fallback untuk production
  - Path-based routing `/app/` aktif
  - React Query untuk server state
  - Zustand untuk local feature state
  - React Context untuk auth state
- **52 feature modules** aktif
- **30 Deno Edge Functions** merupakan bagian nyata dari backend aktif

**Yang TIDAK boleh diasumsikan:**

- ❌ App sudah punya server backend sendiri
- ❌ Hash-based routing `/#/` adalah default — realitas adalah path-based `/app/`
- ❌ Backend bisa langsung di-replace tanpa abstraction layer

---

## Toolchain and Runtime Truth

**Package Manager:** `pnpm` (WAJIB, bukan npm/yarn)

**Stack Aktif:**

- React 19
- Vite 6
- TypeScript 5.8
- React Router 7 (path-based routing)
- Tailwind CSS v4
- **@supabase/supabase-js** — masih dependency aktif

**Scripts Verifikasi Utama:**

```bash
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm test:ci      # Unit tests (CI mode)
pnpm test:e2e     # Playwright E2E
pnpm build        # Production build
```

---

## CI Truth

- CI **ADA** — GitHub Actions workflow exists
- Quality job mencakup: lint, format, typecheck, migration validation, unit test, build, smoke, bundle, coverage
- E2E job **ADA** — berjalan setelah quality job
- **Status:** Exists but needs verification

**Catatan:**

- CI tidak boleh diasumsikan "belum ada" (sudah ada)
- CI juga tidak boleh diasumsikan "sudah fully trusted" — workflow menunjukkan potensi format/indent issues yang perlu diverifikasi sebelum dijadikan migration gate

---

## Production Truth vs Migration Truth

| Area             | Production Truth         | Migration Truth                          |
| ---------------- | ------------------------ | ---------------------------------------- |
| Auth             | ✅ Ready                 | ⚠️ Deeply coupled ke Supabase Auth + RPC |
| Course Builder   | ✅ Ready                 | ⚠️ Query langsung ke Supabase            |
| Quiz             | ✅ Ready                 | ⚠️ Edge Functions untuk grading          |
| Analytics        | ✅ Ready                 | ⚠️ RPC-based patterns                    |
| Gamification     | ✅ Ready                 |                                          |
| Gradebook        | ⚠️ Limited               |                                          |
| Parent/Principal | ⚠️ Beta di area tertentu |                                          |
| Realtime         | ✅ Active                | ❌ Native Supabase, belum di-abstraction |
| Storage          | ✅ Active                | ❌ Native Supabase Storage               |

**Kesimpulan:** Produk cukup matang (81/100), tapi backend deeply coupled ke Supabase. Migrasi TIDAK bisa dibaca sebagai "tinggal ganti provider" — butuh abstraction layer yang kuat dulu.

---

## Known Migration-Critical Facts

1. **Auth dependencies:** Sekarang bergantung pada Supabase Auth + RPC patterns (`get_auth_bootstrap`, `ensure_profile_exists`, dll)
2. **Multi-tenant isolation:** Ditopang oleh RLS + `tenant_id` column — di VIL harus diubah menjadi TenantGuard middleware atau setara
3. **Edge Functions:** 30 functions adalah bagian nyata dari backend aktif, bukan optional
4. **Realtime:** Native Supabase, 9 consumer hooks — butuh abstraction sebelum migrate
5. **Storage:** Native Supabase Storage — butuh abstraction sebelum migrate
6. **Routing:** Path-based routing `/app/` sudah aktif — tidak ada mismatch lagi
7. **Abstraction layer:** BELUM dimulai — Phase 0A adalah prasyarat keras sebelum Phase 1

---

## No Longer Assume

Hal-hal yang **TIDAK boleh diasumsikan** lagi:

- ❌ Hash routing `/#/` sebagai active state — realitas adalah path-based `/app/`
- ❌ "CI belum ada" — sudah ada, tapi perlu verifikasi
- ❌ "Backend scaffold bisa langsung masuk auth" — Phase 0A harus selesai dulu
- ❌ Auth/Realtime/Storage adalah wave awal — semuanya frozen sampai Gate RS + Gate 0A lulus
- ❌ README lama lebih akurat dari readiness doc — kontrol tower ada di `migration-plan-agents/`

---

## Baseline Decisions for Next Workstreams

**Source of Truth:**

- **Produk:** `docs/PRODUCTION_READINESS_STATUS.md`
- **Migrasi:** `migration-plan-agents/00_CONTROL_TOWER/*`

**Workstream Order:**

1. A (sekarang) → Reality Sync Baseline
2. B → Supabase Coupling Inventory
3. C → Gap Reclassification
4. D → Scope Narrowing
5. E → Revised Phase 0

**Constraint:**

- TIDAK boleh open auth/realtime/storage cutover sebelum Gate RS (Reality Sync) lulus
- TIDAK boleh open Phase 1 sebelum Gate 0A lulus
- Execution readiness harus mencapai 88/100 sebelum widen scope

---

## Acceptance Checklist

Workstream A selesai jika file ini memuat:

- [x] Repository readiness: **81/100**
- [x] Migration execution readiness: **68/100 → 88/100**
- [x] Arsitektur: **Supabase-centric** (no traditional backend)
- [x] Routing: **Path-based `/app/`**
- [x] Edge Functions: **30**
- [x] E2E: **400+ Playwright scenarios**
- [x] CI: **Exists but needs verification**
- [x] Allowed scope: **Phase -1 + 0A only**
- [x] Frozen scope: **0B+ dan Phase 1+**
