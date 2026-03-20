# EduSync LMS Feature Map

> **Status:** v1.0  
> **Dibuat:** 2026-03-11  
> **Tujuan:** Pemetaan visual seluruh fitur sistem EduSync untuk menghindari arsitektur kacau saat project semakin besar.

---

## 1. Feature Overview

Dokumen ini menunjukkan overview keseluruhan sistem EduSync LMS yang mencakup 6 domain utama:

```mermaid
mindmap
  root((EduSync LMS))
    Courses
      Course Builder
      Course Publishing
      Course Assignment
    Lessons
      Smart Player
      Video Lessons
      Text/Article Lessons
      Lesson Blocks
      Progress Tracking
      AI Tutor
    Assignments
      Assignment Creation
      Submission System
      Grading & Feedback
      Rubrics
      Group Assignments
    Quiz
      Quiz Builder
      Quiz Attempts
      Auto-Grading
      Time Limits
      AI Essay Grading
      Question Bank
    Gamification
      XP System
      Level Progression
      Badges & Achievements
      Certificates
      Leaderboards
      Streaks
    Analytics
      Teacher Dashboard v2
      Student Progress
      Course Statistics
      Engagement Scoring
      Cohort Retention
      Funnel Analysis
      Path Analysis
      Predictive Alerts
      Struggle Detection
    Social
      Forum Diskusi
      Pengumuman
      Kalender
    Guidance
      In-App Walkthroughs
      Tooltips
      Checkpoints
    Attendance
      Teacher Scan
      Student View
    Auth
      Email/Password
      Google OAuth
      Class Join Code
      Multi-Tenant
```

---

## 2. Feature Hierarchy & Relationships

### 2.1 Core Learning Structure

```mermaid
graph TB
    subgraph Tenant["Tenant / School"]
        direction TB
        Academic[Academic Units<br/>TK, SD, SMP, SMA]
        Classes[Classes<br/>Kelas Mata Pelajaran]
        Enrollments[Enrollments<br/>Student Membership]
    end

    subgraph Course["Course Domain"]
        direction TB
        Courses[Courses<br/>Kursus/Silabus]
        Modules[Modules<br/>Bab/Sesi]
        Lessons[Lessons<br/>Materi]
        Blocks[Lesson Blocks<br/>Konten]
    end

    subgraph Assessment["Assessment Domain"]
        direction TB
        Assignments[Assignments<br/>Tugas]
        Submissions[Submissions<br/>Jawaban Siswa]
        Grades[Grades<br/>Nilai & Feedback]
    end

    subgraph Quiz["Quiz Domain"]
        direction TB
        Quizzes[Quizzes<br/>Kuis]
        Questions[Questions<br/>Soal]
        Options[Options<br/>Pilihan Jawaban]
        Attempts[Attempts<br/>Percobaan]
    end

    Academic --> Classes
    Classes --> Enrollments
    Courses --> Modules
    Modules --> Lessons
    Lessons --> Blocks
    
    Blocks -->|reference| Assignments
    Blocks -->|reference| Quizzes
    
    Enrollments -->|take| Assignments
    Enrollments -->|take| Quizzes
    
    Assignments --> Submissions
    Submissions --> Grades
    
    Quizzes --> Questions
    Questions --> Options
    Attempts -->|belongs to| Quizzes
```

---

## 3. Domain Detail: Courses

### 3.1 Feature List

| Feature | Deskripsi | Status |
|---------|-----------|--------|
| Course CRUD | Create, Read, Update, Delete kursus | ✅ |
| Course Builder | Interface drag-drop untuk membangun materi | ✅ |
| Course Publishing | Workflow Draft → Published → Archived | ✅ |
| Course Assignment | Assign kursus ke multiple classes | ✅ |
| Course Modules | Hierarki bab/sesi dalam kursus | ✅ |
| Course Progress | Tracking persentase penyelesaian | ✅ |

### 3.2 Course Hierarchy

