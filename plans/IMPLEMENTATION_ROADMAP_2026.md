# EduSync LMS — Implementation Roadmap 2026

> Berdasarkan SQA Audit Report (`notion-report-2026-03-28T18-27-45.md`)  
> Overall Production Readiness Score Saat Ini: **5.8/10 (CONDITIONAL-GO)**  
> Target Score: **8.5/10 (GO)**  
> Tanggal Dibuat: 2026-03-29

---

## Ringkasan Eksekutif

Audit menemukan **5 CRITICAL vulnerabilities** yang memblokir deployment production, plus
puluhan HIGH/MEDIUM issues di UX, accessibility, testing, dan arsitektur. Roadmap ini
dibagi menjadi **6 Phase** yang harus dikerjakan secara berurutan untuk phase keamanan,
dan sebagian paralel untuk phase lainnya.

### Skor Per Domain Saat Ini

| Domain                         | Skor   | Status      |
| ------------------------------ | ------ | ----------- |
| Security                       | 4.5/10 | 🔴 CRITICAL |
| Authentication & Authorization | 5.5/10 | 🔴 CRITICAL |
| Error Handling & Monitoring    | 4.5/10 | 🔴 CRITICAL |
| UX & User Flows                | 4.0/10 | 🔴 CRITICAL |
| Accessibility (WCAG 2.1)       | 4.5/10 | 🟠 HIGH     |
| Testing & QA Coverage          | 6.0/10 | 🟠 HIGH     |
| API & Data Layer               | 5.5/10 | 🟠 HIGH     |
| UI Design System               | 6.5/10 | 🟡 MEDIUM   |
| Feature Completeness           | 6.5/10 | 🟡 MEDIUM   |
| Code Health & TypeScript       | 7.5/10 | 🟢 GOOD     |
| Performance & Bundle           | 7.5/10 | 🟢 GOOD     |
| Architecture & Multi-tenant    | 7.5/10 | 🟢 GOOD     |

---

## PHASE 1 — Critical Security Fixes

**Timeline: Week 1 (Hari 1–5)**  
**Status: PRODUCTION BLOCKER — Harus selesai sebelum deployment**  
**Estimasi effort: 3–4 developer-days**

### 1.1 Fix RoleGuard Cross-Tenant Privilege Escalation

**File:** `src/components/guards/RoleGuard.tsx:27`  
**Severity:** CRITICAL  
**Effort:** 2 jam

**Masalah:**

```typescript
// SAAT INI (BERBAHAYA):
const hasAccess = allowedRoles.includes(currentRole) || allowedRoles.includes(role)
// `role` = global highest privilege — admin di Tenant A bisa akses admin routes Tenant B
```

**Fix:**

```typescript
// HARUS DIUBAH KE:
const { activeRole, loading } = useAuth()
const hasAccess = activeRole && allowedRoles.includes(activeRole)
if (!hasAccess) return <Navigate to="/unauthorized" />
```

**Dampak jika tidak difix:** Admin di Tenant A dapat mengakses semua admin routes di Tenant B tanpa otorisasi.

---

### 1.2 Fix Stored XSS di CertificateViewer

**File:** `src/features/gamification/components/CertificateViewer.tsx:16`  
**Severity:** CRITICAL  
**Effort:** 1 jam

**Masalah:**

```typescript
// SAAT INI (BERBAHAYA):
w.document.write(`<h1>${userName}</h1><h2>${courseTitle}</h2>`)
// userName dari database, tidak di-escape → XSS execution
```

**Fix:**

```typescript
// Import utility yang sudah ada:
import { escapeHtml } from '@/src/utils/sanitize'

w.document.write(`
  <h1>${escapeHtml(userName)}</h1>
  <h2>${escapeHtml(courseTitle)}</h2>
`)
```

**Attack chain yang diblokir:** User set nama profil menjadi `<img src=x onerror=alert(document.cookie)>` → tersimpan di DB → XSS execute saat certificate dibuka → curi session token dari localStorage.

---

### 1.3 Fix usePermissions Global Role Checks

**File:** `src/features/auth/hooks/usePermissions.ts:11-13`  
**Severity:** HIGH (berdampak CRITICAL bersama dengan RoleGuard fix)  
**Effort:** 1 jam

**Masalah:**

```typescript
// SAAT INI (BERBAHAYA):
const isAdmin = roles.includes('admin') // cek SEMUA tenant
const isTeacher = roles.includes('teacher') // bukan activeRole
```

**Fix:**

```typescript
// Harus pakai activeRole (tenant-scoped):
const isAdmin = activeRole === 'admin'
const isTeacher = activeRole === 'teacher'
const isStudent = activeRole === 'student'

// Jika perlu check global admin (untuk super-admin features):
const isGlobalAdmin = roles.includes('admin')
```

---

### 1.4 Audit & Rotate Secrets (.env)

**File:** `.env` di root project  
**Severity:** CRITICAL  
**Effort:** 2–3 jam

**Actions wajib:**

