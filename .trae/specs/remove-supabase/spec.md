# Remove Supabase Spec

## Why
Pengguna ingin beralih dari menggunakan layanan pihak ketiga (Supabase) ke arsitektur backend lokal mandiri yang nantinya akan di-deploy ke VPS sendiri.

## What Changes
- Menghapus dependency `@supabase/supabase-js` dari `package.json`.
- Menghapus inisialisasi dan utilitas client Supabase (misalnya `src/services/supabase/client.ts`).
- **BREAKING**: Mengubah mekanisme Autentikasi (`AuthContext`, `useLoginState`, dll) agar memanggil endpoint REST API lokal standar, bukan SDK Supabase.
- Mengubah semua service fetching data (`apiService`, `courseService`, dll) agar mengambil data dari backend REST API lokal.
- Menghapus environment variable Supabase dari `.env` dan konfigurasi.

## Impact
- Affected specs: Sistem Autentikasi, Manajemen Sesi, CRUD Data (Database).
- Affected code: `package.json`, `src/contexts/AuthContext.tsx`, `src/features/auth/*`, `src/services/*`, `.env`.

## REMOVED Requirements
### Requirement: Integrasi Backend Supabase
**Reason**: Pengguna tidak lagi menggunakan layanan cloud Supabase dan beralih ke backend lokal VPS.
**Migration**: Seluruh panggilan `supabase.auth` dan `supabase.from()` harus digantikan dengan HTTP request (misalnya menggunakan `fetch` atau `axios`) ke URL backend lokal.
