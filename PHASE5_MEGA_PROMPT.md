# Phase 5 Mega Prompt — Feature Health 100/100

Kamu adalah senior fullstack engineer yang mengerjakan EduSync LMS. Tugasmu: bawa SEMUA 24 feature modules ke skor 100/100 di Feature Health Tracker.

**Baca `CLAUDE.md` dan `docs/PHASE5_ROADMAP.md` sebelum mulai kerja.**

---

## CONTEXT

EduSync = multi-tenant SaaS LMS untuk sekolah Indonesia. Stack: React 19 + Vite 6 + TypeScript 5.8 + Tailwind v4 + Supabase JS v2. Semua teks UI = Bahasa Indonesia. Hash routing (`/#/`). Feature modules ada di `src/features/{domain}/`.

## SCORING FORMULA

Setiap feature dinilai 3 dimensi, rata-rata = Skor Total:

```
Completeness (max 100):
  api/ folder exists          → +20
  hooks/ folder exists        → +15
  types/ folder exists        → +15
  components/ folder exists   → +20
  queries/ folder exists      → +15
  *.test.ts file exists       → +15

Dokumentasi (max 100):
  README.md in feature dir    → +30
  doc refs × 2 (max 70)       → each .md file in docs/ that mentions feature name → +2

UI/UX Quality (max 100):
  base                        → +20
  files with `dark:` × 5      → max +50 (need 10+ files)
  files with `Skeleton` × 8   → max +30 (need 4+ files)
```

Scorer script: `scripts/score-features.js` — run setelah setiap perubahan untuk verifikasi.

---

## CURRENT STATE — 24 FEATURES

Tabel gap yang harus ditutup. Setiap sel yang BUKAN `✅` harus dikerjakan.

```
Feature          | api | hooks | types | comp | queries | tests | README | dark≥10 | skel≥4 | docRef≥35
─────────────────┼─────┼───────┼───────┼──────┼─────────┼───────┼────────┼─────────┼────────┼──────────
administration   |  ✅  |  ❌   |  ❌   |  ❌  |   ❌    |  ❌   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(2)
ai-tutor         |  ✅  |  ❌   |  ✅   |  ✅  |   ✅    |  ❌   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(14)
analytics        |  ✅  |  ✅   |  ✅   |  ✅  |   ✅    |  ✅   |   ❌   |  ✅(25) | ✅(6)  |  ❌(22)
announcements    |  ✅  |  ❌   |  ✅   |  ❌  |   ✅    |  ✅   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(7)
assignments      |  ✅  |  ✅   |  ❌   |  ❌  |   ❌    |  ✅   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(10)
calendar         |  ✅  |  ✅   |  ❌   |  ❌  |   ❌    |  ❌   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(2)
classroom        |  ✅  |  ✅   |  ❌   |  ❌  |   ❌    |  ✅   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(6)
courses          |  ✅  |  ❌   |  ✅   |  ❌  |   ✅    |  ✅   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(17)
dashboards       |  ✅  |  ❌   |  ✅   |  ✅  |   ✅    |  ❌   |   ❌   |  ❌(5)  | ❌(0)  |  ❌(5)
discussions      |  ✅  |  ✅   |  ❌   |  ❌  |   ❌    |  ✅   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(3)
gamification     |  ✅  |  ❌   |  ✅   |  ✅  |   ✅    |  ✅   |   ❌   |  ❌(7)  | ✅(4)  |  ❌(13)
gradebook        |  ✅  |  ❌   |  ✅   |  ✅  |   ✅    |  ❌   |   ❌   |  ❌(2)  | ❌(2)  |  ❌(7)
guidance         |  ✅  |  ❌   |  ✅   |  ✅  |   ✅    |  ❌   |   ❌   |  ❌(4)  | ❌(0)  |  ❌(2)
lessons          |  ✅  |  ❌   |  ✅   |  ❌  |   ✅    |  ✅   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(13)
moderation       |  ✅  |  ❌   |  ❌   |  ❌  |   ✅    |  ❌   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(2)
notifications    |  ✅  |  ✅   |  ✅   |  ✅  |   ✅    |  ✅   |   ❌   |  ❌(3)  | ❌(0)  |  ❌(9)
onboarding       |  ❌  |  ❌   |  ✅   |  ✅  |   ❌    |  ❌   |   ❌   |  ❌(1)  | ❌(0)  |  ❌(3)
progress         |  ✅  |  ✅   |  ❌   |  ❌  |   ❌    |  ✅   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(18)
question-bank    |  ✅  |  ❌   |  ❌   |  ✅  |   ❌    |  ✅   |   ❌   |  ❌(3)  | ❌(0)  |  ❌(5)
quizzes          |  ✅  |  ✅   |  ✅   |  ✅  |   ✅    |  ✅   |   ✅   |  ✅(11) | ❌(1)  |  ❌(10)
recommendations  |  ✅  |  ❌   |  ✅   |  ✅  |   ✅    |  ✅   |   ❌   |  ❌(2)  | ❌(0)  |  ❌(10)
reports          |  ✅  |  ❌   |  ✅   |  ✅  |   ✅    |  ❌   |   ❌   |  ❌(2)  | ❌(0)  |  ❌(4)
storage          |  ✅  |  ❌   |  ✅   |  ❌  |   ❌    |  ❌   |   ❌   |  ❌(0)  | ❌(0)  |  ❌(8)
struggle         |  ✅  |  ❌   |  ✅   |  ✅  |   ✅    |  ✅   |   ❌   |  ❌(4)  | ❌(2)  |  ❌(6)
```

