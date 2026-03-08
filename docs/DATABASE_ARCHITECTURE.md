# EduSync LMS — Database Architecture

Production-ready schema built directly on Supabase PostgreSQL.

## Entity-Relationship Overview

```mermaid
erDiagram
    User ||--o| UserProfile : has
    User ||--o{ UserRole : has
    Role ||--o{ UserRole : has
    Role ||--o{ RolePermission : has
    Permission ||--o{ RolePermission : has

    User ||--o{ Class : teaches
    Course ||--o{ Class : "used in"
    User ||--o{ Course : creates
    Class ||--o{ Enrollment : has
    User ||--o{ Enrollment : "enrolled in"
    Enrollment ||--o{ AttendanceRecord : has

    Course ||--o{ CourseModule : contains
    CourseModule ||--o{ Lesson : contains
    Lesson ||--o{ LessonResource : has

    Class ||--o{ Assignment : has
    Assignment ||--o{ AssignmentSubmission : has
    User ||--o{ AssignmentSubmission : submits
    AssignmentSubmission ||--o| Grade : has

    Class ||--o{ Quiz : has
    Quiz ||--o{ QuizQuestion : has
    QuizQuestion ||--o{ QuizOption : has
    Quiz ||--o{ QuizAttempt : has
    User ||--o{ QuizAttempt : attempts

    Class ||--o{ DiscussionThread : has
    DiscussionThread ||--o{ DiscussionPost : has
    User ||--o{ DiscussionPost : writes

    User ||--o{ LessonProgress : tracks
    Lesson ||--o{ LessonProgress : tracked
    User ||--o{ CourseProgress : tracks
    Course ||--o{ CourseProgress : tracked

    User ||--o{ UserBadge : earns
    Badge ||--o{ UserBadge : awarded
    User ||--o| UserPoint : accumulates

    User ||--o{ Notification : receives
    User ||--o{ ActivityLog : generates
    User ||--o{ ActivityEvent : generates
    ActivityEvent }|--|{ Class : "belongs to"
    User ||--o{ Invoice : billed
    Invoice ||--o{ Payment : paid
```

---

## Technical Implementation Details

### Supabase Row Level Security (RLS)

Security is handled at the database layer using Row Level Security (RLS) policies.

| Resource | Who can Read | Who can Insert/Update |
|----------|--------------|------------------------|
| `profiles` | Authenticated users | Users (own), Admins |
| `classes` | Authenticated users | Teachers, Admins |
| `enrollments` | Enrolled students, Teachers | Teachers, Admins, Students (via join_code) |
| `assignments` | Enrolled students, Teachers | Teachers |
| `submissions` | Submitting student, Teachers | Students (submit), Teachers (grade) |
| `notifications` | Recipient user | System (Triggers/Edge Functions) |
| `activity_events`| Authenticated users (tenant isolated) | System (Triggers) |

### PostgreSQL Remote Procedure Calls (RPCs)

Complex operations are wrapped in Postgres functions to prevent multiple network roundtrips from the client and to maintain data integrity.

- `get_my_classes()` — Returns a user's classes based on their role (enrolled in for students, teaching for teachers).
- `create_class(name, course_id, max_students)` — Creates a class and handles teacher assignments.
- `join_class_by_code(code)` — Validates class capacity and enrolls the student.
- `mark_lesson_complete(lesson_id)` — Updates progress and checks for module/course completion.

### Database Triggers

- `on_auth_user_created` — Automatically creates a `profiles` row when a user signs up.
- `on_assignment_graded` — Automatically inserts a notification for the student when a grade is submitted.
- `on_badge_earned` — Emits a realtime database event for Gamification popups.
- `trg_lesson_progress_activity`, `trg_assignment_submission_activity`, `trg_assignment_graded_activity`, `trg_quiz_attempt_activity`, `trg_enrollment_activity` — Insert strongly-typed records into `activity_events` via `create_activity_event()` for the event-driven system.
