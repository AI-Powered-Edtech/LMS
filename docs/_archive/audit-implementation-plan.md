# Rencana Implementasi Temuan Audit EduSync LMS

> **Catatan Penting**: Dokumen ini hanya berisi tindakan untuk temuan yang **BENAR-BENAR VALID** setelah verifikasi terhadap codebase aktual. Temuan yang sudah ada atau merupakan false positive diabaikan.

---

## Daftar Isi

1. [Ringkasan Temuan Valid](#1-ringkasan-temuan-valid)
2. [P1: Tinggi Prioritas](#p1-tinggi-prioritas)
3. [P2: Sedang Prioritas](#p2-sedang-prioritas)
4. [Penjelasan Klaim yang Diabaikan](#4-penjelasan-klaim-yang-diabaikan)

---

## 1. Ringkasan Temuan Valid

| #   | Temuan                                  | Status Codebase                                     | Prioritas | Estimasi |
| --- | --------------------------------------- | --------------------------------------------------- | --------- | -------- |
| 1   | Tidak ada `eslint-plugin-jsx-a11y`      | **BENAR** — Tidak ada di package.json               | P1        | 1 hari   |
| 2   | Invite token exposed di URL query param | **BENAR** — Line 126: `?invite=${token}`            | P1        | 1 hari   |
| 3   | ScormPlayer tidak ada URL whitelist     | **BENAR** — fetch ke Supabase, tapi tanpa validasi  | P1        | 2 jam    |
| 4   | Tidak ada `/offline` route page         | **BENAR** — OfflineBanner ada, tapi tidak ada route | P2        | 4 jam    |

---

## 2. P1: Tinggi Prioritas

### STEP 1: Pasang eslint-plugin-jsx-a11y

**Prioritas**: P1 (TINGGI)  
**Estimated Effort**: 1 hari  
**Risk Level**: RENDAH — Tooling enhancement

**Alasan**: EduSync adalah LMS untuk sektor pendidikan yang tunduk pada regulasi accessibility (WCAG, Section 508). Tanpa linter, potensi pelanggaran a11y meningkat.

#### Step 1.1: Install Dependencies

```bash
cd /home/rog/Documents/edusync1/LMS
pnpm add -D eslint-plugin-jsx-a11y
```

#### Step 1.2: Update eslint.config.js

**File**: `eslint.config.js`

Tambahkan plugin jsx-a11y ke konfigurasi:

```javascript
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import eslintConfigPrettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y' // <- TAMBAHKAN

export default [
  {
    ignores: ['dist/', 'node_modules/', '_archive/', '*.config.*', 'coverage/', 'e2e/'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'simple-import-sort': simpleImportSort,
      'jsx-a11y': jsxA11y, // <- TAMBAHKAN
    },
    rules: {
      // ... existing rules ...

      // ─── Accessibility Rules ───────────────────────────────────────────
      // Critical: block build
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',

      // Important: warn initially
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-redundant-roles': 'warn',
    },
  },
  // ... remaining config ...
]
```

#### Step 1.3: Run Initial Audit

```bash
# Generate report tanpa fix
pnpm eslint src/ --ext .tsx,.ts --format stylish > a11y-audit.txt

# Lihat jumlah pelanggaran
wc -l a11y-audit.txt
```

#### Step 1.4: Verification Commands

```bash
# 1. Verify plugin installed
grep "eslint-plugin-jsx-a11y" package.json

# 2. Run lint
pnpm lint

# 3. Check for critical violations
pnpm eslint src/ --ext .tsx,.ts --rule 'jsx-a11y/alt-text:error' 2>&1 | head -20
```

---

### STEP 2: Perbaiki Invite Token Exposure

**Prioritas**: P1 (TINGGI)  
**Estimated Effort**: 1 hari  
**Risk Level**: SEDANG — Mengubah invite flow

**Alasan**: Token di URL query param berpotensi:

- Tersimpan di browser history
- Bocor via Referer header saat user klik link eksternal
- Terekspos saat user share link (misalnya di WhatsApp)

**File**: `src/features/administration/hooks/useUserManagementState.ts`  
**Line**: 126

#### Current Code (Line 126):

```typescript
const copyInviteLink = (token: string) => {
  const link = `${window.location.origin}/#/login?invite=${token}`
  navigator.clipboard.writeText(link)
}
```

#### Step 2.1: Ubah ke Format Path Parameter

Ganti URL query param menjadi path parameter:

```typescript
const copyInviteLink = (token: string) => {
  // Gunakan path parameter, bukan query param
  // Setelah perubahan, token tidak akan jadi ?invite=xxx tapi /invite/xxx
  const link = `${window.location.origin}/#/invite/${token}`
  navigator.clipboard.writeText(link)
}
```

#### Step 2.2: Buat Route untuk Invite Redemption

**File Baru**: `src/pages/InviteRedeem.tsx`

```typescript
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { FileInvitation, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { captureError } from '@/utils/sentry'
import { toast } from 'sonner'

export function InviteRedeem() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const supabase = useSupabaseClient()
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    const validateAndRedeem = async () => {
      try {
        // Validasi token via RPC
        const { data, error } = await supabase.rpc('validate_invite_token', {
          p_token: token
        })

        if (error || !data) {
          setStatus('invalid')
          return
        }

        // Check token status
        if (data.status === 'expired') {
          setStatus('expired')
          return
        }

        if (data.status === 'valid') {
          setStatus('valid')
          // Simpan invite data di sessionStorage (bukan URL)
          sessionStorage.setItem('invite_data', JSON.stringify({
            email: data.email,
            role: data.role,
            tenantId: data.tenant_id
          }))

          // Redirect ke password setup
          setTimeout(() => {
            navigate('/set-password')
          }, 1500)
        }
      } catch (error) {
        captureError(error, { context: 'invite-redeem', token: token.slice(0, 8) })
        setStatus('invalid')
      }
    }

    validateAndRedeem()
  }, [token, navigate, supabase])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-md px-4 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
            <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              Memvalidasi undangan...
            </h1>
          </>
        )}

        {status === 'valid' && (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              Undangan Valid!
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Mengarahkan ke halaman pengaturan password...
            </p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              Undangan Tidak Valid
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Link undangan tidak valid atau sudah digunakan.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 btn btn-primary"
            >
              Kembali ke Login
            </button>
          </>
        )}

        {status === 'expired' && (
          <>
            <FileInvitation className="mx-auto h-16 w-16 text-amber-500" />
            <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              Undangan Kedaluwarsa
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Link undangan sudah expired. Silakan minta undangan baru.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 btn btn-primary"
            >
              Kembali ke Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

#### Step 2.3: Tambah Route

**File**: `src/app/routes/sharedRoutes.tsx`

Tambahkan route untuk `/invite/:token`:

```typescript
// Import InviteRedeem di lazyPages.tsx atau langsung di sini
import { InviteRedeem } from '@/pages/InviteRedeem'

// Dalam route configuration:
{
  path: '/invite/:token',
  element: <InviteRedeem />,
}
```

#### Step 2.4: Buat RPC Function (Supabase)

**File**: `supabase/migrations/XXXX_add_validate_invite_token.sql`

```sql
CREATE OR REPLACE FUNCTION validate_invite_token(p_token TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path TO 'public'
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite RECORD;
  v_result JSONB;
BEGIN
  -- Find the invite by token
  SELECT
    ui.email,
    ui.role,
    ui.tenant_id,
    ui.expires_at,
    ui.used_at,
    ui.id
  INTO v_invite
  FROM user_invites ui
  WHERE ui.token = p_token AND ui.deleted_at IS NULL;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Token tidak valid'
    );
  END IF;

  -- Check if already used
  IF v_invite.used_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Token sudah digunakan'
    );
  END IF;

  -- Check expiration
  IF v_invite.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'status', 'expired',
      'message', 'Token sudah kedaluwarsa'
    );
  END IF;

  -- Token is valid
  RETURN jsonb_build_object(
    'status', 'valid',
    'email', v_invite.email,
    'role', v_invite.role,
    'tenant_id', v_invite.tenant_id
  );
END;
$$;
```

#### Step 2.5: Verification Commands

```bash
# 1. Generate test invite
# Buat user invite via admin UI

# 2. Check URL format
# Baru: app.com/#/invite/abc123def456
# Lama: app.com/#/login?invite=abc123def456

# 3. Verify token tidak di browser history setelah use
# Buka DevTools > Application > Session Storage
# Pastikan tidak ada token yang tersimpan

# 4. Test expired token
# Gunakan token yang sudah expired
# Expected: tampil halaman "Undangan Kedaluwarsa"

# 5. Test used token
# Gunakan token yang sudah digunakan sebelumnya
# Expected: tampil halaman "Undangan Tidak Valid"
```

---

### STEP 3: Add URL Whitelist Validation di ScormPlayer

**Prioritas**: P1 (TINGGI)  
**Estimated Effort**: 2 jam  
**Risk Level**: RENDAH — Security hardening

**Alasan**: Meskipun fetch hanya ke Supabase, validasi URL whitelist adalah best practice untuk mencegah SSRF jika konfigurasi berubah di masa depan.

**File**: `src/features/lessons/components/ScormPlayer.tsx`  
**Lines**: 284-302

#### Current Code:

```typescript
// Line 284-302
const sessionStr = localStorage.getItem(
  'sb-' + new URL(supabaseUrl).hostname.split('.')[0] + '-auth-token'
)
const accessToken = sessionStr ? JSON.parse(sessionStr)?.access_token : anonKey

try {
  fetch(`${supabaseUrl}/rest/v1/rpc/upsert_scorm_runtime`, {
    // ...
  })
} catch {
  // Best-effort
}
```

#### Updated Code:

```typescript
// Tambahkan whitelist validation
const ALLOWED_DOMAINS = ['supabase.co', 'supabase.in']

const validateScormUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname

    // Check if hostname ends with any allowed domain
    return ALLOWED_DOMAINS.some((domain) => hostname.endsWith(domain))
  } catch {
    return false
  }
}

const sessionStr = localStorage.getItem(
  'sb-' + new URL(supabaseUrl).hostname.split('.')[0] + '-auth-token'
)
const accessToken = sessionStr ? JSON.parse(sessionStr)?.access_token : anonKey

try {
  const scormApiUrl = `${supabaseUrl}/rest/v1/rpc/upsert_scorm_runtime`

  // Validate URL before fetch
  if (!validateScormUrl(scormApiUrl)) {
    console.error('[ScormPlayer] Blocked: Invalid API URL')
    return
  }

  fetch(scormApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${accessToken || anonKey}`,
    },
    body,
    keepalive: true,
  })
} catch (error) {
  // Best-effort — already logged above
  console.warn('[ScormPlayer] Failed to sync SCORM runtime:', error)
}
```

#### Verification Commands

```bash

