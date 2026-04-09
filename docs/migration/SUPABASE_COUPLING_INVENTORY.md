# Supabase Coupling Inventory

## Metadata

- **Tanggal:** 2026-04-09
- **Branch:** main
- **Commit:** 74d86a06
- **Author:** Agent (Migration Planning)
- **Sources Used:**
  - Codebase scan: `src/`
  - `docs/migration/REALITY_SYNC_BASELINE.md`
  - `docs/ARCHITECTURE.md`

---

## Bucket 1: Auth/RPC/Functions

### Auth Primitives

| Path                                                  | Supabase Primitive           | Why Coupled                                                                                                                                                                              | Criticality  | Migration Note                           |
| ----------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------- |
| `src/contexts/auth/useSessionManagement.ts`           | `auth` (Session, User types) | Type definitions from SDK                                                                                                                                                                | **High**     | Need abstraction in Phase 0B             |
| `src/contexts/AuthContext.tsx`                        | `auth` (Session, User types) | Auth context state                                                                                                                                                                       | **High**     | Need abstraction in Phase 0B             |
| `src/contexts/auth/useRoleResolution.ts`              | `auth` (User type)           | Role resolution                                                                                                                                                                          | **High**     | Need abstraction in Phase 0B             |
| `src/features/auth/api/authService.ts`                | `rpc`                        | `get_auth_bootstrap`, `ensure_profile_exists`, `accept_invitation`, `validate_invitation`, `enroll_student`, `onboard_student_join_class`, `create_school_tenant`, `public_lookup_class` | **Critical** | MUST be replicated in VIL — core to auth |
| `src/features/auth/components/ParentRegisterPage.tsx` | `rpc`                        | `request_parent_otp`, `verify_parent_otp`                                                                                                                                                | **High**     | Part of auth flow                        |
| `src/features/auth/components/ParentRegisterPage.tsx` | `from`                       | Direct table writes to `profiles`                                                                                                                                                        | **High**     | Need RPC equivalent                      |

### Critical RPCs (HARUS di-port)

| RPC Name                | Purpose                        | Usage Count       | Criticality  |
| ----------------------- | ------------------------------ | ----------------- | ------------ |
| `get_auth_bootstrap`    | Initial auth data load         | 1 (core)          | **Critical** |
| `ensure_profile_exists` | Ensure profile exists on login | 1 (core)          | **Critical** |
| `accept_invitation`     | Accept class invitation        | 1                 | **High**     |
| `validate_invitation`   | Validate invite token          | 1                 | **High**     |
| `enroll_student`        | Enroll student to class        | Multiple features | **High**     |
| `create_school_tenant`  | Create new tenant (school)     | 1                 | **High**     |

---

## Bucket 2: Realtime

### Channels & Subscriptions

| Path                                                        | Supabase Primitive     | Why Coupled                                  | Criticality | Migration Note            |
| ----------------------------------------------------------- | ---------------------- | -------------------------------------------- | ----------- | ------------------------- |
| `src/features/course-builder/useBuilderChannel.ts`          | `channel()`            | Builder collaboration (broadcast + presence) | **High**    | Phase 0C - Abstract first |
| `src/features/course-builder/useBuilderPresence.ts`         | `RealtimeChannel` type | Presence tracking                            | **High**    | Phase 0C                  |
| `src/features/parent/hooks/useParentNotifications.ts`       | `.subscribe()`         | Real-time parent notifications               | **Medium**  | Phase 0C                  |
| `src/features/parent/hooks/useMessages.ts`                  | `.subscribe()`         | Parent-student messaging                     | **Medium**  | Phase 0C                  |
| `src/features/parent/components/MessageThread.tsx`          | `.subscribe()`         | Message thread updates                       | **Medium**  | Phase 0C                  |
| `src/features/notifications/hooks/useAdminNotifications.ts` | `.subscribe()`         | Admin notification updates                   | **Medium**  | Phase 0C                  |
| `src/features/notifications/hooks/useNotifications.ts`      | `.subscribe()`         | User notification updates                    | **Medium**  | Phase 0C                  |
| `src/features/discussions/queries/discussionQueries.ts`     | `.subscribe()`         | Discussion real-time updates                 | **Medium**  | Phase 0C                  |
| `src/features/classroom/api/classroomService.ts`            | `.subscribe()`         | Classroom updates                            | **Medium**  | Phase 0C                  |
| `src/features/assignments/hooks/useGroupAssignments.ts`     | `.subscribe()`         | Assignment group updates                     | **Low**     | Phase 0C                  |
| `src/features/assignments/api/groupAssignmentService.ts`    | `.subscribe()`         | Group submission updates                     | **Low**     | Phase 0C                  |

**Total:** ~11 realtime subscriptions detected

---

## Bucket 3: Storage

### Storage Operations