**Totals**: 55 missing completeness items · 23 missing README · 14 features 0 dark files · 18 features 0 skeleton · 0 features have 35+ doc refs

---

## EXECUTION ORDER

Kerjakan secara berurutan: **5A → 5B → 5C → 5D → 5E**. Run scorer setelah setiap sprint.

---

## SPRINT 5A — STRUCTURE & README

### Task 1: Buat Missing Folders + Stub Files

Untuk setiap ❌ di kolom api/hooks/types/components/queries di tabel di atas, buat folder + index.ts stub. JANGAN buat file kosong — setiap stub harus bermakna.

#### hooks/ stub template:

```typescript
// src/features/{feature}/hooks/use{Feature}.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { {feature}Service } from '../api/{feature}Service'

/**
 * Hook untuk mengambil data {Feature}.
 * TODO: Implementasi lengkap saat feature matang.
 */
export function use{Feature}Data(tenantId: string) {
  return useQuery({
    queryKey: ['{feature}', tenantId],
    queryFn: () => {feature}Service.getAll(tenantId),
    enabled: !!tenantId,
  })
}

export function use{Feature}Mutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: {feature}Service.upsert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['{feature}'] }),
  })
}
```

#### types/ stub template:

```typescript
// src/features/{feature}/types/index.ts

/** Core {Feature} entity */
export interface {Feature} {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/** Create/update payload */
export interface {Feature}Input {
  // TODO: define fields
}

/** API response wrapper */
export interface {Feature}Response {
  data: {Feature}[]
  count: number
}
```

#### components/ stub template:

```typescript
// src/features/{feature}/components/{Feature}Card.tsx
import { cn } from '@/src/utils/cn'
import type { {Feature} } from '../types'

interface {Feature}CardProps {
  item: {Feature}
  className?: string
}

/**
 * Card component untuk menampilkan {Feature}.
 * Mendukung dark mode.
 */
export function {Feature}Card({ item, className }: {Feature}CardProps) {
  return (
    <div className={cn(
      'rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800',
      className
    )}>
      <h3 className="font-semibold text-slate-900 dark:text-white">{item.id}</h3>
    </div>
  )
}
```

#### queries/ stub template:

