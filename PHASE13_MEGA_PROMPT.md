# PHASE 13 — Performance & Scale
## EduSync LMS — Execution Guide for Claude Code / Agent

> **Instruksi:** Jalankan setiap sprint **secara berurutan**. Verifikasi setelah tiap sprint
> sebelum lanjut. Jangan skip sprint. Jangan ubah file selain yang disebutkan.
>
> Setelah semua sprint selesai, jalankan `node node_modules/.bin/tsc --noEmit` dan
> `npm run build` — keduanya harus sukses tanpa error.

---

## Konteks

| Item | Nilai |
|------|-------|
| Framework | React 19 + Vite 6 + TypeScript 5.8 + Tailwind v4 |
| State server | React Query v5 (`@tanstack/react-query`) |
| Virtualisasi | `@tanstack/react-virtual` v3 — **sudah di package.json, belum dipakai** |
| Bundle analyzer | `ANALYZE=true npm run build` (rollup-plugin-visualizer) |
| Test accounts | `student@edusync.dev` / `teacher@edusync.dev` / `admin@edusync.dev` — password `password123` |

---

## Sprint 13A — VirtualList untuk Tabel Besar

**Goal:** Render hanya baris yang visible di viewport. Target: tabel dengan potensi >100 baris.
**Estimasi:** ~2 jam

### Files yang diubah
```
src/components/ui/VirtualTable.tsx          ← BUAT BARU
src/pages/QuizGradebook.tsx                 ← ubah tbody
src/pages/AssignmentGradebook.tsx           ← ubah tbody
src/features/classroom/components/ClassroomTable.tsx   ← ubah tbody
src/features/discussions/components/DiscussionTable.tsx ← ubah tbody
src/pages/QuestionBankPage.tsx              ← ubah list
```

### Langkah 1 — Buat `VirtualTable` component

**`src/components/ui/VirtualTable.tsx`** (buat baru):

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface Column<T> {
  key: string
  header: string
  width?: string
  render: (row: T, index: number) => React.ReactNode
}

interface VirtualTableProps<T> {
  data: T[]
  columns: Column<T>[]
  rowHeight?: number
  maxHeight?: number
  getRowKey: (row: T, index: number) => string
  emptyState?: React.ReactNode
  className?: string
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 52,
  maxHeight = 600,
  getRowKey,
  emptyState,
  className = '',
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  })

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800"
          style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = data[virtualRow.index]
            return (
              <tr
                key={getRowKey(row, virtualRow.index)}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ width: col.width }}
                    className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                  >
                    {col.render(row, virtualRow.index)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

### Langkah 2 — `QuizGradebook.tsx`

Cari bagian `<tbody className="divide-y divide-slate-100">` (~baris 453) yang berisi
`{filteredAttempts.map((attempt) => ( ... ))}`.

Ganti seluruh blok `<div className="overflow-x-auto ..."><table>...<tbody>...</tbody></table></div>` yang berisi `filteredAttempts.map` dengan:

```tsx
// Tambah import di atas file:
import { VirtualTable } from '@/src/components/ui/VirtualTable'

// Definisikan columns array sebelum return (sesuaikan field dengan tipe attempt yang ada):
const attemptColumns = [
  {
    key: 'student',
    header: 'Siswa',
    width: '200px',
    render: (attempt: typeof filteredAttempts[0]) => (
      <span className="font-medium">{attempt.student_name ?? attempt.user_id}</span>
    ),
  },
  {
    key: 'score',
    header: 'Skor',
    width: '100px',
    render: (attempt: typeof filteredAttempts[0]) => (
      <span className={attempt.score >= 70 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-500'}>
        {attempt.score ?? '-'}
      </span>
    ),
  },
  {
    key: 'submitted',
    header: 'Waktu Submit',
    width: '160px',
    render: (attempt: typeof filteredAttempts[0]) => (
      <span>{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString('id-ID') : '-'}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '120px',
    render: (attempt: typeof filteredAttempts[0]) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        attempt.status === 'submitted'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      }`}>
        {attempt.status}
      </span>
    ),
  },
]

// Ganti blok tabel lama dengan:
<VirtualTable
  data={filteredAttempts}
  columns={attemptColumns}
  rowHeight={52}
  maxHeight={550}
  getRowKey={(attempt) => attempt.id ?? String(attempt.user_id)}