```mermaid
graph LR
    subgraph Course["Course"]
        C1[Title & Description]
        C2[Subject]
        C3[Status]
    end

    subgraph Modules["Modules"]
        M1[Module 1<br/>Bab 1]
        M2[Module 2<br/>Bab 2]
        M3[Module N]
    end

    subgraph Lessons["Lessons"]
        L1[Lesson 1<br/>Video]
        L2[Lesson 2<br/>Article]
        L3[Lesson 3<br/>Quiz]
        L4[Lesson 4<br/>Assignment]
    end

    C1 --> M1
    C1 --> M2
    M1 --> L1
    M1 --> L2
    M2 --> L3
    M2 --> L4
```

---

## 4. Domain Detail: Lessons

### 4.1 Feature List

| Feature | Deskripsi | Status |
|---------|-----------|--------|
| Video Lessons | Pemutaran video dengan tracking progress | ✅ |
| Text/Article Lessons | Konten artikel dengan formatting | ✅ |
| Lesson Blocks | Sistem block-based content | ✅ |
| Lesson Comments | Catatan siswa & feedback guru | ✅ |
| Lesson Resources | File attachments | ✅ |
| AI Tutor | AI assistant untuk materi | ✅ |

### 4.2 Lesson Block Types

```mermaid
graph TD
    Lesson[Lesson] --> |has many| Blocks[Lesson Blocks]
    
    Blocks --> Video[Video Block]
    Blocks --> Text[Text Block]
    Blocks --> Quiz[Quiz Block]
    Blocks --> Assignment[Assignment Block]
    
    Video --> |references| VR[lesson_resources<br/>video url]
    Text --> |stores| Content[lesson_resources<br/>content]
    Quiz --> |references| Q[quizzes table]
    Assignment --> |references| A[assignments table]
```

---

## 5. Domain Detail: Assignments

### 5.1 Feature List

| Feature | Deskripsi | Status |
|---------|-----------|--------|
| Assignment Creation | Buat tugas dengan instruksi | ✅ |
| Due Dates | Tanggal jatuh tempo | ✅ |
| File Attachments | Upload file soal & jawaban | ✅ |
| Submission System | Sistem pengumpulan tugas | ✅ |
| Rubrics | Panduan penilaian terstandar | ✅ |
| Grading | Input nilai & feedback | ✅ |
| Late Submission | Penanganan keterlambatan | ✅ |

### 5.2 Assignment Flow

```mermaid
stateDiagram-v2
    [*] --> Draft: Teacher Create
    Draft --> Published: Teacher Publish
    Published --> Open: Assign to Class
    Open --> Submitted: Student Submit
    Submitted --> Graded: Teacher Grade
    Graded --> [*]
    Submitted --> Late: Past Due Date
    Late --> Rejected: Reject Late
    Late --> Accepted: Accept Late
```

---

## 6. Domain Detail: Quiz

### 6.1 Feature List

| Feature | Deskripsi | Status |
|---------|-----------|--------|
| Quiz Builder | Interface buat soal kuis | ✅ |
| Question Types | MCQ, True/False, Multiple Select, Short Answer, Essay | ✅ |
| Question Bank | Repository soal yang bisa dipakai ulang | ✅ |
| Question Randomization | Soal & pilihan diacak per attempt | ✅ |
| Time Limits | Batasan waktu kuis | ✅ |
| Max Attempts | Batasan percobaan | ✅ |
| Auto-Grading | Penskoran otomatis (MCQ/True-False/Multiple-Select) | ✅ |
| AI Essay Grading | Penilaian esai via Groq (ai-grade-essay edge function) | ✅ |
| Anti-Cheat | Tab-switch detection, heartbeat, optimistic locking | ✅ |
| Autosave | Interval-based answer autosave (30s) | ✅ |
| Quiz Attempts | Tracking percobaan siswa + resume support | ✅ |
| Quiz Analytics | Statistik hasil kuis, difficulty chart | ✅ |
| Quiz Review | Answer review screen post-submission | ✅ |

### 6.2 Quiz Attempt Flow