```bash
# 1. Cek apakah .env pernah di-commit ke git
git log --all --full-history -- .env

# 2. Jika pernah di-commit, hapus dari history
git rm --cached .env
echo ".env" >> .gitignore
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env' HEAD

# 3. Hapus VITE_DEV_PASSWORD dari .env
# VITE_DEV_PASSWORD=password123  ← HAPUS INI

# 4. Rotate Supabase keys jika sudah exposed
# - Buka Supabase dashboard → Settings → API
# - Generate new anon key dan service role key
# - Update semua environment (Vercel, Netlify, dll)
```

**Catatan:** `VITE_SUPABASE_ANON_KEY` adalah public (acceptable), tapi `VITE_DEV_PASSWORD` adalah CRITICAL leak.

---

### 1.5 Audit Semua document.write() & innerHTML Usage

**File:** Seluruh codebase  
**Severity:** HIGH  
**Effort:** 2 jam

```bash
# Temukan semua penggunaan yang berisiko
grep -rn "document\.write\|innerHTML\|dangerouslySetInnerHTML" src/ \
  --include="*.tsx" --include="*.ts"
```

Untuk setiap temuan:

- `document.write()` → wajib gunakan `escapeHtml()`
- `dangerouslySetInnerHTML` → pastikan pakai DOMPurify (seperti MathRenderer.tsx ✅)
- Jika data dari user/DB → wajib sanitize

---

### Deliverable Phase 1

- [ ] RoleGuard menggunakan `activeRole` bukan `role`
- [ ] CertificateViewer tidak ada XSS
- [ ] usePermissions menggunakan `activeRole`
- [ ] `.env` tidak mengandung password/secrets sensitif
- [ ] `.env` ada di `.gitignore`
- [ ] Semua `document.write()` di-escape
- [ ] E2E smoke test: admin Tenant A tidak bisa akses Tenant B routes
- [ ] E2E smoke test: XSS payload di nama profil tidak execute saat certificate dibuka

---

## PHASE 2 — Server-Side Security Enforcement

**Timeline: Week 2–3**  
**Estimasi effort: 8–10 developer-days**

### 2.1 Implementasi Row Level Security (RLS) Policies

**File:** `supabase/migrations/` (file baru)  
**Severity:** CRITICAL  
**Effort:** 3–5 hari

Ini adalah gap terbesar: 149 Supabase queries di client tapi **zero RLS policies terverifikasi**.

```sql
-- Template untuk setiap tabel yang menyimpan data tenant:
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Policy dasar multi-tenant isolation:
CREATE POLICY "tenant_isolation_{table_name}" ON {table_name}
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Tabel prioritas (urutkan dari yang paling kritis):
-- 1. user_roles
-- 2. profiles
-- 3. courses
-- 4. enrollments
-- 5. quiz_questions, quiz_options
-- 6. quiz_attempts, quiz_answers
-- 7. assignments, assignment_submissions
-- 8. grades
-- 9. lesson_progress, student_lesson_signals
-- 10. notifications
-- 11. ai_tutor_sessions
-- 12. feature_flags
```

**Verifikasi setelah implementasi:**

```sql
-- Cek tabel yang belum enable RLS:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- Harus return 0 rows setelah semua tabel di-enable
```

---

### 2.2 Add Content Security Policy (CSP) Headers

**File:** `index.html` atau konfigurasi server  
**Severity:** HIGH  
**Effort:** 4 jam

```html
<!-- index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https://*.supabase.co;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    font-src 'self';
    frame-src 'none';
  "
/>
```

---

### 2.3 Server-Side Rate Limiting via Edge Functions

**File:** `supabase/functions/rate-limiter/` (baru)  
**Severity:** HIGH  
**Effort:** 2 hari

Client-side rate limiting **mudah di-bypass** (clear localStorage, incognito, curl). Harus ada server-side enforcement.

```typescript
// supabase/functions/rate-limiter/index.ts
// Implementasi menggunakan Supabase Edge Functions + Redis/KV store
// Untuk: login, quiz-submit, ai-tutor, password-reset
```

---

### 2.4 Migrasi Auth Tokens dari localStorage ke httpOnly Cookies

**File:** `src/contexts/AuthContext.tsx`, `src/features/auth/hooks/useLoginState.ts`  
**Severity:** CRITICAL  
**Effort:** 3–5 hari (butuh backend changes)

**Masalah:** Supabase default menyimpan auth tokens di localStorage, yang accessible oleh XSS.

**Opsi:**

1. **Short-term:** Enkripsi localStorage values dengan session-derived key
2. **Long-term:** Konfigurasi Supabase untuk pakai httpOnly cookies

```typescript
// Konfigurasi Supabase client untuk cookies:
const supabase = createClient(url, key, {
  auth: {
    storage: {
      getItem: (key) => cookieStore.get(key),
      setItem: (key, value) =>
        cookieStore.set(key, value, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        }),
      removeItem: (key) => cookieStore.remove(key),
    },
  },
})
```

---

### 2.5 Move AI Tutor Session IDs & Signed Queue ke IndexedDB