/>
```

> **Catatan:** Sesuaikan nama field (`student_name`, `score`, `submitted_at`, `status`)
> dengan interface TypeScript aktual dari `attempt`. Baca tipe di
> `src/features/quizzes/types/` sebelum mengisi render function.

### Langkah 3 — `ClassroomTable.tsx`

File ini sudah menggunakan `data.map((row) => ...)` dengan `columns` prop yang fleksibel.
Ganti rendering loop dengan `VirtualTable`:

```tsx
import { VirtualTable } from '@/src/components/ui/VirtualTable'

// Hapus blok <table>...<tbody>{data.map(...)}</tbody></table>
// Ganti dengan:
<VirtualTable
  data={data}
  columns={columns}
  rowHeight={56}
  maxHeight={520}
  getRowKey={(row, i) => (row as { id?: string }).id ?? String(i)}
/>
```

> Pastikan `columns` prop di ClassroomTable sudah compatible dengan interface `Column<T>`
> yang baru dibuat. Jika berbeda, ubah interface `Column` di `VirtualTable.tsx` agar match.

### Langkah 4 — `DiscussionTable.tsx`

Sama seperti ClassroomTable — file ini sudah pakai `columns` + `data.map`. Terapkan
`VirtualTable` dengan `rowHeight={72}` (karena baris diskusi lebih tinggi).

### Langkah 5 — `QuestionBankPage.tsx`

Baris ~150: `{questions.map((q) => (...))}` — ini adalah list card, bukan table.
Gunakan `useVirtualizer` langsung (tidak pakai `VirtualTable`):

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

// Di dalam komponen:
const parentRef = useRef<HTMLDivElement>(null)
const virtualizer = useVirtualizer({
  count: questions.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // perkiraan tinggi tiap card
  overscan: 5,
})

// Ganti list lama dengan:
<div ref={parentRef} className="overflow-auto" style={{ maxHeight: '70vh' }}>
  <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
    {virtualizer.getVirtualItems().map((vRow) => {
      const q = questions[vRow.index]
      return (
        <div
          key={q.id}
          ref={virtualizer.measureElement}
          data-index={vRow.index}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${vRow.start}px)`,
          }}
        >
          {/* Salin JSX card lama untuk 1 item `q` di sini */}
        </div>
      )
    })}
  </div>
</div>
```

### Verifikasi Sprint 13A

```bash
node node_modules/.bin/tsc --noEmit   # 0 error
npm run build                         # sukses
# Manual: buka QuizGradebook, dev tools > Performance, scroll tabel
# DOM hanya berisi ~15 baris meski data 200+
```

---

## Sprint 13B — Infinite Scroll untuk Course Catalog

**Goal:** Ganti load-all-50 dengan `useInfiniteQuery` + IntersectionObserver sentinel.
**Estimasi:** ~1.5 jam

### Konteks

`src/pages/Courses.tsx` saat ini:
- Memanggil `courseService.fetchCourses({ tenantId, limit: 50 })` sekali
- Menyimpan di `useState<Course[]>`
- Tidak ada paginasi di UI

`courseService.fetchCourses` sudah mendukung `{ page, limit }` dan mengembalikan `{ courses, count }`.

### Files yang diubah

```
src/features/courses/queries/courseQueries.ts   ← tambah useInfiniteCoursesQuery
src/pages/Courses.tsx                           ← ganti useState + fetch dengan infinite query
```

### Langkah 1 — `courseQueries.ts` — tambah infinite query

```ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { courseService } from '../api/courseService'

const PAGE_SIZE = 12

export function useInfiniteCoursesQuery(tenantId: string, search?: string) {
  return useInfiniteQuery({
    queryKey: ['courses', 'infinite', tenantId, search],
    queryFn: ({ pageParam = 1 }) =>
      courseService.fetchCourses({
        tenantId,
        page: pageParam as number,
        limit: PAGE_SIZE,
        search,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flatMap((p) => p.courses).length
      return loaded < (lastPage.count ?? 0) ? allPages.length + 1 : undefined
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tenantId,
  })
}
```

### Langkah 2 — `Courses.tsx` — ganti fetch pattern

Hapus semua:
- `const [courses, setCourses] = useState<Course[]>([])`
- `const [loading, setLoading] = useState(true)`
- `useEffect(() => { courseService.fetchCourses(...) }, [...])`

Ganti dengan:

```tsx
import { useInfiniteCoursesQuery } from '@/src/features/courses/queries/courseQueries'
import { useRef, useEffect } from 'react'

// Di dalam komponen (ganti state lama):
const { tenantId } = useAuth()
const [search, setSearch] = useState('')
const debouncedSearch = useDeferredValue(search) // React 19 built-in

const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
} = useInfiniteCoursesQuery(tenantId ?? '', debouncedSearch)

const courses = data?.pages.flatMap((p) => p.courses) ?? []

// Sentinel ref untuk IntersectionObserver
const sentinelRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (!sentinelRef.current || !hasNextPage) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    { rootMargin: '200px' }
  )
  observer.observe(sentinelRef.current)
  return () => observer.disconnect()
}, [hasNextPage, isFetchingNextPage, fetchNextPage])
```

Di akhir grid kursus, tambahkan sentinel + loading indicator:

```tsx
{/* Sentinel — trigger load more */}
<div ref={sentinelRef} className="col-span-full h-1" />

