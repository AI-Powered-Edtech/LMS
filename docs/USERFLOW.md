# EduSync LMS — User Flow

## System Actors

```mermaid
graph LR
    S["👨‍🎓 Student"]
    T["👩‍🏫 Teacher"]
    A["🛡️ Admin"]
    
    S --> |learns in| CLASS["🏫 Class"]
    T --> |teaches| CLASS
    A --> |manages| PLATFORM["⚙️ Platform"]
```

---

## Core Learning Loop

This is the heart of EduSync. Everything else supports this cycle.

```mermaid
graph TD
    START["Teacher creates learning material"] --> STUDY["Student studies lesson"]
    STUDY --> ASK["Student asks question in Discussion"]
    ASK --> ANSWER["Teacher answers"]
    ANSWER --> ASSIGN["Teacher assigns work"]
    ASSIGN --> SUBMIT["Student submits"]
    SUBMIT --> GRADE["Teacher grades"]
    GRADE --> FEEDBACK["Student receives feedback via Notification"]
    FEEDBACK --> IMPROVE["Student improves"]
    IMPROVE --> STUDY
    
    style START fill:#4CAF50,color:#fff
    style FEEDBACK fill:#FF9800,color:#fff
    style IMPROVE fill:#2196F3,color:#fff
```

---

## 1. Student Flows

### 1.1 Onboarding

```mermaid
graph TD
    REG["Register (`/login`)"] --> AUTH["Supabase Auth"]
    AUTH --> PROFILE["Complete Profile"]
    PROFILE --> JOIN["Join Class (via Code)"]
    JOIN --> DASH["Student Dashboard (`/student`)"]
```

### 1.2 Learning Flow

```mermaid
graph TD
    DASH["Dashboard (`/student`)"] --> CLASS["Open Class (`/student/courses`)"]
    CLASS --> MOD["View Modules"]
    MOD --> LESSON["Open Lesson (`/student/lesson/:id`)"]
    LESSON --> CONTENT["Study Content"]
    CONTENT --> MARK["Mark Completed"]
    MARK --> NEXT{More lessons?}
    NEXT -->|Yes| LESSON
    NEXT -->|No| DONE["Module Complete ✅"]
    DONE --> PROGRESS["Progress Updated (RPC call)"]
    PROGRESS --> BADGE["Badge Earned 🏆 (Trigger)"]
```

### 1.3 Assignment Flow

```mermaid
graph TD
    CLASS["Open Class"] --> ASSIGN["Assignments Tab (`/student/assignments`)"]
    ASSIGN --> OPEN["Open Assignment"]
    OPEN --> READ["Read Instructions"]
    READ --> WORK["Write / Upload Submission"]
    WORK --> SUBMIT["Submit to Supabase"]
    SUBMIT --> WAIT["Status: SUBMITTED"]
    WAIT --> GRADED["Teacher Grades (Edge Function)"]
    GRADED --> RESULT["View Score + Feedback"]
```

---

## 2. Teacher Flows

### 2.1 Class Management

```mermaid
graph TD
    DASH["Teacher Dashboard (`/teacher`)"] --> CREATE["Create Class (`/teacher/courses`)"]
    CREATE --> CODE["Generate Join Code"]
    CODE --> SHARE["Share with Students"]
    SHARE --> ENROLL["Students Enroll"]
```

### 2.2 Grading Flow (SpeedGrader)

```mermaid
graph TD
    DASH["Teacher Dashboard"] --> GRADE["SpeedGrader (`/teacher/gradebook`)"]
    GRADE --> SELECT["Select Assignment"]
    SELECT --> SUB["View Submissions"]
    SUB --> REVIEW["Review Documents"]
    REVIEW --> SCORE["Input Score & Feedback"]
    SCORE --> CALL["Invoke `grade-submission`"]
    CALL --> UPDATE["DB Updated, Student Notified"]
```

---

## 3. Admin Flows

### 3.1 Overview

```mermaid
graph TD
    DASH["Admin Dashboard (`/admin`)"] --> USERS["Manage Users"]
    DASH --> CONTENT["Manage Courses"]
    DASH --> FINANCE["Billing (`/admin/billing`)"]
    DASH --> SETTINGS["Platform Settings (`/admin/settings`)"]
```
