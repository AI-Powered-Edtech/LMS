# Phase 2: Core CRUD Endpoints — Week 23-38 Detail

<aside>
🎯

**Goal:** Migrasi data endpoints dari Supabase PostgREST ke VIL REST handlers. 48 feature modules, 167 RPCs. Per-feature flag rollback.

**Duration:** 16 minggu | **Effort:** ~240 jam | **Deliverable:** Semua CRUD berjalan via VIL

</aside>

---

## Workflow Per-Batch

Setiap batch mengikuti pola yang sama:

1. **Model** — Write Rust structs (`Serialize`, `Deserialize`, `sqlx::FromRow`)
2. **Handlers** — Write CRUD endpoints
3. **Guards** — Port RLS policies ke Rust middleware (TenantGuard + RbacGuard)
4. **🆕 Shadow test** — Request ke Supabase DAN VIL, compare responses
5. **Integration tests** — Rust tests against test DB
6. **Frontend** — Update `RestApiClient` per-feature
7. **E2E** — Run `pnpm test:e2e` dengan `VITE_API_BACKEND=vil`
8. **Feature flag** — Enable per-feature (bukan per-module)

**Rollback:** Per-feature flags. Jika `courses` gagal, hanya `courses` revert ke Supabase proxy.

---

## Batch 1 (Minggu 23-28): Courses, Classes, Lessons, Builder

### Week 23-24: Courses & Classes

**Rust Model:**

```rust
// crates/models/src/course.rs
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Course {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub status: String,        // 'draft' | 'published' | 'in_review' | 'approved'
    pub tenant_id: Uuid,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// GOTCHA: courses.status includes 'in_review' and 'approved' (migration 20260324160000)
// GOTCHA: use status = 'published', NOT is_published (column doesn't exist)
```

**Endpoints:**

| **Endpoint** | **Method** | **RLS Policies to Port** | **Role Access** |
| --- | --- | --- | --- |
| `/api/v1/courses` | GET (list) | 5 policies | All roles (filtered by tenant) |
| `/api/v1/courses/:id` | GET | 3 policies | All roles |
| `/api/v1/courses` | POST | 2 policies | Teacher, Admin |
| `/api/v1/courses/:id` | PUT | 4 policies | Teacher (owner), Admin |
| `/api/v1/courses/:id` | DELETE | 2 policies | Teacher (owner), Admin |
| `/api/v1/classes` | GET/POST/PUT/DELETE | 4 policies | Teacher, Admin |

**RLS → Middleware Pattern:**

```rust
// BEFORE (Supabase RLS):
// CREATE POLICY "courses_select" ON courses
//   FOR SELECT USING (tenant_id = get_my_tenant_id());

// AFTER (VIL middleware):
async fn list_courses(
    State(ctx): State<AppContext>,
    tenant: TenantId,  // injected by TenantGuard
    claims: Claims,    // injected by JwtAuth
) -> Result<Json<Vec<Course>>, AppError> {
    // Explicit tenant scoping (replaces RLS)
    let courses = sqlx::query_as!(
        Course,
        "SELECT id, title, description, status, tenant_id, created_by, created_at, updated_at 
         FROM courses WHERE tenant_id = $1 AND status = 'published'
         ORDER BY created_at DESC",
        tenant.0
    )
    .fetch_all(&ctx.db)
    .await?;
    
    Ok(Json(courses))
}
```

### Week 25-26: Lessons & Course Builder

**Endpoints:**

- `GET/POST/PUT/DELETE /api/v1/lessons`
- `GET/POST/PUT/DELETE /api/v1/modules` — **GOTCHA: `course_modules."order"` harus dikutip (SQL reserved word)**
- `GET/POST/PUT/DELETE /api/v1/lessons/:id/blocks` — block-based content
- Builder collaboration endpoints (sync, audit, collaborators)

**GOTCHA dari codebase:**

- `lessons."order"` — must be quoted in SQL
- `course_modules."order"` — same
- `course_collaborators` uses `auto_set_tenant_id()` trigger — NOT `set_tenant_id_from_user()`

### Week 27-28: Enrollment & Progress

**Endpoints:**

- `GET/POST /api/v1/enrollments` — **GOTCHA: `enrollments.user_id` NOT `student_id`**
- `GET/POST /api/v1/progress`
- Progress tracking + xAPI statements

**Week 28: Batch 1 Gate Review**

<aside>
🚪

**Gate 3:** Jika RLS→middleware menghasilkan security bugs → pause, build automated policy verification tests sebelum lanjut.

</aside>

---

## Batch 2 (Minggu 28-32): Assignments, Quizzes, Gradebook

### Week 28-29: Quiz Engine (Paling Kompleks — 13 service files)

| **Service File** | **Methods** | **Priority** |
| --- | --- | --- |
| `quizCRUD.ts` | ~8 | P0 |
| `quizBuilderService.ts` | ~6 | P0 |
| `quizAttemptService.ts` | ~10 | P0 — timer, autosave, auto-submit |
| `quizPlayer.service.ts` | ~8 | P0 — student quiz flow |
| `quizTimerService.ts` | ~4 | P0 — pause/resume (Phase 26 feature) |
| `quizAnalyticsService.ts` | ~6 | P1 |
| `quizAnalytics.service.ts` | ~4 | P1 |
| `suspiciousAttempts.service.ts` | ~3 | P2 |
| `questionBankService.ts` | ~6 | P1 |
| `quizQuestionManagement.ts` | ~5 | P1 |

