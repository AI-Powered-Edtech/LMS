# Tasks

- [ ] Task 1: Identity Model End-to-End (backend + frontend)
  - [ ] SubTask 1.1: Backend — ubah login agar mengambil semua membership tenant+role (tanpa `LIMIT 1`) dan menentukan `active_tenant_id` yang valid.
  - [ ] SubTask 1.2: Backend — pastikan access token selalu berisi claim `tenant_id` (active tenant) dan `role` sesuai membership tenant tersebut.
  - [ ] SubTask 1.3: Backend — buat endpoint `POST /api/v1/auth/switch-tenant` untuk mint token baru ketika tenant berubah.
  - [ ] SubTask 1.4: Frontend — wiring tenant switch: panggil endpoint switch-tenant, simpan session/token baru ke auth provider, dan refresh bootstrap bila perlu.
  - [ ] SubTask 1.5: Frontend — hapus fallback `activeRole ?? role` di layout + sidebar; pastikan ada safe-state saat `activeRole` belum resolved.
  - [ ] SubTask 1.6: Validasi — tambah/ubah test untuk login response shape, switch-tenant, serta unit/integration test untuk layout/sidebar role gating.

- [ ] Task 2: Security Hardening
  - [ ] SubTask 2.1: Backend — `main.rs` hard-fail bila `JWT_SECRET` tidak ada atau < 32 karakter; sinkronkan `.env.example` bila diperlukan.
  - [ ] SubTask 2.2: Backend — gate `observer(true)` dengan env `ENABLE_OBSERVER=true`.
  - [ ] SubTask 2.3: Frontend — hapus log user state (`console.log`) di AuthContext dan pastikan tidak ada log sensitif serupa.
  - [ ] SubTask 2.4: Backend — `TooManyRequests` harus 429 (brute-force lock login + konversi error di extractors).
  - [ ] SubTask 2.5: Validasi — jalankan test suite backend+frontend, dan pastikan tidak ada perilaku regresi pada auth bootstrap.

- [ ] Task 3: Debt Cleanup
  - [ ] SubTask 3.1: Hapus seluruh komentar legacy “Supabase” yang tersisa di kode (frontend/backend).
  - [ ] SubTask 3.2: Repo hygiene — hapus folder `.pnpm-store/` dari repo dan tambahkan ke `.gitignore`.
  - [ ] SubTask 3.3: Typed DB facade — ganti `db: any` menjadi facade bertipe (gunakan type `ApiClient`/`ApiQueryBuilder` yang sudah ada), tanpa mengubah call sites secara masif.
  - [ ] SubTask 3.4: Fix UUID fallback — hilangkan UUID berbasis `Math.random()` dan gunakan generator yang aman (mis. `crypto.randomUUID()` atau util yang sudah tersedia).
  - [ ] SubTask 3.5: Validasi — lint/typecheck, dan tambahkan/ubah unit test bila diperlukan untuk memastikan facade db bertipe tidak mengubah behavior.

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
