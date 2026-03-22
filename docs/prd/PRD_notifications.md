# PRD — Notifications (Notifikasi)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live (Partial)
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/notifications/`

---

## 1. Problem Statement

Siswa, guru, dan admin di EduSync sering kerepotan dengan multiple notification channels yang tidak sinkron:

- **WhatsApp groups:** Real-time tapi noisy, tidak terstruktur.
- **Email:** Delayed, easy to ignore or get lost.
- **In-app:** Hanya muncul kalau aplikasi buka, easy to miss.
- **SMS:** Expensive, limited availability di rural areas.

**Masalah spesifik:**

- Student miss important announcement (deadline, schedule change) karena ada di notif tapi dia nggak buka app.
- Teacher tidak tahu apakah siswa read pesan penting atau tidak.
- Di Indonesia, most users check WhatsApp immediately, but don't install every app — WhatsApp is primary channel.
- Push notification (browser/mobile) already Edge Function deployed, but **frontend integration missing** — students only get in-app notif, not push.
- Email digest function deployed tapi **scheduling missing** — teacher digests tidak pernah dikirim.

**Key insight:** In Indonesian context, **WhatsApp adalah must-have**, not optional. Competitors (Google Classroom) don't integrate WhatsApp well, this is EduSync competitive advantage.

Notifications v1 mengatasi ini dengan:

1. **Centralized notification hub** (in-app, realtime via Supabase).
2. **Push notifications** (browser push) untuk out-of-app reach.
3. **WhatsApp integration** (future, highly demanded locally).
4. **Email digest** (batched notifications, schedule-based).
5. **Notification preferences** (user controls what to receive + how).

---

## 2. Goals

1. **Ensure Message Delivery:** 95% of critical notifications (deadline, announcement, quiz result) reach student within 5 minutes across all channels (in-app + push + email).
2. **Enable User Control:** 90% of notifications have user preference (opt-in/out per type, per channel), users feel less spammed.
3. **Complete Push Notification Flow:** Deploy browser push notifications (Edge Function `send-push` exists, integrate frontend) so students get notified out-of-app.
4. **Schedule Email Digests:** Teacher/admin can opt-in to daily/weekly email digest of activity (deployments exist, scheduling missing).
5. **Lay Groundwork for WhatsApp:** v1 ready architecture for WhatsApp integration (Edge Function stub, RLS for phone numbers, preference UI), launch v1.1.
6. **Reduce Notification Fatigue:** Smart notification grouping (batch related events) + user preferences reduce spam, improve engagement.

---

## 3. Non-Goals

1. **WhatsApp Integration (v1):** High demand but complex (phone number verification, WhatsApp Business API, compliance). v1 architecture ready, v1.1 implementation.
2. **SMS Integration:** Cost-prohibitive in Indonesia. WhatsApp cheaper + more reach. SMS for critical alerts only (v2).
3. **In-App Notification Threads/Conversations:** v1 is notification hub (list of events). Threaded messaging (DM-like) is v2.
4. **Mobile App Deep-Linking:** v1 push just opens app. v1.1 can deep-link to specific lesson, quiz, discussion.
5. **AI-Powered Notification Timing:** v1 sends immediately. ML-based "optimal send time" is v2.
6. **Notification Scheduling UI for Users:** v1 has preference toggles. Calendar-based scheduling (e.g., "notify me Tuesday at 6 PM only") is v2.

---

## 4. User Stories

### Untuk Siswa (Student)

- **US1:** As a student, I want to see a notification bell in the app header **so that** I know when new notifications arrive.
  - Red badge shows unread count. Click opens notification panel.

- **US2:** As a student, I want to receive browser/mobile push notifications **so that** I get notified even when app is closed.
  - Example: Quiz result posted → push "Quiz result ready, score 85/100" → click opens quiz detail.

- **US3:** As a student, I want to control which notifications I receive **so that** I'm not spammed with irrelevant events.
  - Settings page: checkboxes for "New quiz posted", "Quiz result ready", "Discussion reply", "New announcement", "Teacher feedback on assignment", etc.

- **US4:** As a student, I want to choose notification channels (in-app, push, email) per notification type **so that** critical alerts come via push but nice-to-know updates only in-app.
  - Example: Enable push for "Deadline in 24 hours" but not for "Someone liked my forum post".

- **US5:** As a student, I want to mark notifications as read **so that** I can track what I've seen and tidy up my notification panel.

- **US6:** As a student, I want to clear/delete old notifications **so that** panel doesn't get cluttered.

### Untuk Guru (Teacher)

- **US7:** As a teacher, I want to receive push notifications when student submits assignment **so that** I'm immediately aware and can review/grade quickly.

- **US8:** As a teacher, I want a daily/weekly email digest of activity in my classes **so that** I don't miss anything but also don't get overwhelmed by real-time notifications.
  - Example: Weekly digest "5 new assignments submitted, 12 discussion replies, 3 quiz attempts this week" with links.

- **US9:** As a teacher, I want to customize which events trigger notifications **so that** I only get alerted on high-priority items (new assignment, urgent announcement).

- **US10:** As a teacher, I want to see notification history (what was sent, read receipts) **so that** I know if announcement was actually read by students.

### Untuk Admin (Admin)

- **US11:** As an admin, I want to send school-wide broadcast notifications **so that** all students get critical updates immediately.
  - Example: "Sekolah ditutup Senin karena banjir" → push to all → max reach.

- **US12:** As an admin, I want to monitor notification delivery metrics **so that** I ensure critical messages aren't silently failing.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                                           | Acceptance Criteria (Given/When/Then)                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **In-App Notification Bell**                          | Given student/teacher in app, When notifications exist, Then notification icon in header shows red badge with count. Click opens panel with list of notifications.                                                                                                    |
| 2   | **In-App Notification Panel**                         | Given user opens notification panel, When panel displays, Then show paginated list of notifications (newest first) with: title, timestamp, read/unread state, sender avatar.                                                                                          |
| 3   | **Mark Notifications as Read**                        | Given user views notification, When clicking notification or 2-second auto-mark, Then notification marked read in DB (`notifications.read_at` set), badge count decreases, UI updates.                                                                                |
| 4   | **Realtime In-App Notifications**                     | Given new event triggers notification (quiz posted, announcement, etc), When notification created in DB, Then Supabase Realtime pushes to connected client, bell updates instantly + new notif appears in panel without page refresh.                                 |
| 5   | **Notification Preferences Page**                     | Given user in Settings, When clicking "Notifikasi", Then display toggles per event type (Quiz Posted, Assignment Due, Discussion Reply, New Announcement, etc). Per-type controls for channels: In-App, Push, Email.                                                  |
| 6   | **Browser Push Notifications (Frontend Integration)** | Given user allows push permission (OS level), When notification event occurs, When `notifications.send_via_push = true` AND user has push token, Then call Edge Function `send-push` with message + link. On user click, focus browser window + navigate to resource. |
| 7   | **Push Token Management**                             | Given user grants browser push permission, When app loads, Then register push token via Service Worker, store in `push_subscriptions` table (NEW). On logout, remove token. Token expires after 30 days inactivity (refresh on login).                                |
| 8   | **Email Digest (Scheduled Delivery)**                 | Given teacher opt-in to "Weekly digest on Fridays 5 PM", When schedule fires, Then Edge Function `send-email-digest` called with user_id + trigger type + time window (last 7 days), digest email sent with aggregated events + links back to app.                    |
| 9   | **Clear/Delete Notifications**                        | Given user in notification panel, When clicking "Clear All" or delete individual notification, Then notifications soft-deleted (hidden from UI, kept in audit logs).                                                                                                  |
| 10  | **Notification for Specific Events**                  | Given events: quiz posted, assignment due, discussion reply, quiz result, grade posted, announcement, then trigger notification creation in `notifications` table with appropriate type + content. Engineer must implement triggers for core events.                  |
| 11  | **Tenant Isolation (RLS)**                            | Given notification created, When RLS checks, Then user can only see notifications meant for them (not other users). Enforce via `user_id` + `tenant_id` in RLS policy.                                                                                                |
| 12  | **Mobile Responsive**                                 | Given user on mobile (375px), When opening notification panel, Then list is readable, notifications scroll, buttons are large (48px+).                                                                                                                                |

### P1 — Nice to Have

| #   | Requirement                        | Notes                                                                                                                     |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Notification Grouping/Batching** | 5 quiz results in 10 minutes batched into 1 notification "5 quiz results ready" instead of 5 separate. Reduces spam.      |
| 2   | **Smart Notification Quiet Hours** | User sets quiet hours (e.g., 9 PM to 6 AM): no push during quiet hours, batch in digest next morning.                     |
| 3   | **Notification Snooze**            | User click "Remind me in 1 hour" on notification, notification reappears in 1 hour. Good for "Grade ready" notifications. |
| 4   | **Deep-Link in Push**              | Push for quiz result includes link that deep-links to quiz detail (not just app open). Requires mobile app capability.    |
| 5   | **Email Template Customization**   | School can customize email header/footer (logo, colors) in digest emails.                                                 |
| 6   | **Notification Timing Analytics**  | Admin see when students open notifications, device type, engagement rate. Feed back to product.                           |

### P2 — Future Considerations

| #   | Consideration                                      | Reasoning                                                                                                                |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | **WhatsApp Integration**                           | High demand in Indonesia. Requires: WhatsApp Business API, phone number verification, compliance (privacy). v1.1 target. |
| 2   | **SMS Notifications**                              | SMS for critical alerts (grade posted, deadline urgent). Higher cost than WhatsApp. v2.                                  |
| 3   | **Slack Integration**                              | Teacher/admin get Slack notifications of student submissions. Enterprise feature. v2.                                    |
| 4   | **In-App Chat/Messaging**                          | DM-like conversation between student-teacher or peer-peer. Beyond notification scope, separate feature.                  |
| 5   | **AI-Powered Optimal Send Time**                   | ML predicts best time to send notifications to maximize open rate. Advanced feature.                                     |
| 6   | **Notification Preferences from Parent Dashboard** | Parents customize what notifications they receive (subset of student notifications). Parent app feature.                 |

---

## 6. Success Metrics

### Leading Indicators (Hari–Minggu)

- **Push Permission Adoption:** % of users who enable browser push notifications. **Target:** 70%.
  - **Cara Ukur:** `COUNT(users with push_subscriptions) / total_users`

- **Notification Delivery Rate:** % of notifications successfully sent to user channels (in-app counted as 100%, push success rate from Edge Function logs). **Target:** 95%+ overall, 85%+ for push (some users disable).
  - **Cara Ukur:** `successful_sends / total_notification_events`

- **Average Notification Latency (End-to-End):** Time from event created to user sees notification. **Target:** <2 seconds for in-app, <5 seconds for push.
  - **Cara Ukur:** Measure in Supabase logs + Edge Function logs.

- **Email Digest Open Rate:** % of digest emails opened (tracked via email tracking pixel). **Target:** 50%+.
  - **Cara Ukur:** Email provider analytics (depends on provider, e.g., SendGrid).

### Lagging Indicators (Minggu–Bulan)

- **Notification Preference Opt-In Rate:** % of users who customize notification preferences (toggle at least 1 setting). **Target:** 60%.
  - **Cara Ukur:** `COUNT(users who modified notification_preferences) / total_users`

- **Spam Complaint Rate:** # notifications reported as "too many" or marked as spam. **Target:** <2% (keep <50 spam reports per 1000 users/week).

- **User Engagement via Notifications:** % of notifications that lead to user action (click and open related resource). **Target:** 40%+ (high variance by type; quiz result will be 70%+, nice-to-know maybe 20%).
  - **Cara Ukur:** Track click events in notification panel + navigation to resource.

- **Critical Information Reach:** % of critical notifications (deadline, announcement) that reach target user within deadline/notification window. **Target:** 98%+.
  - **Cara Ukur:** Filter notifications by `is_critical = true`, check delivery timestamp vs deadline.

---

## 7. Open Questions

| #   | Pertanyaan                                                                                                              | Owner                  | Blocking?                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------- |
| 1   | Which events trigger notifications v1? (Quiz posted, assignment due, grade posted, discussion reply, announcement, etc) | Product                | Ya                                            |
| 2   | Push subscription storage — separate table or extend existing `users` table?                                            | Engineering            | Ya                                            |
| 3   | Email digest frequency options — daily, weekly, none? Or customizable per event?                                        | Product/UX             | Tidak (can start with weekly default)         |
| 4   | Notification deletion policy — hard delete after 30 days, or keep forever?                                              | Compliance/Engineering | Tidak (keep for audit, soft delete)           |
| 5   | WhatsApp MVP scope — just text messages, or can include images/links/buttons?                                           | Product/Design         | Tidak (v1.1 concern)                          |
| 6   | Service Worker for push — how to handle failures (SW registration fails, browser doesn't support)?                      | Engineering            | Ya                                            |
| 7   | APNS (Apple Push) vs FCM (Firebase Cloud Messaging) — for mobile apps, if any?                                          | Engineering            | Tidak (v1 browser only, mobile app is future) |

---

## 8. Timeline & Phases

### Phase 1: MVP (2 minggu)

- **Week 1 (3 hari):** Design notification panel UI, build `notifications` table + RLS, wire up Supabase Realtime, test in-app notifications.
- **Week 1 (2 hari):** Notification preferences page, toggle per event type + channel.
- **Week 2 (2 hari):** Integrate push (Service Worker setup, `send-push` Edge Function call, token management).
- **Week 2 (1 hari):** Core event triggers (quiz posted, announcement, discussion reply).

### Phase 2: Polish + Email Digest (1 minggu)

- Wire up email digest scheduling (trigger job daily/weekly).
- Test push on iOS Safari, Firefox, Chrome.
- Analytics integration, user testing, feedback loop.

### Phase 3: v1.1 (Later, 2 minggu)

- WhatsApp integration (requires WhatsApp Business API setup).
- Smart grouping/batching.
- Notification snooze.

**Hard Deadline:** Ship MVP (in-app + push + email digest schedule) by EOD April (week 2 of dev).

---

## 9. Dependensi & Risiko

### Technical Dependencies

1. **Database tables:** `notifications` (NEW), `notification_preferences` (NEW), `push_subscriptions` (NEW).
2. **Supabase Realtime:** Already available, must enable on `notifications` table.
3. **Edge Function `send-push`:** Already deployed, tested to work with browser push. Frontend integration needed.
4. **Edge Function `send-email-digest`:** Already deployed, tested. Scheduling job needed (Cloud Function scheduler or Cron job).
5. **Service Worker for Push:** Must be registered at app startup, handle permission dialogs gracefully.

### Schema Design

```sql
-- Table: notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  type VARCHAR(50) NOT NULL, -- 'quiz_posted', 'assignment_due', 'discussion_reply', etc.
  title TEXT NOT NULL,
  content TEXT,
  link VARCHAR(500), -- URL to resource in app
  related_resource_id UUID, -- FK to quiz, discussion, etc.
  related_resource_type VARCHAR(50), -- 'quiz', 'discussion', etc.
  read_at TIMESTAMPTZ,
  sent_via_push BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  sent_via_email BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- soft delete
  CONSTRAINT rls_user CHECK (user_id = auth.uid()),
  CONSTRAINT rls_tenant CHECK (tenant_id = (SELECT get_my_tenant_id()))
);