```mermaid
stateDiagram-v2
    [*] --> Locked: Not Started
    
    Locked --> InProgress: Student Click Start
    InProgress --> InProgress: Answer Questions
    InProgress --> Submitted: Submit Answers
    InProgress --> Expired: Time Run Out
    
    Submitted --> Graded: Auto-Grade
    Submitted --> Graded: Manual Review
    Graded --> [*]
    
    Expired --> [*]
```

### 6.3 Quiz Security

```mermaid
graph LR
    Start[Start Quiz RPC] --> Tenant[Check Tenant ID]
    Tenant --> Enrolled[Verify Enrollment]
    Enrolled --> Attempts[Check Max Attempts]
    Attempts --> Lock{Attempts < Max?}
    Lock -->|Yes| Create[Create Attempt]
    Lock -->|No| Reject[Reject - Max Reached]
    Create --> Valid[Return Attempt ID]
```

---

## 7. Domain Detail: Gamification

### 7.1 Feature List

| Feature | Deskripsi | Status |
|---------|-----------|--------|
| XP Transactions | Append-only XP ledger (lesson +10, quiz +5/+25, badge, streak) | ✅ |
| Level Progression | 10 levels (L1=0 XP → L10=5500 XP) via `compute_level()` | ✅ |
| Badges v2 | `badge_definitions` + `student_badges`, 4 rarity tiers, 6 types | ✅ |
| Auto-Award (pg_cron) | `check_badge_eligibility()` + `process_xp_awards()` every 5 min | ✅ |
| Certificates | `issue_certificate()` RPC, unique cert number, teacher-issued | ✅ |
| Leaderboard v2 | XP or streak sort, weekly/monthly/all-time periods | ✅ |
| Streaks | Daily streak tracking, streak bonus XP (5×streak_day) | ✅ |

### 7.2 Gamification Entities

```mermaid
graph TB
    subgraph Core["Gamification Core"]
        Points[Points Ledger<br/>Transaction History]
        UserPoints[User Points<br/>Total & Level]
    end
    
    subgraph Recognition["Recognition"]
        Badges[Badges<br/>Definitions]
        BadgeRules[Badge Rules<br/>Auto-Award Logic]
        UserBadges[User Badges<br/>Earned Badges]
    end
    
    subgraph Competition["Competition"]
        Leaderboards[Leaderboards<br/>Rankings]
        Streaks[User Streaks<br/>Daily Activity]
    end
    
    Points --> UserPoints
    UserPoints --> Leaderboards
    Badges --> BadgeRules
    BadgeRules --> UserBadges
```

### 7.3 Points Earning Events

```mermaid
graph LR
    Event[Activity Event] --> Quiz[Quiz Completed]
    Event --> Lesson[Lesson Completed]
    Event --> Streak[Daily Login]
    Event --> Badge[Badge Earned]
    
    Quiz -->|+10-100 pts| Ledger
    Lesson -->|+5-20 pts| Ledger
    Streak -->|+5 pts| Ledger
    Badge -->|+25-50 pts| Ledger
    
    Ledger -->|aggregate| UserPoints[User Points Table]
```

---

## 8. Domain Detail: Analytics

### 8.1 Feature List

| Feature | Deskripsi | Status |
|---------|-----------|--------|
| Teacher Dashboard v2 | Multi-panel analytics (engagement, lesson, course, student) | ✅ |
| Course Stats | Metrik pre-aggregated (810–812 aggregation engine) | ✅ |
| Student Progress | Progress individual siswa | ✅ |
| Engagement Scoring | 0-100 score: activity×40 + completion×30 + quiz×20 + streak×10 | ✅ |
| Cohort Retention | Weekly retention heatmap per enrollment cohort | ✅ |
| Funnel Analysis | Custom funnel builder (enrollment → lesson → quiz → completion) | ✅ |
| Path Analysis | Sankey-style learning path flow diagram | ✅ |
| Predictive Alerts | ML risk scoring → early warning panel for teachers | ✅ |
| Struggle Detection | Real-time alerts: slow progress, low score, repeated re-watch | ✅ |
| Course Analytics per Course | `/course-analytics/:id` page with lesson breakdown table | ✅ |

### 8.2 Analytics Data Pipeline

