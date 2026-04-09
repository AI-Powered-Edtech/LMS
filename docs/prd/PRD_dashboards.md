# PRD — Dashboards (Custom Widget Builder)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live (V1 Foundation, Widget Builder P2+)
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/dashboards/`

---

## 1. Problem Statement

Guru dan admin memiliki kebutuhan berbeda untuk monitoring data:

- Guru ingin melihat student engagement, quiz results, attendance dalam 1 layar
- Admin sekolah ingin melihat financial metrics (SPP collection, enrollment pipeline), feature health
- Saat ini, setiap insight memerlukan navigasi ke halaman berbeda → workflow fragmented, context-switching costly
- Dashboard halaman blank 10–20 detik tanpa skeleton → UX buruk
- Tidak ada customization: one-size-fits-all dashboards berarti tidak semua user happy

**Dampak Bisnis:**

- Admin menghabiskan waktu navigate multiple pages untuk monitoring → low satisfaction
- Guru tidak see whole picture of class in one view → decisions suboptimal
- Kompetitor (Ruangguru, Google Classroom) punya customizable dashboards
- Retention risk: users abandon after 1st week jika dashboard tidak satisfy their workflow

**Siapa yang terdampak:**

- Guru (Teacher): Workflow fragmented, dapat't see whole picture
- Admin Sekolah (School Admin): Manual navigation untuk compliance reporting
- Siswa: Tidak punya personal learning dashboard (future)

---

## 2. Goals

1. **V1: Pre-configured Dashboards** — Teacher dashboard (student engagement, quiz leaderboard, upcoming deadlines) + Admin dashboard (SPP, PPDB, feature health). Both instant-load with skeleton.
2. **Widget-based Architecture** — Future-proof for customization (Phase 5B+). Each widget is atomic, reusable, testable.
3. **Mobile Dashboard** — Dashboard works on mobile. Cards stack vertically, charts responsive.
4. **Real-time Data Sync** — Dashboard data updates via React Query caching + periodic refresh. Sinkronisasi antar browser tabs (same user logged in multiple tabs).
5. **Skeletal Loading** — All dashboard pages show skeleton immediately, data populates in <2s.

---

## 3. Non-Goals

1. **Drag-drop Widget Builder** — v1 has fixed layout. Drag-drop customization is Phase 5B+ and requires persistent dashboard state (DB + API).
2. **Shared Dashboard Links** — No dashboard sharing/export. Each user has private dashboard.
3. **Cross-tenant Admin Dashboard** — Admin only sees their school's data. No multi-school rollup (security + scoping).
4. **Historical Snapshots** — No "compare dashboard to 1 month ago". Snapshot history is Phase 5C+.
5. **AI-suggested Widgets** — No ML-driven widget recommendations. Fixed set per role.

---

## 4. User Stories

### Untuk Guru (Teacher)

- **As a teacher**, I want to load my class dashboard and see [top 5 students, recent quiz results, upcoming assignments due today] in <2s, so I can quickly see what's urgent.
- **As a teacher**, I want to see students sorted by XP (leaderboard snapshot), so I can celebrate top performers in class.
- **As a teacher**, I want to see attendance % per student, so I can address absenteeism.
- **As a teacher**, I want to see a "5 Struggling" card flagging students with latest_quiz_score <60%, so I can prioritize intervention.
- **As a teacher**, I want dashboard to work on mobile (offline cached), so I can check during breaks/commute.
- **As a teacher**, I want to drill into a widget and see detailed breakdown, so I understand the context.

### Untuk Admin Sekolah (School Admin)

- **As an admin**, I want to see aggregated SPP collection metrics (total collected, pending, overdue), so I monitor cash flow.
- **As an admin**, I want to see PPDB enrollment pipeline (applications received, accepted, enrolled), so I track student acquisition.
- **As an admin**, I want to see feature adoption (% teachers using quizzes, % students active), so I justify spend to school leadership.
- **As an admin**, I want to see teacher activity heatmap (who's active, who's inactive), so I identify training needs.
- **As an admin**, I want dashboard alerts (e.g., "SPP overdue >7 days: 12 families"), so I act on risks proactively.

### Untuk Siswa (Student - Future)

- **As a student**, I want to see my learning dashboard (courses enrolled, progress, xp, badges), so I track my own journey.

---

## 5. Requirements

### P0 — Must Have

| Requirement                          | Acceptance Criteria                                                                                                                                                                                                                  | Priority |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| **Teacher Dashboard (Fixed Layout)** | Pre-built teacher dashboard at `/#/app/teacher/dashboards` with 5 widgets: (1) Class summary card, (2) Student list (top 5 by engagement), (3) Quiz results (last 5 attempts), (4) Struggling students card, (5) Attendance heatmap. | P0       |
| **Admin Dashboard (Fixed Layout)**   | Pre-built admin dashboard at `/#/app/admin/analytics` with 4 widgets: (1) SPP collection card, (2) PPDB pipeline card, (3) Feature adoption card, (4) Teacher activity heatmap.                                                      | P0       |
| **Skeleton Screen on Load**          | Dashboard loads with skeleton immediately (<500ms first paint). Data populates in <2s. No blank white page.                                                                                                                          | P0       |
| **Widget Component Pattern**         | Each widget is standalone React component in `src/features/dashboards/components/Widget*.tsx`. Props: data, isLoading, error, onDrill.                                                                                               | P0       |
| **Responsive Mobile Layout**         | Dashboard cards stack vertically on mobile (<768px). Charts responsive. Touch-friendly buttons.                                                                                                                                      | P0       |
| **Dark Mode Support**                | All dashboard components have `dark:` Tailwind classes. Tested in dark mode.                                                                                                                                                         | P0       |
| **Data Refresh Strategy**            | React Query `staleTime: 5 * 60 * 1000` (5 min). "Refresh now" button to force refetch. Periodic background refresh (every 5 min).                                                                                                    | P0       |
| **Drill-down Navigation**            | Clicking a widget card opens a detail page with full breakdown (e.g., click "Quiz Results" → full quiz history page).                                                                                                                | P0       |
| **Error States**                     | Each widget shows graceful error message (not just crash). Retry button available.                                                                                                                                                   | P0       |

