# Acceptance Criteria — Phase 2

Dokumentasi ini menjabarkan kriteria keluar (exit criteria) untuk Phase 2: Core CRUD Migration.

---

## Functional Requirements

### Batch 1: Courses, Classes, Lessons

- [ ] Schema introspection completed untuk courses, classes, lessons, course_modules, enrollments
- [ ] Rust model structs created untuk semua tables
- [ ] vil_resource! Macro implemented dan working
- [ ] TenantGuard + RbacGuard middleware implemented
- [ ] Course CRUD endpoints implemented (list, get, create, update, delete)
- [ ] Course RLS policies ported ke Rust guards
- [ ] Course templates endpoint working
- [ ] Course versioning endpoint working
- [ ] Lesson + Module CRUD endpoints implemented
- [ ] Lesson block content (JSON) supported
- [ ] Classroom CRUD endpoints implemented
- [ ] Enrollment management working
- [ ] Course Builder API endpoints working
- [ ] Integration tests passed untuk semua endpoints
- [ ] Frontend service layer refactored ke VIL

### Batch 2: Quizzes, Assignments, Gradebook

- [ ] Schema introspection completed untuk quiz tables
- [ ] Quiz domain models created
- [ ] Quiz DTOs created dan match frontend expectations
- [ ] Quiz CRUD read endpoints working (teacher + student views)
- [ ] Quiz CRUD write endpoints working (create, update, delete, publish)
- [ ] Quiz attempt start handler working dengan max attempts check
- [ ] Quiz autosave handler working dengan UPSERT pattern
- [ ] Quiz submit handler working dengan idempotency
- [ ] Quiz auto-grade working untuk MCQ/true-false
- [ ] Essay grading queue handler working
- [ ] Quiz timer auto-submit working
- [ ] Question bank CRUD working
- [ ] Assignment CRUD endpoints working
- [ ] Assignment submissions + file upload working
- [ ] Gradebook aggregation working
- [ ] SpeedGrader endpoints working
- [ ] Frontend quiz services refactored ke VIL
- [ ] Frontend assignment services refactored ke VIL

### Batch 3: Analytics, Users, Progress

- [ ] Analytics RPC handlers working (executive overview, teacher dashboard, student progress)
- [ ] All remaining analytics RPCs registered sebagai thin wrappers
- [ ] User management CRUD working (list, get, update, deactivate)
- [ ] Bulk import service working (chunk-based, resumable)
- [ ] Progress tracking endpoints working (lesson progress, course completion, signals)
- [ ] xAPI statement endpoints working dengan idempotency
- [ ] Offline queue compatibility verified

### Batch 4: Remaining Modules

- [ ] Notifications CRUD working
- [ ] Discussions CRUD working
- [ ] Calendar events CRUD working
- [ ] Attendance (QR + manual) working
- [ ] Certificates CRUD working
- [ ] Gamification (XP, badges, leaderboard) working
- [ ] Parent portal working
- [ ] Principal dashboard working
- [ ] Onboarding wizard working
- [ ] Surveys CRUD working (if frontend ready)
- [ ] Finance SPP tracking working (if frontend ready)
- [ ] Global search working
- [ ] Moderation CRUD working

---

## Non-Functional Requirements

### Security

- [ ] Gate 3: RLS → Middleware security review passed
- [ ] Tenant isolation: Semua query filter `tenant_id = $1`
- [ ] RBAC: Role checks implemented menggunakan `user_roles` table
- [ ] Ownership checks untuk UPDATE/DELETE operations
- [ ] Input validation untuk semua request DTOs
- [ ] SQL injection prevention: semua queries gunakan bind parameters

### Error Handling

- [ ] Semua endpoint return PostgREST-compatible error format:
  ```json
  { "code": "...", "message": "...", "details": null, "hint": null }
  ```

### Testing

- [ ] cargo check passed untuk seluruh project
- [ ] cargo test passed untuk seluruh project
- [ ] Integration tests passed untuk Batch 1-4
- [ ] Shadow mode verification passed

### Performance

- [ ] Quiz fetch latency ≤ 200ms
- [ ] Quiz submit latency ≤ 500ms
- [ ] Pagination headers implemented (X-Total-Count)

### Offline Queue

- [ ] Quiz submit idempotency: key format `quiz:{attempt_id}:{user_id}` accepted dengan 200
- [ ] xAPI idempotency: key format `xapi:{verb}:{objectType}:{objectId}:{userId}` accepted dengan 200
- [ ] Progress last-write-wins verified

---

## Shadow Mode Requirements

- [ ] Dual-write infrastructure implemented untuk semua modules
- [ ] Divergence logging working
- [ ] Per-flow cutover flags implemented
- [ ] Manual cutover trigger available untuk setiap flow

---

## Frontend Requirements

- [ ] Semua service files refactored ke VIL endpoints
- [ ] Offline queue compatibility verified
- [ ] Error handling match VIL error format
- [ ] TypeScript typecheck passed

---

## SQL Requirements

- [ ] SELECT \* — NEVER used, always explicit columns
- [ ] Reserved words quoted: `"order"`, `"limit"`, `"offset"`
- [ ] Foreign key constraints verified

---

## Exit Criteria

Phase 2 dianggap selesai jika:

1. ✅ Semua CRUD endpoint untuk Batch 1–4 ter-implement di VIL
2. ✅ Shadow mode berjalan untuk semua modul dengan dual-write
3. ✅ Integration tests passed
4. ✅ Frontend service layer refactored ke VIL
5. ✅ Security review passed (Gate 3)
6. ✅ RLS policies di-supports oleh Rust middleware
7. ✅ cargo check && cargo test passed
8. ✅ pnpm typecheck && pnpm lint passed (frontend)
