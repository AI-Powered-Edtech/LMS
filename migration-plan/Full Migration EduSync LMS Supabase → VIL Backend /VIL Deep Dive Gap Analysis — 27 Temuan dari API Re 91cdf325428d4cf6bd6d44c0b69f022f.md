# VIL Deep Dive Gap Analysis — 27 Temuan dari API Reference

<aside>
🔬

**27 gap tambahan** ditemukan setelah deep dive ke VIL API Reference lengkap. Plan saat ini hanya memanfaatkan ~30% dari VIL capabilities. Total effort bisa turun **~167 jam** (bukan 50) jika semua built-in digunakan.

</aside>

---

## 🔴 P0 — Fix Segera

### #25. Phase 0 ApiClient: `useApiClient` di service files AKAN GAGAL

**Status:** ⚠️ Sudah di-fix di Agent Task Queue (singleton pattern), tapi Phase 0 detail page MASIH menunjukkan `useApiClient` hook pattern.

**Action:** Update Phase 0 detail page — semua references ke `useApiClient` harus jadi `getApiClient()`.

### #26. BrowserRouter vs Hash Routing Inkonsistensi

**Temuan:** `App.tsx` menggunakan `BrowserRouter`, tapi `AGENTS.md` + `CLAUDE.md` claim hash routing `/#/`.

**Analisis:** Ini kemungkinan **inkonsistensi dokumentasi di codebase EduSync**, bukan di plan migrasi. Yang penting untuk VIL: `useSessionManagement.ts` OAuth callback menggunakan `window.location.pathname` (path-based). VIL harus handle path routing untuk auth callback.

**Action:** Verifikasi routing strategy dengan cek routes.tsx. Untuk plan: **gunakan path routing** sebagai asumsi karena `BrowserRouter` adalah kode aktual.

### #7. CSRF Protection — Tidak Ada di Plan

**VIL Built-in:** `CsrfProtection` dengan double-submit cookie pattern, exempt paths.

**Action:** Tambahkan ke Phase 1 security:

```rust
use vil_server::auth::csrf::{CsrfConfig, CsrfProtection};
let csrf = CsrfProtection::new(
    CsrfConfig::new()
        .exempt_path("/api/v1/auth/login")
        .exempt_path("/api/v1/auth/register")
        .exempt_path("/api/v1/lti/launch")  // LTI uses form POST
        .exempt_path("/api/v1/health")
);
```

### #4. BruteForce Protection — Missing dari Auth

**VIL Built-in:** `BruteForceProtection` track failed attempts per-IP/per-account dengan lockout.

**Action:** Tambahkan ke Phase 1B setelah RateLimit:

```rust
use vil_server::auth::security::BruteForceProtection;
let brute_force = BruteForceProtection::new()
    .max_attempts(5)
    .lockout_duration(Duration::from_secs(900)); // 15 min lockout
```

### #27. `vite-env.d.ts` belum ada `VITE_API_BACKEND`

**Status:** Sudah ada di Agent Task Queue (Task 0A-7), tapi belum di-execute.

**Action:** Execute Task 0A-7 sebagai bagian dari Phase 0 Week 1.

---

## 🟡 P1 — Update Phase 1-4

### #1. `OAuth2Client` Built-in untuk Google OAuth

**VIL Built-in:** `vil_server_auth::oauth2::OAuth2Client` — authorization URL, token exchange, OIDC claims.

**Hemat:** ~12 jam dari Phase 1B task #5 (sebelumnya 2 hari → 0.5 hari).

**Action:** Update Phase 1B #5 dan Bootstrap Context.

### #2. `IdempotencyStore` Built-in untuk Offline Queue

**VIL Built-in:** `IdempotencyStore` (24h TTL, 10K max, `Idempotency-Key` header).

**Hemat:** ~8 jam dari CC6 custom implementation.

**Action:** Update CC6 — gunakan VIL `IdempotencyStore` sebagai server-side dedup.

### #3. `FeatureFlags` Built-in untuk Per-Feature Cutover

**VIL Built-in:** `FeatureFlags` dengan percentage rollout + per-tenant.

**Hemat:** ~10 jam.

**Action:** Update Phase 2 rollback strategy + CC8 per-flow cutover — gunakan VIL `FeatureFlags`.

### #5. `AuditLog` Built-in untuk Privileged Operations

**VIL Built-in:** `AuditLog` dengan `.record()` dan `.recent()`.