```mermaid
graph LR
    subgraph Source["Activity Source"]
        LP[lesson_progress]
        QA[quiz_attempts]
        AS[assignment_submissions]
    end
    
    subgraph Pipeline["Data Pipeline"]
        Trigger[DB Triggers]
        RPC[Periodic RPC]
    end
    
    subgraph Consumer["Pre-Aggregated Tables"]
        CP[course_progress]
        CS[course_stats]
    end
    
    subgraph Dashboard["Dashboards"]
        TD[Teacher Dashboard]
        SD[Student Dashboard]
        AD[Admin Dashboard]
    end
    
    LP --> Trigger
    QA --> Trigger
    AS --> Trigger
    
    Trigger --> CP
    CP --> RPC
    RPC --> CS
    
    CP --> TD
    CS --> TD
    CP --> SD
    CS --> AD
```

### 8.3 Teacher Analytics Metrics

```mermaid
graph TB
    Analytics[Teacher Analytics] --> Overview[Overview]
    Analytics --> Modules[Module Completion]
    Analytics --> Quizzes[Quiz Pass Rates]
    Analytics --> Students[Student List]
    
    Overview --> TotalEnrolled[Total Enrolled]
    Overview --> ActiveStudents[Active Students]
    Overview --> AvgProgress[Avg Progress]
    Overview --> AvgScore[Avg Quiz Score]
    Overview --> AtRisk[At-Risk Count]
    
    Students --> Top[Top Performers]
    Students --> Risk[At-Risk Students]
```

---

## 9. Cross-Domain Relationships

### 9.1 Data Flow Diagram

```mermaid
flowchart TB
    subgraph User["User Actions"]
        Student[Student]
        Teacher[Teacher]
        Admin[Admin]
    end
    
    subgraph Learning["Learning System"]
        View[View Lesson]
        Complete[Complete Lesson]
        TakeQuiz[Take Quiz]
        Submit[Submit Assignment]
    end
    
    subgraph Events["Event Bus"]
        Activity[activity_events]
    end
    
    subgraph Processing["Async Processing"]
        Progress[Progress Calculation]
        Gamification[Gamification Update]
        Analytics[Analytics Update]
        Notification[Notification]
    end
    
    subgraph Storage["Data Storage"]
        Lessons[lesson_progress]
        Points[user_points]
        Stats[course_stats]
    end
    
    Student --> View
    View --> Complete
    Student --> TakeQuiz
    Student --> Submit
    
    Complete --> Activity
    TakeQuiz --> Activity
    Submit --> Activity
    
    Activity --> Progress
    Activity --> Gamification
    Activity --> Analytics
    Activity --> Notification
    
    Progress --> Lessons
    Gamification --> Points
    Analytics --> Stats
```

---

## 10. Feature Dependencies

```mermaid
graph BT
    %% Base dependencies
    Tenant[TOrganization] --> User[enant/Users & Auth]
    Tenant --> Academic[Academic Terms]
    
    User --> Enrollments[Enrollments]
    Academic --> Classes[Classes]
    
    %% Learning build on academic
    Enrollments --> Courses[Courses]
    Classes --> Courses
    Courses --> Modules[Modules]
    Modules --> Lessons[Lessons]
    
    %% Assessment build on learning
    Lessons --> Quizzes[Quizzes]
    Lessons --> Assignments[Assignments]
    
    %% Activities depend on all
    Enrollments --> QuizAttempts[Quiz Attempts]
    Enrollments --> Submissions[Submissions]
    
    Quizzes --> QuizAttempts
    Assignments --> Submissions
    
    %% Analytics & Gamification on top
    QuizAttempts --> Analytics[Analytics]
    Submissions --> Analytics
    Lessons --> Analytics
    
    QuizAttempts --> Gamification[Gamification]
    Submissions --> Gamification
    Lessons --> Gamification
```

---

## 11. Quick Reference

### 13.1 Feature to Table Mapping

