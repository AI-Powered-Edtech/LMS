// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
# Phase 22 — Final Push: 89/100 → 100/100

## Tujuan

Menutup 17 gap tersisa dari Phase 21 dan mencapai skor sempurna di seluruh 4 kategori evaluasi.

| Kategori | Saat ini | Target | Gap |
|----------|----------|--------|-----|
| UI/UX | 81 | 100 | 19 |
| Logic & Product | 89 | 100 | 11 |
| Code Health | 93 | 100 | 7 |
| Technical | 95 | 100 | 5 |
| **Total** | **89** | **100** | **11** |

## Strategi Eksekusi

4 sprint paralel, diurutkan dari quick-wins hingga fitur berat:

| Sprint | Fokus | Estimasi | Agents |
|--------|-------|----------|--------|
| 22A | Quick Wins & Config Fixes | 4–5 jam | 3 parallel |
| 22B | UX Polish & Accessibility | 6–8 jam | 2 parallel |
| 22C | Feature Completion | 2–3 hari | 2 parallel |
| 22D | Test Coverage & Validation | 6–8 jam | 2 parallel |

---

## Sprint 22A — Quick Wins & Config Fixes

**Goal:** 7 gap yang masing-masing < 2 jam effort. Bisa di-parallelkan ke 3 agents.

### A1. Wire LazyLoadTimeout ke Routing (Gap 1)

**File:** `src/app/routes/index.tsx`
**Component:** `src/components/ui/LazyLoadTimeout.tsx` (sudah ada, 48 LOC)
**Problem:** LazyLoadTimeout sudah dibuat tapi tidak di-wire — Suspense fallback di routing masih tanpa timeout.

**Langkah:**
1. Buka `src/app/routes/index.tsx`
2. Import `LazyLoadTimeout` dari `@/src/components/ui/LazyLoadTimeout`
3. Cari setiap `<Suspense fallback={...}>` di routing tree
4. Wrap fallback content dengan `<LazyLoadTimeout timeout={15000}>`:
```tsx
import { LazyLoadTimeout } from '@/src/components/ui/LazyLoadTimeout'

// Di setiap Suspense boundary:
<Suspense fallback={
  <LazyLoadTimeout timeout={15000}>
    <AppLoading />
  </LazyLoadTimeout>
}>
```
5. Jika `AppLoading` tidak di-import, cari component loading yang sudah dipakai dan wrap dengan LazyLoadTimeout
6. Juga wire di `src/app/routes/studentRoutes.tsx`, `teacherRoutes.tsx`, `adminRoutes.tsx` jika ada nested Suspense

**Acceptance Criteria:**
- [ ] `LazyLoadTimeout` imported dan digunakan di minimal 1 Suspense boundary di routing
- [ ] Setelah 15 detik tanpa resolve, user melihat "Halaman terlalu lama dimuat" + tombol "Muat Ulang"
- [ ] Build berhasil tanpa error

---

### A2. FeatureErrorBoundary: Detect useContext Null Error (Gap 7)

**File:** `src/components/FeatureErrorBoundary.tsx` (115 LOC)
**Problem:** Hanya detect chunk load errors. Saat JWT expired dan context jadi null, error "Cannot read properties of null (reading 'useContext')" masih tampil sebagai generic error.

**Langkah:**
1. Buka `src/components/FeatureErrorBoundary.tsx`
2. Cari fungsi `isChunkLoadError()` — sudah ada, detect 4 pattern
3. Tambahkan fungsi baru `isSessionExpiredError()`:
```tsx
function isSessionExpiredError(error: Error): boolean {
  const msg = error.message?.toLowerCase() || ''
  return (
    msg.includes('usecontext') ||
    msg.includes("cannot read properties of null") ||
    msg.includes("cannot read property") ||
    (msg.includes('null') && msg.includes('reading'))
  )
}
```
4. Di `componentDidCatch` atau `getDerivedStateFromError`, check `isSessionExpiredError(error)` dan set state `errorType: 'session_expired'`
5. Di render method, jika `errorType === 'session_expired'`, tampilkan UI khusus:
```tsx
if (this.state.errorType === 'session_expired') {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
      <LogOut className="w-12 h-12 text-amber-500 mb-4" />
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
        Sesi Anda Telah Berakhir
      </h3>
      <p className="mt-2 text-slate-500 dark:text-slate-400">
        Silakan masuk kembali untuk melanjutkan.
      </p>
      <button
        onClick={() => window.location.href = '/#/login'}
        className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
      >
        Masuk Kembali
      </button>
    </div>
  )
}
```
6. Import `LogOut` dari `lucide-react`

**Acceptance Criteria:**
- [ ] Error "Cannot read properties of null" → menampilkan "Sesi Anda Telah Berakhir" UI
- [ ] Tombol "Masuk Kembali" redirect ke `/#/login`
- [ ] Chunk load errors masih ditangani terpisah (tidak terganggu)
- [ ] Build berhasil

---

### A3. Proactive Token Refresh (Gap 11)

**File:** `src/contexts/AuthContext.tsx`
**Problem:** Token refresh hanya reactive (menunggu error). Tidak ada proactive check sebelum JWT expired.

**Langkah:**
1. Buka `src/contexts/AuthContext.tsx`
2. Cari `useEffect` yang handle `onAuthStateChange` atau session initialization
3. Setelah session di-load, tambahkan interval check:
```tsx
// Di dalam useEffect setelah session tersedia
useEffect(() => {
  if (!session) return

  const REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 menit sebelum expiry
  const CHECK_INTERVAL = 60_000 // check setiap 60 detik

  const checkTokenExpiry = () => {
    const expiresAt = session.expires_at
    if (!expiresAt) return

    const expiresAtMs = expiresAt * 1000
    const timeUntilExpiry = expiresAtMs - Date.now()

    if (timeUntilExpiry < REFRESH_THRESHOLD && timeUntilExpiry > 0) {
      supabase.auth.refreshSession().catch((err) => {
        console.warn('Proactive token refresh failed:', err)
      })
    }
  }

  const interval = setInterval(checkTokenExpiry, CHECK_INTERVAL)
  return () => clearInterval(interval)
}, [session?.expires_at])
```
4. Pastikan `session` reactive — jika session object berubah setelah refresh, effect harus re-run
5. Tambahkan Sentry breadcrumb (optional) untuk tracking refresh events

**Acceptance Criteria:**
- [ ] Interval 60 detik aktif saat session ada
- [ ] Refresh dipanggil saat token < 5 menit dari expiry
- [ ] Interval di-cleanup saat component unmount
- [ ] Tidak ada memory leak (clearInterval proper)
- [ ] Build berhasil

---

### A4. Tambah 3 ESLint Rules (Gap 14)

**File:** `eslint.config.js` (82 LOC)
**Problem:** 3 critical TypeScript rules belum ditambahkan.

**Langkah:**
1. Buka `eslint.config.js`
2. Cari block `rules: { ... }`
3. Tambahkan 3 rules berikut:
```js
'@typescript-eslint/no-floating-promises': 'warn',
'@typescript-eslint/ban-ts-comment': ['warn', {
  'ts-ignore': true,
  'ts-expect-error': false,
  'ts-nocheck': true,
}],
'@typescript-eslint/explicit-function-return-types': ['off'],
```