### P1 — Nice to Have

| Requirement                              | Acceptance Criteria                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Teacher: Attendance Heatmap**          | Heatmap showing attendance % per student (rows) by day (columns). Color coded (green=present, red=absent). |
| **Admin: SPP Alerts**                    | Alert banner if ≥10 families overdue SPP >7 days. Click to see list.                                       |
| **Admin: Course Adoption Widget**        | Card showing "Courses created this month: X", "Active learners: Y", "Quiz attempts: Z".                    |
| **Student: Personal Learning Dashboard** | Student can see their enrolled courses, progress %, xp, badges, streaks. (Requires student role access).   |
| **Dashboard Refresh Icon**               | Button to manually refresh all widgets. Shows loading spinner on each.                                     |
| **Time Zone Display**                    | All timestamps respect user's time zone (not server time).                                                 |
| **Accessibility**                        | Keyboard navigation, screen reader support. All widgets have aria-labels.                                  |
| **Export Dashboard to PDF**              | Button to export visible dashboard as PDF (using html2pdf or similar).                                     |

### P2 — Future Considerations

| Requirement                        | Notes                                                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Drag-drop Widget Builder**       | Teacher/admin customizable dashboard layout. Requires `user_dashboard_settings` table + persistence layer. Phase 5B+. |
| **Widget Marketplace**             | Custom widgets created by plugins. Would require widget registry + sandboxed execution. Phase 5C+.                    |
| **Dashboard Presets**              | Offer preset dashboard templates (e.g., "New Teacher", "Admin Compliance"). Requires template system.                 |
| **Cross-tenant Admin Rollup**      | District admins see aggregated metrics across all schools. Security scoping required. Phase 5C+.                      |
| **Historical Snapshots**           | "Compare to 1 month ago" view. Requires time-series DB table. Phase 5C+.                                              |
| **Real-time Alerts via WebSocket** | Instant notification when thresholds crossed (e.g., "5 new overdue SPP"). Currently event-driven batch.               |