**File:** `src/features/ai-tutor/components/AITutorPanel.tsx:131`, `src/features/lessons/api/lessonService.ts:101`  
**Severity:** HIGH  
**Effort:** 1 hari

```typescript
// HAPUS:
localStorage.setItem(`ai_tutor_session_${lessonId}`, responseData.session_id)
localStorage.setItem(QUEUE_KEY, JSON.stringify(signedQueue))

// GANTI DENGAN IndexedDB (offlineStorage.ts sudah ada):
await saveToIndexedDB('ai_sessions', { lessonId, sessionId: responseData.session_id })
await saveToIndexedDB('progress_queue', signedQueue)
```

---

### 2.6 Sentry User Clearing on Logout

**File:** `src/contexts/AuthContext.tsx:503`  
**Severity:** LOW  
**Effort:** 30 menit

```typescript
// Tambahkan di signOut():
import { clearSentryUser } from '@/src/services/sentry'

const signOut = useCallback(async () => {
  clearSentryUser() // ← TAMBAHKAN INI
  localStorage.removeItem('activeTenantId')
  // ... rest of signOut
}, [])
```

---

### Deliverable Phase 2

- [ ] RLS enabled + policies di semua tabel public
- [ ] CSP header ter-deploy
- [ ] Server-side rate limiting aktif untuk login/quiz/ai-tutor/password-reset
- [ ] AI tutor session IDs tidak lagi di localStorage
- [ ] Signed progress queue tidak lagi di localStorage
- [ ] Sentry user di-clear saat logout
- [ ] Penetration testing untuk memverifikasi fix

---

## PHASE 3 — Error Handling & UX Gaps

**Timeline: Week 3–4**  
**Estimasi effort: 5–7 developer-days**

### 3.1 Fix Silent Failures — Toast Notifications

**File:** `src/contexts/AuthContext.tsx`, mutation hooks  
**Severity:** HIGH  
**Effort:** 1 hari

8+ titik kegagalan silent yang membuat user bingung:

```typescript
// 1. Fix join code enrollment (AuthContext.tsx:363):
try {
  const { error } = await supabase.rpc('enroll_student', { p_join_code: pendingCode })
  if (error) throw error
  toast.success('Berhasil bergabung ke kelas!')
} catch (e) {
  toast.error('Kode bergabung tidak valid. Periksa kembali kode Anda.')
  localStorage.setItem('pendingJoinCode', pendingCode) // retry on next login
}

// 2. Fix invitation acceptance (AuthContext.tsx:345):
try {
  const { error } = await supabase.rpc('accept_invitation', { invite_token: pendingToken })
  if (error) throw error
  toast.success('Undangan berhasil diterima!')
} catch (e) {
  toast.error('Undangan tidak valid atau sudah kadaluarsa.')
}

// 3. Fix session expiry during operations:
// AuthContext.tsx:468 — tambahkan warning sebelum auto-logout
if (error) {
  toast.warning('Sesi Anda akan berakhir. Silakan login kembali.')
  await signOut()
}
```

---

### 3.2 Add Offline Banner & Sync Status

**File:** `src/components/layout/Layout.tsx` (baru: `OfflineBanner.tsx`)  
**Severity:** CRITICAL (UX)  
**Effort:** 1 hari

```typescript
// src/components/ui/OfflineBanner.tsx (baru)
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { pendingCount } = useSyncQueue()

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

  if (isOnline && pendingCount === 0) return null

  if (!isOnline) return (
    <div role="status" className="bg-amber-500 text-white text-sm px-4 py-2 text-center">
      ⚠️ Mode offline — perubahan akan tersimpan dan disinkronkan saat kembali online
    </div>
  )

  return (
    <div role="status" className="bg-blue-500 text-white text-sm px-4 py-2 text-center">
      🔄 Menyinkronkan {pendingCount} item...
    </div>
  )
}
```

---

### 3.3 Standardize Loading States dengan Skeleton

**File:** `src/features/notifications/components/NotificationPanel.tsx`, route-level  
**Severity:** MEDIUM  
**Effort:** 4 jam

```typescript
// NotificationPanel.tsx — ganti text loading dengan Skeleton:
// BEFORE:
if (isLoading) return <div className="p-6">Memuat notifikasi...</div>

// AFTER:
if (isLoading) return (
  <div className="space-y-3 p-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <SkeletonCard key={i} className="h-16" />
    ))}
  </div>
)

// RoleGuard.tsx — ganti generic AppLoading dengan role-specific skeleton
// Buat: StudentDashboardSkeleton, TeacherDashboardSkeleton, AdminDashboardSkeleton
```

---

### 3.4 Implementasi Optimistic Updates untuk Notifikasi

**File:** `src/features/notifications/queries/` (hook useMutation)  
**Severity:** HIGH  
**Effort:** 4 jam