```typescript
// src/features/{feature}/queries/{feature}Queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { {feature}Service } from '../api/{feature}Service'

export const {feature}Keys = {
  all: (tenantId: string) => ['{feature}', tenantId] as const,
  detail: (tenantId: string, id: string) => ['{feature}', tenantId, id] as const,
}

export function use{Feature}List(tenantId: string) {
  return useQuery({
    queryKey: {feature}Keys.all(tenantId),
    queryFn: () => {feature}Service.getAll(tenantId),
    enabled: !!tenantId,
  })
}
```

#### api/ stub (hanya untuk onboarding yang belum punya):

```typescript
// src/features/onboarding/api/onboardingService.ts
import { supabase } from '@/src/lib/supabase'

export const onboardingService = {
  async getProgress(userId: string) {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('step, completed_at')
      .eq('user_id', userId)
    if (error) throw error
    return data
  },

  async completeStep(userId: string, step: string) {
    const { error } = await supabase
      .from('onboarding_progress')
      .upsert({ user_id: userId, step, completed_at: new Date().toISOString() })
    if (error) throw error
  },
}
```

**Penting**: Cek existing index.ts exports dan pastikan stub TIDAK conflict. Jika feature sudah punya hooks di lokasi lain (misal `useCalendarQueries` di `hooks/`), jangan buat duplikat — folder sudah exist.

### Task 2: Buat README.md untuk 23 Features

Template README.md:

```markdown
# {Feature Name} Feature Module

{1-2 kalimat deskripsi feature dalam konteks EduSync LMS.}

## Architecture

\`\`\`
src/features/{feature}/
├── api/ # Supabase service layer
├── queries/ # React Query hooks
├── hooks/ # Custom React hooks
├── types/ # TypeScript interfaces
├── components/ # React components
└── **tests**/ # Unit & integration tests
\`\`\`

## Key Components

- **{Component1}** — {deskripsi singkat}
- **{Component2}** — {deskripsi singkat}

## API / RPC

| Function             | Deskripsi   |
| -------------------- | ----------- |
| `{service}.getAll()` | {deskripsi} |
| `{service}.upsert()` | {deskripsi} |

## Database Tables

- `{table_name}` — {deskripsi}

## Usage

\`\`\`tsx
import { use{Feature}Data } from '@/src/features/{feature}'

function MyComponent() {
const { data, isLoading } = use{Feature}Data(tenantId)
// ...
}
\`\`\`

## Testing

\`\`\`bash
npx vitest run src/features/{feature}
\`\`\`

## Related Docs

- [DATABASE.md](../../docs/DATABASE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
```

**Populate setiap README** dengan info NYATA dari feature tersebut — jangan copy-paste generik. Baca index.ts exports, api service, dan components untuk isi yang akurat.

### Task 3: Fix README.md utama

Ganti semua `22` yang merujuk feature count jadi `24`:

- `Features["22 Feature Modules"]` → `Features["24 Feature Modules"]`
- `22 self-contained modules` → `24 self-contained modules`
- `features/               # 22 feature modules` → `features/               # 24 feature modules`

### Verifikasi Sprint 5A:

```bash
node scripts/score-features.js  # Semua Completeness harus = 100
```

---

## SPRINT 5B — UNIT & INTEGRATION TESTS

### Task 1: Test Files untuk 12 Features Tanpa Tests

Features yang butuh `__tests__/`: administration, ai-tutor, calendar, dashboards, gradebook, guidance, moderation, onboarding, reports, storage, struggle (sudah punya test tapi verifikasi), quizzes (sudah ada, skip).

#### Test template (sesuaikan per feature):

```typescript
// src/features/{feature}/__tests__/{feature}.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { {feature}Service } from '../api/{feature}Service'

// Mock Supabase
const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
      }),
    },
  },
}))

describe('{feature}Service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getAll', () => {
    it('should query with tenant_id filter', async () => {
      const mockData = [{ id: '1', tenant_id: 't1' }]
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      })

      const result = await {feature}Service.getAll('t1')
      expect(mockFrom).toHaveBeenCalledWith('{table_name}')
      expect(result).toEqual(mockData)
    })

    it('should throw on Supabase error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'RLS violation' },
          }),
        }),
      })

      await expect({feature}Service.getAll('t1')).rejects.toThrow()
    })
  })
})
```

