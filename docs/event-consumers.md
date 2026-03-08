# Event Consumers Architecture

EduSync LMS uses a highly scalable event-driven architecture to process student and teacher activities efficiently without overwhelming the database with queries.

## Concept
Instead of every feature querying the `activity_events` table directly, events flow through a processing pipeline:

```text
activity_events  →  Database Triggers (O(1) updates)
                 →  Database Webhook (Async)  →  Edge Function  →  Consumer Tables
```

## 1. Consumer Tables
Consumer tables pre-aggregate data globally for the LMS, allowing rapid retrieval:
- **`lesson_progress` / `course_progress`**: Updated instantaneously to reflect student progress.
- **`leaderboards`**: Tenant-isolated points and ranks for gamification, enabling entirely query-free leaderboard fetching. It uses the `idx_leaderboards_tenant_points` index.
- **`course_stats`**: Pre-aggregated analytics for teachers and admins. It uses the `idx_course_stats_course` index.
- **`notifications`**: User-facing alerts.

All consumer tables strictly enforce `tenant_id` for multi-tenant isolation and RLS policies.

## 2. Event Processing Pipeline

### Lightweight Triggers (Real-time O(1))
For immediate feedback like updating a lesson's completion status, we use a database trigger (`trg_process_progress_events`). 
- **Rule**: Triggers must never execute heavy aggregations, complex joins, or call external services.

### Async Edge Functions (Heavy Logic)
For heavy processing (Analytics, Notifications, Gamification computations), Supabase Database Webhooks asynchronously invoke the `event-consumer` Edge Function.
- The `event-consumer` processes logic in Deno and upserts consumer tables.

### Idempotency / Processing Guards
To prevent duplicate processing by edge function retries, `activity_events` tracks progress with three timestamp columns:
- `processed_gamification_at`
- `processed_notifications_at`
- `processed_analytics_at`

## Configuration Instructions
To ensure the `event-consumer` Edge Function is triggered correctly:
1. Go to your **Supabase Dashboard** > **Database** > **Webhooks**.
2. Create a new Webhook:
   - **Name**: `activity_events_consumer`
   - **Table**: `public.activity_events`
   - **Events**: `INSERT`
   - **Type**: HTTP Request
   - **Method**: `POST`
   - **URL**: Your Edge Function URL for `event-consumer` (e.g. `https://[PROJECT_ID].functions.supabase.co/event-consumer`)
   - **Headers**: Add `Authorization: Bearer [YOUR_ANON_KEY]` or Service Role Key if required.

*(Once configured, whenever a student completes a lesson, the activity is fully propagated to leaderboards, stats, and notifications asynchronously).*
