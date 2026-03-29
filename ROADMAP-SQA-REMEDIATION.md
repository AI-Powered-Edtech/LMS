# EduSync LMS — SQA Remediation Roadmap

**Sumber:** SQA Audit Report `notion-report-2026-03-28T21-24-14.md`  
**Overall Score:** 5.1/10 → Target: 8.5/10  
**Verdict:** 🔴 NO-GO for production — kondisional pada critical fixes  
**Dibuat:** 2026-03-29

---

## Ringkasan Eksekutif

Audit menemukan **4 CRITICAL**, **6 HIGH**, **15 MEDIUM**, dan **10 LOW** issues. Tiga exploit chain telah diverifikasi oleh engine:

1. **Session Hijacking Chain** — XSS di `CertificateViewer.tsx:25` + token di localStorage → full account takeover
2. **Cross-Tenant Admin Escalation** — `RoleGuard.tsx:19` cek `role` global bukan `activeRole` tenant-scoped (CVSS 9.1)
3. **Token Persistence After Logout** — `pendingInviteToken` tidak dihapus → user berikutnya inherit invite

---

## Phase 1 — Security Critical (Sprint 1, ~1 minggu)

**Target: Block 0 → Production Gate**

### P0-1: Fix Cross-Tenant Admin Privilege Escalation

**File:** `src/components/guards/RoleGuard.tsx:19`  
**CVSS:** 9.1 — Admin di Tenant A bisa akses admin routes di Tenant B

```typescript
// SEBELUM (VULNERABLE):
const hasAccess = allowedRoles.includes(currentRole) || allowedRoles.includes(role)

// SESUDAH (SECURE):
const hasAccess = activeRole ? allowedRoles.includes(activeRole) : false
if (!activeRole) return <Navigate to="/select-workspace" replace />
```

**Verifikasi:** Test scenario — user admin Tenant A switch ke Tenant B, pastikan tidak bisa akses `/app/admin/*`

---

### P0-2: Fix XSS di Certificate Generation

**File:** `src/features/gamification/components/CertificateViewer.tsx:25`  
**Tipe:** Stored XSS via `document.write()` — user dapat inject `<script>` melalui nama profil

```typescript
// SEBELUM (VULNERABLE):
w.document.write(`<h1>${cert.title}</h1><p>${profile?.first_name} ${profile?.last_name}</p>`)

// SESUDAH (SECURE):
import { escapeHtml } from '@/src/utils/sanitize'
w.document.write(`
  <html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="script-src 'none';">
  </head>
  <body>
    <h1>${escapeHtml(cert.title)}</h1>
    <p>Awarded to: ${escapeHtml(profile?.first_name ?? '')} ${escapeHtml(profile?.last_name ?? '')}</p>
  </body>
  </html>
`)
w.opener = null // Sever window.opener reference
```

**Juga periksa:** `src/utils/sanitize.ts` — laporan mendeteksi `document.write()` di file ini juga

---

### P0-3: Audit & Fix localStorage Token Storage

**Files:** `src/features/auth/hooks/useLoginState.ts:143,146`, `src/features/ai-tutor/components/AITutorPanel.tsx:89`

Tokens yang tersimpan di localStorage:

- `pendingJoinCode` (useLoginState.ts:143)
- `pendingInviteToken` (useLoginState.ts:146)
- `ai_tutor_session_${lessonId}` (AITutorPanel.tsx:89)

**Opsi Remediation:**

- **Short-term:** Tambah Content-Security-Policy headers untuk mencegah XSS exfiltration
- **Long-term:** Migrate session tokens ke HttpOnly cookies via Supabase Edge Function

**CSP Meta Tag (immediate):**

```html
<!-- index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co;"
/>
```

---

### P0-4: Purge .env dari Git History & Rotate Secrets

**Bukti:** Engine confirmed `.env` EXISTS on disk dengan `VITE_DEV_PASSWORD=password123`

```bash
# 1. Verify apa yang terekspos
git log --all -- ".env"
grep -E "(SERVICE_ROLE|SECRET|PASSWORD|PRIVATE)" .env

# 2. Tambah ke .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# 3. Remove dari tracking (JANGAN commit secrets baru)
git rm --cached .env

# 4. Jika sudah pernah di-commit, purge dari history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# 5. Buat .env.example template
cp .env .env.example
# Edit .env.example — ganti semua values dengan placeholders
```

**Setelah purge:** Rotate semua secrets yang terekspos di Supabase dashboard

---

### P0-5: Audit & Deploy Supabase RLS Policies