```typescript
// useMarkNotificationRead dengan optimistic update:
const { mutate: markRead } = useMutation({
  mutationFn: (id: string) => notificationsApi.markRead(id),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.notifications() })
    const prev = queryClient.getQueryData(queryKeys.notifications())
    queryClient.setQueryData(queryKeys.notifications(), (old) =>
      old?.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    )
    return { prev }
  },
  onError: (err, id, ctx) => {
    queryClient.setQueryData(queryKeys.notifications(), ctx?.prev)
    toast.error('Gagal menandai notifikasi sebagai telah dibaca')
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
  },
})
```

---

### 3.5 Implementasi API Error Boundaries per Route

**File:** `src/app/routes.tsx`, route-level components  
**Severity:** HIGH  
**Effort:** 4 jam

```typescript
// Wrap semua route lazy-loaded dengan ErrorBoundary:
import { FeatureErrorBoundary } from '@/src/components/FeatureErrorBoundary'

const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))

<Suspense fallback={<AppLoading />}>
  <FeatureErrorBoundary>
    <StudentDashboard />
  </FeatureErrorBoundary>
</Suspense>
```

---

### 3.6 Verify Sentry captureError Usage

**File:** Seluruh codebase  
**Severity:** HIGH  
**Effort:** 1 hari

Sentry diinisialisasi dengan baik di `sentry.ts` tapi `captureError()` tidak terpanggil di mana-mana.

```bash
# Audit penggunaan:
grep -rn "captureError\|Sentry\.capture" src/ --include="*.ts" --include="*.tsx"

# Setiap try-catch yang BUKAN logging harus memanggil captureError():
try {
  await riskyOperation()
} catch (error) {
  captureError(error, { context: 'operationName', userId: user?.id })
  toast.error('Terjadi kesalahan. Tim kami telah diberitahu.')
}
```

---

### 3.7 Add Rate Limit User Feedback

**File:** `src/utils/rateLimiter.ts` — consumers  
**Severity:** HIGH  
**Effort:** 2 jam

```typescript
// Di semua titik yang menggunakan rateLimiter:
const allowed = loginRateLimiter.check(email)
if (!allowed) {
  const remainingMs = loginRateLimiter.getResetTime(email)
  const remainingSecs = Math.ceil(remainingMs / 1000)
  toast.error(`Terlalu banyak percobaan. Coba lagi dalam ${remainingSecs} detik.`)
  return
}
```

---

### Deliverable Phase 3

- [ ] Toast notifications di semua failure points (join code, invite, session)
- [ ] Offline banner muncul saat tidak ada koneksi
- [ ] Sync status indicator menunjukkan jumlah item pending
- [ ] Loading states menggunakan Skeleton (bukan text)
- [ ] Optimistic updates untuk mark notification read
- [ ] Error boundaries per route
- [ ] Sentry captureError dipanggil di semua catch blocks kritis
- [ ] Rate limit errors menampilkan pesan + countdown ke user

---

## PHASE 4 — Accessibility (WCAG 2.1 AA)

**Timeline: Week 5–6**  
**Estimasi effort: 5–7 developer-days**

### 4.1 Tambahkan Skip Links ke Semua Halaman

**File:** `src/components/layout/Layout.tsx`  
**Severity:** CRITICAL (WCAG 2.4.1 — Level A violation)  
**Effort:** 2 jam

```typescript
// src/components/layout/Layout.tsx
export function Layout() {
  return (
    <>
      {/* Skip link — selalu tambahkan di awal layout */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
                   focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white
                   focus:rounded-md focus:ring-2"
      >
        Lewati ke konten utama
      </a>

      <Header />

      <main id="main-content" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
    </>
  )
}
```

---

### 4.2 Tambahkan Accessibility ke MathRenderer

**File:** `src/components/ui/MathRenderer.tsx`  
**Severity:** CRITICAL (WCAG 1.1.1 — blind students tidak bisa akses konten matematika)  
**Effort:** 4 jam

```typescript
// MathRenderer.tsx — tambahkan aria-label dengan teks deskriptif
export function MathRenderer({ latex, altText }: MathRendererProps) {
  const sanitized = DOMPurify.sanitize(katexHtml)

  return (
    <span
      role="math"
      aria-label={altText ?? `Persamaan matematika: ${latex}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
```

---

### 4.3 Reduced Motion Support untuk Framer Motion

**File:** `src/components/ui/Tabs.tsx` dan semua komponen dengan animasi  
**Severity:** HIGH (WCAG 2.3.3)  
**Effort:** 3 jam

```typescript
// src/components/ui/Tabs.tsx
import { useReducedMotion } from 'framer-motion'

export function Tabs({ ... }) {
  const shouldReduceMotion = useReducedMotion()

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 400, damping: 30 }

  return (
    <AnimatePresence>
      <motion.span
        layoutId={`tab-indicator-${layoutId}`}
        transition={transition}
        className="..."
      />
    </AnimatePresence>
  )
}
```

---

### 4.4 ARIA Live Regions untuk Notifikasi

**File:** `src/features/notifications/components/NotificationPanel.tsx`  
**Severity:** HIGH (WCAG 4.1.3)  
**Effort:** 2 jam

```typescript
// NotificationPanel.tsx
<div
  aria-live="polite"
  aria-atomic="false"
  aria-label="Panel notifikasi"