**Hemat:** ~6 jam dari CC8 manual audit log.

**Action:** Update CC8 privileged operations — gunakan VIL `AuditLog`.

### #6. `SessionManager` Built-in

**VIL Built-in:** Cookie-based sessions, TTL, HttpOnly, SameSite.

**Hemat:** ~4 jam dari Phase 1B #4.

**Action:** Evaluate: kombinasi JWT (stateless) + SessionManager (stateful refresh tokens).

### #8. `Valid<T>` Request Validation

**VIL Built-in:** Auto-validate via `validator` crate.

**Hemat:** ~15 jam across Phase 2-3 (167 endpoints).

**Action:** Update Bootstrap Context — semua handler struct pakai `#[derive(Validate)]` + `Valid<T>` extractor.

### #9. `Scheduler` vs `vil_trigger_cron`

**VIL Built-in:** Lightweight `Scheduler` untuk simple recurring tasks.

**Action:** Update Phase 3E — use `Scheduler` untuk simple jobs (cleanup, flush), `vil_trigger_cron` untuk complex cron.

### #10. `VilWsEvent` + `WsHub` untuk Realtime

**Status:** Sudah ada di Bootstrap Context tapi tidak referenced di Phase 4 detail.

**Action:** Update Phase 4 detail — explicit reference ke `VilWsEvent` derive macro.

### #13. `Cache<K,V>` untuk Hot Data

**VIL Built-in:** LRU + TTL cache, `ShmCacheBackend` untuk zero-copy.

**Hemat:** ~8 jam.

**Action:** Tambahkan caching strategy ke Phase 2:

- Course catalog: `Cache` dengan 5 min TTL
- User profiles + roles: per-session cache
- Tenant settings: `Cache` dengan 15 min TTL
- Quiz questions: immutable cache during attempt

### #14. Tri-Lane Mesh — Leverage Properly

**Temuan:** Plan menyebut Tri-Lane tapi hanya di arsitektur diagram. Harus digunakan aktif.

**Action:** Update CC7 Worker Architecture:

- Quiz grading: receive via **Data Lane** (VIL `Visibility::Internal`)
- Notification fanout: via **Control Lane** (backpressure-aware)
- Analytics refresh: via **Trigger Lane**

### #15. `DeadLetterQueue` Built-in

**VIL Built-in:** `.enqueue()`, `.recent()`, `.mark_replayed()` di mesh.

**Hemat:** ~4 jam — hapus custom `dead_letter_jobs` table dari plan.

**Action:** Update CC7 — gunakan VIL mesh DLQ instead of custom table.

### #16. `EventBus` untuk In-Process Pub/Sub

**VIL Built-in:** Topic-based pub/sub.

**Action:** Tambahkan event-driven pattern:

- `quiz.submitted` → trigger grading + update progress + send notification
- `lesson.completed` → award XP + check streaks + update progress

---

## 🟠 P2 — Operasional & Optimization

### #11. `VilEntity` DB Semantic Layer

**VIL Built-in:** Compile-time table/field validation, provider-neutral CRUD.

**Action:** Evaluate di Phase 2 — jika boilerplate terlalu banyak dengan raw `sqlx::FromRow`, switch ke `VilEntity`.

### #12. `MultiPoolManager` untuk Per-Service DB Pools

**VIL Built-in:** Dedicated pool per-service.

**Action:** Tambahkan ke Phase 2 optimization:

- `default` pool: general CRUD (50 connections)
- `analytics` pool: heavy aggregation reads (20 connections)
- `grading` pool: quiz grading writes (10 connections)

### #17. Rust Compile Time Impact pada CI/CD

**Temuan:** Fresh VIL build bisa 15-30 menit.

**Action:** Tambahkan CC9 — Rust CI/CD Strategy:

- Multi-stage Docker builds
- `cargo-chef` untuk dependency caching
- `sccache` untuk shared compilation cache
- Incremental builds for dev
- Build matrix: test on PR, release on merge to main

### #18. Binary Size & Deployment

**Action:** Tambahkan ke Phase 6 deployment:

- `--profile release-lto` untuk production binary
- Docker: `distroless` base image (smallest)
- Binary size target: <50MB

### #19. Graceful Shutdown

**VIL Built-in:** `RestartCoordinator::start_drain()` + `.wait_for_drain()`.

