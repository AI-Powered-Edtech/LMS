# Prompt: Merge PR #147 — Sprint A-D

Copas ke agent (Jules, Claude, dsb). Ganti `[REPO]` jika perlu.

---

Kamu adalah senior engineer di repo `AI-Powered-Edtech/LMS`. Tugasmu: review dan merge PR #147, fix semua blocker dulu.

## PR Info

- **URL**: https://github.com/AI-Powered-Edtech/LMS/pull/147
- **Branch**: `notion-sync/incoming` → `main`
- **Isi**: Sprint A-D dari Notion AI — test coverage, OpenTelemetry, API versioning, parent portal hooks, shared-management components
- **Files**: 31 files, +5346/-69

## Langkah Kerja

### Step 1: Checkout branch

```bash
git fetch origin
git checkout notion-sync/incoming
```

### Step 2: Fix issue Qodo #1 — `shared-management/` lokasi salah

File `src/shared-management/` harus dipindah ke `src/features/shared-management/` sesuai konvensi feature module.

Pindahkan:
- `src/shared-management/DataTable.tsx` → `src/features/shared-management/components/DataTable.tsx`
- `src/shared-management/StatsCards.tsx` → `src/features/shared-management/components/StatsCards.tsx`
- `src/features/shared-management/FilterBar.tsx` → `src/features/shared-management/components/FilterBar.tsx`
- `src/shared-management/index.ts` → `src/features/shared-management/index.ts`
- `src/shared-management/README.md` → `src/features/shared-management/README.md`

Update semua import yang merujuk ke path lama.

### Step 3: Cek CI failures

Jalankan lokal:
```bash
pnpm typecheck
pnpm lint
pnpm build
```

Fix semua TypeScript error dan lint error yang ditemukan di file-file baru Sprint A-D.

File baru yang perlu dicek:
- `src/contexts/__tests__/AuthContext.branch-coverage.test.tsx`
- `src/features/courses/__tests__/courseService.comprehensive.test.ts`
- `src/features/gradebook/__tests__/gradebookApi.comprehensive.test.ts`
- `src/features/gradebook/__tests__/hooks.comprehensive.test.ts`
- `src/features/lessons/__tests__/lessonService.comprehensive.test.ts`
- `src/features/parent/__tests__/integration.flow.test.ts`
- `src/features/parent/hooks/useParentNotifications.ts`
- `src/features/parent/hooks/useChildActivityHistory.ts`
- `src/features/quizzes/__tests__/hooks.comprehensive.test.ts`
- `src/features/quizzes/__tests__/quizAttemptService.test.ts`
- `supabase/functions/_shared/otel.ts`
- `supabase/functions/_shared/apiVersion.ts`

### Step 4: Hapus noise files dari commit

File-file ini tidak perlu masuk ke main (doc lokal, bukan kode):
- `IMPLEMENTATION_PLAN_PHASE31.md`
- `PRODUCTION_READINESS_REPORT.md`
- `QA_DEV_LOOP_1.md`
- `QA_DEV_LOOP_4.md`
- `QA_DEV_LOOP_5.md`
- `__command_old__`

Hapus dari branch:
```bash
git rm --cached IMPLEMENTATION_PLAN_PHASE31.md PRODUCTION_READINESS_REPORT.md QA_DEV_LOOP_1.md QA_DEV_LOOP_4.md QA_DEV_LOOP_5.md __command_old__
git commit -m "chore: remove noise files from PR"
```

### Step 5: Update COMPONENT_REGISTRY.md

Tambahkan entri baru di COMPONENT_REGISTRY.md untuk:
- `src/features/shared-management/` — Status: Active, Last Updated: 2026-04-06
- `src/features/parent/hooks/useParentNotifications.ts` — shared hook baru
- `src/features/parent/hooks/useChildActivityHistory.ts` — shared hook baru

### Step 6: Merge

Setelah semua fix:
```bash
git push origin notion-sync/incoming
```

Tunggu CI pass, lalu merge via GitHub (squash merge direkomendasikan).

Atau merge langsung:
```bash
gh pr merge 147 --squash --subject "feat(sprint-ad): test coverage, OTel, API versioning, parent portal, shared components"
```

## Aturan Proyek (wajib diikuti)

- Teks UI → Bahasa Indonesia
- Komponen baru → wajib `dark:` Tailwind variants
- Supabase calls → hanya dari `src/features/*/api/`
- Identity → `const { user, role, tenantId } = useAuth()`
- Routing → hash `/#/app/...`
- Jangan hapus/ubah baris `file:...` di code block Notion

## Setelah Merge

1. Update `CHANGELOG.md` — tambah entry Sprint A-D
2. Jalankan `git pull` di main working tree