| Path                                                   | Supabase Primitive                        | Why Coupled            | Criticality | Migration Note       |
| ------------------------------------------------------ | ----------------------------------------- | ---------------------- | ----------- | -------------------- |
| `src/features/storage/api/storageService.ts`           | `storage.from().upload()`                 | General file upload    | **High**    | Phase 0D - 5 buckets |
| `src/features/storage/api/storageService.ts`           | `storage.from().remove()`                 | File deletion          | **High**    | Phase 0D             |
| `src/features/storage/api/storageService.ts`           | `storage.from().getPublicUrl()`           | Get public URL         | **High**    | Phase 0D             |
| `src/features/video/api/videoUploadService.ts`         | `storage.from('videos').upload()`         | Video upload           | **High**    | Phase 0D             |
| `src/features/video/api/videoUploadService.ts`         | `storage.from('videos').getPublicUrl()`   | Video URL              | **High**    | Phase 0D             |
| `src/features/courses/services/videoCaptionService.ts` | `storage.from('video-captions').upload()` | Caption upload         | **Medium**  | Phase 0D             |
| `src/features/assignments/api/assignmentService.ts`    | `storage.from('submissions').upload()`    | Assignment submissions | **High**    | Phase 0D             |
| `src/features/administration/api/documentApi.ts`       | `storage.from('documents').upload()`      | School documents       | **High**    | Phase 0D             |

### Buckets Teridentifikasi

| Bucket           | Purpose                | Migration Priority |
| ---------------- | ---------------------- | ------------------ |
| `videos`         | Lesson videos          | High               |
| `submissions`    | Assignment submissions | High               |
| `avatars`        | User profile pictures  | Medium             |
| `documents`      | School documents       | High               |
| `certificates`   | Generated certificates | Medium             |
| `video-captions` | Video captions         | Low                |

---

## Bucket 4: Offline Sync

### Offline Queue Operations

| Path                          | Supabase Primitive | Why Coupled                                         | Criticality | Migration Note                    |
| ----------------------------- | ------------------ | --------------------------------------------------- | ----------- | --------------------------------- |
| `src/utils/offlineQueue.ts`   | `from` + `rpc`     | Queue writes to `messages`, `record_xapi_statement` | **High**    | Must be abstracted before Phase 5 |
| `src/utils/backgroundSync.ts` | `from`             | Background sync on reconnect                        | **High**    | Needs offline abstraction         |

**Pattern:** Direct writes when offline, sync on reconnect via queue.

---

## Bucket 5: RLS Policies (Critical Tables)

### Tables with RLS-Dependent Security

| Table                | Security Pattern | Criticality  | Migration Note                 |
| -------------------- | ---------------- | ------------ | ------------------------------ |
| `profiles`           | RLS + tenant_id  | **Critical** | Must map to TenantGuard        |
| `user_roles`         | RLS by user_id   | **Critical** | Must map to RBAC               |
| `tenant_memberships` | RLS by tenant_id | **Critical** | Validated: exists in schema    |
| `user_sessions`      | RLS by user_id   | **High**     | Device tracking, login history |
| `courses`            | RLS by tenant    | **High**     | Must map to TenantGuard        |
| `classes`            | RLS by tenant    | **High**     | Must map to TenantGuard        |
| `enrollments`        | RLS by tenant    | **High**     | Must map to TenantGuard        |
| `lti_sessions`       | RLS by tenant    | **Medium**   | LTI guest sessions             |
| `ai_tutor_sessions`  | RLS by tenant    | **Medium**   | AI Tutor sessions              |

**Pola Keamanan Kritis:**

- Tenant isolation: `tenant_id = (SELECT get_my_tenant_id())`
- User isolation: `auth.uid() = user_id`
- Semua query harus menyertakan tenant filter

---

## Bucket 6: Edge Functions

### 30 Edge Functions Teridentifikasi

