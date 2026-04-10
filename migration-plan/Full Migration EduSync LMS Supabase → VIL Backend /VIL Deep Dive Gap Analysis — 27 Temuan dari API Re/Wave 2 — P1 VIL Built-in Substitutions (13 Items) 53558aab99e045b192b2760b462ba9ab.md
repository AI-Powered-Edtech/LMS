# Wave 2 — P1 VIL Built-in Substitutions (13 Items)

> **Instruksi:** Apply items ini ke plan pages satu per satu. Setiap item punya target page dan section. Setelah apply, ubah status ⬜ → ✅. Estimasi total hemat: **~97 jam**.

---

## Status Tracker

| #   | Gap | VIL Built-in                 | Hemat   | Target Page                 | Status |
| --- | --- | ---------------------------- | ------- | --------------------------- | ------ |
| 1   | #1  | `OAuth2Client`               | ~12 jam | Phase 1 Detail              | ⬜     |
| 2   | #2  | `IdempotencyStore`           | ~8 jam  | CC6 (Main Plan)             | ⬜     |
| 3   | #3  | `FeatureFlags`               | ~10 jam | Phase 2 Detail + CC8        | ⬜     |
| 4   | #5  | `AuditLog`                   | ~6 jam  | CC8 (Main Plan)             | ⬜     |
| 5   | #6  | `SessionManager`             | ~4 jam  | Phase 1 Detail              | ⬜     |
| 6   | #8  | `Valid<T>`                   | ~15 jam | Bootstrap Context + Phase 2 | ⬜     |
| 7   | #9  | `Scheduler`                  | ~4 jam  | Phase 3 Detail (3E)         | ⬜     |
| 8   | #10 | `VilWsEvent` • `WsHub`       | ~12 jam | Phase 4-6 Detail            | ⬜     |
| 9   | #13 | `Cache<K,V>`                 | ~8 jam  | Phase 2 Detail              | ⬜     |
| 10  | #14 | Tri-Lane Mesh                | ~0 jam  | CC7 (Main Plan)             | ⬜     |
| 11  | #15 | `DeadLetterQueue`            | ~4 jam  | CC7 (Main Plan)             | ⬜     |
| 12  | #16 | `EventBus`                   | ~6 jam  | Phase 2 Detail              | ⬜     |
| 13  | #23 | `TestClient` • `BenchRunner` | ~10 jam | Phase 1 + Phase 2 Detail    | ⬜     |

---

## Item 1: `OAuth2Client` untuk Google OAuth (#1)

**Hemat:** ~12 jam dari Phase 1B task #5 (sebelumnya 2 hari → 0.5 hari)

**Target:** Phase 1 Detail → Week 16 Google OAuth PKCE

**Action:** Update Phase 1B #5 OAuth code. Ganti manual PKCE implementation dengan:

```rust
use vil_server_auth::oauth2::OAuth2Client;

let oauth = OAuth2Client::new(
    "google",
    &std::env::var("GOOGLE_CLIENT_ID").unwrap(),
    &std::env::var("GOOGLE_CLIENT_SECRET").unwrap(),
)
.authorization_url("https://accounts.google.com/o/oauth2/v2/auth")
.token_url("https://oauth2.googleapis.com/token")
.userinfo_url("https://www.googleapis.com/oauth2/v3/userinfo")
.scopes(&["openid", "email", "profile"]);

// Initiate:
let (auth_url, state, verifier) = oauth.authorization_url_pkce(redirect_uri)?;

// Callback:
let token = oauth.exchange_code_pkce(code, verifier).await?;
let userinfo = oauth.userinfo(&token.access_token).await?;
```

**Juga update:** Bootstrap Context Section 4 — tambahkan `OAuth2Client` ke security features list.

---

## Item 2: `IdempotencyStore` untuk Offline Queue (#2)

**Hemat:** ~8 jam dari CC6 custom implementation

**Target:** Main Plan → CC6 Offline & Queue Semantics

**Action:** Tambahkan ke CC6 section:

```rust
use vil_server::auth::idempotency::IdempotencyStore;

// VIL built-in: 24h TTL, 10K max entries, Idempotency-Key header
let idem = IdempotencyStore::new()
    .ttl(Duration::from_secs(86400))   // 24h
    .max_entries(10_000);

// Usage in quiz submission handler:
async fn submit_quiz(idem: &IdempotencyStore, key: &str, ...) {
    if let Some(cached) = idem.get(key).await {
        return Ok(cached);  // Replay cached response
    }
    let result = process_submission(...).await?;
    idem.store(key, &result).await;
    Ok(result)
}
```