>
  {/* Bell button */}
  <button
    aria-label={`Notifikasi, ${unreadCount} belum dibaca`}
    aria-expanded={isOpen}
    aria-controls="notification-panel"
  >
    <Bell />
    {unreadCount > 0 && <span aria-hidden="true">{unreadCount}</span>}
  </button>

  {/* Notification list */}
  <div
    id="notification-panel"
    role="region"
    aria-label="Daftar notifikasi"
  >
    {notifications.map(n => (
      <button
        key={n.id}
        aria-label={`${n.title} — ${n.read_at ? 'sudah dibaca' : 'belum dibaca'}`}
      >
        {n.title}
      </button>
    ))}
  </div>
</div>
```

---

### 4.5 Keyboard Navigation untuk Tab Component

**File:** `src/components/ui/Tabs.tsx`  
**Severity:** MEDIUM (WCAG 2.1.1)  
**Effort:** 2 jam

```typescript
// Tambahkan keyboard handler di TabsList:
<div
  role="tablist"
  onKeyDown={(e) => {
    const tabs = Array.from(tabListRef.current?.querySelectorAll('[role="tab"]') ?? [])
    const currentIndex = tabs.indexOf(document.activeElement as HTMLElement)

    if (e.key === 'ArrowRight') {
      const next = (currentIndex + 1) % tabs.length
      ;(tabs[next] as HTMLElement).focus()
    }
    if (e.key === 'ArrowLeft') {
      const prev = (currentIndex - 1 + tabs.length) % tabs.length
      ;(tabs[prev] as HTMLElement).focus()
    }
    if (e.key === 'Home') (tabs[0] as HTMLElement).focus()
    if (e.key === 'End') (tabs[tabs.length - 1] as HTMLElement).focus()
  }}
>
```

---

### 4.6 Icon Accessibility (lucide-react)

**File:** Semua komponen yang menggunakan icon  
**Severity:** MEDIUM (WCAG 1.1.1)  
**Effort:** 2 jam

```typescript
// Untuk icon dekoratif (punya label teks di sekitarnya):
<Bell aria-hidden="true" />

// Untuk icon standalone (tidak ada teks):
<button aria-label="Buka notifikasi">
  <Bell aria-hidden="true" />
</button>

// Untuk icon informatif (AlertTriangle untuk urgency):
<AlertTriangle aria-label="Mendesak" role="img" />
```

---

### Deliverable Phase 4

- [ ] Skip link di semua halaman (Layout.tsx)
- [ ] MathRenderer memiliki `aria-label` dengan deskripsi teks
- [ ] Semua animasi Framer Motion mendukung `prefers-reduced-motion`
- [ ] NotificationPanel memiliki `aria-live` region
- [ ] Tab component mendukung keyboard navigation (Arrow keys, Home, End)
- [ ] Semua icon memiliki `aria-hidden` atau `aria-label` yang tepat
- [ ] Uji dengan NVDA/VoiceOver dan keyboard-only navigation
- [ ] Jalankan axe DevTools scan — target 0 critical violations

---

## PHASE 5 — Testing & QA Coverage

**Timeline: Week 5–7**  
**Estimasi effort: 8–10 developer-days**

### 5.1 E2E Tests untuk Critical Security Paths

**File:** `e2e/critical-paths/` (baru)  
**Severity:** CRITICAL  
**Effort:** 2 hari

```typescript
// e2e/critical-paths/tenant-isolation.spec.ts
test('admin Tenant A tidak bisa akses admin routes Tenant B', async ({ page }) => {
  // Login sebagai admin@tenant-a.com
  await page.goto('/#/login')
  await page.fill('[name="email"]', 'admin@tenant-a.com')
  await page.fill('[name="password"]', process.env.TEST_PASSWORD!)
  await page.click('[type="submit"]')

  // Switch ke Tenant B
  await page.click('[data-testid="tenant-switcher"]')
  await page.click('[data-testid="tenant-b"]')

  // Coba akses admin route
  await page.goto('/#/app/admin/users')

  // Harus di-redirect ke unauthorized
  await expect(page).toHaveURL(/unauthorized/)
})