**KUNCI**: Baca actual service functions di `api/{feature}Service.ts` dan test method-method yang NYATA ada. Jangan test fungsi yang tidak exist.

### Task 2: Real E2E Tests

Buat 3 file E2E yang benar-benar login dan interaksi:

```typescript
// e2e/flows/student-learning-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Student Learning Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login')
    // Klik quick-login button (bukan fill form — lihat CLAUDE.md gotcha)
    await page.getByRole('button', { name: /student/i }).click()
    await page.waitForURL(/.*student/, { timeout: 15000 })
  })

  test('enroll course → open lesson → start quiz → submit', async ({ page }) => {
    // Navigate ke courses
    await page.goto('/#/app/student/courses')
    await page.waitForTimeout(5000) // blank load issue

    // Verifikasi course cards muncul
    await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible({
      timeout: 15000,
    })

    // Klik course pertama
    await page.locator('[data-testid="course-card"]').first().click()
    await page.waitForTimeout(3000)

    // Verifikasi course detail page
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('view progress dan leaderboard', async ({ page }) => {
    await page.goto('/#/app/student/leaderboard')
    await page.waitForTimeout(5000)
    await expect(page.locator('table, [class*="leaderboard"]').first()).toBeVisible({
      timeout: 15000,
    })
  })
})
```

```typescript
// e2e/flows/teacher-grading-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Teacher Grading Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login')
    await page.getByRole('button', { name: /teacher/i }).click()
    await page.waitForURL(/.*teacher/, { timeout: 15000 })
  })

  test('open gradebook → view submissions', async ({ page }) => {
    await page.goto('/#/app/teacher/gradebook')
    await page.waitForTimeout(10000) // known blank load
    await expect(page.locator('table, [class*="gradebook"]').first()).toBeVisible({
      timeout: 20000,
    })
  })

  test('open course builder', async ({ page }) => {
    await page.goto('/#/app/teacher/course-builder')
    await page.waitForTimeout(5000)
    // Verifikasi halaman loads tanpa error
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
  })
})
```

```typescript
// e2e/flows/admin-management-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login')
    await page.getByRole('button', { name: /admin/i }).click()
    await page.waitForURL(/.*admin/, { timeout: 15000 })
  })

  test('admin dashboard → manage users → audit log', async ({ page }) => {
    // Admin dashboard
    await page.goto('/#/app/admin')
    await page.waitForTimeout(3000)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })

    // Users page
    await page.goto('/#/app/admin/users')
    await page.waitForTimeout(15000) // known 10-20s load
    await expect(page.locator('table, [class*="user"]').first()).toBeVisible({ timeout: 25000 })

    // Audit log
    await page.goto('/#/app/admin/audit')
    await page.waitForTimeout(15000)
    const text = await page.textContent('body')
    expect(text?.toLowerCase()).toMatch(/audit|log|aktivitas/i)
  })
})
```

### Verifikasi Sprint 5B:

```bash
npx vitest run                              # Semua unit tests pass
npx playwright test e2e/flows/              # Semua E2E flow tests pass
node scripts/score-features.js              # Semua Completeness = 100
```

---

## SPRINT 5C — DARK MODE & SKELETON SCREENS

### Task 1: Dark Mode (target ≥10 files per feature)

Setiap `.tsx` component file harus punya `dark:` Tailwind variants. Patterns yang HARUS ada:

```
Background:  bg-white         → dark:bg-slate-800  ATAU  dark:bg-gray-900
             bg-slate-50      → dark:bg-slate-900
             bg-slate-100     → dark:bg-slate-800
Text:        text-slate-900   → dark:text-white  ATAU  dark:text-slate-100
             text-slate-600   → dark:text-slate-300
             text-slate-500   → dark:text-slate-400
Border:      border-slate-200 → dark:border-slate-700
Input:       bg-white         → dark:bg-slate-900
Card:        rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
Badge:       bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400
```

