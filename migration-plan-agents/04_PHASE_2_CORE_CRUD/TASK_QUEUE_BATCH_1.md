# Task Queue — Phase 2 Batch 1

**Modul:** Courses, Classes, Lessons, Course Builder  
**Durasi:** Minggu 23–28 | **Effort:** ~80–100 jam

---

## Task IDs

| ID      | Modul       | Deskripsi                       |
| ------- | ----------- | ------------------------------- |
| 2B1-00  | Foundation  | Schema Introspection            |
| 2B1-00b | DevOps      | Nginx Route Update              |
| 2B1-01  | Foundation  | Rust Model Structs              |
| 2B1-02  | Foundation  | vil_resource! Macro             |
| 2B1-03  | Foundation  | TenantGuard + RbacGuard         |
| 2B1-04  | Courses     | Course CRUD Endpoints           |
| 2B1-05  | Courses     | Course RLS Guards               |
| 2B1-06  | Courses     | Template Endpoints              |
| 2B1-07  | Courses     | Version Endpoints               |
| 2B1-08  | Courses     | Course Integration Tests        |
| 2B1-09  | Courses     | Frontend courseService → VIL    |
| 2B1-10  | Lessons     | Lesson + Module CRUD            |
| 2B1-11  | Lessons     | Lesson Block Content            |
| 2B1-12  | Lessons     | Lesson RLS Guards               |
| 2B1-13  | Lessons     | Lesson Integration Tests        |
| 2B1-14  | Lessons     | Frontend lessonService → VIL    |
| 2B1-15  | Classroom   | Classroom CRUD                  |
| 2B1-16  | Classroom   | Enrollment Endpoints            |
| 2B1-17  | Classroom   | Classroom RLS Guards            |
| 2B1-18  | Classroom   | Classroom Integration Tests     |
| 2B1-19  | Classroom   | Frontend classroomService → VIL |
| 2B1-20  | Builder     | Builder API Endpoints           |
| 2B1-21  | Builder     | Builder Integration Tests       |
| 2B1-22  | Builder     | Frontend courseBuilderApi → VIL |
| 2B1-23  | Integration | Shadow Mode Infra               |
| 2B1-24  | Integration | Shadow Mode Verification        |
| 2B1-25  | Integration | E2E Tests VIL                   |
| 2B1-26  | Integration | Per-Flow Cutover Flags          |

---

## Dependency Graph

```
2B1-01 (Model Structs)
    ├──→ 2B1-02 (vil_resource! Macro)
    └──→ 2B1-03 (TenantGuard + RbacGuard)

2B1-02 + 2B1-03
    ├──→ 2B1-04 (Course CRUD Endpoints)
    ├──→ 2B1-10 (Lesson + Module CRUD)
    ├──→ 2B1-15 (Classroom CRUD)
    └──→ 2B1-20 (Builder API Endpoints)

2B1-04 → 2B1-05 (Course RLS Guards)
    ├──→ 2B1-06 (Template Endpoints)
    ├──→ 2B1-07 (Version Endpoints)
    └──→ 2B1-08 (Course Integration Tests)

2B1-05 → 2B1-09 (Frontend courseService → VIL)

2B1-10 → 2B1-11 (Lesson Block Content)
    └──→ 2B1-12 (Lesson RLS Guards)
        └──→ 2B1-13 (Lesson Integration Tests)
            └──→ 2B1-14 (Frontend lessonService → VIL)

2B1-15 → 2B1-16 (Enrollment Endpoints)
    └──→ 2B1-17 (Classroom RLS Guards)
        └──→ 2B1-18 (Classroom Integration Tests)
            └──→ 2B1-19 (Frontend classroomService → VIL)

2B1-20 → 2B1-21 (Builder Integration Tests)
    └──→ 2B1-22 (Frontend courseBuilderApi → VIL)

(2B1-09 + 2B1-14 + 2B1-19 + 2B1-22)
    └──→ 2B1-23 (Shadow Mode Infra)
        └──→ 2B1-24 (Shadow Mode Verification)
            └──→ 2B1-25 (E2E Tests VIL)
                └──→ 2B1-26 (Per-Flow Cutover Flags)
```

---

## Task Detail

### 2B1-00: Schema Introspection

**Goal:** Document exact column names dan types dari actual database sebelum membuat model structs

**Dependencies:** None (prerequisite)

**Implementation:**

```sql
-- Run semua query ini dan document output di schema-batch1.md

-- 1. courses table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'courses' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. classes table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'classes' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. course_modules table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'course_modules' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. lessons table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'lessons' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. enrollments table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'enrollments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('courses', 'classes', 'course_modules', 'lessons', 'enrollments')
ORDER BY tablename, policyname;

-- 7. Foreign keys
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('courses', 'classes', 'course_modules', 'lessons', 'enrollments')
ORDER BY tc.table_name;
```

---

### 2B1-01: Rust Model Structs

**Goal:** Buat semua model struct untuk Batch 1 resources

**Dependencies:** Phase 1A scaffold selesai

**Files to create:**

- `edusync-api/crates/models/src/course.rs`
- `edusync-api/crates/models/src/class.rs`
- `edusync-api/crates/models/src/lesson.rs`
- `edusync-api/crates/models/src/course_module.rs`
- `edusync-api/crates/models/src/enrollment.rs`
- `edusync-api/crates/models/src/course_collaborator.rs`
- `edusync-api/crates/models/src/lib.rs` (add mod declarations)