# 1. Type check
pnpm typecheck

# 2. Build
pnpm build

# 3. Manual test
# Buka lesson dengan SCORM content
# Check Console untuk log validateScormUrl
```

---

## 3. P2: Sedang Prioritas

### STEP 4: Buat Offline Route Page

**Prioritas**: P2 (SEDANG)  
**Estimated Effort**: 4 jam  
**Risk Level**: RENDAH — User experience enhancement

**Alasan**:

- OfflineBanner sudah ada di UI
- Tapi tidak ada dedicated route `/offline` untuk PWA fallback
- Saat pengguna offline dan mengakses deep link yang tidak di-cache, mereka melihat error instead of helpful message

**Status**: Tidak ada di codebase saat ini — perlu dibuat baru

#### Step 4.1: Create Offline Page Component

**File Baru**: `src/pages/Offline.tsx`

```typescript
import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function Offline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const navigate = useNavigate()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload()
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <WifiOff className="h-12 w-12 text-gray-400 dark:text-gray-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Anda Sedang Offline
        </h1>

        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Halaman ini membutuhkan koneksi internet.
          Silakan periksa koneksi Anda dan coba lagi.
        </p>

        {/* Connection Status Indicator */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 dark:bg-gray-800">
          <div
            className={`h-3 w-3 rounded-full ${
              isOnline
                ? 'bg-green-500 animate-pulse'
                : 'bg-red-500'
            }`}
            aria-label={isOnline ? 'Online' : 'Offline'}
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isOnline ? 'Connection restored' : 'No connection'}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={handleRetry}
            disabled={!isOnline}
            variant="primary"
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isOnline ? 'animate-spin' : 'opacity-50'}`} />
            Coba Lagi
          </Button>

          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>

          <Button
            asChild
            variant="ghost"
            className="inline-flex items-center gap-2"
          >
            <Link to="/" className="inline-flex items-center gap-2">
              <Home className="h-4 w-4" />
              Beranda
            </Link>
          </Button>
        </div>

        {/* Tips for offline use */}
        <div className="mt-12 rounded-lg bg-blue-50 p-4 text-left dark:bg-blue-900/20">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Tips Menggunakan Offline
          </h3>
          <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Quiz yang sudah dimulai akan tersimpan otomatis</li>
            <li>• Lesson video yang sudah dimuat dapat ditonton offline</li>
            <li>• Tugas dapat ditulis offline dan disinkronkan saat online</li>
          </ul>
        </div>

        {/* Screen reader accessibility */}
        <p className="sr-only">
          Anda sedang offline. Hubungan internet Anda saat ini tidak aktif.
          {isOnline && ' Hubungan telah dipulihkan. Klik tombol Coba Lagi untuk memuat ulang halaman.'}
        </p>
      </div>
    </div>
  )
}
```