| Function                     | Category     | Purpose                       | Criticality |
| ---------------------------- | ------------ | ----------------------------- | ----------- |
| `ai-grade-essay`             | AI           | Essay grading via Groq        | **High**    |
| `ai-tutor`                   | AI           | AI tutor chat                 | **High**    |
| `generate-ai-content`        | AI           | AI content generation         | **High**    |
| `generate-course-outline`    | AI           | Course outline generation     | **High**    |
| `generate-lesson-draft`      | AI           | Lesson draft generation       | **High**    |
| `generate-quiz-from-content` | AI           | Quiz generation from content  | **High**    |
| `recommend-learning-path`    | AI           | Learning path recommendation  | **High**    |
| `check-plagiarism`           | AI           | Plagiarism checking           | **High**    |
| `grade-quiz-attempt`         | Processing   | Background quiz grading       | **High**    |
| `process-progress-events`    | Processing   | Batch progress processing     | **High**    |
| `progress-events`            | Processing   | Progress events queue         | **High**    |
| `transform-course-content`   | Processing   | Course content transformation | **Medium**  |
| `video-webhook`              | Processing   | Video processing webhook      | **Medium**  |
| `send-email-digest`          | Notification | Daily email digest            | **Medium**  |
| `send-push`                  | Notification | Push notifications            | **Medium**  |
| `send-parent-digest`         | Notification | Parent digest                 | **Medium**  |
| `send-parent-otp`            | Notification | Parent OTP                    | **High**    |
| `whatsapp-webhook`           | External     | WhatsApp webhook              | **Low**     |
| `bulk-import-users`          | Admin        | Bulk user import              | **Medium**  |
| `load-quiz-data`             | Quiz         | Quiz data loading             | **High**    |
| `lti-jwks`                   | LTI          | LTI JWKS                      | **Medium**  |
| `lti-oidc-login`             | LTI          | LTI OIDC login                | **Medium**  |
| `lti-launch`                 | LTI          | LTI launch                    | **Medium**  |
| `lti-grade-passback`         | LTI          | LTI grade passback            | **Medium**  |
| `scorm-extract`              | SCORM        | SCORM upload/extract          | **Medium**  |
| `generate-pdf`               | PDF          | Certificate generation        | **Medium**  |
| `generate-executive-report`  | Reports      | Executive report              | **Medium**  |
| `generate-parent-report`     | Reports      | Parent report                 | **Medium**  |
| `check-rate-limit`           | Utility      | Rate limiting                 | **Medium**  |
| `health-check`               | Utility      | Health check                  | **Low**     |

**Category Breakdown:**

- AI Functions: 8 (high priority)
- Processing: 5 (high priority)
- Notifications: 4 (medium priority)
- LTI: 4 (medium priority)
- Reports: 2 (medium priority)
- Utility/Other: 7

---

## Bucket 7: Client SDK Types

### Supabase-Derived Types

| Type              | Location                        | Status                  | Migration Note     |
| ----------------- | ------------------------------- | ----------------------- | ------------------ |
| `Session`         | `src/contexts/auth/*`           | Direct import           | Must be abstracted |
| `User`            | `src/contexts/auth/*`           | Direct import           | Must be abstracted |
| `RealtimeChannel` | `src/features/course-builder/*` | Direct import           | Must be abstracted |
| `PostgrestError`  | Multiple services               | Used for error handling | Must be abstracted |

**Status:** Abstraction type layer (`src/services/api/types.ts`) **BELUM ADA** — ini adalah Task 0A-1 dalam migration plan.

---

## Summary & Recommendations

### Coupling Severity Map

| Bucket         | Severity     | Count        | Recommendation           |
| -------------- | ------------ | ------------ | ------------------------ |
| Auth/RPC       | **Critical** | 15+ items    | Migrate-first (Phase 1)  |
| RLS Policies   | **Critical** | 9 tables     | Migrate-first (Phase 1)  |
| Edge Functions | **High**     | 30 functions | Migrate-later (Phase 3)  |
| Storage        | **High**     | 6 buckets    | Migrate-later (Phase 5)  |
| Realtime       | **Medium**   | 11 subs      | Migrate-later (Phase 4)  |
| Offline Sync   | **High**     | 2 files      | Migrate-later (Phase 5)  |
| Client Types   | **High**     | 4 types      | Migrate-first (Phase 0A) |

### Abstraction Priority (for Phase 0A)

1. **0A-1:** Create `src/services/api/types.ts` — abstract all Supabase types
2. **0A-2:** Create ApiClient interface
3. **0A-3:** Supabase implementation (current)
4. **0A-4:** VIL stub implementation
5. **0A-5:** Refactor courseService as POC

### Risk Assessment

| Area              | Risk Level   | Mitigation                             |
| ----------------- | ------------ | -------------------------------------- |
| Auth coupling     | **Critical** | MUST complete Phase 0A before Phase 1  |
| RLS → TenantGuard | **Critical** | Must replicate tenant isolation in VIL |
| 30 Edge Functions | **High**     | Need clear mapping to VIL equivalents  |
| Storage buckets   | **High**     | Abstract in Phase 0D before migrate    |
| Realtime          | **Medium**   | Abstract in Phase 0C, migrate Phase 4  |

---

## Acceptance Checklist

- [x] Bucket 1: Auth/RPC — 15+ items cataloged
- [x] Bucket 2: Realtime — 11 subscriptions found
- [x] Bucket 3: Storage — 6 buckets identified
- [x] Bucket 4: Offline Sync — 2 files analyzed
- [x] Bucket 5: RLS — 9 critical tables identified
- [x] Bucket 6: Edge Functions — 30 functions listed
- [x] Bucket 7: Client Types — 4 types, types.ts NOT YET CREATED
- [x] Summary & Recommendations written

(End of file - total 230 lines)