---

## 6. Success Metrics

### Leading Indicators (Real-time, intra-sprint)

| Metric                          | Target                      | Measurement                                                      |
| ------------------------------- | --------------------------- | ---------------------------------------------------------------- |
| **First Paint Time (Skeleton)** | <500ms                      | Browser DevTools, Lighthouse. Test on 4G throttle.               |
| **Time to Interactive (Data)**  | <2s                         | Lighthouse TTI. Measure on real devices.                         |
| **Widget Load Time**            | <1s per widget              | React Query DevTools. Measure query time.                        |
| **Dark Mode File Coverage**     | 10+ components              | Count `dark:` variants in `src/features/dashboards/components/`. |
| **Mobile Responsiveness**       | All widgets stack correctly | Visual test on iOS/Android. No horizontal scroll.                |

### Lagging Indicators (End of sprint/month)

| Metric                             | Target              | Measurement                                                  |
| ---------------------------------- | ------------------- | ------------------------------------------------------------ |
| **Dashboard Session Duration**     | +20% avg            | analytics_events: avg session time on `/#/app/*/dashboards`. |
| **Widget Drill-down CTR**          | ≥30%                | Count click-through from widget card to detail page.         |
| **Teacher Daily Dashboard Visits** | ≥70% of DAU         | Count unique teacher users viewing dashboard daily.          |
| **Admin Dashboard Adoption**       | ≥80% of admin users | Count unique admin users visiting admin dashboard weekly.    |
| **Mobile Dashboard Sessions**      | ≥25% of total       | analytics_events filtered by mobile user-agent.              |
| **Error Rate on Dashboard**        | <2%                 | Count error states vs total dashboard loads.                 |

---

## 7. Open Questions

| #   | Pertanyaan                                                                          | Owner           | Blocking?                                 |
| --- | ----------------------------------------------------------------------------------- | --------------- | ----------------------------------------- |
| 1   | Should "Struggling Students" card filter by course or show school-wide?             | Product         | Tidak (per-course for v1)                 |
| 2   | For admin SPP widget, show only overdue or also pending?                            | Product/Finance | Tidak (show both, distinct badges)        |
| 3   | Should teacher dashboard have per-course tabs, or single unified view?              | Product/UX      | Ya — need clarity before Sprint 5B        |
| 4   | Do we need real-time WebSocket alerts or is 5-min cache ok?                         | Eng Lead        | Tidak (5-min is P1, WebSocket is P2)      |
| 5   | Should student dashboard be P1 or P2?                                               | Product         | Tidak (P2 — focus on teacher/admin first) |
| 6   | Export to PDF: should include historical data (week/month trends) or just snapshot? | Product         | Tidak (snapshot only for v1)              |

---

## 8. Timeline & Phases

### Phase 5A — Teacher Dashboard Foundation (2–3 days)

- [ ] Create `DashboardSkeleton` component with pulsing widget placeholders
- [ ] Build teacher dashboard layout (5 widget slots)
- [ ] Implement 5 widgets:
  - `ClassSummaryCard` (total students, avg engagement, %)
  - `TopStudentsCard` (top 5 by xp, leaderboard preview)
  - `RecentQuizCard` (last 5 quiz attempts)
  - `StrugglingStudentsCard` (students with struggle_score ≥7)
  - `AttendanceCard` (attendance % per student preview)
- [ ] Integrate with React Query (useQuery per widget)
- [ ] Dark mode variants

**Deliverable:** Teacher dashboard loads with skeleton, displays 5 widgets

### Phase 5B — Admin Dashboard Foundation (2–3 days)

