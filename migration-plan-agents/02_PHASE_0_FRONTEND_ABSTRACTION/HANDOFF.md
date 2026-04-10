# Phase 0 Handoff Status

Dokumen ini menggambarkan status aktual Phase 0 setelah Phase 1 dan Phase 2 mulai berjalan. Tujuannya bukan lagi "handoff ke Phase 1" dalam arti perencanaan, tetapi menjadi referensi tentang abstraction layer apa yang memang sudah hidup di codebase dan apa yang masih berupa deferred hardening.

---

## Status Aktual per 2026-04-11

### Yang Sudah Masuk

| Area | Status | Catatan |
| --- | --- | --- |
| API client abstraction | ✅ | `src/services/api/` sudah menjadi jalur utama runtime switching |
| Auth abstraction | ✅ | `src/services/auth/` aktif, dan mode `vil` sekarang usable |
| Realtime abstraction | ✅ | Interface + provider switching sudah ada |
| Storage abstraction | ✅ | Interface + provider switching sudah ada |
| Frontend wiring | ✅ | `VITE_API_BACKEND` mengendalikan provider aktif |
| Feature service refactor | ✅ | Service layer domain utama sudah diarahkan ke abstraction layer |

### Artefak Kunci

```text
src/services/api/
src/services/auth/
src/services/realtime/
src/services/storage/
src/services/supabase/client.ts
src/services/api/runtime.ts
src/main.tsx
```

---

## Exit State yang Benar

### Sudah Terbukti

- `getApiClient()`, `getAuthProvider()`, `getRealtimeProvider()`, dan `getStorageProvider()` sudah menjadi abstraction boundary yang dipakai runtime
- Mode `supabase` tetap berjalan lewat provider asli
- Mode `vil` sekarang tidak lagi hanya stub untuk API/Auth utama
- Import ke `@/services/supabase/client` masih ada di service layer kompatibilitas, tetapi client itu sendiri sekarang menjadi facade yang mengarah ke backend aktif

### Belum Tertutup Penuh

- Compatibility contract freeze (`0E`) masih deferred
- Direct dependency CI guard (`0F`) belum dianggap final
- Verification Phase 0 (`0G`) belum bisa dinyatakan hijau total karena full repo `pnpm typecheck`, `pnpm lint`, dan `pnpm build` masih terpengaruh debt pre-existing di area non-migration

---

## Dampak ke Phase Berikutnya

Phase 0 berhasil menyiapkan fondasi yang dipakai langsung oleh Phase 1 dan Phase 2:

1. `vilAuthProvider` bisa diisi tanpa memecah `AuthContext`
2. `vilApiClient` dan facade `supabase` bisa mengambil alih sebagian besar query/RPC tanpa refactor UI massal kedua
3. Realtime dan storage tetap bisa ditunda ke phase berikutnya tanpa mengulang abstraction work

---

## Known Gaps

- Realtime runtime migration belum dikerjakan
- Storage runtime migration belum dikerjakan
- Edge Function migration tetap berada di phase berikutnya
- Full repo verification masih tertahan oleh debt lama di luar migration slice

---

## File Fokus Lanjutan

| File | Peran |
| --- | --- |
| `src/services/api/apiClient.ts` | Registry client aktif |
| `src/services/api/runtime.ts` | Source of truth backend mode aktif |
| `src/services/api/vilApiClient.ts` | Implementasi VIL query/RPC |
| `src/services/auth/vilAuthProvider.ts` | Implementasi auth VIL |
| `src/services/supabase/client.ts` | Facade kompatibilitas ke provider aktif |

---

## Kesimpulan

Phase 0 bisa dianggap **implemented and in use**, tetapi belum **verification-complete**. Nilai Phase 0 sekarang adalah abstraction boundary yang sudah terbukti cukup stabil untuk membawa Phase 1 auth dan Phase 2 CRUD masuk ke mode `vil`.
