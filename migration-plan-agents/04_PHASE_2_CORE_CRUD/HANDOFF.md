# Handoff — Phase 2 → Phase 3

Dokumentasi ini用于 Phase 2 ke Phase 3 的交接，记录已完成的工件、已知问题和 Phase 3 的前置条件。

---

## Phase 2 完成状态

### ✅ 已完成

| 模块                | 状态    | 备注                      |
| ------------------- | ------- | ------------------------- |
| Courses CRUD        | ✅ 完成 | All 5 CRUD endpoints      |
| Lessons + Modules   | ✅ 完成 | Block content JSON        |
| Classrooms          | ✅ 完成 | Enrollment management     |
| Course Builder      | ✅ 完成 | Reorder, publish          |
| Shadow Mode         | ✅ 完成 | Dual-write infrastructure |
| Quiz Models         | ✅ 完成 | Quiz domain models        |
| Quiz CRUD           | ✅ 完成 | Teacher + student views   |
| Quiz Attempt        | ✅ 完成 | Start, autosave, submit   |
| Quiz Grading        | ✅ 完成 | Auto-grade MCQ            |
| Assignments         | ✅ 完成 | Submissions + file upload |
| Gradebook           | ✅ 完成 | Aggregation + SpeedGrader |
| Analytics RPCs      | ✅ 完成 | Thin wrappers             |
| User Management     | ✅ 完成 | CRUD + bulk import        |
| Progress Tracking   | ✅ 完成 | Last-write-wins           |
| xAPI Statements     | ✅ 完成 | Idempotency               |
| Notifications       | ✅ 完成 | CRUD + mark-read          |
| Discussions         | ✅ 完成 | Threads + comments        |
| Calendar            | ✅ 完成 | Events CRUD               |
| Attendance          | ✅ 完成 | QR + manual               |
| Gamification        | ✅ 完成 | XP + badges + leaderboard |
| Certificates        | ✅ 完成 | CRUD                      |
| Parent Portal       | ✅ 完成 | Linked children           |
| Principal Dashboard | ✅ 完成 | Overview + reports        |
| Onboarding          | ✅ 完成 | Wizard                    |
| Search + Moderation | ✅ 完成 | ILIKE + reports           |

---

## 交接给 Phase 3 的工件

### Rust 后端

```
edusync-api/crates/
├── models/
│   ├── src/
│   │   ├── course.rs
│   │   ├── class.rs
│   │   ├── lesson.rs
│   │   ├── course_module.rs
│   │   ├── enrollment.rs
│   │   ├── course_collaborator.rs
│   │   ├── quiz.rs
│   │   ├── quiz_dto.rs
│   │   ├── analytics.rs
│   │   ├── user.rs
│   │   ├── bulk_import.rs
│   │   ├── progress.rs
│   │   ├── xapi.rs
│   │   ├── notification.rs
│   │   ├── discussion.rs
│   │   ├── calendar.rs
│   │   ├── attendance.rs
│   │   ├── certificate.rs
│   │   ├── gamification.rs
│   │   ├── parent.rs
│   │   ├── onboarding.rs
│   │   ├── survey.rs
│   │   ├── finance.rs
│   │   └── lib.rs
├── middleware/
│   ├── src/
│   │   ├── tenant_guard.rs
│   │   ├── rbac_guard.rs
│   │   ├── guards/
│   │   │   ├── course_guard.rs
│   │   │   └── mod.rs
│   │   └── mod.rs
├── macros/
│   ├── src/
│   │   └── lib.rs
│   └── Cargo.toml
└── server/
    ├── src/
    │   ├── routes/
    │   │   ├── courses.rs
    │   │   ├── lessons.rs
    │   │   ├── modules.rs
    │   │   └── mod.rs
    │   ├── handlers/
    │   │   ├── quiz_read.rs
    │   │   ├── quiz_write.rs
    │   │   ├── quiz_attempt.rs
    │   │   ├── quiz_autosave.rs
    │   │   ├── quiz_submit.rs
    │   │   ├── analytics.rs
    │   │   ├── users.rs
    │   │   ├── bulk_import.rs
    │   │   ├── progress.rs
    │   │   ├── xapi.rs
    │   │   ├── notifications.rs
    │   │   ├── discussions.rs
    │   │   ├── calendar.rs
    │   │   ├── attendance.rs
    │   │   ├── certificates.rs
    │   │   ├── gamification.rs
    │   │   ├── parent.rs
    │   │   ├── principal.rs
    │   │   ├── onboarding.rs
    │   │   ├── surveys.rs
    │   │   ├── finance.rs
    │   │   ├── search.rs
    │   │   ├── moderation.rs
    │   │   └── mod.rs
    │   ├── error.rs
    │   ├── main.rs
    │   └── routes.rs
    └── Cargo.toml
```

### 前端服务层

所有 `src/features/*/api/*.ts` 服务文件应已重构为使用 VIL 端点。

---

## 已知问题和限制

### 1. Email Digest

- Email digest (`digestApi.ts`) 仍在 Supabase Edge Function 中
- 将在 Phase 3C 处理

### 2. Realtime

- Discussions realtime (postgres_changes) 仍在 Supabase Realtime 中
- 将在 Phase 4 处理

### 3. PDF Generation

- Certificate PDF generation 仍在 Supabase Edge Function (`generate-pdf`)
- 将在 Phase 3 处理

### 4. Surveys + Finance

- 如果前端模块有 TODO stubs 或 < 50% 功能完成，已跳过
- 需要在 Phase 2B 或 Phase 3 中重新评估

### 5. Quiz Grading Worker

- 需要配置 `quiz_submission_queue` 表
- Worker 需要独立部署或作为后台任务

### 6. Test Accounts

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

---

## Phase 3 前置条件

在开始 Phase 3 之前，请确认：

1. ✅ Phase 2 所有测试通过
2. ✅ Shadow mode 验证完成
3. ✅ 手动 cutover triggers 可用
4. ✅ 前端服务层完全迁移到 VIL
5. ✅ 安全审查通过 (Gate 3)

---

## Phase 3 概述

Phase 3 涵盖：

- **3A:** Email + Push Notification Services (从 Edge Functions 迁移)
- **3B:** External Integrations (LTI, SCORM)
- **3C:** Advanced Features (AI Tutor, Essay Grading, PDF Generation)
- **3D:** Performance Optimization (Caching, Rate Limiting)

---

## 支持信息

- **Dev App:** `http://localhost:5173` (after `pnpm dev`)
- **VIL Server:** `http://localhost:8080`
- **Test JWTs:** See AGENTS.md 或 `/home/rog/Documents/edusync1/LMS/docs/TESTING.md`
