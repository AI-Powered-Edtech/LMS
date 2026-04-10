# Supabase Coupling Inventory

**Status:** COMPLETED

**Filled deliverable:** `docs/migration/SUPABASE_COUPLING_INVENTORY.md`

This file was a template. The actual filled inventory lives at the path above.

---

## 7-Bucket Summary

| Bucket              | Items        | Migration Phase          | Risk         |
| ------------------- | ------------ | ------------------------ | ------------ |
| 1: Auth/RPC         | 15+ items    | Phase 1                  | **Critical** |
| 2: Realtime         | 11 subs      | Phase 4                  | **Medium**   |
| 3: Storage          | 6 buckets    | Phase 5                  | **High**     |
| 4: Offline Sync     | 2 files      | Phase 5                  | **High**     |
| 5: RLS/Schema       | 9 tables     | Phase 0-2                | **Critical** |
| 6: Edge Functions   | 30 functions | Phase 3                  | **High**     |
| 7: Client Types     | 4 types      | Phase 0A (migrate-first) | **High**     |

**Total supabase-importing files:** 129

## Edge Functions (30 total)

ai-grade-essay, ai-tutor, bulk-import-users, check-plagiarism, check-rate-limit,
generate-ai-content, generate-course-outline, generate-executive-report,
generate-lesson-draft, generate-parent-report, generate-pdf,
generate-quiz-from-content, grade-quiz-attempt, health-check, load-quiz-data,
lti-grade-passback, lti-jwks, lti-launch, lti-oidc-login,
process-progress-events, progress-events, recommend-learning-path, scorm-extract,
send-email-digest, send-parent-digest, send-parent-otp, send-push,
transform-course-content, video-webhook, whatsapp-webhook

## Migration Order

1. **Phase 0A:** API abstraction (client types, ApiClient interface)
2. **Phase 1:** Auth + Schema (Bucket 1, 5)
3. **Phase 2:** CRUD + RPCs
4. **Phase 3:** Edge Functions (Bucket 6)
5. **Phase 4:** Realtime + Polling (Bucket 2)
6. **Phase 5:** Storage + Offline Sync (Bucket 3, 4)
7. **Phase 6:** Decommission

---

**Signed off:** 2026-04-10, Agent (Migration Planning)