{/* Loading more indicator */}
{isFetchingNextPage && (
  <div className="col-span-full flex justify-center py-6">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    <span className="ml-2 text-sm text-slate-500">Memuat lebih banyak...</span>
  </div>
)}

{/* End of list */}
{!hasNextPage && courses.length > 0 && (
  <p className="col-span-full text-center text-sm text-slate-400 py-4">
    Semua {courses.length} kursus ditampilkan
  </p>
)}
```

Pertahankan logika filter lokal (`filteredCourses`) di atas courses yang sudah di-flatten.

### Verifikasi Sprint 13B

```bash
node node_modules/.bin/tsc --noEmit
npm run build
# Manual: buka /#/app/student/courses atau /#/teaching/courses
# Halaman awal hanya load 12 kursus
# Scroll ke bawah → otomatis load 12 berikutnya
# Network tab: request pertama page=1, lalu page=2 dst
```

---

## Sprint 13C — Stale-Time Tiering

**Goal:** Setiap query punya staleTime yang tepat sesuai seberapa cepat data berubah.
Mengurangi refetch yang tidak perlu pada data statis, mempercepat respons UI.
**Estimasi:** ~1 jam

### Langkah 1 — Buat konstanta di `src/utils/queryConstants.ts`

**`src/utils/queryConstants.ts`** (buat baru):

```ts
/**
 * Stale-time tiers untuk React Query.
 *
 * STATIC   — data yang sangat jarang berubah (konfigurasi tenant, panduan onboarding, role)
 * MODERATE — data yang berubah beberapa kali per hari (kursus, nilai, leaderboard)
 * DYNAMIC  — data yang berubah dalam menit (kalender, tugas aktif, quiz attempts)
 * REALTIME — data yang dikontrol WebSocket (notifikasi) — staleTime=0 agar cache langsung stale
 */
export const STALE = {
  STATIC: 30 * 60 * 1000,    // 30 menit
  MODERATE: 5 * 60 * 1000,   // 5 menit (default global)
  DYNAMIC: 30 * 1000,         // 30 detik
  REALTIME: 0,                // 0 — cache selalu stale, update via subscription
} as const

/**
 * gcTime tiers — berapa lama data tetap di cache setelah tidak dipakai.
 * Lebih lama dari staleTime agar navigasi kembali ke halaman masih menampilkan data lama
 * sambil refetch di background.
 */
