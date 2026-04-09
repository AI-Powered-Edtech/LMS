# Supabase Coupling Inventory — 7-Bucket Classification

> **Date:** **\*\***\_\_\_**\*\***  
> **Purpose:** Catalog all Supabase touchpoints and assign migration phases

---

## Bucket 1: Auth (Migrate Last — Phase 1)

**Rationale:** Auth is highest-risk migration. Gate 2 is a hard stop.

| File/Pattern                         | Count | Migration Phase |
| ------------------------------------ | ----- | --------------- |
| `supabase.auth.session()`            |       | Phase 1         |
| `supabase.auth.getSession()`         |       | Phase 1         |
| `supabase.auth.setSession()`         |       | Phase 1         |
| `supabase.auth.refreshSession()`     |       | Phase 1         |
| `supabase.auth.signInWithPassword()` |       | Phase 1         |
| `supabase.auth.signUp()`             |       | Phase 1         |
| `supabase.auth.signOut()`            |       | Phase 1         |
| `supabase.auth.onAuthStateChange()`  |       | Phase 1         |
| `get_auth_bootstrap` RPC             |       | Phase 1         |
| `mfaService.ts`                      |       | Phase 1         |
| `useAuth()` hook                     |       | Phase 1         |
| `AuthContext.tsx`                    |       | Phase 1         |

**Auth Migration Gate:** If parity fails → STOP, stay with Supabase Auth

---

## Bucket 2: RPCs / Stored Procedures (Migrate Phase 2)

**Rationale:** 21+ analytics RPCs. Keep as stored procedures initially.

| RPC Name                  | Count | Migration Phase |
| ------------------------- | ----- | --------------- |
| Analytics RPCs (list all) | 21+   | Phase 2         |
| `get_*` procedures        |       | Phase 2         |
| `upsert_*` procedures     |       | Phase 2         |
| `set_*` procedures        |       | Phase 2         |
| Tenant management RPCs    |       | Phase 1         |
| Quiz grading RPCs         |       | Phase 3         |

**Strategy:** Keep as PostgreSQL stored procedures initially. Migrate to Rust handlers if needed.

---

## Bucket 3: Realtime (Migrate Phase 4)

**Rationale:** 9 realtime hooks + 5 services. Complex reconnection semantics.

| Hook/Service                | Pattern              | Migration Phase |
| --------------------------- | -------------------- | --------------- |
| `useBuilderChannel.ts`      | Broadcast + presence | Phase 4         |
| `useBuilderPresence.ts`     | Presence tracking    | Phase 4         |
| `useNotifications.ts`       | postgres_changes     | Phase 4         |
| `useAdminNotifications.ts`  | postgres_changes     | Phase 4         |
| `discussionQueries.ts`      | postgres_changes     | Phase 4         |
| `useMessages.ts`            | Broadcast            | Phase 4         |
| `MessageThread.tsx`         | Broadcast            | Phase 4         |
| `classroomService.ts`       | postgres_changes     | Phase 4         |
| `groupAssignmentService.ts` | Broadcast            | Phase 4         |

**Realtime Migration Gate:** If WebSocket reliability < 99.9% → Keep Supabase Realtime

---

## Bucket 4: Storage (Migrate Phase 5)

**Rationale:** Upload/delete/getPublicUrl. Dual-write period required.

| File/Pattern                                | Count | Migration Phase |
| ------------------------------------------- | ----- | --------------- |
| `supabase.storage.from().upload()`          |       | Phase 5         |
| `supabase.storage.from().remove()`          |       | Phase 5         |
| `supabase.storage.from().getPublicUrl()`    |       | Phase 5         |
| `supabase.storage.from().createSignedUrl()` |       | Phase 5         |
| Storage service files                       | 5     | Phase 5         |

**Storage Decision:** May stay on Supabase if MinIO cost/effort > benefit

---

## Bucket 5: Edge Functions (Migrate Phase 3)

**Rationale:** 22 Edge Functions. Complex dependencies on Groq, LTI, SCORM.