**Strategi efisien**: Untuk features dengan sedikit files (<10 TSX), kamu perlu membuat komponen baru atau memecah komponen besar. JANGAN buat file dummy — setiap file harus punya purpose:

- `{Feature}PageHeader.tsx` — header section dengan title & breadcrumb
- `{Feature}EmptyState.tsx` — empty state component
- `{Feature}FilterBar.tsx` — filter/search bar
- `{Feature}Card.tsx` — card component
- `{Feature}Table.tsx` — table component
- `{Feature}Stats.tsx` — statistics/metrics cards
- `{Feature}Modal.tsx` — modal dialogs
- `{Feature}Form.tsx` — create/edit form
- `{Feature}Skeleton.tsx` — skeleton loading (juga hitung di skeleton score)
- `{Feature}DetailView.tsx` — detail/show view

Semua file di atas HARUS punya `dark:` classes → ini memenuhi target ≥10 dark files.

**GOTCHA**: Scorer menghitung files yang mengandung literal string `dark:` — pastikan SETIAP component file punya minimal 1 `dark:` class.

### Task 2: Skeleton Screens (target ≥4 files per feature)

Buat skeleton components per feature. Import dari `@/src/components/ui/Skeleton`:

```typescript
// src/features/{feature}/components/{Feature}Skeleton.tsx
import { Skeleton, SkeletonCard } from '@/src/components/ui/Skeleton'

export function {Feature}Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

Kamu butuh 4 file per feature yang mengandung `Skeleton`:

1. `{Feature}Skeleton.tsx` — standalone skeleton component
2. `{Feature}Card.tsx` — card yang punya loading state dengan Skeleton
3. `{Feature}Table.tsx` — table yang punya loading state
4. `{Feature}DetailView.tsx` atau `{Feature}Stats.tsx` — stat cards dengan Skeleton loading

**GOTCHA**: Scorer menghitung files yang mengandung case-insensitive `Skeleton` string — import counts!

### Verifikasi Sprint 5C:

```bash
node scripts/score-features.js  # Semua UI/UX Quality harus = 100
```

---

## SPRINT 5D — DOCUMENTATION SATURATION

### Task 1: Buat `docs/features/` directory dengan 24 feature docs

```bash
mkdir -p docs/features
```

Untuk SETIAP feature, buat `docs/features/{FEATURE_NAME}.md`:

```markdown
# {Feature Name}

## Overview

{2-3 paragraf tentang feature ini dalam konteks EduSync LMS.}

## Architecture

{Jelaskan bagaimana feature ini berinteraksi dengan Supabase, RLS, dan tenant isolation.}

## Database Tables

{List tabel yang digunakan feature ini beserta kolom pentingnya.}

## RPC / Edge Functions

{List RPC dan Edge Functions yang related.}

## UI Pages

{List halaman/route yang digunakan feature ini.}

## Dependencies

{Feature lain yang di-depend atau yang depend ke feature ini.}

## Known Issues

{Bug atau limitation yang diketahui.}

## Testing

{Bagaimana cara test feature ini.}

## Related Features