**Menggantikan:** Custom `dead_letter_jobs` idempotency logic. DLQ table tetap ada untuk failed jobs.

---

## Item 3: `FeatureFlags` untuk Per-Feature Cutover (#3)

**Hemat:** ~10 jam

**Target:** Phase 2 Detail → Per-batch workflow + Main Plan CC8

**Action:** Tambahkan ke Phase 2 per-batch workflow dan CC8:

```rust
use vil_server::config::FeatureFlags;

let flags = FeatureFlags::new()
    .flag("courses_vil", false)          // Per-feature VIL routing
    .flag("quizzes_vil", false)
    .flag("gradebook_vil", false)
    .percentage("shadow_mode", 10)       // 10% traffic shadow to VIL
    .per_tenant("courses_vil", tenant_id); // Per-tenant rollout

// In routing middleware:
if flags.is_enabled("courses_vil") {
    route_to_vil(req).await
} else {
    proxy_to_supabase(req).await
}
```

**Menggantikan:** Custom `VITE_API_BACKEND` env var approach (tetap sebagai fallback).

---

## Item 4: `AuditLog` untuk Privileged Operations (#5)

**Hemat:** ~6 jam

**Target:** Main Plan → CC8 Privileged Operation Inventory

**Action:** Tambahkan ke CC8:

```rust
use vil_server::observability::AuditLog;

let audit = AuditLog::new(&db);

// Record privileged operation:
audit.record("bulk_import", &json!({
    "actor": claims.sub,
    "tenant": claims.tenant_id,
    "imported_count": 150,
    "file": "students.csv"
})).await;

// Query recent:
let recent = audit.recent(50).await;
```

**Menggantikan:** Manual INSERT ke `activity_logs` table.

---

## Item 5: `SessionManager` untuk Stateful Refresh Tokens (#6)

**Hemat:** ~4 jam

**Target:** Phase 1 Detail → Week 15 Session management

**Action:** Evaluate kombinasi JWT (stateless access) + SessionManager (stateful refresh):

```rust
use vil_server::auth::session::SessionManager;

let sessions = SessionManager::new()
    .ttl(Duration::from_secs(30 * 24 * 3600))  // 30 days
    .cookie_name("edusync_refresh")
    .http_only(true)
    .same_site(SameSite::Lax);
```

**Catatan:** Access tokens tetap JWT stateless (1hr). Refresh tokens bisa dikelola SessionManager untuk server-side revocation.

---

## Item 6: `Valid<T>` untuk Request Validation (#8)

**Hemat:** ~15 jam across Phase 2-3 (167 endpoints)

**Target:** Bootstrap Context + Phase 2 Detail

**Action:** Update Bootstrap Context Section 2 handler pattern:

```rust
use validator::Validate;
use vil_server::extract::Valid;

#[derive(Deserialize, Validate)]
struct CreateCourseRequest {
    #[validate(length(min = 1, max = 200))]
    title: String,
    #[validate(length(max = 5000))]
    description: Option<String>,
    #[validate(custom = "validate_course_status")]
    status: String,
}

async fn create_course(
    State(ctx): State<AppState>,
    claims: Claims,
    Valid(body): Valid<CreateCourseRequest>,  // Auto-validates, returns 400 on failure
) -> Result<Json<Course>, VilError> {
    // body is already validated — no manual checks needed
}
```

**Menggantikan:** Manual validation code di setiap handler.

---

## Item 7: `Scheduler` untuk Simple Recurring Tasks (#9)

**Hemat:** ~4 jam

**Target:** Phase 3 Detail → 3E Background Jobs

**Action:** Update Phase 3E — gunakan `Scheduler` untuk simple jobs, `vil_trigger_cron` untuk complex:

- `Scheduler`: cleanup, flush, session expiry (lightweight, in-process)
- `vil_trigger_cron`: email digest, analytics refresh, AI quota reset (heavy, needs DB)

---

## Item 8: `VilWsEvent` + `WsHub` untuk Realtime (#10)

**Hemat:** ~12 jam