// e2e/critical-paths/xss-certificate.spec.ts
test('XSS payload di nama profil tidak execute saat certificate dibuka', async ({ page }) => {
  const xssPayload = '<img src=x onerror=window.__XSS_EXECUTED=true>'

  // Update nama profil dengan XSS payload
  await updateProfile(page, { first_name: xssPayload })

  // Buka certificate viewer
  await page.goto(`/#/certificates/${courseId}`)

  // Verifikasi XSS tidak execute
  const xssExecuted = await page.evaluate(() => window.__XSS_EXECUTED)
  expect(xssExecuted).toBeFalsy()

  // Verifikasi nama ter-escape dengan benar
  await expect(page.locator('h1')).toContainText('<img')
})
```

---

### 5.2 E2E Tests untuk Quiz Submission & Offline Sync

**File:** `e2e/critical-paths/quiz-submission.spec.ts` (baru)  
**Severity:** CRITICAL  
**Effort:** 1 hari

```typescript
// e2e/critical-paths/quiz-submission.spec.ts
test('quiz submission offline tersimpan dan sync saat online kembali', async ({
  page,
  context,
}) => {
  // Login dan mulai quiz
  await loginAsStudent(page)
  await page.goto('/#/app/student/quiz/123')

  // Jawab pertanyaan
  await page.click('[data-testid="option-a"]')

  // Simulasi offline
  await context.setOffline(true)

  // Submit quiz
  await page.click('[data-testid="submit-quiz"]')

  // Verifikasi feedback offline
  await expect(page.locator('[data-testid="offline-feedback"]')).toContainText(
    'Jawaban tersimpan. Akan dikirim saat online.'
  )

  // Kembali online
  await context.setOffline(false)

  // Verifikasi sync terjadi
  await page.waitForSelector('[data-testid="sync-complete"]')

  // Verifikasi di database
  const submission = await getQuizSubmission(studentId, quizId)
  expect(submission).toBeTruthy()
})
```

---

### 5.3 Unit Tests untuk Auth Module

**File:** `src/features/auth/__tests__/` (baru)  
**Severity:** CRITICAL (auth module: 0 tests saat ini)  
**Effort:** 2 hari

```typescript
// src/features/auth/__tests__/RoleGuard.test.tsx
describe('RoleGuard', () => {
  test('menggunakan activeRole bukan global role', () => {
    const { container } = render(
      <AuthProvider mockValue={{ role: 'admin', activeRole: 'student' }}>
        <RoleGuard allowedRoles={['admin']}>
          <div>Admin Content</div>
        </RoleGuard>
      </AuthProvider>
    )
    // Harus di-redirect, bukan menampilkan Admin Content
    expect(container.textContent).not.toContain('Admin Content')
  })

  test('akses diberikan jika activeRole sesuai', () => {
    render(
      <AuthProvider mockValue={{ role: 'admin', activeRole: 'admin' }}>
        <RoleGuard allowedRoles={['admin']}>
          <div>Admin Content</div>
        </RoleGuard>
      </AuthProvider>
    )
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })
})

// src/features/auth/__tests__/AuthContext.test.tsx
describe('AuthContext', () => {
  test('tenant switching tidak leak data dari tenant sebelumnya', async () => { ... })
  test('session refresh berjalan saat token hampir expired', async () => { ... })
  test('localStorage corruption recovery — fallback ke first valid tenant', () => { ... })
  test('concurrent fetchUserData dilindungi oleh fetchLock', async () => { ... })
})
```

---

### 5.4 Konfigurasi Coverage Thresholds

**File:** `vitest.config.ts`  
**Severity:** HIGH  
**Effort:** 1 jam

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        global: {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70,
        },
        // Critical modules lebih tinggi:
        'src/contexts/AuthContext.tsx': {
          statements: 90,
          branches: 85,
        },
        'src/components/guards/RoleGuard.tsx': {
          statements: 95,
        },
      },
    },
  },
})
```

---

### 5.5 Visual Regression Testing dengan Storybook

**File:** `.storybook/test-runner.config.ts` (baru)  
**Severity:** MEDIUM  
**Effort:** 1 hari

```bash
# Install Chromatic atau Playwright visual testing
pnpm add -D @chromatic-com/storybook

# Atau setup dengan Playwright snapshots
pnpm add -D @storybook/test-runner
```

---

### 5.6 Tambahkan CI/CD Pipeline

**File:** `.github/workflows/ci.yml` (baru)  
**Severity:** MEDIUM  
**Effort:** 4 jam

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3

      - name: Typecheck
        run: pnpm typecheck

      - name: Unit Tests + Coverage
        run: pnpm test --coverage

      - name: Check Coverage Thresholds
        run: pnpm test:coverage-check

      - name: E2E Tests
        run: pnpm test:e2e

      - name: Bundle Size Check
        run: pnpm build && pnpm bundlesize

      - name: Accessibility Scan
        run: pnpm test:a11y