**File:** `supabase/migrations/` — verify RLS sudah aktif di semua tables

Minimal policies yang harus ada:

```sql
-- Enable RLS pada semua tables tenant-scoped
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: user hanya akses data tenant sendiri
CREATE POLICY "tenant_isolation_courses"
ON courses FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);

-- Role-based: hanya admin yang bisa manage users
CREATE POLICY "only_admins_manage_user_roles"
ON user_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = user_roles.tenant_id
      AND ur.role = 'admin'
  )
);
```

**Verifikasi:** Test via Supabase SQL editor — query cross-tenant data harus return empty

---

## Phase 2 — Auth & Monitoring Hardening (Sprint 2, ~1 minggu)

**Target: Auth score 3.5 → 7.0**

### P1-1: Fix signOut — Bersihkan Semua localStorage Auth Tokens

**File:** `src/contexts/AuthContext.tsx:428-449`

```typescript
const signOut = useCallback(async () => {
  // Bersihkan SEMUA auth-related localStorage keys
  const keysToRemove = ['activeTenantId', 'pendingInviteToken', 'pendingJoinCode']
  keysToRemove.forEach((key) => localStorage.removeItem(key))

  // Bersihkan semua ai_tutor_session_* keys
  Object.keys(localStorage)
    .filter((k) => k.startsWith('ai_tutor_session_'))
    .forEach((k) => localStorage.removeItem(k))

  setUser(null)
  setSession(null)
  setProfile(null)
  setTenantId(null)
  setMemberships([])
  setActiveTenantState(null)
  setRawTenants({})
  setRoles([])

  try {
    await supabase.auth.signOut()
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Auth] signOut error:', err)
  }
}, [])
```

---

### P1-2: Fix usePermissions — Gunakan activeRole, Bukan Global roles

**File:** `src/hooks/usePermissions.ts`

```typescript
// SEBELUM (VULNERABLE — cek global roles):
const isAdmin = roles.includes('admin')
const isTeacher = roles.includes('teacher')

// SESUDAH (SECURE — cek tenant-scoped activeRole):
const isAdmin = activeRole === 'admin'
const isTeacher = activeRole === 'teacher'
const isStudent = activeRole === 'student'
```

---

### P1-3: Validasi is_active saat Tenant Switch

**File:** `src/contexts/AuthContext.tsx:116-128`

```typescript
const setActiveTenant = useCallback(
  (id: string) => {
    localStorage.setItem('activeTenantId', id)
    const tenant = rawTenants[id]

    if (tenant) {
      // Validasi is_active flag sebelum set
      if (!tenant.is_active) {
        toast.error('Workspace ini tidak aktif')
        return
      }
      setActiveTenantState(tenant)
      setTenantId(id)
    } else {
      toast.error('Workspace tidak ditemukan atau Anda tidak memiliki akses')
      const firstActiveTenant = Object.values(rawTenants).find((t) => t.is_active)
      if (firstActiveTenant) {
        setActiveTenantState(firstActiveTenant)
        setTenantId(firstActiveTenant.id)
      }
    }
  },
  [rawTenants]
)
```

---

### P1-4: Integrasikan Sentry User Tracking

**File:** `src/contexts/AuthContext.tsx` + `src/utils/sentry.ts`

```typescript
// Di AuthContext setelah login berhasil:
import { setSentryUser, clearSentryUser, captureError } from '@/src/utils/sentry'

// Setelah fetchUserData berhasil:
setSentryUser(user.id, role)

// Di signOut:
clearSentryUser()

// Di semua useMutation onError:
onError: (err, vars, context) => {
  captureError(err, { mutation: 'deleteBlock', vars })
  toast({ title: 'Operasi gagal', variant: 'error' })
}
```

---

### P1-5: Tambah Error Boundaries di Semua Routes

**File:** Buat `src/components/ErrorBoundary.tsx` dan wrap semua routes

```typescript
// src/app/routes/index.tsx
import { ErrorBoundary } from '@/src/components/ErrorBoundary'

<ErrorBoundary fallback={<ErrorPage />} onError={captureError}>
  <Routes>
    {/* semua routes */}
  </Routes>
</ErrorBoundary>

// Juga wrap setiap lazy-loaded page:
<Suspense fallback={<AppLoading />}>
  <ErrorBoundary fallback={<FeatureErrorState />}>
    <LazyPage />
  </ErrorBoundary>
</Suspense>
```

---

### P1-6: Tambah captureError ke Semua useMutation Error Handlers