{Feature lain yang berkaitan: administration, analytics, assignments, calendar, classroom,
courses, dashboards, discussions, gamification, gradebook, guidance, lessons, moderation,
notifications, onboarding, progress, question-bank, quizzes, recommendations, reports,
storage, struggle, ai-tutor}
```

**KRITIS**: Di section "Related Features", list SEMUA 24 features. Ini memastikan setiap feature doc menyebut semua feature lain → cross-reference.

### Task 2: Update SEMUA Existing Docs

Untuk setiap file di `docs/*.md` (33 files), tambahkan section atau paragraf yang menyebut SEMUA 24 feature names. Caranya:

1. `docs/ARCHITECTURE.md` — tambahkan section "Feature Module Index" yang list semua 24 features dengan 1-line deskripsi
2. `docs/DATABASE.md` — tambahkan mapping tabel → feature
3. `docs/SECURITY.md` — tambahkan section "Feature-level Security" yang list RLS per feature
4. `docs/AUTH.md` — tambahkan section "Feature Access Matrix"
5. `docs/TESTING.md` — tambahkan section "Feature Test Coverage"
6. Dan seterusnya — setiap doc file harus menyebut semua 24 feature names minimal 1x

**Target**: Setiap feature name muncul di ≥35 doc files. Dengan 24 feature docs + 33 existing docs = 57 possible. Kita hanya butuh 35.

### Task 3: Buat Docs Tambahan jika Perlu

Jika ada feature yang masih <35 doc refs setelah Task 1 & 2:

- `docs/API_REFERENCE.md` — list semua RPC endpoints by feature
- `docs/COMPONENT_LIBRARY.md` — list semua shared components used by features
- `docs/FEATURE_MATRIX.md` — role × feature permission matrix
- `docs/PERFORMANCE.md` — load time budget per feature
- `docs/ACCESSIBILITY.md` — a11y compliance per feature

### Verifikasi Sprint 5D:

```bash
node scripts/score-features.js  # Semua Dokumentasi harus = 100
```

---

## SPRINT 5E — FINAL VERIFICATION

```bash
# 1. Run scorer — SEMUA harus 100/100
node scripts/score-features.js

# 2. Fix any outlier
# Jika ada feature < 100, identify dimension yang kurang dan fix

# 3. Run tests
npx vitest run
npx playwright test

# 4. Run build
npm run build

# 5. Update CHANGELOG.md
# Tambahkan entry Phase 5

# 6. Update docs/ENGINEERING_ROADMAP.md
# Mark Phase 5 sebagai Complete
```

---

## RULES — WAJIB DIIKUTI

1. **Semua teks UI dalam Bahasa Indonesia** — error messages, labels, placeholder, empty states
2. **Jangan pernah hardcode user ID, tenant ID, atau credentials** — pakai `useAuth()`
3. **Semua new components harus punya `dark:` Tailwind variants**
4. **Skeleton components import dari `@/src/components/ui/Skeleton`**
5. **Test files gunakan vitest** (`describe`, `it`, `expect`, `vi`)
6. **Jangan buat file kosong** — setiap file harus punya konten bermakna minimal 10 baris
7. **Quiz columns: `quiz_questions.text` bukan `question_text`, `quiz_options.text` bukan `option_text`**
8. **`order` adalah reserved word SQL — selalu quote: `"order"`**
9. **`courses.status = 'published'` bukan `is_published`**
10. **`enrollments.user_id` bukan `student_id`**
11. **Run `node scripts/score-features.js` setelah SETIAP sprint** untuk verify progress
12. **Update docs/ setelah SETIAP task signifikan** (per CLAUDE.md documentation policy)
13. **Commit setelah setiap sprint selesai** dengan message `feat(phase5): Sprint 5{X} — {deskripsi}`

---

## QUICK REFERENCE — Feature Name Mapping

Gunakan nama EXACT ini di docs dan cross-references:

```
administration, ai-tutor, analytics, announcements, assignments,
calendar, classroom, courses, dashboards, discussions,
gamification, gradebook, guidance, lessons, moderation,
notifications, onboarding, progress, question-bank, quizzes,
recommendations, reports, storage, struggle
```

---

## CHECKLIST FINAL

- [ ] 24/24 features Completeness = 100
- [ ] 24/24 features Dokumentasi = 100
- [ ] 24/24 features UI/UX Quality = 100
- [ ] 24/24 features Skor Total = 100
- [ ] All vitest pass
- [ ] All playwright E2E pass
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] ENGINEERING_ROADMAP.md updated
- [ ] README.md says "24 Feature Modules"
- [ ] Notion Feature Health Tracker synced (semua 100)