-- Table: notification_preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  notification_type VARCHAR(50), -- 'quiz_posted', 'assignment_due', etc.
  enabled_in_app BOOLEAN DEFAULT true,
  enabled_push BOOLEAN DEFAULT true,
  enabled_email BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type),
  CONSTRAINT rls_user CHECK (user_id = auth.uid()),
  CONSTRAINT rls_tenant CHECK (tenant_id = (SELECT get_my_tenant_id()))
);

-- Table: push_subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  endpoint VARCHAR(500) NOT NULL, -- push service endpoint URL
  auth_key VARCHAR(255) NOT NULL, -- encryption key
  p256dh_key VARCHAR(255) NOT NULL, -- encryption key
  user_agent TEXT, -- browser/device info
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ,
  UNIQUE(user_id, endpoint),
  CONSTRAINT rls_user CHECK (user_id = auth.uid()),
  CONSTRAINT rls_tenant CHECK (tenant_id = (SELECT get_my_tenant_id()))
);

-- Indexes
CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

### Integration Points

- **Auth:** Use `useAuth()` to get `user_id`.
- **Supabase Realtime:** Subscribe to `notifications` table changes for logged-in user.
- **Edge Functions:** Call `send-push` and `send-email-digest` with user_id + context.
- **Event Triggers:** Integrate with quiz, assignment, discussion, announcement modules to create notifications.

