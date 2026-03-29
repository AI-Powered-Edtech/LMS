# EduSync LMS — Upgrade Guide

> Last reviewed: 2026-03-22

Panduan ini mendokumentasikan strategi upgrade untuk setiap dependency utama EduSync LMS.
Istilah teknis ditulis dalam bahasa Inggris; penjelasan dalam Bahasa Indonesia.

---

## React 19 → Future

### Fitur React 19 yang Aktif Digunakan

| Fitur                     | Lokasi                                       | Catatan                                                                            |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `React.lazy` + `Suspense` | `src/app/routes.tsx` — 45+ lazy page imports | Semua page-level routes di-lazy-load dengan `<Suspense fallback={<AppLoading />}>` |
| `useId`                   | `Modal.tsx`, `Select.tsx`, `Input.tsx`       | Untuk accessible label `id`/`htmlFor` pairing                                      |
| Concurrent rendering      | Seluruh app                                  | HashRouter berjalan di concurrent mode secara default                              |
| Automatic batching        | Seluruh app                                  | State updates di event handlers dan effects otomatis di-batch                      |
| `use` hook                | Belum digunakan                              | Tersedia untuk future adoption (promise/context reading)                           |
| Server Components         | Belum digunakan                              | Arsitektur Supabase-centric tidak memerlukan SSR saat ini                          |

### Class Components yang Masih Ada

EduSync memiliki 4 ErrorBoundary class components (satu-satunya pola yang membutuhkan class component di React):

- `src/components/ErrorBoundary.tsx`
- `src/components/common/ErrorBoundary.tsx`
- `src/components/FeatureErrorBoundary.tsx`
- `src/components/ui/ErrorBoundary.tsx`

**Tidak ada class component lain.** Semua ErrorBoundary sah karena React belum menyediakan hook equivalent untuk `componentDidCatch`.

### Catatan Migrasi ke React 20+

1. **Monitor React canary channel** — React team biasanya memberi peringatan 6-12 bulan sebelum deprecation
2. **ErrorBoundary** — Jika React 20 menambahkan `useErrorBoundary` hook, konsolidasikan 4 file ErrorBoundary menjadi 1 functional component
3. **`useEffect` cleanup** — Semua `useEffect` sudah menggunakan cleanup pattern (contoh: `setupPrefetchListeners()` di `App.tsx` mengembalikan cleanup function)
4. **StrictMode** — Pastikan semua side-effect idempotent (StrictMode double-invoke di development)
5. **Server Components** — Jika EduSync membutuhkan SSR di masa depan (SEO untuk halaman publik), siapkan migrasi ke React Server Components + framework seperti Next.js atau React Router v7 framework mode
6. **Compiler (React Forget)** — Monitor React Compiler untuk auto-memoization; jika stable, hapus manual `useMemo`/`useCallback` yang redundan
7. **`use()` hook** — Pertimbangkan adopsi untuk mengganti pola `useEffect` + state untuk data fetching (saat ini sudah ditangani oleh React Query)

### Risiko Migrasi: RENDAH

React team berkomitmen pada backward compatibility. Breaking changes biasanya minimal antar major version.

---

## Tailwind CSS v4 → Future

### Pendekatan Saat Ini

EduSync menggunakan **Tailwind CSS v4** dengan pendekatan CSS-first:

- **Tidak ada `tailwind.config.js`** — konfigurasi sepenuhnya di CSS
- **Design tokens** didefinisikan di `src/styles/tokens.css` sebagai CSS custom properties (`:root` dan `.dark`)
- **Token categories**: colors (primary/secondary/success/warning/danger/neutral), spacing, typography, shadows, border-radius, transitions, z-index scale
- **Dark mode** via `.dark` class atau `[data-theme="dark"]` attribute, dengan inverted color scales
- **Vite plugin**: `@tailwindcss/vite` (bukan PostCSS plugin) untuk performa build terbaik
- **`cn()` utility** di `src/utils/cn.ts` menggunakan `clsx` + `tailwind-merge` untuk conditional class merging

### Hal yang Perlu Diperhatikan untuk v5+

1. **`@theme` directive changes** — Monitor perubahan pada CSS-first config syntax
2. **Utility name stability** — Beberapa utility mungkin di-rename; jalankan codemod jika tersedia
3. **`tokens.css` compatibility** — Custom properties (CSS variables) adalah standard web dan kemungkinan besar tetap kompatibel
4. **`tailwind-merge` compatibility** — Library ini harus di-update bersamaan karena ia meng-parse Tailwind class names
5. **`@tailwindcss/vite` plugin** — Pastikan major version plugin sesuai dengan major version Tailwind
6. **Dark mode strategy** — Inverted color scale di `tokens.css` adalah pattern custom; pastikan tidak bertentangan dengan built-in dark mode Tailwind

### Risiko Migrasi: RENDAH-MENENGAH

Tailwind v4 sudah CSS-first, jadi migrasi ke v5 kemungkinan lebih mulus dibanding v3 ke v4. Namun, utility name changes bisa membutuhkan refactor di 155+ file yang menggunakan Tailwind classes.

---

## Supabase JS v2 → v3

### Penggunaan Saat Ini

- **Client singleton**: `src/services/supabase/client.ts`
- **Auth**: `AuthContext.tsx` menggunakan `supabase.auth.signInWithPassword`, `signUp`, `signOut`, `getSession`, `onAuthStateChange`, `resetPasswordForEmail`, `updateUser`
- **Auth patterns di pages**: `ForgotPassword.tsx`, `ResetPassword.tsx`, `VerifyEmail.tsx`
- **Database queries**: via `supabase.from()` dan `.rpc()` di semua service files
- **Realtime**: digunakan untuk notifications dan live features
- **Storage**: digunakan untuk document management

### Breaking Changes yang Perlu Diperhatikan

1. **Auth API** — `signInWithPassword` sudah digunakan (migrasi dari v1 `signIn` sudah selesai). v3 mungkin mengubah response shapes
2. **Realtime API** — Subscription API mungkin berubah (channel creation, filter syntax)
3. **Storage API** — Bucket access patterns dan signed URL generation mungkin berubah
4. **Type generation** — `supabase gen types` output mungkin berbeda; regenerasi diperlukan
5. **Error handling** — Error response format mungkin berubah
6. **`PostgrestFilterBuilder`** — Method chaining API mungkin berubah

### Checklist Sebelum Upgrade