**GOTCHA dari codebase:**

- `quiz_questions.text` — column is `text`, NOT `question_text`
- `quiz_options.text` — column is `text`, NOT `option_text`
- Quiz attempt snapshot is immutable — once submitted, cannot be changed
- Partial answer autosave every 30 seconds

### Week 30-31: Assignments + Gradebook

**Assignments:**

- `GET/POST/PUT/DELETE /api/v1/assignments` — CRUD + group assignments
- `POST /api/v1/assignments/:id/submit` — student submission
- 5 RPC calls for assignment management

**Gradebook (complex aggregation queries):**

```rust
// Complex gradebook query example
pub async fn get_gradebook_summary(
    pool: &PgPool,
    class_id: Uuid,
    tenant_id: Uuid,
) -> Result<Vec<GradebookRow>, Error> {
    sqlx::query_as!(
        GradebookRow,
        r#"
        SELECT 
            e.user_id as student_id,
            p.full_name,
            AVG(g.score)::FLOAT as avg_score,
            COUNT(DISTINCT g.assignment_id) as graded_count
        FROM enrollments e
        JOIN profiles p ON p.id = e.user_id
        LEFT JOIN grades g ON g.student_id = e.user_id AND g.tenant_id = $2
        WHERE e.class_id = $1 AND e.tenant_id = $2
        GROUP BY e.user_id, p.full_name
        ORDER BY p.full_name
        "#,
        class_id, tenant_id
    )
    .fetch_all(pool)
    .await
}
```

- SpeedGrader endpoints (annotation read/write)
- What-If Grades calculation

### Week 32: Batch 2 Verification

- All quiz flows E2E tested
- Gradebook aggregation matches Supabase output
- Shadow mode comparison for complex queries

---

## Batch 3 (Minggu 32-36): Analytics, Users, Administration

### Week 32-33: Analytics (21+ RPCs)

<aside>
💡

**Strategy: KEEP stored procedures in PostgreSQL.** Analytics RPCs terlalu complex untuk re-write ke Rust. Call via `sqlx::query!` instead.

</aside>

```rust
// Keep analytics as stored procedures — just call from Rust
#[get("/api/v1/analytics/executive")]
async fn get_executive_overview(
    State(ctx): State<AppContext>,
    tenant: TenantId,
    Query(params): Query<AnalyticsParams>,
) -> Result<Json<ExecutiveOverview>, AppError> {
    let result = sqlx::query_as!(
        ExecutiveOverview,
        "SELECT * FROM get_executive_overview($1, $2, $3)",
        tenant.0, params.start_date, params.end_date
    )
    .fetch_one(&ctx.db)
    .await?;
    Ok(Json(result))
}
```

**RPCs to keep as stored procedures:**

- `get_executive_overview` — principal dashboard
- `get_principal_overview_cached` — cached version
- `get_teacher_dashboard` — teacher analytics
- `get_student_progress` — student progress
- All 21+ analytics aggregation functions
- **GOTCHA:** When checking teacher role in analytics RPCs, query `user_roles` table directly (don't use `has_role()` — fails when JWT missing tenant claim)

### Week 34-35: User Management + Bulk Import

- Admin user CRUD endpoints
- Bulk import service (already hardened in Phase 31 — chunk-based, resumable)
- Profile management
- `student_lesson_signals` — **GOTCHA: use `total_time_spent`, `last_accessed_at`, `latest_quiz_score` (NOT `time_spent_seconds`, `last_event_at`, `quiz_avg_score`)**

### Week 36: xAPI + Progress

- xAPI statement endpoints (offline queue already built in Phase 31B)
- Progress tracking events
- `process-progress-events` logic (currently Edge Function)

---

## Batch 4 (Minggu 36-38): Remaining Features

### Week 36-37: Communication & Gamification

| **Feature Module** | **Endpoints** | **Complexity** |
| --- | --- | --- |
| `discussions/` | Forum CRUD + comments | Medium |
| `notifications/` | CRUD + batching (Phase 31C) | Medium |
| `calendar/` | Events CRUD | Low |
| `attendance/` | QR scan + manual | Medium |
| `certificates/` | Generate + verify | Medium |
| `gamification/` | XP, badges, streaks, leaderboard | Medium |

### Week 37-38: Parent, Principal, Admin

| **Feature Module** | **Endpoints** | **Complexity** |
| --- | --- | --- |
| `parent/` | Dashboard, messages, child data | Medium |
| `principal/` | Executive dashboard, surveys, reports | Medium |
| `onboarding/` | Teacher wizard | Low |
| `surveys/` | Survey CRUD + results | Medium |
| `finance/` | SPP tracking (5 RPCs) | High |
| `search/` | Global search | Low |
| `moderation/` | Content moderation | Low |

### Week 38: Phase 2 Gate Review

| **Criteria** | **Target** | **Status** |
| --- | --- | --- |
| All 48 feature module CRUD endpoints migrated | VIL handles all data queries | ⬜ |
| 167 RPCs callable from VIL | Via `sqlx::query!` or Rust handlers | ⬜ |
| RLS policies ported to middleware | TenantGuard + RbacGuard on all endpoints | ⬜ |
| Shadow mode verification | Supabase vs VIL responses match | ⬜ |
| E2E tests pass | `pnpm test:e2e` with `VITE_API_BACKEND=vil` | ⬜ |
| Load tests pass | `k6 run tests/load/stress.js` — P99 < 800ms | ⬜ |
| Per-feature flags work | Individual features can revert to Supabase | ⬜ |