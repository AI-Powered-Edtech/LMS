# Task Queue — Phase 2 Batch 4

**Modul:** Remaining Modules (Notifications, Discussions, Calendar, Attendance, Gamification, Certificates, Parent, Principal, Onboarding, Surveys, Finance, Search)  
**Durasi:** Minggu 36–38 | **Effort:** ~40–50 jam

---

## Task IDs

| ID    | Modul               | Deskripsi                                  |
| ----- | ------------------- | ------------------------------------------ |
| 2D-1  | Notifications       | Notification CRUD + Batching               |
| 2D-2  | Discussions         | Discussions Forum CRUD                     |
| 2D-3  | Calendar            | Calendar Events CRUD                       |
| 2D-4  | Attendance          | Attendance (QR + Manual)                   |
| 2D-5  | Certificates        | Certificates Generation                    |
| 2D-6  | Gamification        | XP, Badges, Streaks, Leaderboard           |
| 2D-7  | Parent Portal       | View linked children, progress, messages   |
| 2D-8  | Principal Dashboard | Executive reports, surveys overview        |
| 2D-9  | Onboarding          | Teacher Onboarding Wizard                  |
| 2D-10 | Surveys             | Surveys CRUD + responses                   |
| 2D-11 | Finance             | Finance (SPP) Tracking                     |
| 2D-12 | Search              | Search + Moderation (ILIKE keyword filter) |

---

## Dependency Map

```
Cluster D: Notifications → Discussions → Parent
2D-1 → 2D-2 → 2D-7

Cluster E: Calendar + Attendance (parallel)
2D-3, 2D-4

Cluster F: Gamification + Certificates (parallel)
2D-5, 2D-6

Cluster G: Principal + Onboarding (parallel)
2D-8, 2D-9

Cluster H: Surveys + Finance + Search (parallel)
2D-10, 2D-11, 2D-12
```

---

## Task Detail

### 2D-1: Notifications CRUD + Batching

**Goal:** Notification CRUD endpoints + batch mark-as-read

**Dependencies:** Phase 1A scaffold selesai

**Endpoints:**

- `GET /api/v1/notifications` — List notifications
- `PUT /api/v1/notifications/mark-read` — Mark as read (batch)
- `PUT /api/v1/notifications/mark-all-read` — Mark all as read
- `GET /api/v1/notifications/unread-count` — Unread count

**CATATAN:** Email digest tetap di Supabase Edge Function sampai Phase 3C

---

### 2D-2: Discussions Forum CRUD

**Goal:** Discussions forum — threads + comments CRUD

**Dependencies:** Task 2D-1 selesai

**Endpoints:**

- `GET /api/v1/discussions` — List threads
- `POST /api/v1/discussions` — Create thread
- `DELETE /api/v1/discussions/:thread_id` — Delete thread
- `GET /api/v1/discussions/:thread_id/comments` — List comments
- `POST /api/v1/discussions/:thread_id/comments` — Create comment

**CATATAN:** Realtime subscription (postgres_changes) tetap via Supabase Realtime sampai Phase 4

---

### 2D-3: Calendar Events CRUD

**Goal:** Calendar events CRUD — simple CRUD

**Dependencies:** Phase 1A scaffold selesai

**Endpoints:**

- `GET /api/v1/calendar/events` — List events
- `POST /api/v1/calendar/events` — Create event
- `PUT /api/v1/calendar/events/:id` — Update event
- `DELETE /api/v1/calendar/events/:id` — Delete event

---

### 2D-4: Attendance (QR + Manual)

**Goal:** Attendance CRUD — QR code check-in + manual attendance

**Dependencies:** Phase 1A scaffold selesai

**Endpoints:**

- `GET /api/v1/attendance` — List attendance
- `POST /api/v1/attendance/record` — Record attendance
- `POST /api/v1/attendance/bulk` — Bulk attendance
- `POST /api/v1/attendance/qr-check-in` — QR check-in

---

### 2D-5: Certificates Generation

**Goal:** Certificate CRUD + generation trigger

**Dependencies:** Phase 2 Batch 1 courses selesai

