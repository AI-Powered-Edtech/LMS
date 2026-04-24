# 02 — Inventory Modul Existing

Peta modul yang sudah ada di codebase `/home/emp/Downloads/LMS`. Disusun 2026-04-24, terakhir update setelah superbatch cloud-agent + operator hardening.

**Total** (post-superbatch): **55+ domain** (13 baru dari migrasi 039-064), ~240 FE page/component, ~20 handler Rust wired (termasuk `midtrans_webhook`, `ai_tutor_real`, `report_real`, `embeddings_handler`, `events_worker` bin), ~100+ RPC Postgres, ~100+ tabel DB (schema expanded dengan academic foundation + Kurmer + finance + PPDB + AI).

## Modul baru dari superbatch (2026-04-24)

Ringkasan tambahan, untuk detail lihat roadmap fase 1-6 yang tercentang:

| Domain | Migrasi | FE surface | Rust handler | Status |
|---|---|---|---|---|
| Academic Foundation | 039-045 | AcademicYears, GradeLevels, RombelManagement, Subjects, Timetable, StudentDossier, StaffDossier pages | — | Schema + FE CRUD ✓, wiring partial |
| RBAC 10-role matrix | 046 | — | — | Schema ✓, middleware enforcement belum lengkap |
| Kurmer Assessment | 047-051 | AKM stimuli, P5 projects pages | — | Schema ✓ |
| Event bus outbox | 052 | — | `bin/events_worker.rs` | Worker compiles & runs; subscribers belum lengkap |
| Rapor Kurmer | 053, 062 | Rapor, RaporPrint pages | `report_real.rs` | Real endpoint mounted; PDF rendering masih browser-print |
| Finance Midtrans | 054 | ParentPortal (billing view) | `midtrans_webhook.rs` (SHA512 verify) | Webhook ✓; `create_payment` snap token masih stub (real Midtrans call belum) |
| BOS expense | 055 | BosTracking page | — | Schema + UI ✓, laporan generator belum |
| PPDB extended | 056 | PpdbJalur page | — | Schema + jalur CRUD ✓, flow lengkap belum |
| Integrations | 057 | Integrations page, Dapodik CSV FE export | — | CSV export (FE) ✓, async job processor belum |
| AI infra | 058 | AuthoringAssist, SpeedGraderAi, LessonAiTutor, ParentDigest, PrincipalInsights | `ai_tutor_real.rs`, `embeddings_handler.rs` | Komponen + endpoints ✓, integrasi ke existing pages partial |
| Audit + rate limit | 059, 061 | — | 12 audit triggers | Schema + triggers ✓, middleware enforcement belum |
| Counseling/BK + parent links + sikap | 060 | Counseling, ParentLinks pages | — | Schema + UI ✓ |
| Rombel attendance | 063 | RombelAttendance page (H/S/I/A per-day) | — | Schema + UI ✓, event integration belum |
| Stub tables | 064 | — | — | `onboarding_progress`, `tenant_subscriptions(+plan_id)` fill baseline gap |

## Legend

- **FULL**: wired FE↔BE, happy path works
- **PARTIAL**: sebagian wired, ada stub/fallback, butuh polish
- **STUB**: UI ada tapi backend belum/placeholder, atau sebaliknya

## Matriks modul

### Core (18 FULL)

| Modul | FE | BE | Status | Integrasi utama |
|---|---|---|---|---|
| Authentication | `/login`, `/register`, `/verify-email`, `/verify-2fa` | `auth/*` handlers, `users/refresh_tokens/mfa_factors` | FULL | Semua — AuthGuard lindungi semua route |
| Multi-tenancy | `/workspace-selector`, admin | `tenant_admin.rs`, `tenants`, `tenant_memberships`, `tenant_modules` | FULL | Foundational: semua data scoped `tenant_id` |
| Invitations | `/invite/:token`, `/join` | `tenant_invites.rs` | FULL | → enrollment → gradebook |
| Courses & Lessons | `/teacher/courses`, `/teacher/course-builder`, `/student/courses` | `courses.rs`, `courses/lessons/course_modules` | FULL | → enrollment, progress, course_stats |
| Assignments | `/student/assignments`, `/teacher/grader` | RPC proxy, `assignments`, `assignment_submissions` | FULL | → gradebook, notifications, peer review |
| Gradebook | `/teacher/gradebook`, `/student/grades`, `/parent/nilai` | RPC, `gradebook_entries`, pg_notify trigger | FULL | Hub: quiz, assignment, attendance menulis kemari |
| Notifications | `/notifications` | `notification_handlers.rs`, `notifications`, push+OTP+WA | FULL | Digunakan semua modul lifecycle |
| LTI 1.3 | `/lti/callback` | `lti_handlers.rs`, `lti_*` tables | FULL | Integrasi LMS external (jarang dipakai SD/SMP) |
| Parent Portal | `/register-parent`, `/parent/*` | RPC, `parent_notifications`, `parent_teacher_threads` | FULL | Read-only dari gradebook/attendance; write messages |
| Principal Dashboard | `/principal/*` | RPC executive overview | FULL | Aggregate dari semua modul |
| Administration | `/admin/users`, `/admin/administration` | `tenant_admin.rs` | FULL | Manage users, roles, feature flags |
| Onboarding | first-login flow | `onboarding.rs`, `teacher_onboarding_progress` | FULL | Guide user baru |
| Profile/Settings | `/profile`, `/settings` | RPC, `profiles`, `users` | FULL | Basic account mgmt |
| Feature Flags | `/admin/feature-flags` | `feature_flags` table | FULL | Gating per tenant |
| Storage | (file upload UI) | `storage/handlers.rs`, S3 | FULL | Lesson resources, assignment attachments |
| Realtime | (transport) | `realtime/*`, pg_notify + WS | FULL | Gradebook sync, live notifications |
| Video transcoding | (background) | `video_transcoding_jobs` + scheduler | FULL | Async job |
| Observability | (internal) | `observability.rs` shadow mode | FULL | Eng tooling |