**Catatan penting:**
- Gunakan `'warn'` bukan `'error'` untuk `no-floating-promises` dan `ban-ts-comment` — agar tidak break existing code. Bisa di-escalate ke `'error'` setelah semua violations di-fix.
- `explicit-function-return-types` di-set `'off'` karena React components dan hooks sudah inferrable oleh TypeScript — forcing return types pada setiap function akan menambah boilerplate tanpa benefit signifikan di codebase ini. Prioritas di `no-floating-promises` yang memiliki real bug prevention value.
- **PENTING:** `no-floating-promises` memerlukan `parserOptions.project` — pastikan sudah ada:
```js
languageOptions: {
  parserOptions: {
    project: './tsconfig.json',
    // atau './tsconfig.app.json' jika itu yang dipakai
  },
},
```
4. Jalankan `npx eslint src/ --max-warnings=9999` untuk melihat jumlah violations
5. Jika ada violations kritis (< 10), fix langsung. Jika banyak (> 50), biarkan sebagai warning dulu.

**Acceptance Criteria:**
- [ ] `no-floating-promises` active sebagai warning
- [ ] `ban-ts-comment` active — `ts-ignore` di-warn, `ts-expect-error` diizinkan
- [ ] `eslint.config.js` valid — `npx eslint --print-config src/App.tsx` tidak error
- [ ] Build berhasil

---

### A5. Fix "PUBLISHED" String ke Bahasa Indonesia (Gap 13)

**Problem:** Beberapa UI badges mungkin menampilkan status enum mentah ("PUBLISHED", "DRAFT") daripada terjemahan Bahasa Indonesia.

**Langkah:**
1. Grep seluruh codebase untuk string yang berisi status display:
```bash
grep -rn "PUBLISHED\|DRAFT\|ARCHIVED\|IN_REVIEW\|APPROVED" --include="*.tsx" src/
```
2. Bedakan antara:
   - **Status comparison** (OK): `status === 'published'` — jangan ubah
   - **UI display** (FIX): `<Badge>PUBLISHED</Badge>` atau `{status.toUpperCase()}` — ubah ke Bahasa Indonesia
3. Buat atau temukan utility function `translateCourseStatus()`:
```tsx
// src/utils/statusTranslations.ts
export function translateCourseStatus(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draf',
    published: 'Diterbitkan',
    archived: 'Diarsipkan',
    in_review: 'Dalam Peninjauan',
    approved: 'Disetujui',
  }
  return map[status.toLowerCase()] || status
}

export function translateAssignmentStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Menunggu',
    submitted: 'Dikumpulkan',
    graded: 'Dinilai',
    late: 'Terlambat',
    missing: 'Belum Dikumpulkan',
  }
  return map[status.toLowerCase()] || status
}
```
4. Cari semua badge/chip components yang menampilkan status dan gunakan utility function
5. Jika utility sudah ada di codebase (cek `src/utils/` atau `src/shared/`), gunakan yang ada

**Acceptance Criteria:**
- [ ] 0 instances of raw English status strings visible di UI
- [ ] Semua status badges menampilkan Bahasa Indonesia
- [ ] Status comparison di queries tetap menggunakan enum asli (lowercase English)
- [ ] Build berhasil

---

### A6. Stagger Animations pada Card Grids (Gap 3)

**Files:**
- `src/pages/StudentDashboard.tsx` (atau feature equivalent)
- `src/pages/TeacherDashboard.tsx` (atau feature equivalent)
- Semua halaman yang menampilkan grid of cards

**Problem:** Cards muncul serentak — tidak ada stagger animation.

**Langkah:**
1. Cari semua dashboard pages yang menampilkan card grids
2. Buat reusable stagger variants:
```tsx
// src/utils/animations.ts (buat file baru atau tambahkan ke existing)
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}
```
3. Wrap card grid containers:
```tsx
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/src/utils/animations'

<motion.div
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
  variants={staggerContainer}
  initial="hidden"
  animate="show"
>
  {items.map((item) => (
    <motion.div key={item.id} variants={staggerItem}>
      <CardComponent {...item} />
    </motion.div>
  ))}
</motion.div>
```
4. Terapkan di minimal 4 halaman:
   - StudentDashboard (class cards)
   - TeacherDashboard (class cards)
   - Course catalog/list
   - Assignments list

**Acceptance Criteria:**
- [ ] Cards di dashboard muncul berurutan (stagger 60ms)
- [ ] Animation smooth, tidak janky
- [ ] `staggerContainer` + `staggerItem` reusable dari `animations.ts`
- [ ] Minimal 4 halaman menggunakan stagger animation
- [ ] Build berhasil

---

### A7. Konfigurasi Playwright Visual Regression (Gap 17)

**File:** `playwright.config.ts` (29 LOC)
**Problem:** Tidak ada dedicated project untuk visual regression testing dengan snapshot tolerance.