**Endpoints:**

- `GET /api/v1/certificates` — List certificates
- `POST /api/v1/certificates/issue` — Issue certificate
- `GET /api/v1/certificates/verify` — Verify certificate

**CATATAN:** PDF generation tetap di Phase 3

---

### 2D-6: Gamification (XP, Badges, Streaks, Leaderboard)

**Goal:** Gamification CRUD — XP, badges, streaks, leaderboard

**Dependencies:** Phase 1A scaffold selesai

**Endpoints:**

- `GET /api/v1/gamification/xp` — Get user XP
- `POST /api/v1/gamification/xp` — Add XP
- `GET /api/v1/gamification/leaderboard` — Get leaderboard
- `GET /api/v1/gamification/badges` — List badges
- `GET /api/v1/gamification/badges/me` — Get user badges

---

### 2D-7: Parent Portal

**Goal:** Parent portal — view linked children, progress, messages

**Dependencies:** Task 2D-1 (notifications), Task 2D-2 (discussions) selesai

**Endpoints:**

- `GET /api/v1/parent/children` — List linked children
- `GET /api/v1/parent/children/:child_id/progress` — Get child progress
- `GET /api/v1/parent/messages` — List messages
- `POST /api/v1/parent/messages` — Send message

---

### 2D-8: Principal Dashboard

**Goal:** Principal dashboard endpoints — executive reports, surveys overview

**Dependencies:** Task 2C-1 (analytics) selesai

**Endpoints:**

- `GET /api/v1/principal/overview` — Principal overview
- `GET /api/v1/principal/reports` — Executive reports
- `GET /api/v1/principal/school-stats` — School stats

**CATATAN:** Mostly thin wrappers around analytics RPCs

---

### 2D-9: Teacher Onboarding Wizard

**Goal:** Onboarding wizard — track teacher setup progress

**Dependencies:** Phase 1A scaffold selesai

**Endpoints:**

- `GET /api/v1/onboarding/progress` — Get progress
- `POST /api/v1/onboarding/step` — Update step

---

### 2D-10: Surveys CRUD

**Goal:** Surveys CRUD + responses

**Dependencies:** Phase 1A scaffold selesai

**Endpoints:**

- `GET /api/v1/surveys` — List surveys
- `POST /api/v1/surveys` — Create survey
- `POST /api/v1/surveys/:survey_id/respond` — Submit response
- `GET /api/v1/surveys/:survey_id/results` — Get survey results

**CATATAN:** Skip jika frontend module punya TODO stubs atau < 50% feature completion

---

### 2D-11: Finance (SPP Tracking)

**Goal:** Finance / SPP (Sumbangan Pembinaan Pendidikan) tracking

**Dependencies:** Phase 1A scaffold selesai

**Endpoints:**

- `GET /api/v1/finance/spp` — List SPP records
- `POST /api/v1/finance/spp` — Create SPP
- `POST /api/v1/finance/spp/:spp_id/pay` — Record payment
- `GET /api/v1/finance/spp/summary` — Get summary

**CATATAN:** Skip jika frontend module punya TODO stubs atau < 50% feature completion

---

### 2D-12: Search + Moderation

**Goal:** Global search (PostgreSQL ILIKE keyword filter) + content moderation CRUD

**Dependencies:** Phase 2 Batch 1-3 selesai

**Search Endpoints:**

- `GET /api/v1/search?q=...&entity_type=...` — Global search

**Moderation Endpoints:**

- `GET /api/v1/moderation/reports` — List reports
- `POST /api/v1/moderation/reports` — Create report
- `PUT /api/v1/moderation/reports/:report_id/resolve` — Resolve report

---

## Parallelism

Batch 4 bisa paralel antar module, kecuali dependency eksplisit:

- Cluster D: 2D-1 → 2D-2 → 2D-7
- Cluster E: 2D-3, 2D-4 (parallel)
- Cluster F: 2D-5, 2D-6 (parallel)
- Cluster G: 2D-8, 2D-9 (parallel)
- Cluster H: 2D-10, 2D-11, 2D-12 (parallel)