export const GC = {
  SHORT: 5 * 60 * 1000,   // 5 menit
  NORMAL: 10 * 60 * 1000, // 10 menit (default React Query)
  LONG: 30 * 60 * 1000,   // 30 menit — untuk data statis
} as const
```

### Langkah 2 — Update query files

Import `STALE` dan ganti nilai hardcoded di setiap file berikut:

#### `src/features/administration/queries/administrationQueries.ts`
```ts
import { STALE, GC } from '@/src/utils/queryConstants'
// staleTime: STALE.STATIC  — konfigurasi modul sekolah jarang berubah
// gcTime: GC.LONG
```

#### `src/features/guidance/queries/useGuidanceQueries.ts`
```ts
import { STALE, GC } from '@/src/utils/queryConstants'
// Ganti: staleTime: 2 * 60 * 1000  →  staleTime: STALE.STATIC
// gcTime: GC.LONG
```

#### `src/features/onboarding/queries/onboardingQueries.ts`
```ts
// staleTime: STALE.STATIC  — step onboarding tidak berubah setelah selesai
```

#### `src/features/recommendations/queries/recommendationQueries.ts`
```ts
// staleTime: STALE.STATIC  — rekomendasi di-recompute harian oleh pg_cron, bukan real-time
```

#### `src/features/reports/queries/reportQueries.ts`
```ts
// staleTime: STALE.STATIC  — laporan dihasilkan on-demand, tidak berubah setelah dihasilkan
```

#### `src/features/gamification/queries/gamificationQueries.ts`
```ts
// Badge list & user badges:    staleTime: STALE.STATIC   — badge tidak berubah
// Leaderboard:                 staleTime: STALE.MODERATE  — sudah 10min, pertahankan atau MODERATE
// Streak & XP:                 staleTime: STALE.MODERATE
// Ganti staleTime: 60_000 (1 min) di leaderboard → STALE.MODERATE (lebih tepat untuk 5min)
```

#### `src/features/analytics/queries/analyticsQueries.ts`
```ts
// Query dengan staleTime: 5 * 60 * 1000 (majority):  ganti ke STALE.MODERATE (no-op, tapi eksplisit)
// Query dengan staleTime: 15 * 60 * 1000:             ganti ke STALE.STATIC
// Query dengan staleTime: 30 * 60 * 1000:             ganti ke STALE.STATIC
```

#### `src/features/gradebook/queries/useGradebook.ts`
```ts
// staleTime: 30_000  →  STALE.DYNAMIC   — nilai aktif berubah saat guru input nilai
// staleTime: 60_000  →  STALE.DYNAMIC
```

#### `src/features/struggle/queries/useStruggleQueries.ts`
```ts
// Pertahankan STALE.MODERATE (sudah 5 min) — struggle alerts tidak perlu lebih fresh
// Tidak perlu diubah, cukup import STALE dan ganti literal
```

#### `src/features/notifications/hooks/useNotifications.ts`
```ts
import { STALE } from '@/src/utils/queryConstants'
// staleTime: 5 * 60 * 1000  →  STALE.REALTIME
// Reasoning: notifikasi dikontrol WebSocket subscription, staleTime tidak relevan
// Data selalu "stale" tapi WebSocket push update memicu invalidateQueries
```

#### `src/features/discussions/queries/discussionQueries.ts`
Baca file ini dulu. Tentukan tier:
- Thread list: `STALE.DYNAMIC` (diskusi aktif berubah cepat)
- Thread detail/replies: `STALE.DYNAMIC`

#### `src/features/calendar/` queries
```ts
// Semua calendar event queries: STALE.DYNAMIC
// Deadline dan jadwal berubah dalam menit (guru bisa edit kapan saja)
```

### Langkah 3 — Verifikasi tidak ada literal staleTime tersisa

```bash
grep -r "staleTime:.*\* 60 \* 1000\|staleTime: [0-9]" \
  src/features --include="*.ts" --include="*.tsx"