---

### 2B1-02: vil_resource! Macro

**Goal:** Implement `vil_resource!` macro yang auto-generate 5 CRUD endpoints per resource

**Dependencies:** 2B1-01

**Files to create:**

- `edusync-api/crates/macros/src/lib.rs`
- `edusync-api/crates/macros/Cargo.toml`
- `edusync-api/Cargo.toml` (add workspace member)

---

### 2B1-03: TenantGuard + RbacGuard Middleware

**Goal:** Implement Axum extractors `TenantId` dan `Claims` yang dipakai semua CRUD handlers

**Dependencies:** Phase 1 auth selesai

**Files to create:**

- `edusync-api/crates/middleware/src/tenant_guard.rs`
- `edusync-api/crates/middleware/src/rbac_guard.rs`
- `edusync-api/crates/middleware/src/mod.rs`
- `edusync-api/crates/server/src/error.rs` (AppError type)

---

### 2B1-04: Course CRUD Endpoints

**Goal:** Implement 5 CRUD endpoints untuk courses resource di VIL

**Dependencies:** 2B1-01, 2B1-02, 2B1-03

**Files to create:**

- `edusync-api/crates/server/src/routes/courses.rs`
- `edusync-api/crates/server/src/routes/mod.rs`
- `edusync-api/crates/server/src/main.rs` (register ServiceProcess)

---

### 2B1-05: Course RLS Guards

**Goal:** Port semua RLS policies untuk `courses` table ke Rust guard functions

**Dependencies:** 2B1-04

**Files to create:**

- `edusync-api/crates/middleware/src/guards/course_guard.rs`
- `edusync-api/crates/middleware/src/guards/mod.rs`
- Update `routes/courses.rs` to use guards

---

### 2B1-06: Template Endpoints

**Goal:** Course template CRUD (clone course as template)

**Dependencies:** 2B1-05

---

### 2B1-07: Version Endpoints

**Goal:** Course versioning endpoints

**Dependencies:** 2B1-05

---

### 2B1-08: Course Integration Tests

**Goal:** Integration tests untuk course endpoints

**Dependencies:** 2B1-06, 2B1-07

---

### 2B1-09: Frontend courseService → VIL

**Goal:** Refactor frontend course service untuk menggunakan VIL API

**Dependencies:** 2B1-08

---

### 2B1-10: Lesson + Module CRUD

**Goal:** Implement CRUD untuk lessons dan course_modules

**Dependencies:** 2B1-01, 2B1-02, 2B1-03

**Files:**

- `edusync-api/crates/server/src/routes/lessons.rs`
- `edusync-api/crates/server/src/routes/modules.rs`

---

### 2B1-11: Lesson Block Content

**Goal:** Support block-based lesson content (JSON)

**Dependencies:** 2B1-10

---

### 2B1-12: Lesson RLS Guards

**Goal:** Port RLS policies untuk lessons dan modules

**Dependencies:** 2B1-11

---

### 2B1-13: Lesson Integration Tests

**Dependencies:** 2B1-12

---

### 2B1-14: Frontend lessonService → VIL

**Dependencies:** 2B1-13

---

### 2B1-15: Classroom CRUD

**Goal:** Implement CRUD untuk classes

**Dependencies:** 2B1-01, 2B1-02, 2B1-03

---

### 2B1-16: Enrollment Endpoints

**Goal:** Student enrollment management

**Dependencies:** 2B1-15

---

### 2B1-17: Classroom RLS Guards

**Dependencies:** 2B1-16

---

### 2B1-18: Classroom Integration Tests

**Dependencies:** 2B1-17

---

### 2B1-19: Frontend classroomService → VIL

**Dependencies:** 2B1-18

---

### 2B1-20: Builder API Endpoints

**Goal:** Course builder endpoints (reorder, publish)

**Dependencies:** 2B1-01, 2B1-02, 2B1-03

---

### 2B1-21: Builder Integration Tests

**Dependencies:** 2B1-20

---

### 2B1-22: Frontend courseBuilderApi → VIL

**Dependencies:** 2B1-21

---

### 2B1-23: Shadow Mode Infra

**Goal:** Setup dual-write infrastructure

**Dependencies:** 2B1-09, 2B1-14, 2B1-19, 2B1-22

---

### 2B1-24: Shadow Mode Verification

**Dependencies:** 2B1-23

---

### 2B1-25: E2E Tests VIL

**Dependencies:** 2B1-24

---

### 2B1-26: Per-Flow Cutover Flags

**Goal:** Implement feature flags untuk per-flow cutover

**Dependencies:** 2B1-25

---

## Parallelism Map

| Parallel Group        | Tasks                  | Can Run In Parallel With          |
| --------------------- | ---------------------- | --------------------------------- |
| Group A (Foundation)  | 2B1-01, 2B1-02, 2B1-03 | Serial                            |
| Group B (Courses)     | 2B1-04 → 2B1-09        | Group C, D, E                     |
| Group C (Lessons)     | 2B1-10 → 2B1-14        | Group B, D, E                     |
| Group D (Classroom)   | 2B1-15 → 2B1-19        | Group B, C, E                     |
| Group E (Builder)     | 2B1-20 → 2B1-22        | Group B, C, D                     |
| Group F (Integration) | 2B1-23 → 2B1-26        | Serial (all groups must complete) |
