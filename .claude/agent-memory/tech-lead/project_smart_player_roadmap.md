---
name: Smart Player Roadmap Status
description: SP-0 through SP-25 full roadmap status, batch decisions, Wave 4 implementation details
type: project
---

SP-0 through SP-12 completed (smart player core, telemetry pipeline, quiz, struggle score computation).

SP-13 Struggle Detection & Alerts frontend completed 2026-03-19.
SP-16 Engagement Scoring completed 2026-03-19.
SP-17 to SP-21 completed (path analysis, guidance, early warning, achievements, streaks/XP).
SP-22 to SP-25 (Wave 4 FINAL) completed 2026-03-20.

---

## Wave 4 (SP-22 → SP-25) — Completed 2026-03-20

### SP-22: Custom Dashboard Builder
- Migration: `supabase/migrations/826_custom_dashboards.sql`
- Tables: `dashboard_configs` (tenant_id, created_by, layout JSONB, widgets JSONB, is_shared)
- RPCs: save_dashboard, get_dashboards, get_dashboard, delete_dashboard
- Feature: `src/features/dashboards/` — DashboardBuilder, DashboardViewer, DashboardList, WidgetRenderer, WidgetPicker
- Page: `src/pages/Dashboards.tsx` at route `/teaching/dashboards`

### SP-23: Export & Scheduled Reports
- Migration: `supabase/migrations/827_export_reports.sql`
- Tables: `scheduled_reports` (report_type, schedule, export_format, last_generated_at)
- RPCs: save_scheduled_report, get_scheduled_reports, delete_scheduled_report, generate_report_data
- Feature: `src/features/reports/` — ExportButton, ReportScheduler, ReportList
- ExportButton uses `papaparse` (static import) for CSV, `window.print()` for PDF

### SP-24: Realtime Activity Feed
- No migration needed (uses existing `learning_events` table)
- Components: `src/features/analytics/components/LiveActivityFeed.tsx`, `ActiveNowIndicator.tsx`, `LiveLessonMap.tsx`
- Realtime pattern: supabase.channel().on('postgres_changes', INSERT on learning_events).subscribe()
- Integrated into TeacherAnalyticsDashboard as "Live" tab

### SP-25: Adaptive Learning Recommendations
- Migration: `supabase/migrations/828_adaptive_learning.sql`
- Tables: `learning_recommendations` (recommendation_type, confidence, priority, status)
- RPCs: generate_recommendations, get_student_recommendations, record_recommendation_action
- pg_cron: generates recommendations every 10 min
- Feature: `src/features/recommendations/` — RecommendationFeed, SmartNextButton, ReviewPrompt
- Integrated into Dashboard.tsx (student RecommendationFeed), LessonViewer.tsx (SmartNextButton replaces inline next button, ReviewPrompt after quiz < 60%)

---

## Key Technical Decisions (Wave 4)

- `react-grid-layout` installed but DashboardBuilder uses CSS grid (not drag-drop) — simpler, no layout perf issues
- `papaparse` statically imported after npm install
- `FunnelDefinition` uses `funnel_id` not `id` — corrected in WidgetRenderer
- `EngagementSummaryRow` has no `avg_completion_pct` — uses `as unknown` cast for metric_card widget
- TeacherAnalyticsDashboard refactored: Overview/Live/Reports tabs, ActiveNowIndicator in header
- Realtime livefeed buffers events in a ref and flushes every 1s to avoid state thrashing
- `lastQuizScore` state added to LessonViewer for ReviewPrompt trigger (currently set to null until quiz score API is wired)

**Why:** Final wave to complete Smart Player v2 full feature set.
**How to apply:** Migrations 826-828 must be applied to Supabase before features work. All frontend features degrade gracefully if DB is not ready.
