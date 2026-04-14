# EduSync — Feature Reference

## 1. Courses

- Create, edit, and publish courses with rich metadata (title, description, thumbnail, status)
- Course status lifecycle: `draft` → `in_review` → `approved` → `published` → `archived`
- Course modules (sections) and lessons with drag-and-drop ordering (`"order"` column, SQL reserved word — must be quoted)
- Lesson types: video (HLS streaming), text/rich content, quiz, SCORM package, file attachment
- Collaborative course builder with real-time presence (`builder:{course_id}` WebSocket channel)
- Course collaborators (co-teachers) via `course_collaborators` table

## 2. Assessments

### Quizzes

- Multiple-choice questions (MCQ) and essay questions
- Question bank with reusable questions
- Time-limited quizzes
- Anti-cheat measures (tab detection, fullscreen enforcement)
- Auto-grading for MCQ; AI-assisted grading for essays
- Student attempt history and score tracking

### Assignments

- Individual and group assignments
- File submission (up to 20 MB via `assignment-submissions` bucket)
- Due dates and late submission policies
- Peer review workflow
- Rubric-based grading

### Rubrics

- Custom rubric builder with criteria and performance levels
- Reusable rubrics across assignments
- Rubric-linked SpeedGrader

## 3. Gradebook

- Per-course grade overview for teachers
- SpeedGrader: inline grading with rubric overlay
- Manual grade entry and override
- Weighted grade calculation
- Grade export (CSV)
- LTI grade passback to external platforms

## 4. AI Features

All AI features use the Groq LLM API (`GROQ_API_KEY` required).

- **AI Essay Grading** (`POST /api/v1/ai/grade-essay`): automated essay evaluation against rubric criteria
- **AI Tutor** (`POST /api/v1/ai/tutor`): conversational study assistant for students
- **Content Generation** (`POST /api/v1/ai/generate-content`): generate lesson content from a topic/outline
- **Quiz Generation** (`POST /api/v1/ai/generate-quiz`): generate MCQ questions from lesson content

## 5. Notifications

### In-App Notifications

- Real-time delivery via WebSocket (`notifications:{user_id}` channel)
- pg_notify trigger on `notifications` table INSERT
- Mark as read, notification center UI

### Email

- SMTP-based email delivery (lettre crate)
- Email digest for daily activity summaries (via cron job)
- Password reset and email verification emails

### Web Push (VAPID)

- Browser push notifications via Web Push Protocol
- `POST /api/v1/push/send` endpoint
- Requires `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY`

### WhatsApp OTP

- OTP sent via WhatsApp Business API (Meta Graph API)
- `POST /api/v1/whatsapp/send-otp` and `POST /api/v1/whatsapp/verify-otp`
- Used for parent portal phone verification

## 6. Realtime

- **Collaborative Course Builder**: presence tracking + broadcast for cursor positions, edits
- **Live Notifications**: instant delivery via WebSocket + pg_notify
- **Discussions**: real-time new reply notifications (`discussions:tenant:{tenant_id}`)
- **Classroom Events**: live classroom activity via `classroom:{class_id}` channel
- **Messages**: direct/group messaging via `messages:{room_id}` channel

See [REALTIME.md](REALTIME.md) for architecture and protocol details.

## 7. Analytics

### Student Analytics

- Lesson completion tracking (`student_lesson_signals` table)
- Time spent per lesson (`total_time_spent`)
- Quiz score history (`latest_quiz_score`)
- Course progress percentage

### Teacher Analytics

- Class performance overview
- Student struggle detection (automatic identification of at-risk students)
- Per-lesson engagement metrics
- Assignment submission rate

### Admin / Executive Reports

- Tenant-wide engagement metrics
- Active users, completion rates
- Report export (CSV, PDF)
- Principal executive dashboard

## 8. LTI 1.3

- Full LTI 1.3 platform integration
- OIDC login flow (`GET /api/v1/lti/oidc-login`)
- JWT-based launch (`POST /api/v1/lti/launch`)
- JWKS public endpoint for platform verification (`GET /api/v1/lti/jwks`, no auth required)
- Guest user provisioning: deterministic email `lti-{platformId8}-{sub}@lti.edusync.internal`
- LTI grade passback to external gradebooks
- Env vars: `LTI_RSA_PRIVATE_KEY`, `LTI_RSA_PUBLIC_KEY`, `LTI_LAUNCH_URL`, `APP_URL`

## 9. SCORM

- SCORM ZIP package upload via storage API
- Server-side extraction and indexing (`POST /api/v1/scorm/extract`)
- SCORM player with API bridge (attached to parent `window`, not iframe)
- Runtime data tracking in `scorm_runtime_data` table
- Sticky terminal states: `completed`/`passed` cannot revert
- `lesson_resources.type` CHECK includes `'scorm'`

## 10. Gamification

- **XP (Experience Points)**: awarded for lesson completion, quiz scores, assignments
- **Levels**: calculated from total XP thresholds
- **Badges**: custom badge definitions per tenant, automatically awarded based on criteria
- **Leaderboard**: tenant-scoped XP ranking, cached in `leaderboard_cache`
  - Route must include both `student` and `teacher`: `role={["student", "teacher"]}`
- **Streaks**: daily login and activity streaks
- **Quests**: gamified challenge sequences

## 11. Multi-Tenancy

- Each school is an independent tenant with its own isolated data
- `tenant_id` column on all tables, enforced at the VIL API layer (no RLS)
- Tenant creation by admin: `POST /api/v1/auth/create-tenant`
- Student enrollment flow: invitation → `validate-invitation` → `accept-invitation` → `enroll`
- Class lookup by code: `GET /api/v1/auth/lookup-class`
- `auto_set_tenant_id()` trigger for automatic tenant_id population

## 12. PWA (Progressive Web App)

- Service worker via `vite-plugin-pwa`
- Offline support for previously loaded content
- Install prompt on mobile and desktop
- Background sync for offline actions

## 13. Storage

- Video upload up to 500 MB (presigned PUT direct to S3 for files ≥ 10 MB)
- File attachments per lesson (up to 50 MB)
- Avatar image upload (up to 2 MB)
- Certificate PDF generation and storage
- Signed URLs for private content access

See [STORAGE.md](STORAGE.md) for bucket definitions and upload flow.

## 14. Parent Portal

- Parents can view their child's course progress, grades, and attendance
- WhatsApp OTP verification for parent account linking
- Notifications on assignment submission and grade posting

## 15. Bulk Operations

- **CSV User Import** (`POST /api/v1/import/users`): bulk create students/teachers from CSV file
- **Bulk Grading**: grade multiple submissions simultaneously in SpeedGrader
- **Bulk Enrollment**: enroll multiple students at once via class code or CSV

## 16. Additional Features

- **Attendance tracking**: per-class attendance records
- **Academic calendar**: term/semester management
- **Announcements**: school-wide and class-specific announcements
- **Discussions**: threaded forum per lesson/course
- **Search**: global full-text search across courses and lessons
- **Dark mode**: full dark mode support via ThemeContext
- **Math rendering**: KaTeX for LaTeX math expressions in lessons and quizzes
- **Video captions**: VTT/SRT subtitle support in video player (hls.js)
- **QR codes**: class join QR code generation
- **Adaptive learning paths**: personalized content sequencing
- **xAPI (Experience API)**: learning activity tracking for LRS integration
