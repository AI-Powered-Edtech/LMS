# Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru

<aside>
🚨

**15 gap tambahan** ditemukan dari analisis mendalam VIL GitHub repo + ROADMAP + operational requirements. Total effort bisa naik **+176-266 jam** (853 → ~1,030-1,120 jam, ~70-75 minggu). Setiap gap punya severity, action, dan target phase.

</aside>

---

## Status Tracker

| **#** | **Severity** | **Gap**                                   | **Effort Impact** | **Target Phase**   | **Status** |
| ----- | ------------ | ----------------------------------------- | ----------------- | ------------------ | ---------- |
| 1     | 🔴           | PostgREST Query Builder Replacement       | +100-150 jam      | Phase 0A + Phase 2 | ⬜         |
| 2     | 🔴           | Password Reset / Forgot Password Flow     | +12-16 jam        | Phase 1B           | ⬜         |
| 3     | 🔴           | Supabase `auth.*` SQL Functions Migration | +20-30 jam        | Phase 1A + Phase 6 | ⬜         |
| 4     | 🔴           | VIL Multi-Tenancy NOT Open-Source         | +0 jam (doc)      | Phase 1C           | ⬜         |
| 5     | 🟡           | PostgreSQL Extension Audit                | +8-16 jam         | Phase 0            | ⬜         |
| 6     | 🟡           | Email Template Migration                  | +8-12 jam         | Phase 1B           | ⬜         |
| 7     | 🟡           | Connection Pooling (PgBouncer)            | +4-8 jam          | Phase 1A           | ⬜         |
| 8     | 🟡           | `vil_trigger_cdc` untuk Realtime          | +0 jam (eval)     | Phase 4            | ⬜         |
| 9     | 🟡           | Deployment Architecture                   | +20-30 jam        | Phase 1A           | ⬜         |
| 10    | 🟡           | Database Backup & Disaster Recovery       | +8-12 jam         | Phase 6            | ⬜         |
| 11    | 🟡           | VIL Version Pinning & Stability           | +0 jam (policy)   | Phase 1A           | ⬜         |
| 12    | 🟠           | Horizontal Scaling & WS Sticky Sessions   | +0 jam (future)   | Post-Phase 6       | ⬜         |
| 13    | 🟠           | Storage URL Migration Detail              | +0 jam (in scope) | Phase 5            | ⬜         |
| 14    | 🟠           | Server-Side Logging & Error Tracking      | +4-8 jam          | Phase 1A           | ⬜         |
| 15    | 🟠           | Integration Test Environment Detail       | +0 jam (in scope) | CC3                | ⬜         |

---

# 🔴 P0 — Kritikal

## 1. PostgREST Query Builder Replacement

**Impact:** +100-150 jam — ini gap scope terbesar di seluruh plan

**Masalah:** Plan menghitung "167 RPCs" untuk Phase 2, tapi 117+ files juga pakai `supabase.from('table').select().eq().order()` — ini bukan RPC, ini PostgREST query builder chains. VIL tidak punya PostgREST equivalent.

**KEPUTUSAN YANG HARUS DIBUAT (Phase 0A):**

**Opsi A: Per-resource REST endpoints (DIREKOMENDASIKAN)**

- Setiap `.from('courses').select().eq('tenant_id', tid)` → `GET /api/v1/courses?tenant_id=tid`
- Frontend `VilApiClient.from('courses')` translate ke REST calls
- VIL side: typed Rust handlers per table/resource
- Pro: Cleanest, most maintainable, type-safe
- Con: More upfront boilerplate (tapi `VilEntity` di Wave 3 bisa kurangi)

**Opsi B: Generic query proxy**

- Build PostgREST-compatible proxy di VIL yang translate query params ke `sqlx`
- Frontend stays almost identical
- Pro: Minimal frontend changes
- Con: Meniru PostgREST = complex, defeats purpose of moving off Supabase

**Opsi C: Hybrid**

- Simple CRUD via generic endpoints (`GET/POST/PUT/DELETE /api/v1/{table}`)
- Complex queries via dedicated handlers
- Pro: Balanced
- Con: Two patterns to maintain

**Rekomendasi:** Opsi A. Ini lebih effort upfront tapi menghasilkan arsitektur paling bersih. `VilEntity` auto-CRUD dari Wave 3 bisa offset sebagian besar boilerplate.

**Action:** Tambahkan design decision task ke Phase 0A Week 1. Ini mempengaruhi SELURUH scope Phase 2.

### KEPUTUSAN FINAL: Opsi A — Per-Resource REST Endpoints ✅

<aside>
✅

