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
      Video Lessons
      Text/Article Lessons
      Lesson Blocks
      Progress Tracking
    Assignments
      Assignment Creation
      Submission System
      Grading & Feedback
      Rubrics
    Quiz
      Quiz Builder
      Quiz Attempts
      Auto-Grading
      Time Limits
    Gamification
      Points System
      Badges & Achievements
      Leaderboards
      Streaks
    Analytics
      Teacher Dashboard
      Student Progress
      Course Statistics
      At-Risk Detection
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
| Question Types | Multiple Choice, Essay | ✅ |
| Time Limits | Batasan waktu kuis | ✅ |
| Max Attempts | Batasan percobaan | ✅ |
| Auto-Grading | Penskoran otomatis | ✅ |
| Quiz Attempts | Tracking percobaan siswa | ✅ |
| Quiz Analytics | Statistik hasil kuis | ✅ |

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
| Points System | Earn & deduct points | ✅ |
| Level Progression | Level up berdasarkan XP | ✅ |
| Badges | Achievement badges | ✅ |
| Leaderboards | Ranking per kelas | ✅ |
| Streaks | Daily learning streaks | ✅ |
| Badge Rules | Auto-award berdasarkan trigger | ✅ |

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
| Teacher Dashboard | Overview kelas & kursus | ✅ |
| Course Stats | Metrik pre-aggregated | ✅ |
| Student Progress | Progress individual siswa | ✅ |
| Quiz Analytics | Statistik hasil kuis | ✅ |
| At-Risk Detection | Identifikasi siswa bermasalah | ✅ |
| Progress Reports | Laporan kemajuan | ✅ |

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

### 11.1 Feature to Table Mapping

| Feature Area | Primary Tables |
|--------------|----------------|
| Courses | `courses`, `course_modules`, `course_classes` |
| Lessons | `lessons`, `lesson_resources`, `lesson_progress`, `lesson_comments` |
| Assignments | `assignments`, `assignment_submissions`, `assignment_attachments`, `grades`, `rubrics` |
| Quiz | `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_answers` |
| Gamification | `user_points`, `points_ledger`, `badges`, `badge_rules`, `user_badges`, `leaderboards`, `user_streaks` |
| Analytics | `course_stats`, `activity_events`, `user_progress` |

### 11.2 Key Services

| Domain | Service File |
|--------|--------------|
| Courses | `courseService.ts`, `courseBuilderService.ts` |
| Lessons | `lessonService.ts`, `progressService.ts` |
| Assignments | `assignmentService.ts` |
| Quiz | `quizService.ts`, `quizAnalyticsService.ts` |
| Gamification | `gamificationService.ts`, `leaderboardService.ts` |
| Analytics | `analyticsService.ts`, `studentProgressService.ts` |

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