# Harus kosong — semua sudah pakai STALE.* constant
```

### Verifikasi Sprint 13C

```bash
node node_modules/.bin/tsc --noEmit
npm run build
```

---

## Sprint 13D — Bundle Splitting Enhancement

**Goal:** Pisahkan 5 dependensi besar yang saat ini masuk chunk `index` ke chunk vendor sendiri.
Mengurangi ukuran initial bundle sehingga TTI (Time to Interactive) lebih cepat.
**Estimasi:** ~30 menit

### Context: chunk saat ini di vite.config.ts

```ts
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-recharts': ['recharts'],
  'vendor-katex': ['katex'],
  'vendor-query': ['@tanstack/react-query'],
}
```

### Langkah 1 — Tambah 5 chunk baru di `vite.config.ts`

Tambahkan ke object `manualChunks`:

```ts
'vendor-motion': ['motion'],                              // Framer Motion v12 — ~80kb gz
'vendor-dnd': ['@hello-pangea/dnd'],                     // Drag-and-drop — ~30kb gz
'vendor-markdown': ['remark-gfm', 'remark-math', 'rehype-katex'],  // Markdown/LaTeX
'vendor-sentry': ['@sentry/react'],                      // Error tracking — ~50kb gz
'vendor-date': ['date-fns'],                             // Date utilities — ~20kb gz
```

Hasil `manualChunks` final:

```ts
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-recharts': ['recharts'],
  'vendor-katex': ['katex'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-motion': ['motion'],
  'vendor-dnd': ['@hello-pangea/dnd'],
  'vendor-markdown': ['remark-gfm', 'remark-math', 'rehype-katex'],
  'vendor-sentry': ['@sentry/react'],
  'vendor-date': ['date-fns'],
},
```

### Langkah 2 — Pastikan lazy-load halaman yang berat

Di `src/app/routes.tsx`, pastikan semua halaman menggunakan `React.lazy()`. Cari halaman
yang **belum** lazy-loaded dan tambahkan. Contoh pola yang benar:

```ts
const QuizGradebook = React.lazy(() => import('@/src/pages/QuizGradebook'))
const AssignmentGradebook = React.lazy(() => import('@/src/pages/AssignmentGradebook'))
```

Halaman yang wajib lazy-loaded (cek jika belum):
- `QuizGradebook`, `AssignmentGradebook`, `Analytics`, `Certificates`, `DocumentManager`
- `QuestionBankPage`, `Creator` (course builder — paling berat karena DnD + editor)

### Verifikasi Sprint 13D

```bash
npm run build 2>&1 | grep "vendor-"
# Harus muncul: vendor-motion.js, vendor-dnd.js, vendor-markdown.js, vendor-sentry.js, vendor-date.js
```

Opsional — lihat ukuran chunk:

```bash
ANALYZE=true npm run build
# Buka stats.html di browser, pastikan index chunk < 200kb gz
```

---

## Sprint 13E — Web Vitals Reporting

**Goal:** Pantau LCP, FID, CLS, TTFB, INP dari pengguna nyata.
`web-vitals` sudah ada di `package.json` — tinggal dipakai.
**Estimasi:** ~45 menit

### Files yang diubah

```
src/utils/reportWebVitals.ts      ← BUAT BARU
src/main.tsx                      ← panggil reportWebVitals
```

### Langkah 1 — `src/utils/reportWebVitals.ts`

```ts
import type { Metric } from 'web-vitals'

type VitalHandler = (metric: Metric) => void

function sendToAnalytics(metric: Metric) {
  // 1. Log ke console di development
  if (import.meta.env.DEV) {
    const value = metric.name === 'CLS' ? metric.value.toFixed(4) : Math.round(metric.value)
    const rating = metric.rating ?? 'unknown'
    const color = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌'
    console.info(`[Web Vitals] ${color} ${metric.name}: ${value} (${rating})`)
    return
  }

  // 2. Di production: kirim ke Sentry sebagai breadcrumb / custom measurement
  // Hanya import Sentry jika ada di bundle (cek window.__sentry_dsn)
  try {
    // Gunakan navigator.sendBeacon agar tidak blokir unload
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      url: window.location.pathname,
    })
    if (typeof navigator.sendBeacon === 'function') {
      // Gunakan endpoint analytics internal jika ada
      // navigator.sendBeacon('/api/vitals', body)
      // Fallback: simpan di sessionStorage untuk diambil Sentry session replay
      const existing = JSON.parse(sessionStorage.getItem('web_vitals') ?? '[]') as Metric[]
      existing.push(metric)
      sessionStorage.setItem('web_vitals', JSON.stringify(existing.slice(-20)))
    }
    // Jika Sentry SDK aktif, tambahkan sebagai measurement
    if (typeof window !== 'undefined' && (window as { Sentry?: { addBreadcrumb?: VitalHandler } }).Sentry) {
      (window as { Sentry: { addBreadcrumb: (b: object) => void } }).Sentry.addBreadcrumb({
        category: 'web-vitals',
        message: `${metric.name}: ${Math.round(metric.value)}`,
        level: metric.rating === 'good' ? 'info' : 'warning',
        data: { value: metric.value, rating: metric.rating },
      })
    }
  } catch {
    // Web vitals reporting should never break the app
  }
}

export function reportWebVitals(onPerfEntry?: VitalHandler) {
  const handler = onPerfEntry ?? sendToAnalytics
  // Dynamic import agar tidak masuk initial bundle
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
    onCLS(handler)
    onFID(handler)
    onFCP(handler)
    onLCP(handler)
    onTTFB(handler)
    onINP(handler)
  })
}
```

### Langkah 2 — Panggil dari `src/main.tsx`

Tambahkan di akhir `main.tsx`, setelah `ReactDOM.createRoot(...)`:

```ts
import { reportWebVitals } from '@/src/utils/reportWebVitals'