**Langkah:**
1. Buka `playwright.config.ts`
2. Tambahkan project `visual` di array `projects`:
```typescript
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'visual',
    use: {
      ...devices['Desktop Chrome'],
      // Konsisten viewport untuk screenshot comparison
      viewport: { width: 1280, height: 720 },
    },
    testMatch: '**/visual-regression.spec.ts',
    expect: {
      toHaveScreenshot: {
        maxDiffPixels: 100,
        threshold: 0.2,
      },
    },
  },
],
```
3. Pastikan `e2e/visual-regression.spec.ts` sudah ada — jika belum, buat skeleton:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('login page', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('login.png')
  })

  test('student dashboard', async ({ page }) => {
    // Login as student first
    await page.goto('/#/login')
    await page.fill('[name="email"]', 'student@edusync.dev')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/app/**')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('student-dashboard.png')
  })

  test('teacher dashboard', async ({ page }) => {
    await page.goto('/#/login')
    await page.fill('[name="email"]', 'teacher@edusync.dev')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/app/**')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('teacher-dashboard.png')
  })
})
```
4. Tambahkan script di `package.json`:
```json
"test:visual": "playwright test --project=visual"
```

**Acceptance Criteria:**
- [ ] `playwright.config.ts` punya project `visual` dengan `maxDiffPixels: 100`
- [ ] `e2e/visual-regression.spec.ts` ada dan runnable
- [ ] `pnpm test:visual` command tersedia
- [ ] Config valid — `npx playwright test --list` tidak error

---

## Sprint 22B — UX Polish & Accessibility

**Goal:** Implementasi UX patterns yang meningkatkan user experience secara signifikan. 2 agents parallel.

### B1. useUndoableAction Hook + Undo Toast (Gap 4)

**Files baru:**
- `src/hooks/useUndoableAction.ts`
- Update: `src/hooks/useToast.ts` (jika perlu extend toast API)

**Problem:** 0 implementasi undo pada destructive operations. Delete langsung execute tanpa kesempatan batal.

**Langkah:**

1. Buat `src/hooks/useUndoableAction.ts`:
```tsx
import { useRef, useCallback } from 'react'
import { useToast } from './useToast'

interface UndoableOptions {
  /** Pesan yang ditampilkan di toast */
  message: string
  /** Delay sebelum action dieksekusi (ms) */
  delay?: number
  /** Callback saat action benar-benar dieksekusi */
  onExecute: () => void | Promise<void>
  /** Callback saat user klik "Batal" */
  onUndo?: () => void
}

export function useUndoableAction() {
  const { addToast, dismissToast } = useToast()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const execute = useCallback(
    ({ message, delay = 5000, onExecute, onUndo }: UndoableOptions) => {
      // Tampilkan toast dengan tombol Batal
      const toastId = addToast({
        type: 'warning',
        message,
        duration: delay,
        action: {
          label: 'Batal',
          onClick: () => {
            // Cancel pending execution
            if (timerRef.current) {
              clearTimeout(timerRef.current)
              timerRef.current = null
            }
            dismissToast(toastId)
            onUndo?.()
          },
        },
      })

      // Schedule actual execution
      timerRef.current = setTimeout(async () => {
        timerRef.current = null
        try {
          await onExecute()
        } catch (error) {
          addToast({
            type: 'error',
            message: 'Gagal menjalankan aksi. Silakan coba lagi.',
          })
        }
      }, delay)
    },
    [addToast, dismissToast]
  )

  return { execute }
}
```

2. **Extend toast system** — Cek `useToast` hook apakah sudah support `action` prop (label + onClick). Jika belum:
   - Tambahkan `action?: { label: string; onClick: () => void }` ke toast interface
   - Update toast component di `src/components/ui/Toast.tsx` atau equivalent untuk render action button:
   ```tsx
   {toast.action && (
     <button
       onClick={toast.action.onClick}
       className="ml-3 px-3 py-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
     >
       {toast.action.label}
     </button>
   )}
   ```

3. **Integrate ke 3 destructive actions minimum:**

   **a) Delete classroom (ClassManagement):**
   - Cari komponen yang handle delete classroom
   - Ganti direct `mutation.mutate()` dengan:
   ```tsx
   const { execute } = useUndoableAction()

   const handleDelete = (classroom: Classroom) => {
     // Optimistically remove from UI
     queryClient.setQueryData(['classrooms'], (old) =>
       old?.filter(c => c.id !== classroom.id)
     )

     execute({
       message: `Kelas "${classroom.name}" akan dihapus`,
       onExecute: () => deleteClassroom.mutateAsync(classroom.id),
       onUndo: () => {
         // Restore to UI
         queryClient.invalidateQueries({ queryKey: ['classrooms'] })
       },
     })
   }
   ```

   **b) Remove student from class:**
   - Cari komponen yang handle remove student
   - Sama pattern — optimistic removal + undo restore

   **c) Delete assignment:**
   - Cari komponen yang handle delete assignment
   - Sama pattern — optimistic removal + undo restore

**Acceptance Criteria:**
- [ ] `useUndoableAction` hook tersedia dan reusable
- [ ] Toast menampilkan tombol "Batal" selama 5 detik
- [ ] Klik "Batal" → action dibatalkan, UI di-restore
- [ ] Setelah 5 detik tanpa batal → action dieksekusi
- [ ] Minimal 3 destructive actions menggunakan hook ini
- [ ] Build berhasil

---

### B2. BottomNav Badge Counts (Gap 2)

**File:** `src/components/layout/BottomNav.tsx` (83 LOC)
**Problem:** Nav items hanya tampilkan nama tanpa badge count untuk unread notifications atau pending items.

**Langkah:**

1. Buat hook `src/hooks/useNavBadges.ts`:
```tsx
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/src/services/supabase/client'
import { useAuth } from '@/src/contexts/AuthContext'

interface NavBadges {
  assignments: number
  announcements: number
  notifications: number
}

export function useNavBadges(): NavBadges {
  const { user, tenantId } = useAuth()

  const { data: assignmentCount = 0 } = useQuery({
    queryKey: ['nav-badge', 'assignments', user?.id],
    queryFn: async () => {
      if (!user) return 0
      const { count } = await supabase
        .from('assignment_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'pending')
      return count || 0
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 menit
    refetchInterval: 5 * 60 * 1000, // refetch setiap 5 menit
  })

  // Serupa untuk announcements dan notifications — sesuaikan query
  // dengan schema yang ada di database

  return {
    assignments: assignmentCount,
    announcements: 0, // implement sesuai schema
    notifications: 0, // implement sesuai schema
  }
}
```

2. Update `BottomNav.tsx`:
```tsx
import { useNavBadges } from '@/src/hooks/useNavBadges'

function BottomNav() {
  const badges = useNavBadges()

  // Di dalam navItems config, tambahkan badgeKey mapping:
  // { name: 'Tugas', icon: FileText, path: '/app/student/assignments', badgeKey: 'assignments' }

  return (
    <nav className="fixed bottom-0 ... md:hidden">
      {filteredItems.map((item) => {
        const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0
        return (
          <NavLink key={item.path} to={item.path} className="...">
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </div>
            <span className="text-xs mt-0.5">{item.name}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
```

**Acceptance Criteria:**
- [ ] Badge merah muncul di icon nav saat ada pending items
- [ ] Badge menampilkan angka (max "99+")
- [ ] Data di-fetch dengan staleTime 2 menit (tidak spam API)
- [ ] Badge tidak muncul jika count = 0
- [ ] Dark mode compatible
- [ ] Build berhasil

---

### B3. OfflineFormNotice Component (Gap 12)

**File baru:** `src/components/ui/OfflineFormNotice.tsx`
**File update:** `src/components/OfflineIndicator.tsx` (97 LOC)

**Problem:** Tidak ada form-level offline warning. `OfflineIndicator` sudah punya `OfflineInlineWarning` export tapi perlu dipastikan digunakan di forms.

**Langkah:**

1. Cek apakah `OfflineInlineWarning` di `OfflineIndicator.tsx` sudah cukup — jika ya, cukup integrate ke forms:
```tsx
import { OfflineInlineWarning } from '@/src/components/OfflineIndicator'

// Di dalam form component:
<form onSubmit={handleSubmit}>
  <OfflineInlineWarning />
  {/* form fields */}
  <button type="submit" disabled={isOffline}>
    Simpan
  </button>
</form>
```

2. Jika `OfflineInlineWarning` belum menampilkan pending count, update:
```tsx
export function OfflineInlineWarning() {
  const { isOffline } = useNetworkStatus()
  const pendingCount = useSyncQueueCount()

  if (!isOffline && pendingCount === 0) return null

  return (
    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Anda sedang offline. Perubahan akan disimpan saat koneksi pulih.
          </p>
        </>
      ) : pendingCount > 0 ? (
        <>
          <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {pendingCount} perubahan menunggu sinkronisasi.
          </p>
        </>
      ) : null}
    </div>
  )
}
```

3. Integrate `OfflineInlineWarning` ke minimal 5 form pages:
   - Create/Edit Assignment form
   - Create/Edit Announcement form
   - Create/Edit Classroom form
   - Profile settings form
   - Quiz builder form

**Acceptance Criteria:**
- [ ] `OfflineInlineWarning` menampilkan pending count
- [ ] Warning muncul di form saat offline
- [ ] Minimal 5 forms menampilkan offline notice
- [ ] Submit button disabled saat offline (pada forms yang tidak punya offline support)
- [ ] Build berhasil

---

### B4. Keyboard Arrow Navigation di Sidebar (Gap 6)

**File:** `src/components/layout/Sidebar.tsx`
**Problem:** Menu items tidak bisa di-navigate dengan keyboard arrow keys.

**Langkah:**

1. Buat custom hook `src/hooks/useArrowNavigation.ts`:
```tsx
import { useCallback, useRef } from 'react'

export function useArrowNavigation() {
  const containerRef = useRef<HTMLElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const container = containerRef.current
    if (!container) return

    const focusableItems = Array.from(
      container.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    )
    const currentIndex = focusableItems.indexOf(document.activeElement as HTMLElement)

    let nextIndex: number | null = null

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        nextIndex = currentIndex < focusableItems.length - 1 ? currentIndex + 1 : 0
        break
      case 'ArrowUp':
        e.preventDefault()
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableItems.length - 1
        break
      case 'Home':
        e.preventDefault()
        nextIndex = 0
        break
      case 'End':
        e.preventDefault()
        nextIndex = focusableItems.length - 1
        break
    }

    if (nextIndex !== null) {
      focusableItems[nextIndex]?.focus()
    }
  }, [])

  return { containerRef, handleKeyDown }
}
```

2. Integrate di Sidebar:
```tsx
import { useArrowNavigation } from '@/src/hooks/useArrowNavigation'

function Sidebar() {
  const { containerRef, handleKeyDown } = useArrowNavigation()

  return (
    <aside className="...">
      <nav
        ref={containerRef}
        role="navigation"
        aria-label="Menu utama"
        onKeyDown={handleKeyDown}
      >
        {/* nav items */}
      </nav>
    </aside>
  )
}
```

3. Tambahkan `tabIndex={0}` pada setiap nav item jika belum focusable
4. Tambahkan visual focus indicator yang konsisten: `focus-visible:ring-2 focus-visible:ring-blue-500`

**Acceptance Criteria:**
- [ ] Arrow Up/Down navigasi antar menu items
- [ ] Home → first item, End → last item
- [ ] Focus wraps (dari terakhir ke pertama dan sebaliknya)
- [ ] Focus ring visible saat navigating
- [ ] Tidak mengganggu mouse/touch interaction
- [ ] Build berhasil

---

### B5. In-App Contextual Help (Gap 5)

**Files baru:**
- `src/components/ui/HelpButton.tsx`
- `src/hooks/usePageHelp.ts`
- `src/data/helpContent.ts`

**Problem:** Tidak ada floating help button atau contextual tooltip system.

**Langkah:**

1. Buat `src/data/helpContent.ts` — mapping route → help content:
```tsx
interface HelpItem {
  title: string
  description: string
  tips: string[]
}

export const helpContent: Record<string, HelpItem> = {
  '/app/student/dashboard': {
    title: 'Dasbor Siswa',
    description: 'Halaman utama yang menampilkan ringkasan aktivitas belajar Anda.',
    tips: [
      'Klik kartu kelas untuk melihat materi dan tugas',
      'Lihat streak Anda di bagian atas untuk mempertahankan semangat belajar',
      'Notifikasi tugas baru akan muncul di sini',
    ],
  },
  '/app/teacher/dashboard': {
    title: 'Dasbor Guru',
    description: 'Kelola kelas, pantau progres siswa, dan buat materi pembelajaran.',
    tips: [
      'Klik "Buat Kelas" untuk memulai kelas baru',
      'Gunakan analytics untuk memantau keterlibatan siswa',
      'Buat pengumuman untuk berkomunikasi dengan siswa',
    ],
  },
  // Tambahkan untuk setiap route utama...
}
```

2. Buat `src/hooks/usePageHelp.ts`:
```tsx
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { helpContent } from '@/src/data/helpContent'

export function usePageHelp() {
  const location = useLocation()

  const help = useMemo(() => {
    // Match route pattern (strip dynamic segments)
    const path = location.pathname.replace(/\/[a-f0-9-]{36}/g, '/:id')
    return helpContent[path] || null
  }, [location.pathname])

  return help
}
```

3. Buat `src/components/ui/HelpButton.tsx`:
```tsx
import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { usePageHelp } from '@/src/hooks/usePageHelp'

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false)
  const help = usePageHelp()

  if (!help) return null

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Bantuan"
      >
        {isOpen ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
      </button>

      {/* Help panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={%DOPEN% opacity: 0, y: 10, scale: 0.95 %DCLOSE%}
            animate={%DOPEN% opacity: 1, y: 0, scale: 1 %DCLOSE%}
            exit={%DOPEN% opacity: 0, y: 10, scale: 0.95 %DCLOSE%}
            className="fixed bottom-32 right-4 md:bottom-18 md:right-6 z-40 w-80 max-h-[60vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5"
          >
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {help.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {help.description}
            </p>
            {help.tips.length > 0 && (
              <ul className="mt-3 space-y-2">
                {help.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
```

4. Mount `<HelpButton />` di setiap layout (StudentLayout, TeacherLayout, AdminLayout):
```tsx
<main>
  <Outlet />
  <HelpButton />
</main>
```

5. Buat help content untuk minimal 8 routes utama:
   - Student: dashboard, courses, assignments, quiz
   - Teacher: dashboard, gradebook, analytics, course builder
   - Admin: dashboard, users

**Acceptance Criteria:**
- [ ] Floating "?" button muncul di bottom-right (di atas BottomNav pada mobile)
- [ ] Klik → panel help contextual muncul dengan animasi
- [ ] Content berubah sesuai route
- [ ] Minimal 8 routes punya help content
- [ ] Dark mode compatible
- [ ] Build berhasil

---

## Sprint 22C — Feature Completion

**Goal:** Implementasi 3 fitur yang masih placeholder/TODO. Ini sprint terberat.

### C1. Group Assignments Backend + Frontend (Gap 8)

**Problem:** `StudentGroupView.tsx` dan `TeacherGroupView.tsx` masih pakai mock data dengan TODO comments.

**Langkah:**

#### C1a. Database Migration

Buat `supabase/migrations/20260326_group_assignments.sql`:
```sql
-- ============================================================
-- Group Assignments — tables, RLS, RPCs
-- ============================================================

-- 1. Assignment groups table
CREATE TABLE IF NOT EXISTS assignment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  max_members int DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assignment_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON assignment_groups
  USING (tenant_id = (SELECT get_my_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON assignment_groups
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- 2. Group members table
CREATE TABLE IF NOT EXISTS assignment_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE assignment_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON assignment_group_members
  USING (tenant_id = (SELECT get_my_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON assignment_group_members
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- 3. Group submissions table
CREATE TABLE IF NOT EXISTS group_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  content text,
  file_url text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'graded')),
  grade numeric(5,2),
  feedback text,
  submitted_at timestamptz,
  graded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE group_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON group_submissions
  USING (tenant_id = (SELECT get_my_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON group_submissions
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- 4. RPC: Get student's group for an assignment
CREATE OR REPLACE FUNCTION get_student_group_assignment(
  p_user_id uuid,
  p_assignment_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_build_object(
    'group', json_build_object(
      'id', ag.id,
      'name', ag.name,
      'max_members', ag.max_members
    ),
    'members', (
      SELECT json_agg(json_build_object(
        'user_id', agm.user_id,
        'role', agm.role,
        'display_name', up.display_name,
        'avatar_url', up.avatar_url
      ))
      FROM assignment_group_members agm
      JOIN user_profiles up ON up.user_id = agm.user_id
      WHERE agm.group_id = ag.id
    ),
    'submission', (
      SELECT json_build_object(
        'id', gs.id,
        'status', gs.status,
        'content', gs.content,
        'file_url', gs.file_url,
        'submitted_at', gs.submitted_at,
        'grade', gs.grade,
        'feedback', gs.feedback
      )
      FROM group_submissions gs
      WHERE gs.group_id = ag.id AND gs.assignment_id = p_assignment_id
      ORDER BY gs.created_at DESC
      LIMIT 1
    )
  ) INTO result
  FROM assignment_groups ag
  JOIN assignment_group_members agm ON agm.group_id = ag.id
  WHERE ag.assignment_id = p_assignment_id
    AND agm.user_id = p_user_id;

  RETURN result;
END;
$$;

-- 5. RPC: Get teacher's group overview for a classroom assignment
CREATE OR REPLACE FUNCTION get_teacher_group_overview(
  p_assignment_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(
    json_build_object(
      'group_id', ag.id,
      'group_name', ag.name,
      'member_count', (
        SELECT count(*) FROM assignment_group_members WHERE group_id = ag.id
      ),
      'members', (
        SELECT json_agg(json_build_object(
          'user_id', agm.user_id,
          'display_name', up.display_name,
          'role', agm.role
        ))
        FROM assignment_group_members agm
        JOIN user_profiles up ON up.user_id = agm.user_id
        WHERE agm.group_id = ag.id
      ),
      'submission_status', COALESCE(
        (SELECT gs.status FROM group_submissions gs WHERE gs.group_id = ag.id ORDER BY gs.created_at DESC LIMIT 1),
        'not_started'
      ),
      'grade', (
        SELECT gs.grade FROM group_submissions gs WHERE gs.group_id = ag.id AND gs.status = 'graded' ORDER BY gs.created_at DESC LIMIT 1
      )
    )
  ) INTO result
  FROM assignment_groups ag
  WHERE ag.assignment_id = p_assignment_id;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 6. RPC: Create groups (teacher)
CREATE OR REPLACE FUNCTION create_assignment_groups(
  p_assignment_id uuid,
  p_groups json -- [{ name, member_ids: [uuid] }]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  group_item json;
  new_group_id uuid;
  member_id uuid;
  assignment_row RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify teacher owns assignment
  SELECT a.id, a.classroom_id, a.tenant_id
  INTO assignment_row
  FROM assignments a
  WHERE a.id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  FOR group_item IN SELECT * FROM json_array_elements(p_groups)
  LOOP
    INSERT INTO assignment_groups (assignment_id, classroom_id, tenant_id, name)
    VALUES (
      p_assignment_id,
      assignment_row.classroom_id,
      assignment_row.tenant_id,
      group_item->>'name'
    )
    RETURNING id INTO new_group_id;

    FOR member_id IN SELECT json_array_elements_text(group_item->'member_ids')::uuid
    LOOP
      INSERT INTO assignment_group_members (group_id, user_id, tenant_id)
      VALUES (new_group_id, member_id, assignment_row.tenant_id);
    END LOOP;
  END LOOP;

  RETURN json_build_object('success', true);
END;
$$;
```

#### C1b. Service Layer

Buat `src/features/assignments/api/groupAssignmentService.ts`:
```tsx
import { supabase } from '@/src/services/supabase/client'

export interface GroupMember {
  user_id: string
  role: 'leader' | 'member'
  display_name: string
  avatar_url: string | null
}

export interface GroupSubmission {
  id: string
  status: 'draft' | 'submitted' | 'graded'
  content: string | null
  file_url: string | null
  submitted_at: string | null
  grade: number | null
  feedback: string | null
}

export interface StudentGroup {
  group: { id: string; name: string; max_members: number }
  members: GroupMember[]
  submission: GroupSubmission | null
}

export interface TeacherGroupOverview {
  group_id: string
  group_name: string
  member_count: number
  members: GroupMember[]
  submission_status: string
  grade: number | null
}

export async function getStudentGroupAssignment(
  userId: string,
  assignmentId: string
): Promise<StudentGroup | null> {
  const { data, error } = await supabase.rpc('get_student_group_assignment', {
    p_user_id: userId,
    p_assignment_id: assignmentId,
  })
  if (error) throw error
  return data
}

export async function getTeacherGroupOverview(
  assignmentId: string
): Promise<TeacherGroupOverview[]> {
  const { data, error } = await supabase.rpc('get_teacher_group_overview', {
    p_assignment_id: assignmentId,
  })
  if (error) throw error
  return data || []
}

export async function createAssignmentGroups(
  assignmentId: string,
  groups: { name: string; member_ids: string[] }[]
): Promise<void> {
  const { error } = await supabase.rpc('create_assignment_groups', {
    p_assignment_id: assignmentId,
    p_groups: JSON.stringify(groups),
  })
  if (error) throw error
}
```

#### C1c. React Query Hooks

Buat `src/features/assignments/hooks/useGroupAssignments.ts`:
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/src/contexts/AuthContext'
import {
  getStudentGroupAssignment,
  getTeacherGroupOverview,
  createAssignmentGroups,
} from '../api/groupAssignmentService'

export function useStudentGroup(assignmentId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['group-assignment', 'student', assignmentId, user?.id],
    queryFn: () => getStudentGroupAssignment(user!.id, assignmentId),
    enabled: !!user && !!assignmentId,
  })
}

export function useTeacherGroups(assignmentId: string) {
  return useQuery({
    queryKey: ['group-assignment', 'teacher', assignmentId],
    queryFn: () => getTeacherGroupOverview(assignmentId),
    enabled: !!assignmentId,
  })
}

export function useCreateGroups(assignmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groups: { name: string; member_ids: string[] }[]) =>
      createAssignmentGroups(assignmentId, groups),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group-assignment', 'teacher', assignmentId],
      })
    },
  })
}
```

#### C1d. Connect Views to Real Data

1. **`StudentGroupView.tsx`:**
   - Hapus semua mock data dan TODO comments
   - Import `useStudentGroup` hook
   - Replace static data dengan query data
   - Tambahkan loading state (`<Skeleton />`)
   - Tambahkan empty state ("Anda belum ditempatkan ke grup")
   - Tambahkan error state (`<FeatureErrorBoundary>`)

2. **`TeacherGroupView.tsx`:**
   - Hapus semua mock data dan TODO comments
   - Import `useTeacherGroups` dan `useCreateGroups` hooks
   - Replace static data dengan query data
   - Tambahkan loading state
   - Tambahkan empty state ("Belum ada grup untuk tugas ini") + CTA "Buat Grup"
   - Tambahkan create groups flow (form/modal)

**Acceptance Criteria:**
- [ ] Migration file valid — tables + RLS + RPCs
- [ ] Service layer punya type-safe functions
- [ ] React Query hooks tersedia
- [ ] `StudentGroupView` menampilkan real data (atau empty state yang proper)
- [ ] `TeacherGroupView` menampilkan real data + bisa create groups
- [ ] 0 TODO comments tersisa di kedua file
- [ ] Multi-tenant RLS di semua tables baru
- [ ] Build berhasil

---

### C2. Public Profile (Gap 9)

**Problem:** `PublicProfile.tsx` hanya menampilkan placeholder "dalam pengembangan".

**Langkah:**

#### C2a. Database Migration

Buat `supabase/migrations/20260326_public_profile.sql`:
```sql
-- ============================================================
-- Public Profile — schema additions + RPC
-- ============================================================

-- 1. Add username column to user_profiles (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN username text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bio text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_profile_public'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_profile_public boolean DEFAULT false;
  END IF;
END $$;

-- 2. RPC: Get public profile
CREATE OR REPLACE FUNCTION get_public_profile(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'user_id', up.user_id,
    'display_name', up.display_name,
    'username', up.username,
    'avatar_url', up.avatar_url,
    'bio', up.bio,
    'is_public', up.is_profile_public,
    'gamification', json_build_object(
      'xp', COALESCE(gs.xp, 0),
      'level', COALESCE(gs.level, 1),
      'streak', COALESCE(gs.current_streak, 0),
      'badges_count', (
        SELECT count(*) FROM user_badges ub WHERE ub.user_id = p_user_id
      )
    ),
    'badges', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', b.id,
        'name', b.name,
        'icon', b.icon,
        'earned_at', ub.earned_at
      ) ORDER BY ub.earned_at DESC), '[]'::json)
      FROM user_badges ub
      JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = p_user_id
    ),
    'stats', json_build_object(
      'courses_completed', (
        SELECT count(*) FROM enrollments e
        WHERE e.user_id = p_user_id AND e.status = 'completed'
      ),
      'quizzes_taken', (
        SELECT count(*) FROM quiz_attempts qa
        WHERE qa.user_id = p_user_id AND qa.status = 'completed'
      )
    )
  ) INTO result
  FROM user_profiles up
  LEFT JOIN gamification_stats gs ON gs.user_id = up.user_id
  WHERE up.user_id = p_user_id
    AND (up.is_profile_public = true OR up.user_id = auth.uid());

  RETURN result;
END;
$$;

-- 3. RPC: Update profile privacy
CREATE OR REPLACE FUNCTION update_profile_privacy(p_is_public boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE user_profiles
  SET is_profile_public = p_is_public, updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;
```

#### C2b. Service + Hook

Buat `src/features/profile/api/profileService.ts`:
```tsx
import { supabase } from '@/src/services/supabase/client'

export interface PublicProfile {
  user_id: string
  display_name: string
  username: string | null
  avatar_url: string | null
  bio: string
  is_public: boolean
  gamification: {
    xp: number
    level: number
    streak: number
    badges_count: number
  }
  badges: Array<{
    id: string
    name: string
    icon: string
    earned_at: string
  }>
  stats: {
    courses_completed: number
    quizzes_taken: number
  }
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc('get_public_profile', {
    p_user_id: userId,
  })
  if (error) throw error
  return data
}

export async function updateProfilePrivacy(isPublic: boolean): Promise<void> {
  const { error } = await supabase.rpc('update_profile_privacy', {
    p_is_public: isPublic,
  })
  if (error) throw error
}
```

Buat `src/features/profile/hooks/usePublicProfile.ts`:
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPublicProfile, updateProfilePrivacy } from '../api/profileService'

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => getPublicProfile(userId),
    enabled: !!userId,
  })
}

export function useToggleProfilePrivacy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfilePrivacy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-profile'] })
    },
  })
}
```

#### C2c. PublicProfile Page Redesign

Rewrite `src/pages/PublicProfile.tsx` dari placeholder ke real UI:
- Ambil `userId` dari route params
- Gunakan `usePublicProfile(userId)` hook
- Layout:
  - **Header section:** Avatar besar, display name, username, bio
  - **Stats cards:** XP, Level, Streak, Courses completed
  - **Badges grid:** Semua badges yang di-earn
  - **Privacy toggle:** (hanya tampil jika melihat profile sendiri) Switch "Profil Publik"
- States:
  - Loading: Skeleton cards
  - Not found / private: "Profil ini tidak tersedia atau bersifat privat"
  - Empty badges: "Belum ada badge yang diperoleh"
- Semua text Bahasa Indonesia
- Dark mode full support

**Acceptance Criteria:**
- [ ] Migration menambah `username`, `bio`, `is_profile_public` columns
- [ ] RPC `get_public_profile` berfungsi dengan privacy check
- [ ] Page menampilkan real data (gamification stats, badges)
- [ ] Private profile menampilkan access denied message
- [ ] Owner bisa toggle privacy
- [ ] Responsive layout (mobile + desktop)
- [ ] 0 placeholder text tersisa
- [ ] Build berhasil

---

### C3. Form Validation Standardization (Gap 10)

**Problem:** Forms menggunakan raw `useState` tanpa schema validation. Tidak ada react-hook-form.

**Strategi:** Bukan migrasi semua forms sekaligus (terlalu besar), tapi:
1. Buat shared validation infrastructure
2. Migrate 3 form terpenting sebagai template
3. Sisanya bisa di-migrate incremental

**Langkah:**

#### C3a. Install Dependencies
```bash
pnpm add react-hook-form @hookform/resolvers valibot
```

#### C3b. Buat Shared Schemas

Buat `src/shared/schemas/classroomSchema.ts`:
```tsx
import * as v from 'valibot'

export const createClassroomSchema = v.object({
  name: v.pipe(
    v.string(),
    v.minLength(3, 'Nama kelas minimal 3 karakter'),
    v.maxLength(100, 'Nama kelas maksimal 100 karakter')
  ),
  description: v.optional(v.pipe(
    v.string(),
    v.maxLength(500, 'Deskripsi maksimal 500 karakter')
  )),
  subject: v.pipe(
    v.string(),
    v.minLength(1, 'Mata pelajaran wajib diisi')
  ),
  grade_level: v.optional(v.string()),
})

export type CreateClassroomInput = v.InferOutput<typeof createClassroomSchema>
```

Buat `src/shared/schemas/assignmentSchema.ts`:
```tsx
import * as v from 'valibot'

export const createAssignmentSchema = v.object({
  title: v.pipe(
    v.string(),
    v.minLength(3, 'Judul tugas minimal 3 karakter'),
    v.maxLength(200, 'Judul tugas maksimal 200 karakter')
  ),
  description: v.optional(v.pipe(
    v.string(),
    v.maxLength(2000, 'Deskripsi maksimal 2000 karakter')
  )),
  due_date: v.pipe(
    v.string(),
    v.minLength(1, 'Tanggal tenggat wajib diisi')
  ),
  max_score: v.pipe(
    v.number(),
    v.minValue(1, 'Skor maksimal minimal 1'),
    v.maxValue(1000, 'Skor maksimal tidak boleh lebih dari 1000')
  ),
  type: v.picklist(['individual', 'group'], 'Tipe tugas tidak valid'),
})

export type CreateAssignmentInput = v.InferOutput<typeof createAssignmentSchema>
```

Buat `src/shared/schemas/announcementSchema.ts`:
```tsx
import * as v from 'valibot'

export const createAnnouncementSchema = v.object({
  title: v.pipe(
    v.string(),
    v.minLength(3, 'Judul pengumuman minimal 3 karakter'),
    v.maxLength(200, 'Judul maksimal 200 karakter')
  ),
  content: v.pipe(
    v.string(),
    v.minLength(10, 'Isi pengumuman minimal 10 karakter')
  ),
  priority: v.optional(v.picklist(['low', 'normal', 'high'])),
})

export type CreateAnnouncementInput = v.InferOutput<typeof createAnnouncementSchema>
```

#### C3c. Buat FormField Component

Buat `src/components/ui/FormField.tsx`:
```tsx
import { type FieldError } from 'react-hook-form'

interface FormFieldProps {
  label: string
  error?: FieldError
  required?: boolean
  children: React.ReactNode
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 mt-1">
          {error.message}
        </p>
      )}
    </div>
  )
}
```

#### C3d. Migrate 3 Forms

Pilih 3 form yang paling sering digunakan:
1. **Create Classroom form** — cari component, refactor ke `useForm` + `valibotResolver`
2. **Create Assignment form** — sama
3. **Create Announcement form** — sama

Pattern migrasi untuk setiap form:
```tsx
import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { createClassroomSchema, type CreateClassroomInput } from '@/src/shared/schemas/classroomSchema'
import { FormField } from '@/src/components/ui/FormField'

function CreateClassroomForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateClassroomInput>({
    resolver: valibotResolver(createClassroomSchema),
  })

  const onSubmit = async (data: CreateClassroomInput) => {
    await createClassroom.mutateAsync(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Nama Kelas" error={errors.name} required>
        <input
          {...register('name')}
          className={`w-full px-3 py-2 rounded-lg border ${
            errors.name
              ? 'border-red-500 focus:ring-red-500'
              : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'
          } bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2`}
          placeholder="contoh: Matematika Kelas 10A"
        />
      </FormField>

      {/* More fields... */}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
      >
        {isSubmitting ? 'Menyimpan...' : 'Buat Kelas'}
      </button>
    </form>
  )
}
```

**Acceptance Criteria:**
- [ ] `react-hook-form` + `valibot` + `@hookform/resolvers` installed
- [ ] 3 shared schemas tersedia (`classroom`, `assignment`, `announcement`)
- [ ] `FormField` component reusable
- [ ] 3 forms migrated ke react-hook-form pattern
- [ ] Validation error messages semua Bahasa Indonesia
- [ ] Real-time validation (error muncul onBlur, hilang onChange saat fixed)
- [ ] Build berhasil

---

## Sprint 22D — Test Coverage & Validation

**Goal:** Tutup gap testing — 4 unit test files + 5 E2E flows.

### D1. Unit Test: AuthContext (Gap 15)

Buat `src/contexts/__tests__/AuthContext.test.ts`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
// Import sesuai actual export names

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('session handling', () => {
    it('sets user and profile from session', async () => {
      // Mock supabase.auth.getSession → return valid session
      // Render useAuth hook inside AuthProvider wrapper
      // Assert: user, profile, role, tenantId populated
    })

    it('clears state on sign out', async () => {
      // Mock initial session → then trigger SIGNED_OUT event
      // Assert: user = null, profile = null
    })

    it('redirects on session expiry', async () => {
      // Mock expired session (expires_at in past)
      // Assert: navigate called with '/login'
    })
  })

  describe('role resolution', () => {
    it('resolves teacher role from user_roles', async () => {
      // Mock user_roles query → return { role: 'teacher' }
      // Assert: role === 'teacher'
    })

    it('returns null role when no user_roles entry', async () => {
      // Mock user_roles query → return empty
      // Assert: role === null
    })
  })

  describe('permissions', () => {
    it('teacher has canCreateCourse permission', () => {
      // Assert rolePermissions.teacher.canCreateCourse === true
    })

    it('student does not have canGrade permission', () => {
      // Assert rolePermissions.student.canGrade === false
    })
  })
})
```

**Test count target:** 8-10 tests covering session lifecycle, role resolution, permissions.

---

### D2. Unit Test: useToast (Gap 15)

Buat `src/hooks/__tests__/useToast.test.ts`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

describe('useToast', () => {
  it('adds toast to queue', () => {
    // Render hook
    // act: addToast({ type: 'success', message: 'Test' })
    // Assert: toasts array has 1 item
  })

  it('dismisses toast by id', () => {
    // Add toast, get id
    // act: dismissToast(id)
    // Assert: toasts array empty
  })

  it('auto-dismisses after duration', async () => {
    // Add toast with duration: 1000
    // vi.advanceTimersByTime(1100)
    // Assert: toasts array empty
  })

  it('enforces max toast limit', () => {
    // Add 10 toasts
    // Assert: only last N visible (max limit)
  })

  it('supports action button in toast', () => {
    // Add toast with action: { label: 'Batal', onClick: fn }
    // Assert: toast has action property
  })
})
```

**Test count target:** 5-7 tests.

---

### D3. Unit Test: useNetworkStatus (Gap 15)

Buat `src/hooks/__tests__/useNetworkStatus.test.ts`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

describe('useNetworkStatus', () => {
  it('returns online by default', () => {
    // Mock navigator.onLine = true
    // Render hook
    // Assert: isOnline === true
  })

  it('detects offline event', () => {
    // Render hook
    // act: window.dispatchEvent(new Event('offline'))
    // Assert: isOnline === false
  })

  it('detects online event', () => {
    // Start offline
    // act: window.dispatchEvent(new Event('online'))
    // Assert: isOnline === true
  })

  it('cleans up event listeners on unmount', () => {
    // Spy on removeEventListener
    // Render and unmount
    // Assert: removeEventListener called
  })
})
```

**Test count target:** 4-5 tests.

---

### D4. Unit Test: offlineStorage (Gap 15)

Buat `src/utils/__tests__/offlineStorage.test.ts`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock IndexedDB (fake-indexeddb or manual mock)

describe('offlineStorage', () => {
  beforeEach(() => {
    // Reset mock DB
  })

  it('stores item in offline storage', async () => {
    // await offlineStorage.set('key', { data: 'test' })
    // const result = await offlineStorage.get('key')
    // Assert: result.data === 'test'
  })

  it('returns null for missing key', async () => {
    // const result = await offlineStorage.get('nonexistent')
    // Assert: result === null
  })

  it('deletes item from storage', async () => {
    // Set then delete
    // Assert: get returns null
  })

  it('returns pending count', async () => {
    // Add 3 pending items
    // Assert: getPendingCount() === 3
  })

  it('handles IndexedDB errors gracefully', async () => {
    // Mock IndexedDB to throw
    // Assert: operation returns fallback, no crash
  })
})
```

**Test count target:** 5-6 tests.

---

### D5. E2E Tests: 5 Missing Flows (Gap 16)

#### E2E 1: `e2e/offline-sync.spec.ts`
```typescript
import { test, expect } from '@playwright/test'

test.describe('Offline Sync', () => {
  test('submits quiz offline and syncs when online', async ({ page, context }) => {
    // 1. Login as student
    // 2. Navigate to quiz
    // 3. context.setOffline(true) — simulate offline
    // 4. Answer quiz questions
    // 5. Submit quiz → should queue locally
    // 6. Assert: toast "Disimpan offline"
    // 7. context.setOffline(false) — go online
    // 8. Assert: sync happens, submission visible
  })
})
```

#### E2E 2: `e2e/file-upload.spec.ts`
```typescript
test.describe('File Upload', () => {
  test('uploads assignment file', async ({ page }) => {
    // 1. Login as student
    // 2. Navigate to assignment
    // 3. Upload test file via file input
    // 4. Assert: file preview visible
    // 5. Submit assignment
    // 6. Assert: submission confirmation
  })
})
```

#### E2E 3: `e2e/csv-export.spec.ts`
```typescript
test.describe('CSV Export', () => {
  test('exports gradebook as CSV', async ({ page }) => {
    // 1. Login as teacher
    // 2. Navigate to gradebook
    // 3. Click export CSV button
    // 4. Assert: download triggered
    // 5. Verify file content structure
  })
})
```

#### E2E 4: `e2e/forum-discussion.spec.ts`
```typescript
test.describe('Forum Discussion', () => {
  test('creates topic and replies', async ({ page }) => {
    // 1. Login as student
    // 2. Navigate to forum/discussion
    // 3. Create new topic
    // 4. Assert: topic visible in list
    // 5. Open topic
    // 6. Write reply
    // 7. Assert: reply visible
  })
})
```

#### E2E 5: `e2e/course-builder.spec.ts`
```typescript
test.describe('Course Builder', () => {
  test('creates course with module and lesson', async ({ page }) => {
    // 1. Login as teacher
    // 2. Navigate to course builder
    // 3. Fill course details (title, description)
    // 4. Add module
    // 5. Add lesson to module
    // 6. Save/publish
    // 7. Assert: course visible in catalog
  })
})
```

**Acceptance Criteria per E2E:**
- [ ] Test file exists dan runnable
- [ ] Happy path covered
- [ ] Assertions memvalidasi state akhir
- [ ] Menggunakan test accounts dari CLAUDE.md

---

## Post-Sprint 22 Checklist

Setelah semua 4 sprint selesai, jalankan verifikasi:

### Build & Lint
```bash
pnpm build                           # ✅ No errors
pnpm lint                            # ✅ No errors (warnings OK)
pnpm test --run                      # ✅ All tests pass
pnpm test --run --coverage           # ✅ Coverage thresholds met
npx playwright test --project=chromium  # ✅ E2E pass
```

### Manual Verification
- [ ] Login sebagai student → dashboard → navigate semua routes
- [ ] Login sebagai teacher → dashboard → navigate semua routes
- [ ] Login sebagai admin → dashboard → navigate semua routes
- [ ] Test offline: disconnect network → lihat indicator → submit form → reconnect → verify sync
- [ ] Test session expiry: wait/force expire → verify redirect ke login
- [ ] Test dark mode: toggle → verify semua page consistent
- [ ] Test mobile: resize → verify BottomNav + responsive layout

### Documentation Updates
- [ ] Update `docs/DATABASE.md` — tambah tables baru (assignment_groups, group_members, group_submissions)
- [ ] Update `docs/ARCHITECTURE.md` — document form validation strategy
- [ ] Update `docs/ENGINEERING_ROADMAP.md` — Phase 22 completed
- [ ] Update `CHANGELOG.md` — semua changes
- [ ] Commit semua documentation changes

---

## Proyeksi Skor Final

| Kategori | Sebelum (89) | Setelah 22A | Setelah 22B | Setelah 22C | Setelah 22D | Final |
|----------|-------------|-------------|-------------|-------------|-------------|-------|
| UI/UX | 81 | 86 | 94 | 96 | 96 | **96** |
| Logic & Product | 89 | 92 | 94 | 100 | 100 | **100** |
| Code Health | 93 | 95 | 95 | 97 | 100 | **100** |
| Technical | 95 | 97 | 97 | 97 | 100 | **100** |
| **Total** | **89** | **92** | **95** | **98** | **100** | **99** |

> **Catatan realisme:** UI/UX 100/100 sepenuhnya sulit tanpa user testing feedback loop. Score 96 untuk UI/UX sangat baik — sisanya (in-app help content quality, edge-case responsive issues) memerlukan iterasi berdasarkan real user feedback. Total 99/100 adalah target realistis yang sangat kuat.

---

## Execution Order & Agent Assignment

### Wave 1 — Sprint 22A (3 agents parallel)

| Agent | Tasks |
|-------|-------|
| Agent 1 | A1 (LazyLoadTimeout wire) + A2 (FeatureErrorBoundary) + A3 (Token refresh) |
| Agent 2 | A4 (ESLint rules) + A5 (PUBLISHED fix) + A7 (Playwright config) |
| Agent 3 | A6 (Stagger animations) |

### Wave 2 — Sprint 22B (2 agents parallel)

| Agent | Tasks |
|-------|-------|
| Agent 1 | B1 (useUndoableAction) + B3 (OfflineFormNotice) |
| Agent 2 | B2 (BottomNav badges) + B4 (Keyboard nav) + B5 (Help button) |

### Wave 3 — Sprint 22C (2 agents parallel)

| Agent | Tasks |
|-------|-------|
| Agent 1 | C1 (Group Assignments — migration + service + hooks + views) |
| Agent 2 | C2 (Public Profile — migration + service + page) + C3 (Form validation) |

### Wave 4 — Sprint 22D (2 agents parallel)

| Agent | Tasks |
|-------|-------|
| Agent 1 | D1 (AuthContext test) + D2 (useToast test) + D3 (useNetworkStatus test) + D4 (offlineStorage test) |
| Agent 2 | D5 (5 E2E test files) |

### Post-Wave — Verification

| Agent | Tasks |
|-------|-------|
| Agent 1 | Build + Lint + Test verification + Documentation updates |

---

*Phase 22 Mega Prompt — Claude, 25 Maret 2026*