```

---

### Deliverable Phase 5

- [ ] E2E test: tenant isolation (admin Tenant A tidak bisa akses Tenant B)
- [ ] E2E test: XSS di certificate tidak execute
- [ ] E2E test: quiz submission offline + sync
- [ ] E2E test: login flow + rate limiting
- [ ] E2E test: grade publication → student notification
- [ ] Unit tests untuk AuthContext (min 10 scenarios)
- [ ] Unit tests untuk RoleGuard (min 5 scenarios)
- [ ] Coverage thresholds dikonfigurasi (global: 70%, auth: 90%)
- [ ] Visual regression testing untuk 84 Storybook stories
- [ ] CI/CD pipeline berjalan di setiap PR

---

## PHASE 6 — Feature Completion & Architecture Improvements

**Timeline: Month 2–3**  
**Estimasi effort: 20–30 developer-days**

### 6.1 Operationalize Struggle Detection Module

**File:** `src/features/struggle/` (expand dari 10 files)  
**Severity:** HIGH (core value proposition yang belum selesai)  
**Effort:** 5 hari

Saat ini: 10 source files, 0 pages (30% completeness)

Deliverable:

- Dashboard instruktur menampilkan siswa at-risk
- Alert otomatis ketika siswa menunjukkan struggle pattern
- Student-facing remediation paths
- Integration dengan AI tutor untuk intervensi otomatis

---

### 6.2 Expand Question Bank Module

**File:** `src/features/question-bank/` (expand dari 10 files)  
**Severity:** HIGH  
**Effort:** 5 hari

Saat ini: 10 source files, 0 pages (35% completeness)

Deliverable:

- UI page untuk browse/search question bank
- Versioning & tagging system
- Collaborative authoring (multiple teachers)
- Usage analytics (pertanyaan mana yang dipakai quiz mana)
- Import/export soal (CSV, QTI format)

---

### 6.3 Implementasi AI Tutor UI

**File:** `src/features/ai-tutor/components/` (expand)  
**Severity:** MEDIUM  
**Effort:** 3 hari

Saat ini: 9 source files, 0 pages (45% completeness)

Deliverable:

- Chat interface embedded di LessonViewer
- Conversation history persistence
- Context-aware responses (lesson content aware)
- Integration dengan struggle detection

---

### 6.4 Expand Administration Module

**File:** `src/features/administration/` (expand dari 10 files)  
**Severity:** MEDIUM  
**Effort:** 5 hari

Saat ini: 10 source files (40% completeness)

Deliverable:

- Tenant provisioning wizard
- Usage dashboard (active users, course completions)
- Data export (GDPR compliance)
- Billing integration hooks
- Audit log viewer

---

### 6.5 Implementasi Onboarding Flows

**File:** `src/features/onboarding/` (expand dari 6 files)  
**Severity:** HIGH (UX)  
**Effort:** 3 hari

Saat ini: 6 source files, 0 pages (stub)

Deliverable:

- Student first login → "Selamat datang! Mari temukan kursus pertamamu"
- Teacher first login → "Buat kursus pertamamu"
- Admin first login → "Siapkan institusi Anda"
- Progress indicator untuk setiap onboarding step

---

### 6.6 Centralize Query Keys

**File:** `src/shared/lib/queryKeys.ts` (sudah ada, perlu audit)  
**Severity:** HIGH (API layer)  
**Effort:** 1 hari

```typescript
// Verifikasi semua query key sudah terpusat di queryKeys.ts
// Tidak ada string literal query key yang tersebar di komponen
export const queryKeys = {
  notifications: (userId: string) => ['notifications', userId] as const,
  quizzes: (tenantId: string) => ['quizzes', tenantId] as const,
  quiz: (id: string) => ['quizzes', 'detail', id] as const,
  // ... dst
}
```

---

### 6.7 Complete Offline Background Sync

**File:** `src/features/lessons/api/backgroundSync.ts`  
**Severity:** HIGH  
**Effort:** 2 hari

```typescript
// Lengkapi replayQueue dengan retry + exponential backoff:
async function replayQueue() {
  const pending = await getPendingSubmissions()

  for (const item of pending) {
    try {
      await withExponentialBackoff(() => supabase.from('submissions').insert(item.payload))
      await markSynced(item.id)
    } catch (err) {
      item.attempts++
      if (item.attempts > 3) {
        await deleteQueueItem(item.id)
        captureError(err, { context: 'backgroundSync', itemId: item.id })
      }
    }
  }
}
```

---

### 6.8 Form Validation Standarisasi

**File:** `src/pages/Creator.tsx` (568L), `src/pages/QuizManager.tsx` (502L), `src/features/quizzes/components/QuizEditorView.tsx` (505L)  
**Severity:** HIGH (UI quality)  
**Effort:** 3 hari

Halaman-halaman besar belum menggunakan React Hook Form + Valibot yang sudah tersedia:

```typescript
// Standarisasi semua form menggunakan:
import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import * as v from 'valibot'

const schema = v.object({
  title: v.string([v.minLength(1, 'Judul wajib diisi')]),
  // ...
})