#### Step 4.2: Add Route Configuration

**File**: `src/app/routes/sharedRoutes.tsx`

```typescript
import { Offline } from '@/pages/Offline'

// Dalam route configuration:
{
  path: '/offline',
  element: <Offline />,
}
```

#### Step 4.3: Update PWA Config untuk Offline Fallback

**File**: `vite.config.ts`

Tambahkan ke workbox configuration:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  // ... existing manifest config ...
  workbox: {
    navigateFallback: '/offline', // <- TAMBAHKAN: fallback ke offline page
    navigateFallbackDenylist: [/^\/api/, /^\/auth/],
    // ... existing runtimeCaching ...
  },
})
```

#### Step 4.4: Verification Commands

```bash
# 1. Type check
pnpm typecheck

# 2. Build PWA
pnpm build

# 3. Test offline behavior
# - Buka DevTools > Network
# - Set "Offline"
# - Navigasi ke URL yang tidak di-cache
# Expected: Redirect ke /offline page

# 4. Test online detection
# - Enable network
# Expected: Banner berubah jadi "Connection restored"
```

---

## 4. Penjelasan Klaim yang Diabaikan

Berikut klaim dari audit yang **TIDAK PERLU ditindaklanjuti** karena sudah ada di codebase atau merupakan false positive:

| #   | Klaim Audit                   | Alasan Diabaikan                                                                                 |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | "XSS di env.schema.ts:41"     | **FALSE POSITIVE** — innerHTML menggunakan static string literal, tidak ada user-controlled data |
| 2   | "captureError() never called" | **FALSE** — captureError aktif digunakan di 30+ file                                             |
| 3   | "No 404 page"                 | **FALSE** — NotFound.tsx sudah ada di `src/pages/NotFound.tsx`                                   |
| 4   | "Empty catch blocks"          | **FALSE** — Hanya 3 catch blocks kosong, semua di build scripts (`scripts/`), bukan di app code  |
| 5   | "214 sanitizers"              | **FALSE** — Hanya 2 sanitizer functions,其余 adalah third-party (DOMPurify, rehype-sanitize)     |
| 6   | "10 accessibility hits"       | **FALSE** — 318 aria attributes ditemukan                                                        |
| 7   | "192 component files"         | **UNDERCOUNTED** — Sebenarnya 298 .tsx files                                                     |
| 8   | "165 E2E tests"               | **UNDERCOUNTED** — Sebenarnya ~909 tests di 34 spec files                                        |

---

## Priority Summary

### MUST FIX (P1 - Sebelum Launch)

| Step | Item                             | Effort | Status |
| ---- | -------------------------------- | ------ | ------ |
| 1    | Pasang eslint-plugin-jsx-a11y    | 1 hari | -      |
| 2    | Fix invite token URL exposure    | 1 hari | -      |
| 3    | Add URL whitelist di ScormPlayer | 2 jam  | -      |

### SHOULD FIX (P2 - Dalam 1 Minggu)

| Step | Item                        | Effort | Status |
| ---- | --------------------------- | ------ | ------ |
| 4    | Buat Offline page untuk PWA | 4 jam  | -      |

---

## Total Effort

- **P1 Total**: ~2 hari + 2 jam
- **P2 Total**: ~4 jam
- **Grand Total**: ~3 hari kerja

---

_Generated: 2026-03-29_
_Based on verified audit findings vs actual codebase_