**Opsi A dipilih.** Per-resource typed REST endpoints di VIL. Opsi B (generic proxy) ditolak karena security risk + effort ≈ Opsi A tanpa type safety. Opsi C (hybrid) ditolak karena cognitive overhead 2 pattern.

</aside>

**Opsi B verdict:** ❌ Jangan pilih. Effort re-implement PostgREST query parser (~80-100 jam) ≈ effort Opsi A, tapi tanpa compile-time type safety dan dengan SQL injection surface area lebih besar. Defeats entire purpose of moving off Supabase.

**Opsi C verdict:** ⚠️ Acceptable tapi suboptimal. Dua pattern di codebase = cognitive overhead. Frontend harus tahu kapan pakai generic vs custom = coupling.

**Effort breakdown Opsi A:**

- ~35 resources × ~3-4 jam/resource = **~105-140 jam**
- Offset: `VilEntity` auto-CRUD (Wave 3 #1) bisa hemat ~30-40 jam setelah Phase 2 Batch 1
- Offset: `Valid<T>` request validation (Wave 2 #6) hemat ~15 jam
- Offset: `OpenApiBuilder` (Wave 3 #7) auto-generate docs
- **Net additional after offsets: ~60-85 jam**

**Boilerplate reducer — Rust macro pattern:**

```rust
// Macro untuk repetitive CRUD (bisa dibuat di Phase 2 Batch 1)
macro_rules! vil_resource {
    ($Model:ty, $table:expr, $prefix:expr) => {
        // Auto-generates:
        // GET  $prefix          → list (with query params: tenant_id, filters, order, pagination)
        // GET  $prefix/:id      → get by id
        // POST $prefix          → create
        // PUT  $prefix/:id      → update
        // DELETE $prefix/:id    → delete
        // All with TenantGuard + RbacGuard + Valid<T>
    }
}

vil_resource!(Course, "courses", "/api/v1/courses");
vil_resource!(Lesson, "lessons", "/api/v1/lessons");
vil_resource!(Class, "classes", "/api/v1/classes");
// ... ~35 resources
```

**Frontend `VilApiClient.from()` translation layer:**

```tsx
// VilApiClient translates Supabase-style chaining to REST query params
class VilQueryBuilder<T> {
  private params = new URLSearchParams()
  private resource: string

  constructor(resource: string) {
    this.resource = resource
  }

  select(columns: string) {
    this.params.set('select', columns)
    return this
  }
  eq(col: string, val: unknown) {
    this.params.set(col, String(val))
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.params.set('order', `${col}.${opts?.ascending ? 'asc' : 'desc'}`)
    return this
  }
  range(from: number, to: number) {
    this.params.set('offset', String(from))
    this.params.set('limit', String(to - from + 1))
    return this
  }

  async then(resolve: Function) {
    const resp = await fetch(`/api/v1/${this.resource}?${this.params}`)
    const data = await resp.json()
    resolve({ data, error: resp.ok ? null : data, count: resp.headers.get('x-total-count') })
  }
}
```

### Prototype Task: Task 0A-10

**Dependency:** Task 0A-9 selesai

**Goal:** Prototype 1 resource end-to-end sebelum commit ke full 35 resources

**Steps:**

1. Implement `courses` resource di VIL (5 CRUD endpoints) dengan `sqlx`
2. Implement `VilApiClient.from('courses')` di frontend query param builder
3. Run `courseService.fetchCourses()` → verify response shape identical ke Supabase
4. Run `courseService.createCourse()` → verify insert + response
5. Measure actual implementation time
6. **Decision gate:** Jika 1 resource < 4 jam → proceed Opsi A. Jika > 6 jam → reconsider Opsi C hybrid.

**Expected outcome:** ~3 jam untuk courses resource → extrapolate ~105 jam untuk 35 resources → acceptable.

---

## 2. Password Reset / Forgot Password Flow

**Impact:** +12-16 jam

**Masalah:** Plan auth lengkap tapi **tidak ada forgot password**. Ini production-critical.

**Action:** Tambahkan ke Phase 1B sebagai task #11:

```
POST /api/v1/auth/reset-password
  Body: { email }
  → Generate reset token (1h expiry, one-time-use)
  → Send email via lettre/Resend
  → Return 200 (always, to prevent email enumeration)

POST /api/v1/auth/update-password
  Body: { token, new_password }
  → Verify token validity + expiry
  → Hash with Argon2
  → Update user password
  → Invalidate all refresh tokens
  → Return new session
```

Juga butuh: DB table `password_reset_tokens` (token, user_id, expires_at, used_at).

---

## 3. Supabase `auth.*` SQL Functions Migration

**Impact:** +20-30 jam

**Masalah:** Supabase menyediakan SQL functions di schema `auth` yang dipakai oleh RLS policies DAN stored procedures:

- `auth.uid()` → current user ID dari JWT
- `auth.jwt()` → full JWT claims
- `auth.role()` → JWT role
- `get_my_tenant_id()` → depends on `auth.uid()`
- `auto_set_tenant_id()` → trigger depends on auth context

Saat Supabase di-decommission, **schema `auth` hilang** dan semua functions ini error.

**Action:**

1. **Phase 0 audit:** `grep -r 'auth\.uid\|auth\.jwt\|auth\.role' supabase/migrations/ sql/` → hitungan exact
2. **Phase 1A:** Buat replacement functions di `public` schema:

```sql
-- Replacement: auth.uid() → public.current_user_id()
-- Called from VIL via SET LOCAL per-request
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT current_setting('app.current_user_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- VIL sets this per-request via middleware:
-- sqlx::query("SET LOCAL app.current_user_id = $1").bind(claims.sub)
```

1. **Phase 6:** Migration script to replace ALL `auth.uid()` → `current_user_id()` in stored procedures
2. **RPCs yang pakai `auth.*`:** Audit setiap RPC, replace references

---

## 4. VIL Multi-Tenancy NOT Open-Source

**Impact:** Documentation only

**Masalah:** VIL ROADMAP Phase 5b "Multi-tenancy & namespace isolation" = Commercial repo. Plan's `TenantGuard` is custom code, which is fine, tapi harus eksplisit.

**Action:** Tambahkan note di Phase 1C dan Bootstrap Context:

> VIL tidak punya built-in multi-tenancy. Semua tenant isolation di EduSync adalah 100% custom `TenantGuard` middleware + per-query `tenant_id` filtering. Ini by design — multi-tenancy EduSync lebih fine-grained dari generic VIL offering.

---

# 🟡 P1 — Signifikan

## 5. PostgreSQL Extension Audit

**Impact:** +8-16 jam

**Action:** Tambahkan ke Phase 0 Week 1:

```sql
SELECT * FROM pg_extension;
-- Audit setiap extension:
-- pg_cron → vil_trigger_cron (sudah di plan)
-- pg_net → audit apakah dipakai, replace dengan reqwest di VIL
-- pgsodium → audit encryption usage
-- pgvector → audit AI feature usage
-- pg_graphql → likely not used, confirm
-- uuid-ossp → tetap, standard PostgreSQL
-- pgcrypto → tetap, standard PostgreSQL
```

---

## 6. Email Template Migration

**Impact:** +8-12 jam

**Action:** Tambahkan ke Phase 1B:

- Design HTML email templates (Bahasa Indonesia) untuk:
  - Email verification (signup)
  - Password reset (gap #2)
  - Teacher invitation
  - Parent notification digest
- Gunakan `lettre` + inline CSS (email client compatibility)
- Template variables: `name`, `action_url`, `school_name`
- Test di major email clients (Gmail, Outlook, Yahoo)

---

## 7. Connection Pooling — PgBouncer

**Impact:** +4-8 jam

**Masalah:** Supabase provides PgBouncer built-in. VIL + workers = 85 connections (50+20+10+5). PostgreSQL default `max_connections` = 100. Under load = exhaustion.

**Action:** Tambahkan ke Phase 1A Docker Compose:

```yaml
services:
  pgbouncer:
    image: edoburu/pgbouncer
    environment:
      DATABASE_URL: postgres://postgres:pass@db:5432/edusync
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 200
      DEFAULT_POOL_SIZE: 40
    ports:
      - '6432:6432'
```

VIL connects to PgBouncer (`:6432`) instead of PostgreSQL directly.

---

## 8. `vil_trigger_cdc` untuk Realtime

**Impact:** Evaluation only

**Masalah:** `pg_notify` punya 8KB payload limit dan bisa lost jika no listener. VIL sudah punya `vil_trigger_cdc` (completed in ROADMAP) yang lebih robust.

**Action:** Tambahkan evaluation task ke Phase 4A:

- Compare `pg_notify` vs `vil_trigger_cdc` untuk:
  - Notifications (guaranteed delivery needed)
  - Discussions (message ordering important)
  - Builder presence (ephemeral, `pg_notify` OK)
- Decision: Use `vil_trigger_cdc` for guaranteed delivery channels, `pg_notify` for ephemeral

---

## 9. Deployment Architecture

**Impact:** +20-30 jam

**Action:** Tambahkan CC10 ke main plan atau expand Spec 3:

```
Deployment Stack:
┌───────────────────────────────────┐
│  Cloudflare / Let's Encrypt (TLS)   │
├───────────────────────────────────┤
│  Caddy / Nginx (reverse proxy)      │
│  • api.edusync.id → VIL :8080      │
│  • fallback → Supabase (Phase 1-5)  │
├───────────────────────────────────┤
│  Docker Compose                     │
│  • edusync-api (VIL binary)         │
│  • pgbouncer (:6432)                │
│  • minio (:9000) [Phase 5+]        │
│  • postgres (:5432) [Phase 6+ opt]  │
├───────────────────────────────────┤
│  VPS: ~$20/mo (4 vCPU, 8GB RAM)     │
└───────────────────────────────────┘
```

---

## 10. Database Backup & Disaster Recovery

**Impact:** +8-12 jam

**Action:** Tambahkan ke Phase 6 atau CC baru:

- **Backup strategy:** `pg_dump` daily via cron → S3/MinIO
- **WAL archiving:** for point-in-time recovery
- **RPO:** ≤24 hours (daily backup) atau ≤5 minutes (WAL)
- **RTO:** <1 hour
- **Test restore:** Monthly restore drill ke staging

---

## 11. VIL Version Pinning

**Impact:** Policy decision

**KEPUTUSAN FINAL:**

- **Pin ke specific git tag** di `Cargo.toml`: `vil-server = { git = "...", tag = "v0.1.0" }`
- **Fork VIL repo** ke `OceanOS-id/VIL-edusync` jika needed for stability
- **Evaluate updates monthly** — never auto-update during migration
- **Rollback:** revert `Cargo.toml` tag if update breaks
- Gate 4 already covers: "if VIL unstable → fork to Axum"

---

# 🟠 P2 — Operasional

## 12. Horizontal Scaling & WS Sticky Sessions

Not needed for initial deployment (41K req/s single instance is sufficient for EduSync scale). Document for future:

- HTTP: stateless JWT = horizontal scale ready
- WebSocket: needs Redis pub/sub adapter for multi-instance `WsHub` broadcast
- Load balancer: sticky sessions for WS connections

## 13. Storage URL Migration Detail

Already in Phase 5 scope. Add specifics:

- Audit: `grep -r 'supabase.co/storage' supabase/migrations/` for URL columns
- Tables likely affected: `profiles.avatar_url`, `lesson_resources.url`, `submission_files.file_url`, `certificates.*`
- Migration script: batch `UPDATE` with `REPLACE()` SQL function
- Transition: CDN proxy that redirects old Supabase URLs → new S3 URLs

## 14. Server-Side Logging & Error Tracking

- **Sentry for Rust:** `sentry-rust` crate — add to `Cargo.toml`
- **Centralized logging:** `vil_log` → stdout → Docker logs → Loki/Grafana stack
- **Alert routing:** Grafana alerts → Telegram/Discord webhook (cheapest for solo dev)

## 15. Integration Test Environment

Expand CC3 with:

- Staging: same Docker Compose but with DB snapshot (not prod replica)
- Test tenants: 3 pre-seeded (`test-school-1`, `test-school-2`, `test-school-3`)
- CI pipeline: `cargo test` → `docker build` → deploy staging → `pnpm test:e2e` → deploy prod
- E2E isolation: each test run uses dedicated test tenant

---

# 📊 Revised Effort Summary

| **Kategori**                      | **Sebelum** | **Tambahan** | **Sesudah**                   |
| --------------------------------- | ----------- | ------------ | ----------------------------- |
| Base plan (sebelum VIL deep dive) | ~970 jam    |              |                               |
| VIL built-in savings              |             | -167 jam     |                               |
| Previous total                    | ~853 jam    |              |                               |
| Spec 4 additional (this doc)      |             | +176-266 jam |                               |
| **Revised total**                 |             |              | **~1,030-1,120 jam**          |
| **Revised timeline**              |             |              | **~70-75 minggu (~18 bulan)** |

> **Catatan:** Angka 853 jam sebelumnya terlalu optimistis karena tidak menghitung PostgREST query builder replacement (~100-150 jam). Angka ~1,030-1,120 jam lebih realistis dan closer ke estimasi awal 970 jam + operational gaps.

---

# Priority Tindakan

1. 🔴 **Sekarang (Phase 0A Week 1):** Design `ApiClient.from()` → VIL mapping. Opsi A/B/C decision.
2. 🔴 **Minggu 1:** Audit `auth.*` SQL functions + PostgreSQL extensions
3. 🔴 **Minggu 1:** Tambahkan password reset flow ke Phase 1B
4. 🟡 **Minggu 2:** Design deployment architecture (Docker Compose + PgBouncer)
5. 🟡 **Minggu 2:** Pin VIL version, document multi-tenancy decision
6. 🟡 **Minggu 3:** Email templates + backup strategy
7. 🟠 **Phase 4:** Evaluate `vil_trigger_cdc` vs `pg_notify`