// Jalankan setelah render agar tidak blokir initial paint
reportWebVitals()
```

### Langkah 3 — Tambah `data-testid` untuk Lighthouse CI

Di komponen-komponen berikut, pastikan ada `data-testid` pada elemen utama
agar Lighthouse CI bisa mengukur dengan tepat:

| Komponen | Element | testid |
|----------|---------|--------|
| `src/components/layout/Navbar.tsx` | `<nav>` | `data-testid="navbar"` |
| `src/pages/Dashboard.tsx` | container div utama | `data-testid="dashboard-main"` |
| `src/pages/Courses.tsx` | grid kursus | `data-testid="course-grid"` |
| `src/pages/QuizGradebook.tsx` | tabel nilai | `data-testid="gradebook-table"` |

Cari elemen-elemen tersebut dan tambahkan atribut `data-testid`.

### Langkah 4 — Tambah script Lighthouse CI di `package.json`

Tambahkan ke `scripts`:

```json
"perf:lighthouse": "npx lhci autorun --config=lighthouserc.json 2>/dev/null || npx lighthouse http://localhost:5173 --output=json --output-path=./lighthouse-report.json --chrome-flags='--headless'"
```

Buat `lighthouserc.json` di root project:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:5173/#/login"],
      "numberOfRuns": 1,
      "startServerCommand": "npm run dev"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", {"minScore": 0.7}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "first-contentful-paint": ["warn", {"maxNumericValue": 3000}],
        "largest-contentful-paint": ["warn", {"maxNumericValue": 4000}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Verifikasi Sprint 13E

```bash
node node_modules/.bin/tsc --noEmit
npm run build

# Dev test:
npm run dev
# Buka browser, console DevTools harus menampilkan baris seperti:
# [Web Vitals] ✅ LCP: 1234 (good)
# [Web Vitals] ✅ CLS: 0.0012 (good)
```

---

## Verifikasi Final Phase 13

Jalankan semua setelah sprint 13A–13E selesai:

```bash
# 1. TypeScript
node node_modules/.bin/tsc --noEmit
# Expected: 0 error

# 2. Build
npm run build
# Expected: sukses, chunk vendor-* muncul di output

# 3. Bundle size check
npm run build 2>&1 | grep "vendor-" | awk '{print $1, $NF}'
# Expected: setiap vendor chunk < 200kb gz

# 4. Stale-time literal check
grep -r "staleTime:.*\* 60 \* 1000\|staleTime: [0-9]" \
  src/features --include="*.ts" --include="*.tsx"
# Expected: tidak ada output (semua pakai STALE.*)

# 5. VirtualTable usage
grep -r "useVirtualizer\|VirtualTable" src --include="*.tsx" -l
# Expected: ≥5 file menggunakan virtualisasi

# 6. Infinite query
grep -r "useInfiniteQuery\|fetchNextPage" src --include="*.ts" --include="*.tsx" -l
# Expected: ≥1 file (courseQueries.ts)
```

---

## Dokumentasi yang Wajib Diupdate Setelah Selesai

Ikuti aturan dari `CLAUDE.md` — setelah task signifikan, update docs:

1. **`docs/ENGINEERING_ROADMAP.md`** — tandai Phase 13 sebagai ✅
2. **`CHANGELOG.md`** — tambah section `## Phase 13: Performance & Scale (2026-03-22)`
   dengan list item untuk setiap sprint (13A–13E)
3. **`docs/ARCHITECTURE.md`** — tambah section "Performance Patterns":
   - Virtualisasi: `VirtualTable` component di `src/components/ui/VirtualTable.tsx`
   - Infinite scroll: `useInfiniteCoursesQuery` pattern
   - Stale-time tiers: lihat `src/utils/queryConstants.ts`
   - Bundle splitting: 10 vendor chunks di `vite.config.ts`
   - Web Vitals: `reportWebVitals()` dipanggil dari `main.tsx`

---

## Ringkasan Sprint

| Sprint | Fokus | Files Utama | Impact |
|--------|-------|-------------|--------|
| **13A** | VirtualList tabel besar | `VirtualTable.tsx`, 4 halaman tabel | DOM nodes −90% saat scroll |
| **13B** | Infinite scroll kursus | `courseQueries.ts`, `Courses.tsx` | Initial load 12 item vs 50 |
| **13C** | Stale-time tiering | `queryConstants.ts`, ~10 query files | Refetch lebih sedikit, cache lebih akurat |
| **13D** | Bundle splitting | `vite.config.ts`, `routes.tsx` | Initial JS −20–30% gz |
| **13E** | Web Vitals monitoring | `reportWebVitals.ts`, `main.tsx` | Visibilitas performa production |
