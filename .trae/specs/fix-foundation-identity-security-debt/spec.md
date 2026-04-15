# Layer 1 — Foundation Fix (Identity, Security, Debt) Spec

## Why

Fondasi multi-tenant saat ini belum konsisten end-to-end (token, role, tenant switch), ada celah security yang masih longgar, dan beberapa debt teknis menghambat iterasi Layer 2/3.

## What Changes

- Backend login mengembalikan seluruh membership (tenant + role) user, bukan hasil `LIMIT 1`.
- Token akses selalu merepresentasikan `active_tenant` secara eksplisit (menggunakan claim `tenant_id` sebagai active tenant).
- Tenant switch menghasilkan token/session baru (mint token baru).
- Frontend menghapus fallback `activeRole ?? role` dan menjadikan `activeRole` sumber kebenaran untuk layout + sidebar.
- **BREAKING** Backend hard-fail bila `JWT_SECRET` tidak ada atau < 32 karakter.
- Observability `observer(true)` hanya aktif bila `ENABLE_OBSERVER=true`.
- Menghapus log sensitif user state di AuthContext.
- `TooManyRequests` mengembalikan HTTP 429 (bukan 400).
- Debt cleanup: hapus komentar legacy “Supabase”, ignore + keluarkan `.pnpm-store/` dari repo, ganti `db: any` menjadi facade bertipe, dan hilangkan UUID fallback berbasis `Math.random()`.

## Impact

- Affected specs: multi-tenant identity, session/token model, tenant switching, RBAC enforcement, observability gates, rate limiting behavior, typed DB facade.
- Affected code:
  - Backend: [login.rs](file:///workspace/edusync-api/crates/api-server/src/auth/login.rs), [bootstrap.rs](file:///workspace/edusync-api/crates/api-server/src/auth/bootstrap.rs), [main.rs](file:///workspace/edusync-api/crates/api-server/src/main.rs), [extractors.rs](file:///workspace/edusync-api/crates/api-server/src/extractors.rs), [jwt.rs](file:///workspace/edusync-api/crates/auth/src/jwt.rs), [session.rs](file:///workspace/edusync-api/crates/auth/src/session.rs)
  - Frontend: [AuthContext.tsx](file:///workspace/src/contexts/AuthContext.tsx), [Layout.tsx](file:///workspace/src/components/layout/Layout.tsx), [Sidebar.tsx](file:///workspace/src/components/layout/Sidebar.tsx), [useSessionManagement.ts](file:///workspace/src/contexts/auth/useSessionManagement.ts), [db/index.ts](file:///workspace/src/services/db/index.ts)
  - Repo hygiene: `.gitignore`, root `.pnpm-store/`

## ADDED Requirements

### Requirement: Login Mengembalikan Membership Lengkap

Sistem SHALL mengembalikan daftar tenant+role yang dimiliki user pada response login (tanpa `LIMIT 1`), sehingga frontend dapat mengetahui seluruh akses workspace user secara deterministik.

#### Scenario: Login sukses dengan multi-tenant

- **WHEN** user berhasil login
- **THEN** response berisi `memberships[]` yang mencakup semua tenant aktif yang dimiliki user (tenant_id + role + status minimal)
- **AND** response berisi `active_tenant_id` yang dipakai untuk mint access token

#### Scenario: Login user tanpa membership aktif

- **WHEN** user berhasil memverifikasi kredensial tetapi tidak memiliki membership workspace yang aktif
- **THEN** server mengembalikan error yang jelas (mis. 403) dan tidak menerbitkan token akses

### Requirement: Token Merepresentasikan Active Tenant

Sistem SHALL menerbitkan access token yang selalu memiliki claim tenant aktif secara eksplisit.

Ketentuan:

- Claim `tenant_id` pada JWT diperlakukan sebagai `active_tenant_id`.
- Access token SHALL memuat `role` yang sesuai dengan role user pada `active_tenant_id`.
- Request API yang memerlukan tenant context SHALL menolak token tanpa claim `tenant_id`.

#### Scenario: Token issued pada login

- **WHEN** login berhasil
- **THEN** access token berisi `tenant_id = active_tenant_id` dan `role` sesuai membership pada tenant tersebut

### Requirement: Tenant Switch Mint Token Baru

Sistem SHALL menyediakan mekanisme untuk mengganti active tenant yang menghasilkan token/session baru (mint token baru) agar seluruh request setelah switch konsisten dengan tenant yang dipilih.

Ketentuan:

- Backend menyediakan endpoint `POST /api/v1/auth/switch-tenant`.
- Endpoint menerima `tenant_id` target, memverifikasi user memiliki membership aktif pada tenant tersebut, lalu mengembalikan access/refresh token baru.
- Endpoint SHALL menolak tenant yang tidak aktif atau tenant yang tidak dimiliki user.

#### Scenario: Switch tenant sukses

- **WHEN** user memilih tenant lain yang valid
- **THEN** server mengembalikan token baru dengan claim `tenant_id` sesuai tenant baru dan `role` sesuai membership tenant tersebut

### Requirement: Frontend Menggunakan Active Role Tanpa Fallback

Frontend SHALL menggunakan `activeRole` sebagai sumber kebenaran untuk:

- pemilihan layout utama
- visibilitas item sidebar dan fitur yang role-scoped

Ketentuan:

- Frontend SHALL menghapus fallback `activeRole ?? role`.
- Pada kondisi `activeRole` belum tersedia (mis. bootstrap belum selesai atau activeTenant belum resolved), UI SHALL berada pada state yang aman (mis. loading / skeleton / screen selection) dan tidak merender layout role yang salah.

#### Scenario: Startup setelah reload

- **WHEN** halaman di-reload dan bootstrap masih berjalan
- **THEN** aplikasi tidak menampilkan layout yang salah karena fallback role global

## MODIFIED Requirements

### Requirement: Hardening Security Konfigurasi Runtime

Sistem SHALL hard-fail saat startup bila `JWT_SECRET`:

- tidak terdefinisi, atau
- panjangnya < 32 karakter.

Catatan:

- Ini adalah **BREAKING** untuk environment dev yang sebelumnya mengandalkan default secret.

### Requirement: Observability Gate untuk Observer

Sistem SHALL mengaktifkan `observer(true)` hanya bila `ENABLE_OBSERVER=true` (case-insensitive; juga menerima `1`/`yes`).

### Requirement: Rate Limit Menggunakan Status 429

Sistem SHALL memetakan error `TooManyRequests` menjadi HTTP status code 429.

Ketentuan:

- Brute force lock pada login SHALL mengembalikan 429.
- Konversi `AuthError::TooManyRequests` di layer API server SHALL mengembalikan 429.

## REMOVED Requirements

### Requirement: Komentar Legacy “Supabase” di Kode

**Reason**: referensi Supabase di komentar sudah tidak relevan dan mengaburkan arsitektur VIL.
**Migration**: hapus komentar tanpa mengubah behavior runtime.