- [ ] Build admin dashboard layout (4 widget slots)
- [ ] Implement 4 widgets:
  - `SPPCollectionCard` (total collected, pending, overdue metrics)
  - `PPDBPipelineCard` (applications, accepted, enrolled counts)
  - `FeatureAdoptionCard` (% teachers using quizzes, % students active)
  - `TeacherActivityCard` (activity heatmap or bar chart)
- [ ] Integrate with queries (may require new RPCs)
- [ ] Dark mode variants
- [ ] Error handling

**Deliverable:** Admin dashboard loads, shows metrics, handles errors gracefully

### Phase 5C — Mobile + Polish (2–3 days)

- [ ] Responsive layout: cards stack on mobile (<768px)
- [ ] Charts responsive (Recharts with responsive container)
- [ ] Touch-friendly buttons (min 44px height)
- [ ] Drill-down navigation: clicking widget card → detail page
- [ ] Manual refresh button with loading spinner
- [ ] Accessibility: keyboard nav, aria-labels
- [ ] Test on real iOS/Android devices

**Deliverable:** Fully responsive, accessible, mobile-tested

### Phase 5D — Testing + Optimization (1–2 days)

- [ ] Write tests: widget rendering, data fetch, error states, drill-down nav
- [ ] E2E: teacher loads dashboard → identifies struggling student → clicks card → detail page opens
- [ ] Perf audit: 4G throttle, measure load times
- [ ] Dark mode visual QA

**Deliverable:** All tests pass, <2s load on 4G

---

## 9. Dependensi & Risiko

### Technical Dependencies

1. **React Query v5** — State management for widget data fetching. Already in use.
2. **Recharts** — Charts (heatmap, bar, trend). Already in use.
3. **Tailwind Dark Mode** — Already configured. Ensure `dark:` variants.
4. **Supabase RLS + RPCs** — May need new RPCs for admin metrics (SPP, PPDB aggregation). Estimate: 1 day.
5. **React Router v7** — Already in use. Drill-down navigation uses `<Link>` to detail pages.

### Integration Risks

| Risk                                               | Mitigation                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Admin RPCs don't exist for SPP/PPDB**            | Propose new RPCs: `get_spp_metrics(school_id)`, `get_ppdb_metrics(school_id)`. Start early.            |
| **Widgets fetch data independently** → N+1 queries | Batch query per dashboard load, or use React Query's parallel queries. Test with React Query DevTools. |
| **Chart rendering slow on mobile**                 | Recharts can be slow. Test on 4G, consider simplifying charts if needed.                               |
| **Dark mode contrast**                             | Ensure WCAG AA on dark backgrounds. Use axe DevTools to audit.                                         |
| **Drill-down page misses widget data context**     | Pass state via URL params or React Router state. Keep consistent UX.                                   |

### Edge Cases to Handle

1. **Empty dashboard (no data yet)** — Show empty state: "Belum ada data. Mulai dengan [action]"
2. **Widgets fail independently** — Show error state on failed widget, rest still display
3. **User has no permission for admin dashboard** — Show 403 "Akses Ditolak"
4. **Teacher has no enrolled students** — Show empty state per widget
5. **Admin school has no SPP/PPDB data** — Show "Belum ada invoice" / "Belum ada pendaftar"
6. **Mobile orientation change** — Dashboard adapts without flashing

---

## 10. Technical Architecture

### Dashboard Layout (Teacher)

```
┌─────────────────────────────────────┐
│     Class Summary Card              │  ← 3 metrics: total, avg engagement, %)
├─────────────────────────────────────┤
│ Top Students (5)        │ Quiz Results (5)   │
├──────────────────────┬──────────────┤
│ Struggling Students  │ Attendance   │
└──────────────────────┴──────────────┘
```

### Dashboard Layout (Admin)

```
┌─────────────────────────────────────┐
│     SPP Collection    │  PPDB Pipeline   │
├──────────────────────┬──────────────┤
│ Feature Adoption     │ Teacher Activity   │
└──────────────────────┴──────────────┘
```