Audit semua `useMutation` hooks di `src/features/*/queries/` dan pastikan:

```typescript
onError: (err) => {
  captureError(err, { context: 'mutation-name' })
  toast({ title: 'Error message', variant: 'error' })
}
```

---

## Phase 3 — Data Layer & Service Architecture (Sprint 3-4, ~2 minggu)

**Target: API score 5.5 → 7.5**

### P2-1: Implementasi Sync Queue Functions yang Hilang

**File:** `src/utils/offlineStorage.ts:128-149`  
**Masalah:** `backgroundSync.ts` mengimport `getPendingSubmissions` dan `markSynced` yang tidak ada

```typescript
// Tambahkan ke offlineStorage.ts:
export async function getPendingSubmissions(): Promise<SyncQueueItem[]> {
  const db = await openDB()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly')
  const store = tx.objectStore(STORES.SYNC_QUEUE)
  return wrapRequest(store.getAll())
}

export async function markSynced(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.SYNC_QUEUE)
  return wrapRequest(store.delete(id))
}

export async function incrementAttempts(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.SYNC_QUEUE)
  const item = await wrapRequest<SyncQueueItem>(store.get(id))
  if (item) {
    store.put({ ...item, attempts: item.attempts + 1 })
  }
}
```

---

### P2-2: Sentralisasi Query Keys

**File:** Sudah ada di `src/shared/lib/queryKeys.ts` — pastikan dipakai di semua 77 `useQuery`

```typescript
// src/shared/lib/queryKeys.ts (sudah ada, pastikan format ini)
export const queryKeys = {
  courses: {
    all: (tenantId: string) => ['courses', tenantId] as const,
    detail: (tenantId: string, courseId: string) => ['courses', tenantId, courseId] as const,
  },
  certificates: {
    student: (tenantId: string, userId: string) => ['certificates', tenantId, userId] as const,
  },
  // ... semua domain
}
```

---

### P2-3: Tambah Pagination ke Large Lists

Prioritas: assignments, courses, students, notifications, leaderboard

```typescript
// Pattern untuk useInfiniteQuery:
const useAssignments = (tenantId: string) =>
  useInfiniteQuery({
    queryKey: queryKeys.assignments.list(tenantId),
    queryFn: ({ pageParam = 0 }) =>
      supabase
        .from('assignments')
        .select('id, title, due_date, status')
        .eq('tenant_id', tenantId)
        .range(pageParam, pageParam + 19)
        .order('due_date', { ascending: true }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.data?.length === 20 ? pages.length * 20 : undefined,
  })
```

---

### P2-4: Perkuat TypeScript Types di offlineStorage

**File:** `src/utils/offlineStorage.ts:16-20`

```typescript
// SEBELUM (weak):
export interface CachedQuiz {
  questions: unknown[]
  options: unknown[]
}

// SESUDAH (strong):
interface QuizQuestion {
  id: string
  text: string
  type: 'multiple_choice' | 'true_false' | 'essay'
  order: number
}

export interface CachedQuiz {
  quizId: string
  questions: QuizQuestion[]
  cachedAt: number
  version: number // untuk schema migration
}
```

---

### P2-5: Tambah useFeatureFlag Tenant-Aware

**File:** `src/utils/featureFlags.ts:56`

```typescript
// SEBELUM (ignores tenant):
export function useFeatureFlag(flagName: string): boolean {
  return flagCache?.get(flagName)?.enabled ?? false
}

// SESUDAH (tenant-aware):
export function useFeatureFlag(flagName: string): boolean {
  const { activeTenant } = useAuth()
  return isFeatureEnabled(flagName, activeTenant?.id)
}
```

---

## Phase 4 — UX & Offline Experience (Sprint 4-5, ~1.5 minggu)

**Target: UX score 5 → 7.5**

### P2-6: Implementasi Offline Indicator Banner

**File:** Buat `src/components/ui/OfflineBanner.tsx`

```typescript
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div role="alert" className="bg-yellow-500 dark:bg-yellow-700 text-white px-4 py-2 text-sm text-center">
      Anda sedang offline — perubahan akan disinkronkan saat online kembali
    </div>
  )
}
```

---

### P2-7: Tambah Error State ke CertificateViewer dan komponen query lainnya

**File:** `src/features/gamification/components/CertificateViewer.tsx`

```typescript
const { data: certs, isLoading, error, refetch } = useStudentCertificates()

if (error) {
  return (
    <ErrorState
      title="Gagal memuat sertifikat"
      description="Terjadi kesalahan saat mengambil data"
      action={<Button onClick={() => refetch()}>Coba lagi</Button>}
    />
  )
}
```