**Action:** Tambahkan ke Phase 1A scaffold — kritis untuk in-flight quiz submissions.

### #20. VIL Profiles (dev/staging/prod)

**Status:** Sudah di [main.rs](http://main.rs) example (`.profile("prod")`) tapi tidak explained.

**Action:** Tambahkan ke Bootstrap Context — explain 3 profiles dan auto-tuned settings.

### #21. `OpenApiBuilder` API Documentation

**VIL Built-in:** Auto-generate OpenAPI spec.

**Action:** Tambahkan ke Phase 2 — generate OpenAPI spec untuk frontend team.

### #22. `/admin/playground` API Explorer

**VIL Built-in:** Embedded API explorer.

**Action:** Enable during development — sangat berguna for testing migrated endpoints.

### #23. `TestClient` + `BenchRunner`

**Status:** Sudah di Bootstrap Context Section 11 tapi not referenced di Phase detail.

**Action:** Update Phase 1D dan 2 verification — use `TestClient` for integration tests (faster than k6).

---

## 📊 Revised Effort Summary

| **VIL Built-in**               | **Hemat dari**          | **Estimasi Hemat** |
| ------------------------------ | ----------------------- | ------------------ |
| JwtAuth, RateLimit, RbacPolicy | ✅ Sudah dihitung       | ~20 jam            |
| SseCollect, CircuitBreaker     | ✅ Sudah dihitung       | ~30 jam            |
| OAuth2Client                   | OAuth PKCE manual       | ~12 jam            |
| IdempotencyStore               | CC6 custom idempotency  | ~8 jam             |
| FeatureFlags                   | Per-feature flag system | ~10 jam            |
| BruteForceProtection           | Auth hardening          | ~4 jam             |
| AuditLog                       | Activity logging        | ~6 jam             |
| CsrfProtection                 | Security layer          | ~4 jam             |
| Valid<T>                       | Request validation      | ~15 jam            |
| VilWsEvent + WsHub             | Realtime port           | ~12 jam            |
| Scheduler                      | Simple cron jobs        | ~4 jam             |
| Cache<K,V>                     | DB query caching        | ~8 jam             |
| DeadLetterQueue                | CC7 custom DLQ          | ~4 jam             |
| TestClient + BenchRunner       | Integration testing     | ~10 jam            |
| EventBus                       | Event propagation       | ~6 jam             |
| MultiPoolManager               | DB isolation            | ~4 jam             |
| OpenApiBuilder + playground    | API docs                | ~6 jam             |
| SessionManager                 | Session management      | ~4 jam             |
| **Total**                      |                         | **~167 jam**       |

**Revised timeline:** ~1,020 - 167 = **~853 jam** → bisa ~60 minggu (15 bulan) instead of 72 minggu.

---

## Catatan tentang #26 (BrowserRouter)

`App.tsx` memang import `BrowserRouter as Router`, tapi EduSync juga punya di `AGENTS.md`:

> **Routing:** Hash routing — semua URL pakai `/#/` prefix

Ini kemungkinan **inkonsistensi dokumentasi di codebase EduSync sendiri** (React Router v7 aliased import). Yang penting untuk VIL migration:

- OAuth callback: `window.location.pathname === '/auth/callback'` → **path-based** ✅
- VIL reverse proxy harus handle **path-based routes**
- Plan references ke "hash routing" harus di-verify — beberapa mungkin perlu diubah ke path routing

**Rekomendasi:** Verifikasi dengan `grep -r 'HashRouter\|createHashRouter' src/` apakah ada hash router di codebase. Jika tidak ada → semua references ke `/#/` di plan harus diubah ke path routing.

[Wave 2 — P1 VIL Built-in Substitutions (13 Items)](<VIL%20Deep%20Dive%20Gap%20Analysis%20%E2%80%94%2027%20Temuan%20dari%20API%20Re/Wave%202%20%E2%80%94%20P1%20VIL%20Built-in%20Substitutions%20(13%20Items)%2053558aab99e045b192b2760b462ba9ab.md>)

[Wave 3 — P2 Operational & Optimization (9 Items)](<VIL%20Deep%20Dive%20Gap%20Analysis%20%E2%80%94%2027%20Temuan%20dari%20API%20Re/Wave%203%20%E2%80%94%20P2%20Operational%20&%20Optimization%20(9%20Items)%209f97dc53d38040d18925507a363a0590.md>)