const form = useForm({ resolver: valibotResolver(schema) })
```

---

### 6.9 Real-Time Subscriptions untuk Notifikasi & Leaderboard

**File:** `src/features/notifications/queries/`, `src/features/gamification/queries/`  
**Severity:** MEDIUM  
**Effort:** 2 hari

```typescript
// useNotifications — ganti polling dengan Supabase Realtime:
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        queryClient.setQueryData(queryKeys.notifications(userId), (old) => [payload.new, ...old])
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [userId])
```

---

### 6.10 Bundle Size Governance

**File:** `bundlesize.config.json` (baru)  
**Severity:** HIGH  
**Effort:** 2 jam

```json
{
  "files": [
    {
      "path": "dist/assets/index-*.js",
      "maxSize": "150 kB",
      "compression": "gzip"
    },
    {
      "path": "dist/assets/vendor-*.js",
      "maxSize": "400 kB",
      "compression": "gzip"
    },
    {
      "path": "dist/**/*.css",
      "maxSize": "50 kB",
      "compression": "gzip"
    }
  ]
}
```

---

### Deliverable Phase 6

- [ ] Struggle detection: instructor dashboard + student alerts live
- [ ] Question bank: UI page + versioning + tagging
- [ ] AI tutor: chat UI embedded di LessonViewer
- [ ] Administration: tenant provisioning + usage dashboard
- [ ] Onboarding flows untuk semua 3 roles
- [ ] Query keys semua terpusat
- [ ] Background sync dengan retry + exponential backoff
- [ ] Semua form besar menggunakan RHF + Valibot
- [ ] Notifikasi real-time (bukan polling)
- [ ] bundlesize.config.json dengan thresholds

---

## Deployment Checklist (GO/NO-GO Criteria)

### ✅ GO Criteria (Harus terpenuhi sebelum production)

- [ ] **CRITICAL #1 Fix:** RoleGuard menggunakan `activeRole` (terverifikasi dengan E2E test)
- [ ] **CRITICAL #2 Fix:** Zero XSS vectors (audit + E2E test pass)
- [ ] **CRITICAL #3 Fix:** localStorage tidak menyimpan auth tokens sensitif
- [ ] **CRITICAL #4 Fix:** RLS policies aktif di semua tabel (SQL audit confirm 0 tabel tanpa RLS)
- [ ] **CRITICAL #5 Fix:** `.env` tidak mengandung secrets, rotation selesai
- [ ] Coverage test ≥ 50% (terutama auth flows)
- [ ] Semua 5 CRITICAL vulnerabilities remediasi terverifikasi
- [ ] Security re-audit atau penetration testing pass
- [ ] Sentry error monitoring aktif dan captureError dipanggil

### 🔴 NO-GO Criteria (Keadaan Saat Ini)

- 🔴 5 CRITICAL vulnerabilities masih aktif
- 🔴 Cross-tenant privilege escalation bisa dieksploitasi
- 🔴 XSS + localStorage tokens = attack chain lengkap untuk account takeover
- 🔴 Multi-tenancy isolation dapat di-bypass dari client

---

## Timeline Overview

```
Week 1:    [PHASE 1] Critical Security Fixes (5 items, 3-4 dev-days)
           ██████████████████████████████ BLOCKING

Week 2-3:  [PHASE 2] Server-Side Security (RLS, CSP, cookies, rate limiting)
           ██████████████████████████████████████████████████

Week 3-4:  [PHASE 3] Error Handling & UX Gaps
           ██████████████████████████████████████

Week 5:    [PHASE 4] Accessibility (WCAG 2.1)
           ████████████████████████████████

Week 5-7:  [PHASE 5] Testing & QA Coverage
           ████████████████████████████████████████

Month 2-3: [PHASE 6] Feature Completion & Architecture
           ████████████████████████████████████████████████████████████
```

**Re-audit scheduled:** Setelah Phase 2 selesai (akhir Week 3) untuk verifikasi critical fixes.  
**Production deployment decision:** Setelah Phase 5 selesai (akhir Week 7).

---

## Risk Register

| Risk                                     | Likelihood | Impact   | Mitigation                        |
| ---------------------------------------- | ---------- | -------- | --------------------------------- |
| XSS eksploitasi sebelum fix              | MEDIUM     | CRITICAL | **Deploy fix Phase 1.2 hari ini** |
| Cross-tenant breach                      | LOW        | CRITICAL | **Deploy fix Phase 1.1 hari ini** |
| .env leaked ke internet                  | MEDIUM     | CRITICAL | **Rotate secrets segera**         |
| Offline quiz data loss                   | MEDIUM     | HIGH     | Phase 6.7 (background sync fix)   |
| Performance degradasi dengan 1000+ users | LOW        | HIGH     | Phase 6.9 + virtual scrolling     |
| WCAG compliance lawsuit                  | LOW        | HIGH     | Phase 4 (accessibility)           |

---

## Referensi Files Kritis

| Issue                                    | File                                                         | Line     |
| ---------------------------------------- | ------------------------------------------------------------ | -------- |
| Cross-tenant privilege escalation        | `src/components/guards/RoleGuard.tsx`                        | :27      |
| Stored XSS entry point                   | `src/features/gamification/components/CertificateViewer.tsx` | :16      |
| XSS sanitization utility (sudah ada)     | `src/utils/sanitize.ts`                                      | :3       |
| Global role checks                       | `src/features/auth/hooks/usePermissions.ts`                  | :11-13   |
| Auth token localStorage storage          | `src/features/auth/hooks/useLoginState.ts`                   | :143-146 |
| AI tutor session localStorage            | `src/features/ai-tutor/components/AITutorPanel.tsx`          | :131     |
| Signed progress queue localStorage       | `src/features/lessons/api/lessonService.ts`                  | :101     |
| Supabase client init                     | `src/services/supabase/client.ts`                            | :4-5     |
| Sentry integration (defined, not called) | `src/services/sentry.ts`                                     | :145     |
| Background sync (incomplete)             | `src/features/lessons/api/backgroundSync.ts`                 | -        |
