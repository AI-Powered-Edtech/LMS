# EduSync LMS — User Flows

> Dokumen ini menjabarkan setiap flow utama per-role: screen-by-screen, decision points, edge cases, dan state transitions.
> Referensi: `UX_BLUEPRINT.md` untuk design specs, `SCREEN_SPECS.md` untuk wireframes detail.

---

## Daftar Isi

1. [Student Flows](#1-student-flows)
2. [Teacher Flows](#2-teacher-flows)
3. [Admin Flows](#3-admin-flows)
4. [Cross-Role Flows](#4-cross-role-flows)

---

## 1. Student Flows

### 1.1 Authentication Flow

```
[Halaman Login]
     │
     ├─ Sudah login? ──── YES ──→ [RoleResolver] ──→ [Dashboard]
     │
     NO
     │
     ├─ Mode: Sign In
     │    │
     │    ├─ Email + Password ──→ Supabase Auth
     │    │    ├─ Success ──→ [RoleResolver] ──→ [Student Dashboard /]
     │    │    ├─ Error: Invalid credentials ──→ Toast error, tetap di Login
     │    │    └─ Error: Email not verified ──→ Toast "Cek email"
     │    │
     │    └─ Demo Quick Login (dev only)
     │         └─ student@demo.com ──→ [Dashboard]
     │
     ├─ Mode: Register
     │    │
     │    ├─ Nama + Email + Password
     │    │    ├─ Success ──→ "Registrasi berhasil! Cek email untuk verifikasi"
     │    │    └─ Error: Email sudah terdaftar ──→ Toast error
     │    │
     │    └─ Dari Invitation Link (/?token=XXX)
     │         └─ Email pre-filled ──→ Register ──→ Auto-join class ──→ [Dashboard]
     │
     └─ Forgot Password
          └─ Email ──→ Reset link terkirim ──→ [ResetPassword] ──→ [Login]
```

**Edge Cases:**
- Token invitation expired → toast error, redirect ke Login
- Session expired saat di app → AuthGuard redirect ke Login, preserve intended URL
- Multiple tabs → SessionManager sync across tabs

---

### 1.2 Dashboard Flow (Critical Path)

```
[Student Dashboard /]
     │
     ├─ Section: Welcome Card
     │    └─ Tampilkan: nama, streak 🔥, XP ⭐, level 🎓
     │
     ├─ Section: Kelas Saya
     │    ├─ Ada kelas ──→ [ClassCard] × N ──click──→ [StudentClassPage /:classId]
     │    ├─ Tidak ada ──→ EmptyState "Belum ada kelas" + [Gabung Kelas]
     │    └─ [+ Gabung Kelas] ──→ Join Modal ──→ Masukkan kode ──→ Success/Error
     │
     ├─ Section: Tugas Mendekati Deadline
     │    ├─ Ada tugas ──→ [AssignmentItem] × 3 ──click──→ [Assignments /assignments]
     │    └─ Tidak ada ──→ EmptyState "Tidak ada tugas mendesak" ✅
     │
     ├─ Section: Lanjutkan Belajar
     │    ├─ Ada course ──→ [CourseCard] × 4 ──click──→ [LessonViewer /lesson?moduleId=X]
     │    └─ Tidak ada ──→ EmptyState "Belum ada materi" + [Gabung Kelas]
     │
     ├─ Section: Pengumuman Terbaru
     │    ├─ Ada ──→ [AnnouncementItem] × 2 ──click──→ [Announcements /announcements]
     │    └─ Tidak ada ──→ EmptyState "Belum ada pengumuman"
     │
     ├─ Section: Leaderboard Snapshot
     │    └─ Tampilkan rank dari API, progress ke rank berikutnya
     │
     ├─ Section: Ruang Belajar (Hub)
     │    └─ [Smart Player] [Kuis] [Pusat Tugas] [Tugas Kelompok]
     │         └─ click ──→ navigasi ke page masing-masing
     │
     └─ Section: Progress & Gamification
          ├─ [XP Card] ──→ level progress bar
          ├─ [Achievements] ──→ badges yang earned ──click──→ Badge Detail Modal
          └─ [Quiz History] ──→ recent quiz attempts ──click──→ AttemptDetail Modal
```

**UX Requirements:**
- Dashboard → Lesson harus max **2 klik** (click course card → langsung di lesson viewer)
- Setiap section harus punya skeleton loading saat fetch
- Setiap section harus punya empty state yang actionable
- Data schedule, leaderboard rank, progress — **HARUS dari API** (currently hardcoded)

---

### 1.3 Learning Flow (Paling Critical)

```
[Dashboard: Lanjutkan Belajar]
     │
     click CourseCard
     │
[LessonViewer /lesson?moduleId=X]
     │
     ├─ Load module + lessons list
     │    └─ Skeleton loading saat fetch
     │
     ├─ Sidebar: Lesson List (virtualized)
     │    ├─ ✅ Completed lessons — clickable, green check
     │    ├─ ▶ Current lesson — highlighted, auto-selected
     │    └─ 🔒 Locked lessons — grayed out (sequential unlock)
     │
     ├─ Content Area: Render berdasarkan lesson type
     │
     │    ┌─ TYPE: VIDEO ─────────────────────────────┐
     │    │ [VideoViewer]                               │
     │    │  ├─ HTML5 player, no download               │
     │    │  ├─ Anti-skip: can't seek beyond watched    │
     │    │  ├─ Transcript panel (right sidebar)        │
     │    │  │    ├─ Clickable timestamps (visited only) │
     │    │  │    └─ Lock icon for unwatched portions    │
     │    │  ├─ Completion: 95% watched → auto-complete │
     │    │  └─ Network recovery: overlay saat buffering │
     │    └───────────────────────────────────────────────┘
     │
     │    ┌─ TYPE: ARTICLE ───────────────────────────┐
     │    │ [ArticleViewer]                            │
     │    │  ├─ Sanitized HTML / Markdown content      │
     │    │  ├─ Reading time tracker (visibility-aware) │
     │    │  ├─ Scroll progress tracker                 │
     │    │  ├─ Sticky banner: time + scroll progress   │
     │    │  └─ Completion: min reading time + scroll   │
     │    │       to bottom → auto-complete              │
     │    └───────────────────────────────────────────────┘
     │
     │    ┌─ TYPE: QUIZ ──────────────────────────────┐
     │    │ [QuizViewer]                               │
     │    │  └─ Redirect ke Quiz Player flow (1.4)     │
     │    └───────────────────────────────────────────────┘
     │
     │    ┌─ TYPE: ASSIGNMENT ────────────────────────┐
     │    │ [AssignmentViewer]                          │
     │    │  ├─ Assignment info: title, points, due     │
     │    │  ├─ Instructions (prose-styled)             │
     │    │  ├─ Submission textarea + file upload       │
     │    │  ├─ Submit / Unsubmit toggle                │
     │    │  └─ Graded: feedback + score displayed      │
     │    └───────────────────────────────────────────────┘
     │
     ├─ ProgressReporter: auto-track progress ke backend
     │    └─ Debounced, berjalan di background
     │
     ├─ AI Tutor Panel (right sidebar, collapsible)
     │    ├─ Suggested questions (awal)
     │    ├─ Chat interface — context-aware per lesson
     │    ├─ Difficulty level badge
     │    └─ Clear chat + session management
     │
     ├─ Discussion Board (below content)
     │    └─ Comments per lesson
     │
     └─ On Completion:
          ├─ XP awarded → visual feedback
          ├─ Next lesson unlocked in sidebar
          └─ [NEEDED] "Lanjut ke Pelajaran Berikutnya" button
```

**Decision Points:**
- Lesson belum selesai tapi click lesson lain → allowed (progress tersimpan)
- All lessons complete → module complete → progress updated di course level
- Network offline → OfflineBanner, queued progress reports
- Video seed data kosong → dev-only button "Seed Dummy Videos"

---

### 1.4 Quiz Taking Flow

```
[Quiz Page /quiz]
     │
     ├─ Stats Bar: Total kuis | Selesai | Rata-rata | Total poin
     │
     ├─ Search + Class Filter
     │
     ├─ Tab: Tersedia
     │    │
     │    └─ [QuizCard] × N
     │         │
     │         ├─ Status: Available → [Mulai]
     │         │    └─ click ──→ StartQuizModal (konfirmasi)
     │         │         ├─ Confirm ──→ start_quiz_attempt RPC ──→ [QuizPlayer]
     │         │         └─ Cancel ──→ tetap di Quiz Page
     │         │
     │         ├─ Status: In Progress → [Lanjutkan]
     │         │    └─ click ──→ resume attempt ──→ [QuizPlayer]
     │         │
     │         └─ Status: Expired → disabled, "Waktu habis" badge
     │
     └─ Tab: Selesai
          └─ [QuizAttemptCard] × N ──click──→ AttemptDetail Modal
               └─ Score, answers, correct/incorrect marking

[QuizPlayer — Full Screen Mode]
     │
     ├─ Header: title, question counter, save status, time remaining
     │
     ├─ Anti-Cheat: tab switch → warning overlay (Eye icon, amber)
     │
     ├─ Offline: WifiOff indicator, autosave paused warning
     │
     ├─ Layout:
     │    ├─ Desktop: Sidebar (QuestionPalette grid) + Main (question)
     │    └─ Mobile: Horizontal scroll palette + Main
     │
     ├─ Question Flow:
     │    │
     │    ├─ Read question + answer options
     │    ├─ Select answer (MCQ / multiple select / short answer)
     │    ├─ [F] Flag question for review
     │    ├─ [→] Next question / [←] Previous question
     │    ├─ Autosave: 3s debounce after each answer change
     │    └─ QuestionPalette: color-coded (answered/unanswered/flagged/current)
     │
     ├─ Timer:
     │    ├─ Countdown display
     │    ├─ Warning at 5 min, 1 min remaining
     │    └─ Time up → auto-submit
     │
     ├─ Review Screen (last question → "Selesai"):
     │    ├─ Grid of all questions with status
     │    ├─ Jump to any question
     │    ├─ Summary: answered / unanswered / flagged
     │    └─ [Submit] → ConfirmDialog → submit_quiz RPC
     │
     └─ [QuizResultsView]
          ├─ Passed (score >= passing):
          │    ├─ Green header, Trophy icon, "Selamat!"
          │    ├─ Confetti animation (3s)
          │    ├─ Performance badge (Excellent/Good/Needs Improvement)
          │    ├─ Stats: score %, correct count, bonus XP
          │    └─ [Kembali ke Daftar Kuis] [Lihat Jawaban]
          │
          ├─ Failed (score < passing):
          │    ├─ Red header, XCircle, "Jangan Menyerah!"
          │    ├─ Stats: score %, correct count
          │    └─ [Kembali] [Coba Lagi] (if attempts remaining)
          │
          └─ Pending Grade (manual grading needed):
               ├─ Amber header, Clock icon, "Menunggu Penilaian"
               └─ [Kembali ke Daftar Kuis]
```

**Edge Cases:**
- Network loss during quiz → offline indicator, autosave paused, resume on reconnect
- Browser crash → heartbeat detects, attempt resumable on next visit
- Tab switch → warning (not kick), logged for teacher review
- Time expires → auto-submit with whatever is answered
- Max attempts reached → quiz card disabled, "Batas percobaan tercapai"

---

### 1.5 Assignment Submission Flow

```
[Assignments /assignments]
     │
     ├─ Tab: Aktif (pending assignments)
     │    └─ [AssignmentCard] ──click──→ Assignment Detail
     │
     ├─ Tab: Dikumpulkan (submitted)
     │    └─ [AssignmentCard with status] ──click──→ View submission
     │
     └─ Tab: Dinilai (graded)
          └─ [AssignmentCard with score] ──click──→ View feedback

[Assignment Detail — via LessonViewer or standalone]
     │
     ├─ Read Instructions
     │
     ├─ Write Answer (textarea)
     │    └─ [Attach File] → file picker → upload progress
     │
     ├─ [Submit] → Konfirmasi → submit_assignment RPC
     │    ├─ Success → toast "Tugas berhasil dikumpulkan" + status update
     │    └─ Error → toast error, tetap di form
     │
     ├─ [Unsubmit] (if already submitted, before deadline)
     │    └─ Konfirmasi → unsubmit → edit allowed again
     │
     └─ After Grading:
          ├─ Score displayed
          ├─ Teacher feedback section (green card)
          └─ Textarea disabled
```

---

### 1.6 Social & Info Flow

```
[Dashboard] → [Sosial & Info Hub (Sidebar)]
     │
     ├─ [Forum /forum]
     │    ├─ Browse discussions by category
     │    ├─ Search + filter
     │    ├─ Create new post (title + content + category)
     │    │    ├─ Anonymous option
     │    │    └─ Profanity filter check
     │    ├─ Vote (up/down) on posts
     │    ├─ Reply to post / nested replies
     │    ├─ Teacher: Mark best answer
     │    └─ Report inappropriate content
     │
     ├─ [Calendar /calendar]
     │    ├─ Month view: calendar grid with event dots
     │    ├─ Agenda view: chronological event list
     │    ├─ Click date → sidebar shows events for that date
     │    ├─ Countdown badges: "Hari ini", "Besok", "H-3"
     │    └─ Add event (teacher) / View events (student)
     │
     └─ [Announcements /announcements]
          ├─ Search + filter (All / Unread / Pinned)
          ├─ Read announcement → mark as read
          ├─ RSVP (if required) → konfirmasi kehadiran
          ├─ View attachments → download
          └─ Comments (if enabled) → reply
```

---

### 1.7 Gamification Flow

```
[Dashboard] → [Gamifikasi Hub (Sidebar)]
     │
     ├─ [Leaderboard /leaderboard]
     │    ├─ Podium: Top 3 (crown, silver, bronze)
     │    ├─ Full ranking list (4+) with streaks + XP
     │    ├─ Current user highlighted
     │    └─ [NEEDED] Weekly vs All-time toggle
     │
     └─ [Certificates /certificates]
          ├─ Gallery of earned certificates
          ├─ Download as PDF
          └─ Share (if enabled)
```

---

### 1.8 Profile & Settings Flow

```
[Directory (Sidebar)] → [Profile /profile]
     │
     ├─ Tab: Overview
     │    ├─ Avatar, nama, email, role badge
     │    ├─ Streak, badges, KP display
     │    └─ Edit profile picture / signature
     │
     ├─ Tab: Security
     │    ├─ Change password
     │    └─ Active sessions management
     │
     ├─ Tab: Preferences
     │    ├─ Theme toggle (light/dark)
     │    └─ Notification preferences
     │
     └─ Tab: Private Notes
          └─ Personal annotations (not shared)
```

---

## 2. Teacher Flows

### 2.1 Teacher Dashboard Flow

```
[Teacher Dashboard /teacher-dashboard]
     │
     ├─ Welcome + Quick Actions
     │    ├─ [Kelola Materi] ──→ [Teaching Hub /teaching-hub]
     │    ├─ [Buat Tugas] ──→ [Creator /creator]
     │    └─ [Buat Kuis] ──→ [Quiz Manager /teaching/quiz-manager]
     │
     ├─ Section: Perlu Perhatian (Alerts)
     │    ├─ "X tugas perlu dikoreksi" ──click──→ [SpeedGrader /grader]
     │    ├─ "Y siswa at-risk" ──click──→ [Analytics /analytics]
     │    └─ [NEEDED] Real data dari API (currently some hardcoded)
     │
     ├─ Section: Kelas Aktif
     │    └─ [ClassCard] × N
     │         ├─ Nama kelas, jumlah siswa, rata-rata nilai
     │         ├─ [Detail] ──→ [ClassManagement /class/:classId]
     │         └─ [Analitik] ──→ [Analytics /analytics?class=X]
     │
     ├─ Section: Peralatan Mengajar
     │    ├─ [Buku Nilai] ──→ /gradebook
     │    ├─ [Analitik] ──→ /analytics
     │    └─ [SpeedGrader] ──→ /grader
     │
     └─ Section: Aktivitas Terbaru
          └─ Timeline: student actions (completion, submission, join)
               └─ [NEEDED] Real data dari API
```

---

### 2.2 Content Creation Flow

```
[Teacher Dashboard] → [Kelola Materi]
     │
[Course Builder /teaching/course-builder]
     │
     ├─ Course List (teacher's courses)
     │    ├─ [+ Buat Materi Baru] → Create Modal (title + description)
     │    └─ [CourseCard] ──click──→ Course Editor
     │
     ├─ Course Editor
     │    ├─ Add Module → module name
     │    ├─ Add Lesson to Module → lesson type picker:
     │    │    ├─ Video → VideoBlockEditor (upload/URL)
     │    │    ├─ Article → TextBlockEditor (rich text)
     │    │    ├─ Quiz → QuizBlockEditor (link quiz)
     │    │    └─ Assignment → AssignmentBlockEditor (configure)
     │    ├─ Drag & Drop reorder (modules + lessons)
     │    └─ [Publish] / [Save Draft]
     │
     ├─ Assign Course to Class
     │    └─ [Assign] button ──→ AssignCourseModal ──→ select classes ──→ confirm
     │
     └─ After Assignment:
          └─ Students in those classes see course in "Lanjutkan Belajar"
```

---

### 2.3 Quiz Management Flow

```
[Teaching Hub] → [Manajemen Kuis]
     │
[Quiz Manager /teaching/quiz-manager]
     │
     ├─ Quiz List (teacher's quizzes)
     │    ├─ [+ Buat Kuis Baru] → Quiz creation form
     │    │    ├─ Title, description, time limit
     │    │    ├─ Passing score, max attempts
     │    │    ├─ Add questions:
     │    │    │    ├─ MCQ (single correct)
     │    │    │    ├─ Multiple select
     │    │    │    └─ Short answer
     │    │    ├─ Question Bank integration (import questions)
     │    │    └─ [Save Draft] / [Publish]
     │    │
     │    └─ [QuizCard] ──→ Edit / Assign / View Results
     │
     ├─ Assign Quiz
     │    └─ [QuizAssignModal] ──→ select classes ──→ set schedule ──→ confirm
     │
     └─ View Results
          └─ [Quiz Gradebook /teaching/quiz-gradebook]
               ├─ Per-quiz statistics (avg score, completion rate)
               ├─ Per-student results
               └─ Question analysis (difficulty, discrimination)
```

---

### 2.4 Grading Flow

```
[Teacher Dashboard: "X tugas perlu dikoreksi"]
     │
     click alert
     │
[SpeedGrader /grader]
     │
     ├─ Submission Queue (sidebar)
     │    └─ List of pending submissions
     │         ├─ Student name
     │         ├─ Assignment title
     │         ├─ Submitted timestamp
     │         └─ Status: ungraded / graded
     │
     ├─ Grading Panel (main)
     │    ├─ Student submission (text + attached files)
     │    ├─ Rubric panel (if configured)
     │    ├─ Score input
     │    ├─ Feedback textarea
     │    └─ [Submit Grade] → save → auto-advance to next ungraded
     │
     └─ All Done:
          └─ Summary: X submissions graded, average score

[Gradebook /gradebook]
     │
     ├─ Class selector (dropdown)
     ├─ Student rows × Assignment columns
     ├─ Sortable headers
     ├─ Click cell → edit grade inline
     └─ Export (future: PDF/CSV)
```

---

### 2.5 Class Management Flow

```
[Teacher Dashboard] → [ClassCard: Detail]
     │
[Class Management /class/:classId]
     │
     ├─ Class Info: name, code, student count
     │
     ├─ Student List
     │    ├─ Name, email, join date
     │    ├─ [Invite] → generate/share class code
     │    └─ [Remove] → confirm → remove student
     │
     ├─ Assigned Courses
     │    ├─ [CourseCard] × N with completion %
     │    └─ [Assign Course] → AssignCourseModal
     │
     └─ Class Analytics (summary)
          ├─ Average completion
          ├─ At-risk students
          └─ [Lihat Detail] → /analytics?class=X
```

---

### 2.6 Analytics Flow

```
[Teaching Hub] → [Dasbor Analitik]
     │
[Analytics /analytics]
     │
     ├─ Overview Cards
     │    ├─ Total students
     │    ├─ Average completion rate
     │    ├─ Average quiz score
     │    └─ Active learners (7d)
     │
     ├─ Charts (Recharts)
     │    ├─ Progress over time (line chart)
     │    ├─ Score distribution (bar chart)
     │    ├─ Activity heatmap
     │    └─ At-risk students list
     │
     ├─ Filters:
     │    ├─ Class selector
     │    ├─ Date range
     │    └─ Course filter
     │
     └─ [NEEDED] Export to PDF
```

---

## 3. Admin Flows

### 3.1 Admin Dashboard Flow

```
[Admin Hub /admin-hub]
     │
     ├─ [Administrasi /admin/administration]
     │    ├─ System overview: users, classes, courses
     │    ├─ Module enable/disable toggles
     │    ├─ Tenant settings
     │    └─ Audit log
     │
     ├─ [User Management /admin/users] (via Administration)
     │    ├─ Search + filter by role/status
     │    ├─ [Invite User] → InviteUserModal (email + role)
     │    ├─ [Change Role] → ChangeRoleModal
     │    └─ [Deactivate] → confirm
     │
     ├─ [Analitik /admin/analytics]
     │    └─ System-wide analytics dashboard
     │
     ├─ [Keuangan /admin/finance]
     │    └─ SPP management
     │
     ├─ [PPDB /admin/ppdb]
     │    └─ Student admission management
     │
     ├─ [Tagihan /billing]
     │    └─ Invoice management
     │
     ├─ [Moderasi /admin/moderation]
     │    ├─ Reported content queue
     │    ├─ Review → approve/reject/ban
     │    └─ Moderation history
     │
     └─ [Surat & Dokumen /documents]
          └─ Document management with approval workflow
```

---

## 4. Cross-Role Flows

### 4.1 Notification Flow

```
[Any Page — Header Bell Icon]
     │
     click
     │
[NotificationCenter Dropdown]
     │
     ├─ Unread notifications (bold, blue dot)
     │    ├─ Types: assignment_due, quiz_available, grade_posted,
     │    │         announcement, forum_reply, badge_earned
     │    ├─ Click → navigate to relevant page
     │    └─ Mark as read (individual or all)
     │
     └─ Empty: "Semua sudah dibaca" + Bell icon
```

---

### 4.2 Workspace Selection Flow

```
[Login Success — User has multiple tenants]
     │
[WorkspaceSelector /select-workspace]
     │
     ├─ List of available workspaces/schools
     ├─ Click workspace → set active tenant
     └─ Navigate to Dashboard

[User has single tenant]
     │
     └─ Auto-select → Dashboard (skip selector)
```

---

### 4.3 Theme Toggle Flow

```
[Any Page — Header/Profile]
     │
     toggle theme
     │
     ├─ Light → Dark: class toggle, all `dark:` variants activate
     └─ Dark → Light: class toggle, `dark:` variants deactivate
     │
     └─ Preference saved in localStorage via ThemeContext
```

---

### 4.4 Error & Offline Flows

```
[Any Page]
     │
     ├─ Network Offline:
     │    └─ OfflineBanner (top) → "Anda sedang offline"
     │         └─ Actions queued, retry on reconnect
     │
     ├─ API Error (non-auth):
     │    └─ FeatureErrorBoundary catches
     │         ├─ Friendly message
     │         └─ [Coba Lagi] button
     │
     ├─ API Error (401/403):
     │    └─ AuthGuard → redirect /login or /unauthorized
     │
     └─ Unhandled Error:
          └─ Top-level ErrorBoundary → "Terjadi kesalahan"
               └─ [Muat Ulang] button
```

---

## 5. Flow Metrics & UX KPIs

| Flow | Target Clicks | Current | Priority |
|------|--------------|---------|----------|
| Dashboard → Start Lesson | 2 | 3-4 | ⭐⭐⭐⭐⭐ |
| Dashboard → Take Quiz | 3 | 4 | ⭐⭐⭐⭐ |
| Dashboard → Submit Assignment | 3 | 4-5 | ⭐⭐⭐⭐ |
| Teacher Alert → Grade | 2 | 3 | ⭐⭐⭐⭐ |
| Teacher → Create Quiz | 3 | 4 | ⭐⭐⭐ |
| Teacher → Assign Course | 3 | 4 | ⭐⭐⭐ |

---

## 6. State Transitions Summary

### Page Loading States

Setiap page harus punya 4 states:

```
1. LOADING    → Skeleton (bukan spinner)
2. EMPTY      → EmptyState dengan action CTA
3. ERROR      → FeatureErrorBoundary + retry
4. SUCCESS    → Render data
```

### Component State Machine

```
                    ┌─────────┐
           ┌───────│  IDLE    │───────┐
           │       └─────────┘       │
           │ trigger                  │ trigger
           ▼                          ▼
    ┌──────────┐               ┌──────────┐
    │ LOADING  │               │ STALE    │ (show old data + refetch)
    └────┬─────┘               └────┬─────┘
         │                          │
    ┌────┼────────────┐        ┌────┼────────────┐
    │    │            │        │    │            │
    ▼    ▼            ▼        ▼    ▼            ▼
SUCCESS EMPTY      ERROR    SUCCESS EMPTY     ERROR
```

---

## 7. Navigation Architecture

```
Student Sidebar:
  ├─ 🏠 Dashboard (/)
  ├─ 👥 Sosial & Info (/social-hub)
  ├─ 🎮 Gamifikasi (/gamification-hub)
  └─ ⚙️ Pengaturan (/directory)

Teacher Sidebar:
  ├─ 🎓 Teaching Hub (/teacher-dashboard)
  ├─ 👥 Sosial & Info (/social-hub)
  └─ ⚙️ Pengaturan (/directory)

Admin Sidebar:
  └─ 🏛️ Administrasi (/admin-hub)

Hub Pattern (Progressive Disclosure):
  Sidebar → Hub Page → Feature Page → Detail View
```

---

## Appendix: Screen-to-File Mapping

| Screen | File Path | Lines |
|--------|-----------|-------|
| Login | `src/pages/Login.tsx` | ~250 |
| Student Dashboard | `src/pages/Dashboard.tsx` | ~630 |
| Teacher Dashboard | `src/pages/TeacherDashboard.tsx` | ~238 |
| Lesson Viewer | `src/pages/LessonViewer.tsx` | ~300 |
| Video Viewer | `src/components/LessonViewer/VideoViewer.tsx` | ~350 |
| Article Viewer | `src/components/LessonViewer/ArticleViewer.tsx` | ~200 |
| Assignment Viewer | `src/components/LessonViewer/AssignmentViewer.tsx` | ~200 |
| AI Tutor Panel | `src/components/LessonViewer/AITutorPanel.tsx` | ~300 |
| Quiz Page | `src/pages/Quiz.tsx` | ~400 |
| Quiz Player | `src/features/quizzes/components/player/QuizPlayer.tsx` | ~300 |
| Quiz Results | `src/features/quizzes/components/student/QuizResultsView.tsx` | ~200 |
| Assignments | `src/pages/Assignments.tsx` | ~400 |
| Courses (Teacher) | `src/pages/Courses.tsx` | ~250 |
| Course Builder | `src/pages/CourseBuilder.tsx` | ~400 |
| Quiz Manager | `src/pages/QuizManager.tsx` | ~300 |
| SpeedGrader | `src/pages/SpeedGrader.tsx` | ~300 |
| Gradebook | `src/pages/Gradebook.tsx` | ~300 |
| Analytics | `src/pages/Analytics.tsx` | ~300 |
| Leaderboard | `src/pages/Leaderboard.tsx` | ~200 |
| Calendar | `src/pages/Calendar.tsx` | ~400 |
| Forum | `src/pages/Forum.tsx` | ~400 |
| Announcements | `src/pages/Announcements.tsx` | ~350 |
| Profile | `src/pages/Profile.tsx` | ~300 |
| Class Management | `src/pages/ClassManagement.tsx` | ~300 |
| Header | `src/components/layout/Header.tsx` | ~155 |
| Sidebar | `src/components/layout/Sidebar.tsx` | ~183 |
| Navigation Config | `src/config/navigation.ts` | ~462 |