---

### P2-8: Implementasi Optimistic Updates untuk Teacher Actions

**File:** `src/features/courses/hooks/useLessonActions.ts`

```typescript
const deleteBlockMutation = useMutation({
  mutationFn: ({ lessonId, blockId }: { lessonId: string; blockId: string }) =>
    builderBlockService.deleteBlock(lessonId, blockId),
  onMutate: async ({ blockId }) => {
    await queryClient.cancelQueries(queryKeys.lessons.blocks(lessonId))
    const previous = queryClient.getQueryData(queryKeys.lessons.blocks(lessonId))
    queryClient.setQueryData(queryKeys.lessons.blocks(lessonId), (old: Block[]) =>
      old.filter((b) => b.id !== blockId)
    )
    return { previous }
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(queryKeys.lessons.blocks(lessonId), context?.previous)
    captureError(err, { mutation: 'deleteBlock', blockId: vars.blockId })
    toast({ title: 'Gagal menghapus blok', variant: 'error' })
  },
  onSuccess: () => toast({ title: 'Blok dihapus', variant: 'success' }),
})
```

---

### P2-9: Peringatan "Unsaved Changes" untuk Builder

**File:** `src/features/courses/components/` (course builder)

```typescript
useEffect(() => {
  const hasDraft = async () => {
    const db = await openDB()
    const drafts = await db
      .transaction('builder-drafts', 'readonly')
      .objectStore('builder-drafts')
      .getAll()
    return drafts.length > 0
  }

  const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
    if (await hasDraft()) {
      e.preventDefault()
      e.returnValue = 'Ada perubahan yang belum disimpan. Yakin ingin meninggalkan halaman?'
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [])
```

---

## Phase 5 — Accessibility & Design System (Sprint 5-6, ~2 minggu)

**Target: Accessibility score 3.5 → 6.5, UI score 6.5 → 7.5**

### P2-10: Tambah Skip Link ke Layout

**File:** `src/components/layout/Layout.tsx`  
**WCAG:** SC 2.4.1 — Level A (WAJIB)

```typescript
// Di awal Layout.tsx, sebelum Header:
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
             focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow"
>
  Lewati ke konten utama
</a>

// Pada main content area:
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

---

### P2-11: Tambah ARIA Labels ke NotificationPanel

**File:** `src/features/gamification/components/NotificationPanel.tsx`

```typescript
// Icon buttons butuh aria-label:
<button aria-label={`Tandai notifikasi "${notification.title}" sebagai dibaca`}>
  <Check />
</button>

<button aria-label="Tandai semua notifikasi sebagai dibaca">
  <CheckCircle />
</button>

// Live region untuk unread count:
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
</div>
```

---

### P2-12: Implementasi useReducedMotion di Animasi

**File:** `src/components/ui/Tabs.tsx` dan semua komponen dengan Framer Motion

```typescript
import { useReducedMotion } from 'framer-motion'

function Tabs({ ... }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.span
      layoutId={`tab-indicator-${layoutId}`}
      transition={shouldReduceMotion
        ? { duration: 0 }  // Tanpa animasi
        : { type: 'spring', stiffness: 400, damping: 30 }
      }
    />
  )
}
```

---

### P2-13: Buat Design Token System

**File:** Buat `src/styles/tokens.ts`

```typescript
export const colors = {
  primary: {
    50: 'blue-50',
    500: 'blue-500',
    700: 'blue-700',
  },
  surface: {
    light: 'white',
    dark: 'slate-800',
  },
  text: {
    primary: 'slate-900',
    secondary: 'slate-600',
  },
}