### Partial (17)

| Modul | Problem | Root cause |
|---|---|---|
| Quiz & Assessment | `quiz_handlers.rs` exists tapi **tidak wired** di main.rs; RPC proxy handle | Migration in-progress: handler duplikat jalan via RPC; endpoint siap tapi tidak dipakai |
| Gamification/XP | `xp_gradebook_handlers.rs` tidak wired; RPC handle | Sama — dua-jalur redundant |
| AI Content Generation | Handler ada (generate_content, generate_quiz, grade_essay, tutor_chat); `ai_streaming_handlers.rs` **tidak wired** | Streaming tutor tidak terpasang |
| Plagiarism Detection | UI ada, handler **stub** (selalu `similarity_score: 0.0`) | Belum implementasi engine (API eksternal? ML sendiri?) |
| Anti-Cheat | Event recording works; report endpoint tidak wired | Reporting UI belum terhubung |
| Struggle Detection | RPC + UI OK, tapi signal sources tidak semua terhubung | Perlu wire ke progress events lebih thorough |
| Adaptive Paths | FE evaluator OK, backend orchestration belum jelas | Re-sequencing lessons server-side belum implementasi |
| Peer Review | Config + assignment OK, grading rubric terbatas | Enhancement, bukan broken |
| Reporting & Analytics | RPC-based works; `report_handlers.rs` tidak wired (pakai `stub_handlers`) | Export stub — PDF generator belum production |
| PPDB | Tables ada, UI ada, flow lengkap belum | Period mgmt, kuota, waitlist belum |
| Calendar | FE ada, RPC unclear | No dedicated handler |
| Announcements | FE ada, RPC unclear | Sama — lewat data plane generic |
| Forum/Discussions | FE ada, schema unclear (`group_messages`?) | Migration history tidak jelas |
| Moderation | UI ada, enforcement mechanism unclear | Tidak jelas apa yang terjadi setelah "mark flagged" |
| Recommendations | RPC stubs, ML model integration unclear | Heuristic atau ML? |
| Finance/Billing | Invoice table, dashboard RPC works; payment gateway integration external | Belum ada Midtrans/Xendit wiring |
| Attendance | FE ada (StudentAttendance, ScanAttendance), backend via RPC | Belum ada dedicated handler Rust — RPC generic |

### Stub (7)

| Modul | Status |
|---|---|
| Accessibility audit | Library FE ada, belum systematic enforcement |
| Report export (PDF) | Handler stub, returns 200 empty |
| AI Tutor streaming | Handler file ada, tidak imported |
| Forum schema | Unclear which table (group_messages atau discussion_threads) |
| Search cross-module | `search_questions` RPC works; broader search belum |
| Billing payment processor | Integrasi Midtrans/Xendit belum |
| Gamification Hubs aggregator | UI only, tidak ada logic khusus |

## Pattern arsitektur observasi

- **RPC-heavy**: domain logic mayoritas di PostgreSQL functions (`ALLOWED_RPCS` di `data_plane.rs`), bukan Rust handlers. Pro: fleksibel, bisa ditambah tanpa deploy. Kontra: business logic tersebar di SQL, testing sulit, versioning rumit.
- **Two-tier handler**: banyak modul punya Rust handler (tidak mount) + RPC (mount). Signal migrasi in-progress dari RPC → Rust handler, tapi banyak yang **stuck di tengah**.
- **Tenant isolation**: RLS di-disable (migration 009) — isolation via auth middleware + `tenant_id` di every query. Harus hati-hati: setiap RPC baru wajib filter tenant.
- **Real-time via pg_notify**: trigger DB → emit NOTIFY → Rust WsHub → client. Pattern bagus, dipakai gradebook & notifications.

## Existing Indonesia-specific features

✅ **PPDB** — modul ada (PARTIAL)
✅ **Parent portal (nilai, kehadiran)** — FULL
✅ **SCORM** — extraction handler
✅ **WhatsApp OTP** — handler + env credentials
✅ **Semester management** — schema OK (tabel ada, di allowlist setelah fix sweep)
⚠️ **Bahasa Indonesia UI** — mayoritas sudah, tapi beberapa halaman campur English (perlu audit)
❌ **Rapor Kurmer format** — belum
❌ **Dapodik export** — belum
❌ **AKM-style questions** — belum (ada quiz umum)
❌ **P5 module** — belum
❌ **BOS expense tracking** — belum
❌ **Struktur rombel + wali kelas** — role model belum cukup
❌ **Jam pelajaran (JP)** — tidak ada di schedule model
❌ **CP/ATP tagging** pada lesson — belum

## Open questions untuk tim

- Apakah dual-path (Rust handler vs RPC) disengaja, atau legacy migrasi yang belum selesai?
- Seberapa jauh mau pindahkan SQL RPC → Rust handler? (Costly, tapi clean.)
- Plagiarism: pakai Copyleaks / Turnitin API, atau bangun ML sendiri?
- Payment gateway: Midtrans (lebih familiar sekolah), Xendit (developer-friendly), atau keduanya?