| Function                    | Purpose       | Migration Phase  |
| --------------------------- | ------------- | ---------------- |
| `ai-grade-essay`            | AI grading    | Phase 3          |
| `ai-tutor`                  | AI tutor chat | Phase 3          |
| `generate-ai-content`       | Content gen   | Phase 3          |
| `generate-pdf`              | Certificate   | Phase 3          |
| `grade-quiz-attempt`        | Quiz grading  | Phase 3          |
| `load-quiz-data`            | Quiz load     | Phase 3          |
| `process-progress-events`   | Progress      | Phase 3          |
| `progress-events`           | Progress      | Phase 3          |
| `send-email-digest`         | Email         | Phase 3          |
| `send-push`                 | Push          | Phase 3          |
| `lti-jwks`                  | LTI 1.3       | Phase 3          |
| `lti-oidc-login`            | LTI           | Phase 3          |
| `lti-launch`                | LTI           | Phase 3          |
| `scorm-extract`             | SCORM         | Phase 3          |
| `generate-executive-report` | Reports       | Phase 3          |
| `generate-parent-report`    | Reports       | Phase 3          |
| `bulk-import-users`         | Import        | Phase 3          |
| `check-rate-limit`          | Rate limit    | Phase 3          |
| `send-parent-digest`        | Email         | Phase 3          |
| `send-parent-otp`           | WhatsApp      | Phase 3          |
| `whatsapp-webhook`          | WhatsApp      | Phase 3          |
| `health-check`              | Health        | Phase 1 (public) |

---

## Bucket 6: Database Schema (Migrate with Auth)

**Rationale:** RLS policies, triggers, functions. Critical for security.

| Component               | Count | Migration Phase |
| ----------------------- | ----- | --------------- |
| RLS policies            |       | With CRUD       |
| Triggers                |       | With CRUD       |
| Functions               |       | With CRUD       |
| `auth.users` FK mapping |       | Phase 1         |
| `user_roles` table      |       | Phase 1         |
| `tenants` table         |       | Phase 1         |
| Enum types              |       | Phase 0-2       |

**Strategy:** Port RLS policies to Rust middleware guards (Phase 1-2)

---

## Bucket 7: Polling Fallbacks (Migrate with Realtime)

**Rationale:** Offline sync and polling mechanisms. Migrate with Bucket 3.

| Pattern                    | Location                | Migration Phase |
| -------------------------- | ----------------------- | --------------- |
| Polling intervals          | React Query             | Phase 4         |
| Offline queue writes       | Services                | Phase 4         |
| Reconnection logic         | Hooks                   | Phase 4         |
| Admin notification polling | `useAdminNotifications` | Phase 4         |

---

## Summary Matrix

| Bucket            | Items | Migration Phase | Risk         | Gate     |
| ----------------- | ----- | --------------- | ------------ | -------- |
| 1: Auth           | 12    | Phase 1         | **Critical** | Gate 2   |
| 2: RPCs           | 21+   | Phase 2         | Medium       | None     |
| 3: Realtime       | 14    | Phase 4         | High         | Gate 5   |
| 4: Storage        | 5+    | Phase 5         | Medium       | May stay |
| 5: Edge Functions | 22    | Phase 3         | Medium       | None     |
| 6: Schema         | 20+   | Phase 0-2       | High         | Gate 3   |
| 7: Polling        | 10+   | Phase 4         | Low          | None     |

---

## Migration Order

1. **Phase 0:** API abstraction (all buckets isolated)
2. **Phase 1:** Auth + Schema (Bucket 1, 6)
3. **Phase 2:** CRUD + RPCs (Bucket 2, 6)
4. **Phase 3:** Edge Functions (Bucket 5)
5. **Phase 4:** Realtime + Polling (Bucket 3, 7)
6. **Phase 5:** Storage (Bucket 4)
7. **Phase 6:** Decommission

---

**Inventory Version:** 1.0  
**Status:** Draft