export const motion = {
  spring: { type: 'spring', stiffness: 400, damping: 30 },
  fast: { duration: 0.15 },
  normal: { duration: 0.25 },
}
```

---

### P2-14: Standardisasi Form Components

Integrasikan React Hook Form + Valibot (sudah ada di project):

**File:** Buat `src/components/ui/FormField.tsx`, `Input.tsx`, `Select.tsx`

```typescript
// Form field dengan error display standar:
interface FormFieldProps {
  label: string
  name: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({ label, name, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required && <span aria-hidden="true" className="text-red-500 ml-1">*</span>}
        {required && <span className="sr-only">(wajib diisi)</span>}
      </label>
      {children}
      {error && (
        <p id={`${name}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
```

---

## Phase 6 — Performance & Testing (Sprint 6-7, ~1.5 minggu)

**Target: Test score 6.5 → 8.0, Performance 7.5 → 8.5**

### P2-15: Tambah Bundle Size Limits

**File:** Buat `bundlesize.config.json`

```json
{
  "files": [
    { "path": "./dist/assets/index-*.js", "maxSize": "300 kB", "compression": "gzip" },
    { "path": "./dist/assets/vendor-*.js", "maxSize": "200 kB", "compression": "gzip" }
  ]
}
```

Tambah di `package.json`:

```json
"bundle:check": "bundlesize"
```

---

### P2-16: Tambah Security E2E Tests

**File:** Buat `e2e/security/cross-tenant-admin.spec.ts`

```typescript
test('admin tidak bisa akses admin routes di tenant berbeda', async ({ page }) => {
  // Login sebagai admin Tenant A
  await page.goto('/#/login')
  await page.fill('[name="email"]', 'admin@edusync.dev')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Switch ke Tenant B (where user is student)
  // ...simulasi tenant switch...

  // Coba akses admin routes
  await page.goto('/#/app/admin/users')

  // Harus redirect ke unauthorized
  await expect(page).toHaveURL(/unauthorized/)
  await expect(page.getByText('Admin Content')).not.toBeVisible()
})

test('XSS di certificate name tidak dieksekusi', async ({ page }) => {
  // Update profil dengan payload XSS
  const xssPayload = '<img src=x onerror=alert(document.cookie)>'
  // ...update profile...

  // Lihat certificate
  await page.goto('/#/app/student/certificates')

  // Pastikan tidak ada dialog/alert yang muncul
  const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null)
  const dialog = await dialogPromise
  expect(dialog).toBeNull()
})
```

---

### P2-17: Tambah Unit Tests Auth Critical Path

**File:** Buat `src/features/auth/__tests__/RoleGuard.test.tsx`

```typescript
describe('RoleGuard', () => {
  it('harus deny akses saat activeRole tidak sesuai', () => {
    const mockAuth = { role: 'admin', activeRole: 'student', loading: false }

    render(
      <AuthContext.Provider value={mockAuth}>
        <RoleGuard allowedRoles={['admin']}>
          <div>Admin Content</div>
        </RoleGuard>
      </AuthContext.Provider>
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('harus deny akses saat activeRole null', () => {
    const mockAuth = { role: 'admin', activeRole: null, loading: false }
    // ...
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })
})
```

---

### P2-18: Audit React.memo Candidates

Tambahkan `React.memo` ke komponen yang sering di-render dalam list:

- `src/components/ui/Card.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/SkeletonCard.tsx`
- Komponen item di setiap list/feed

---

### P2-19: Implementasi PrefetchLink

**File:** Buat `src/components/navigation/PrefetchLink.tsx`

```typescript
export function PrefetchLink<T>({ to, queryKey, queryFn, children, ...props }) {
  const queryClient = useQueryClient()

  const prefetch = useCallback(() => {
    queryClient.prefetchQuery({ queryKey, queryFn })
  }, [queryClient, queryKey, queryFn])

  return (
    <Link to={to} onMouseEnter={prefetch} {...props}>
      {children}
    </Link>
  )
}
```

---

## Phase 7 — Feature Completion (Sprint 7-9, ~3 minggu)

**Target: Feature score 6.5 → 8.0**

### P3-1: Build Onboarding Flow (Stub → Complete)

**Saat ini:** 6 source files, 0 flow yang terdeteksi  
Implementasi:

- Teacher: Wizard untuk buat course pertama (3-step)
- Student: Dashboard tour saat first login
- Gunakan `localStorage.getItem('hasCompletedOnboarding')` sebagai gate

---

### P3-2: Lengkapi Profile Module (2 file → minimal viable)

**Saat ini:** Hanya 2 source files, 0 test  
Minimal yang dibutuhkan:

- Profile edit form (nama, avatar, bio)
- Password change
- Notification preferences
- Hapus akun

---

### P3-3: Build Moderation Dashboard (Stub → Partial)

**Saat ini:** 6 source files, no UI  
Minimal:

- Content flagging list untuk admin
- Flag/unflag action pada forum posts
- User report management

---

### P3-4: Tambah Export ke Reports Module

**Saat ini:** 8 source files, no export  
Tambahkan:

- CSV export untuk gradebook
- PDF export untuk sertifikat (gantikan `document.write()`)
- CSV export untuk analytics

---

### P3-5: Implementasi Real-Time Notifications

```typescript
// Gantikan polling dengan Supabase Realtime:
useEffect(() => {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => {
        queryClient.invalidateQueries(queryKeys.notifications.all(userId))
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [userId])
```

---

## Tracking Progress

### Scorecard Target

| Kategori         | Saat Ini   | Target P1  | Target Final |
| ---------------- | ---------- | ---------- | ------------ |
| Security         | 4.5/10     | 8.0/10     | 8.5/10       |
| Auth & AuthZ     | 3.5/10     | 7.5/10     | 8.5/10       |
| UI/UX Quality    | 6.5/10     | 7.0/10     | 8.0/10       |
| User Experience  | 5.0/10     | 6.5/10     | 7.5/10       |
| Accessibility    | 3.5/10     | 5.5/10     | 7.0/10       |
| Performance      | 7.5/10     | 8.0/10     | 8.5/10       |
| Testing          | 6.5/10     | 7.5/10     | 8.5/10       |
| Code Health      | 8.5/10     | 9.0/10     | 9.0/10       |
| Error Handling   | 4.0/10     | 6.5/10     | 7.5/10       |
| Feature Complete | 6.5/10     | 7.0/10     | 8.0/10       |
| API & Data       | 5.5/10     | 7.0/10     | 8.0/10       |
| Architecture     | 7.5/10     | 8.5/10     | 9.0/10       |
| **OVERALL**      | **5.1/10** | **7.5/10** | **8.5/10**   |

---

### File Impact Matrix

| File                                                            | Priority | Issue                   | Fix                                            |
| --------------------------------------------------------------- | -------- | ----------------------- | ---------------------------------------------- |
| `src/components/guards/RoleGuard.tsx:19`                        | 🔴 P0    | Cross-tenant escalation | Gunakan `activeRole` saja                      |
| `src/features/gamification/components/CertificateViewer.tsx:25` | 🔴 P0    | Stored XSS              | escapeHtml() + CSP                             |
| `src/utils/sanitize.ts`                                         | 🔴 P0    | XSS di sanitize.ts      | Hapus document.write()                         |
| `.env`                                                          | 🔴 P0    | Secrets di repo         | Purge + rotate                                 |
| `supabase/migrations/`                                          | 🔴 P0    | No RLS evidence         | Deploy policies                                |
| `src/contexts/AuthContext.tsx:428-449`                          | 🟠 P1    | Incomplete signOut      | Clear all localStorage                         |
| `src/hooks/usePermissions.ts`                                   | 🟠 P1    | Global role check       | Gunakan activeRole                             |
| `src/features/auth/hooks/useLoginState.ts:143,146`              | 🟠 P1    | Tokens in localStorage  | CSP / HttpOnly migration                       |
| `src/utils/offlineStorage.ts:128-149`                           | 🟡 P2    | Missing sync functions  | Implementasi getPendingSubmissions, markSynced |
| `src/components/layout/Layout.tsx`                              | 🟡 P2    | No skip link (WCAG A)   | Tambah skip link                               |
| `src/features/gamification/components/NotificationPanel.tsx`    | 🟡 P2    | Missing ARIA labels     | Tambah aria-label                              |
| `src/components/ui/Tabs.tsx`                                    | 🟡 P2    | No useReducedMotion     | Implementasi                                   |
| `src/utils/featureFlags.ts:56`                                  | 🟡 P2    | Ignores tenantId        | Tambah tenant context                          |
| `src/contexts/AuthContext.tsx:116-128`                          | 🟡 P2    | No is_active check      | Validasi is_active                             |

---

### Sprint Timeline

```
Sprint 1 (Week 1-2):   Phase 1 — Security Critical (P0)
Sprint 2 (Week 2-3):   Phase 2 — Auth & Monitoring (P1)
Sprint 3 (Week 3-4):   Phase 3 — Data Layer (P2 bagian 1)
Sprint 4 (Week 4-5):   Phase 4 — UX & Offline (P2 bagian 2)
Sprint 5 (Week 5-6):   Phase 5 — Accessibility & Design (P2 bagian 3)
Sprint 6 (Week 6-7):   Phase 6 — Performance & Testing (P2 bagian 4)
Sprint 7-9 (Week 7-12): Phase 7 — Feature Completion (P3)
```

**Gate untuk Production Deployment:** Phase 1 + Phase 2 selesai dan verified via E2E security tests

---

_Roadmap ini dibuat berdasarkan analisis `notion-report-2026-03-28T21-24-14.md`_  
_Update dokumen ini setelah setiap sprint selesai_