### Risks & Mitigations

| Risk                                             | Impact                                     | Mitigation                                                                                              |
| ------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Push permission denied by user                   | 30% of users won't receive push            | Graceful degradation, rely on in-app + email, educate users on benefits.                                |
| Push Edge Function fails/timeout                 | Notification never reaches user            | Retry logic (exponential backoff), log failures, fallback to in-app only.                               |
| Email digest not scheduled (cron job fails)      | Teacher never gets digest                  | Monitor cron logs, set up alerting, manual trigger button in admin panel.                               |
| Notification spam (user gets 50+ per day)        | User disables all notifications            | Smart batching (P1 feature), aggressive preference defaults (less is more), user sees unsubscribe link. |
| WhatsApp API integration bugs (v1.1)             | Notifications lost or sent to wrong person | Thorough UAT, phone number validation, test with real accounts, monitor delivery.                       |
| Service Worker registration fails                | App won't send push on this device         | Detect failure, show message "Push not available on this browser", still send in-app + email.           |
| User deletes account, push subscription orphaned | Attempt to send push to deleted user       | RLS on `push_subscriptions` prevents reading, `ON DELETE CASCADE` cleans up orphaned records.           |

### Edge Cases to Test

1. **User has multiple devices (mobile + laptop):** Multiple push subscriptions, notifications sent to all. User experience?
2. **Push subscription expires (30 days no activity):** Old token becomes invalid. Refresh on next login, handle gracefully.
3. **User disables browser push mid-session:** App recognizes, falls back to in-app + email, explains to user.
4. **Email digest with 1000+ events (very active class):** Digest becomes too long. Truncate to top 50 events, add "See full activity in app" link.
5. **Notification created at 11:58 PM, digest scheduled for 11:59 PM:** Does event make it in digest or next day's? Define clearly (include if created before digest trigger time).
6. **User preferences override: no push for announcements, but school broadcasts school-wide emergency:** Emergency should bypass preference? (Define via `is_critical` flag in notification, override preference for critical only).
7. **Very high notification load (1M users, 100k notifications/minute):** Database + Edge Function scaling. Partition by tenant, use queue (PubSub) to batch sends, rate-limit per user gracefully.