**Target:** Phase 4-6 Detail → Week 53-55 WebSocket Architecture

**Action:** Explicit reference ke VIL derive macros di Phase 4:

```rust
#[derive(Clone, Debug, Serialize, Deserialize, VilWsEvent)]
#[ws_event(topic = "builder.presence")]
struct BuilderPresence {
    user_id: String,
    cursor_position: Option<CursorPos>,
    action: String,
}

// WsHub for topic-based broadcast
let hub = WsHub::new();
hub.broadcast("builder.presence", &presence).await;
```

---

## Item 9: `Cache<K,V>` untuk Hot Data (#13)

**Hemat:** ~8 jam

**Target:** Phase 2 Detail — tambahkan caching strategy section

**Action:** Add "Caching Strategy" section ke Phase 2:

```rust
use vil_server::cache::Cache;

// Course catalog: 5 min TTL
let course_cache: Cache<Uuid, Vec<Course>> = Cache::new()
    .ttl(Duration::from_secs(300))
    .max_entries(1000);

// User profiles + roles: per-session
let profile_cache: Cache<Uuid, UserProfile> = Cache::new()
    .ttl(Duration::from_secs(3600));

// Tenant settings: 15 min TTL
let tenant_cache: Cache<Uuid, TenantSettings> = Cache::new()
    .ttl(Duration::from_secs(900));
```

**Invalidation:** Cache bust on write via `EventBus` (Item 12).

---

## Item 10: Tri-Lane Mesh — Leverage Properly (#14)

**Hemat:** Architectural improvement (no direct hour savings)

**Target:** Main Plan → CC7 Worker Architecture

**Action:** Update CC7 to explicitly map lanes:

- **Data Lane** (`VxLane::Data`): Quiz grading results, bulk import progress
- **Control Lane** (`VxLane::Control`): Notification fanout (backpressure-aware)
- **Trigger Lane** (`VxLane::Trigger`): Analytics refresh, cron job triggers

---

## Item 11: `DeadLetterQueue` Built-in (#15)

**Hemat:** ~4 jam

**Target:** Main Plan → CC7 DLQ section

**Action:** Update CC7 DLQ section — replace custom `dead_letter_jobs` table:

```rust
use vil_server::mesh::DeadLetterQueue;

let dlq = mesh.dead_letter_queue();

// Failed messages auto-routed to DLQ
// Manual replay:
for msg in dlq.recent(10).await {
    dlq.mark_replayed(&msg.id).await;
    // Re-process
}
```

**Catatan:** Quiz DLQ (`quiz_submission_queue.status = 'dead_letter'`) tetap di DB karena domain-specific.

---

## Item 12: `EventBus` untuk In-Process Pub/Sub (#16)

**Hemat:** ~6 jam

**Target:** Phase 2 Detail — new section

**Action:** Add "Event-Driven Pattern" section:

```rust
use vil_server::events::EventBus;

let bus = EventBus::new();

// Subscribe:
bus.subscribe("quiz.submitted", |event| async {
    trigger_grading(event).await;
    update_progress(event).await;
    send_notification(event).await;
});

bus.subscribe("lesson.completed", |event| async {
    award_xp(event).await;
    check_streaks(event).await;
    update_progress(event).await;
});

// Publish (in handler):
bus.publish("quiz.submitted", &quiz_event).await;
```

**Benefit:** Decouples side-effects from main handlers. Cache invalidation juga via EventBus.

---

## Item 13: `TestClient` + `BenchRunner` (#23)

**Hemat:** ~10 jam

**Target:** Phase 1 Detail → Week 21 + Phase 2 Detail verification

**Action:** Update testing sections:

```rust
use vil_server_test::TestClient;

#[tokio::test]
async fn test_course_crud() {
    let app = build_test_app().await;
    let client = TestClient::new(app);

    // Create
    let resp = client.post("/api/v1/courses")
        .bearer(teacher_jwt)
        .json(&json!({ "title": "Matematika" }))
        .await;
    resp.assert_status(201);

    // Read
    let resp = client.get("/api/v1/courses")
        .bearer(teacher_jwt)
        .await;
    resp.assert_ok();
    let courses: Vec<Course> = resp.json().await;
    assert_eq!(courses.len(), 1);
}
```

**Menggantikan:** k6 untuk basic integration tests (k6 tetap untuk load/stress tests).