| Feature Area | Primary Tables |
|--------------|----------------|
| Courses | `courses`, `course_modules`, `course_classes` |
| Lessons | `lessons`, `lesson_resources`, `lesson_progress` |
| Assignments | `assignments`, `assignment_submissions`, `assignment_attachments`, `grades`, `rubrics` |
| Quiz | `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts_v2`, `quiz_attempt_questions` |
| Gamification v2 | `badge_definitions`, `student_badges`, `certificates`, `xp_transactions`, `student_xp_summary` |
| Analytics Engine | `student_lesson_signals`, `lesson_analytics_summary`, `course_analytics_summary`, `aggregation_state` |
| Advanced Analytics | `predictive_alerts`, `struggle_alerts`, `funnel_definitions`, `student_cohorts` |
| In-App Guidance | `guidance_tours`, `user_guidance_state` |
| Attendance | `attendance_records` |
| Discussions | `discussions` (forum + lesson comments unified) |

### 13.2 Key Services / Modules

| Domain | Service File |
|--------|--------------|
| Courses | `src/features/courses/api/courseService.ts` |
| Lessons | `src/services/lessonService.ts` |
| Assignments | `src/services/assignmentService.ts` |
| Quiz | `src/features/quizzes/api/quizPlayer.service.ts`, `quizManager.service.ts`, `quizAnalytics.service.ts` |
| Gamification | `src/features/gamification/` |
| Analytics | `src/features/analytics/api/analyticsService.ts` |
| Struggle | `src/features/struggle/` |
| Guidance | `src/features/guidance/` |
| Forum | `src/services/discussionService.ts` |

---

---

## 9. Domain Detail: Auth & Registration

### 9.1 Feature List

| Feature | Deskripsi | Status |
|---------|-----------|--------|
| Email/Password | Supabase Auth sign-up + sign-in | ✅ |
| Google OAuth | `signInWithOAuth({ provider: 'google' })` | ✅ |
| Email Verification | Supabase email confirm flow | ✅ |
| Multi-Tenant | `handle_new_user()` trigger assigns tenant from signup metadata | ✅ |
| Class Join Code | Student enters teacher's join code at registration → auto-enrolled | ✅ |
| Pending Join Code | `localStorage.pendingJoinCode` processed after email verification | ✅ |
| Pending Invite Token | `localStorage.pendingInviteToken` for teacher invite links | ✅ |
| Default Tenant Fallback | UUID `00000000-0000-0000-0000-000000000001` seeded in migration 825 | ✅ |

---

## 10. Domain Detail: In-App Guidance

### 10.1 Feature List

| Feature | Deskripsi | Status |
|---------|-----------|--------|
| Walkthroughs | Multi-step guided tours anchored to DOM elements | ✅ |
| Tooltips | Contextual help tooltips | ✅ |
| Banner Guides | Dismissable informational banners | ✅ |
| Checkpoints | Progress-gated hints | ✅ |
| Completion State | Per-user tour state persisted in `user_guidance_state` | ✅ |

---

## 11. Domain Detail: Attendance

### 11.1 Feature List

| Feature | Deskripsi | Status |
|---------|-----------|--------|
| Teacher Scan | `ScanAttendance` page: AI-powered paper scan, class selector, save to DB | ✅ |
| Attendance Records | `attendance_records` table: per class+date session with JSONB details | ✅ |
| Student View | `StudentAttendance` page: matches student by first name in JSONB, shows summary + per-meeting list | ✅ |
| Status Types | `hadir` / `sakit` / `izin` / `alpha` | ✅ |

---

## 12. Related Documents

| Document | Purpose |
|----------|---------|
| [DOMAIN_MAP.md](./DOMAIN_MAP.md) | Entity & database mapping |
| [COURSE_ENGINE_BLUEPRINT.md](./COURSE_ENGINE_BLUEPRINT.md) | Learning engine detailed architecture |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | SQL schema definitions |
| [QUIZ_SYSTEM_ARCHITECTURE.md](./QUIZ_SYSTEM_ARCHITECTURE.md) | Quiz system detailed design |
| [RLS_POLICIES.md](./RLS_POLICIES.md) | Security policies |

---

_Dokumen ini adalah living document. Update saat arsitektur fitur berubah._