### Widget Component Pattern

```typescript
// src/features/dashboards/components/WidgetTemplate.tsx
interface WidgetProps {
  data?: TData
  isLoading: boolean
  error?: Error
  onDrill?: (id: string) => void // Drill-down handler
}

export function SampleWidget({ data, isLoading, error, onDrill }: WidgetProps) {
  if (isLoading) return <WidgetSkeleton />
  if (error) return <WidgetError onRetry={...} />

  return (
    <div className="
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-700
      rounded-lg p-4 cursor-pointer hover:shadow-lg
      transition-shadow
    " onClick={() => onDrill?.('drill-id')}>
      {/* Widget content */}
    </div>
  )
}
```

### Hook Pattern

```typescript
export function useTeacherDashboard(courseId: string) {
  const classQuery = useQuery({
    queryKey: ['teacher-dashboard', courseId],
    queryFn: () => getTeacherDashboardData(courseId),
    staleTime: 5 * 60 * 1000, // 5 min
  })

  return {
    data: classQuery.data,
    isLoading: classQuery.isLoading,
    error: classQuery.error,
    refetch: classQuery.refetch,
  }
}
```

### Skeleton Component Pattern

```typescript
export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Header skeleton */}
      <Skeleton className="h-20 col-span-full" />

      {/* Widget skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-48" />
      ))}
    </div>
  )
}
```

---

## 11. Database/API Requirements

### New RPCs Required (if not exist)

| RPC                                       | Parameters     | Returns                                        | Purpose                 |
| ----------------------------------------- | -------------- | ---------------------------------------------- | ----------------------- |
| `get_spp_metrics(school_id)`              | school_id UUID | { total_collected, pending, overdue }          | SPP widget              |
| `get_ppdb_metrics(school_id)`             | school_id UUID | { applications, accepted, enrolled }           | PPDB widget             |
| `get_feature_adoption(school_id)`         | school_id UUID | { quiz_usage, active_students, session_count } | Feature adoption widget |
| `get_teacher_activity_heatmap(school_id)` | school_id UUID | { teacher_id, last_activity, activity_count }  | Teacher activity widget |

### Existing Tables Used

- `enrollments` — Student count per class
- `course_progress` — Engagement metrics per student
- `xp_profiles` — XP/badges for leaderboard
- `quiz_attempts` — Recent quiz results
- `attendance_records` — Attendance %
- `invoices` — SPP collection (via reports module)
- `users` / `user_roles` — Teacher list

---

## 12. Success Checklist

- [ ] Teacher dashboard at `/#/app/teacher/dashboards` loads with skeleton
- [ ] Admin dashboard at `/#/app/admin/analytics` loads with skeleton
- [ ] 5 teacher widgets render correctly with data <2s
- [ ] 4 admin widgets render correctly with data <2s
- [ ] All widgets have error states and retry buttons
- [ ] Dark mode applied to all widgets (10+ components)
- [ ] Mobile layout responsive, no horizontal scroll
- [ ] Drill-down navigation works (click widget → detail page)
- [ ] React Query cache hit rate ≥70%
- [ ] Tests written: widget render, data fetch, error states
- [ ] E2E: dashboard load → identify struggling student → click → detail page
- [ ] Perf audit on 4G: <3s load time
- [ ] Accessibility: keyboard nav, aria-labels, screen reader pass

---

## 13. References

- **Database:** `/docs/DATABASE_ARCHITECTURE.md` — tables, RPCs, column gotchas
- **Analytics System:** `/docs/ANALYTICS.md` — engagement metrics, struggle detection
- **Architecture:** `/docs/ARCHITECTURE.md` — multi-tenancy, RLS, realtime
- **Design System:** `/docs/design-system.md` — component patterns, dark mode
- **Authentication:** `/docs/AUTH.md` — role-based access (RoleRoute)
- **Engineering Roadmap:** `/docs/ENGINEERING_ROADMAP.md` — Phase 5 priorities
