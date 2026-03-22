# PRD — Analytics Dashboard Guru

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live (Performance Optimization Phase)
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/analytics/`

---

## 1. Problem Statement

Guru membutuhkan visibilitas real-time terhadap engagement, progress, dan struggle signals siswa mereka untuk membuat intervensi yang tepat sasaran. Saat ini:

- Dashboard analytics blank 10–20 detik tanpa skeleton screens → UX buruk, user bingung
- Halaman data-heavy tanpa virtual scrolling → lag, scroll janky
- Tidak ada early warning otomatis untuk siswa yang kesulitan → guru fokus pada siswa yang already failing
- Query `get_teacher_analytics()` tidak di-cache dengan baik, sering re-fetch
- Tidak ada segment breakdown (Aktif, Berkembang, Perlu Perhatian, Pasif) visible di dashboard

**Dampak Bisnis:**

- Churn rate guru tinggi karena tidak bisa monitor kelas efektif
- Student intervention terlambat → dropout rate naik
- Kompetitor (Ruangguru, Zenius) punya dashboard yang instant-load
- Mobile users abandon karena loading lambat

**Siapa yang terdampak:**

- Guru (Teacher): Tidak bisa make informed decisions
- Siswa (Student): Tidak dapat support cepat dari guru
- Admin: Tidak bisa monitor teacher effectiveness

---

## 2. Goals

1. **Instant-load Dashboard** — Skeleton screens muncul immediate, data load di background. Target: First paint <500ms, meaningful content dalam 2s.
2. **Zero-jank Scrolling** — Virtual list untuk tabel large dengan 100+ students. Target: 60 FPS saat scroll.
3. **Actionable Insights** — Early warning badges untuk students di segment "Perlu Perhatian" atau "Pasif". Target: Teacher dapat identify 1-click who needs help.
4. **Mobile-friendly Analytics** — Responsive charts, touch-friendly, works offline (cached data). Target: 80% of views mobile ≤3s load.
5. **Smart Caching** — stale-time strategy untuk reduce Supabase queries. Target: 70% cache hit rate, <2s update lag.

---

## 3. Non-Goals

1. **Real-time Streaming Analytics** — No live WebSocket updates (too expensive on Supabase). Data updates are event-driven (~5 min refresh).
2. **Predictive ML Models** — No new ML models in v1. Struggle detection uses existing heuristics (quiz failure rate, inactivity, time-on-task).
3. **Custom Report Builder** — Teacher cannot drag-drop custom dashboard layouts yet. That's phase 5B+ (requires widget persistence).
4. **API for Third-party Tools** — No export API or webhooks for LMS integrations (e.g., Google Sheets sync).
5. **Admin Tenant-wide Analytics** — No aggregated analytics across all teachers in a school. Only per-teacher dashboards (simpler scoping).

---

## 4. User Stories

### Untuk Guru (Teacher)

- **As a teacher**, I want to load my class analytics and see student list in <2s (with skeleton), so I don't have to wait around.
- **As a teacher**, I want to scroll through 100+ students in gradebook without lag, so I can quickly grade assignments.
- **As a teacher**, I want to see which students are struggling (segment badge: "Perlu Perhatian"), so I can reach out first before they disengage.
- **As a teacher**, I want to view engagement trends (line chart over 4 weeks), so I can spot declining engagement before it's too late.
- **As a teacher**, I want to filter students by segment (Aktif, Berkembang, Perlu Perhatian, Pasif), so I can bulk-message at-risk students.
- **As a teacher**, I want to drill down into 1 student's metrics (quiz attempts, lesson completion, time spent), so I understand their exact struggles.
- **As a teacher**, I want to compare 2 students' progress, so I can see who's excelling vs. who's behind.
- **As a teacher**, I want cached analytics on mobile so I can check grades offline during commute, so I'm not blocked by network.

### Untuk Siswa (Student)

- **As a student**, I want to see my own engagement metrics (time spent, lessons done, badges), so I understand my progress.
- **As a student**, I want to see leaderboard rank weekly, so I'm motivated by peer comparison.
- **As a student**, I want to understand why I got a "Perlu Perhatian" alert, so I can fix what's wrong.

### Untuk Admin Sekolah (School Admin)

- **As an admin**, I want to see per-teacher analytics summary (how many students each teacher has, avg engagement), so I understand class health.
- **As an admin**, I want to identify which courses have highest dropout, so I can recommend interventions to teachers.

---

## 5. Requirements

### P0 — Must Have

| Requirement                      | Acceptance Criteria                                                                                                                                | Priority |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Skeleton Screen on Load**      | When teacher opens analytics, spinner/skeleton appears immediately. Data populated within 2s. No blank white page.                                 | P0       |
| **Virtual List (100+ students)** | Table with 100+ rows renders without lag. Scroll FPS ≥50. VirtualList library (react-window or TanStack VirtualList) implemented.                  | P0       |
| **Engagement Segments**          | Students bucketed into 4 segments (Aktif, Berkembang, Perlu Perhatian, Pasif). Segment badge visible on each row. Segment % shown in summary card. | P0       |
| **Early Warning Badge**          | Students with struggle_score ≥7 get red "Perlu Perhatian" badge. Clicking badge opens intervention prompt.                                         | P0       |
| **Stale-time Strategy**          | useTeacherAnalytics() hook uses `staleTime: 5 * 60 * 1000` (5 min). Prevents re-fetch on re-mount. Data still updates on event triggers.           | P0       |
| **Dark Mode Support**            | All analytics components have `dark:` Tailwind classes. Tested in dark mode (class="dark" on html).                                                | P0       |
| **Mobile Responsive**            | Analytics layout adapts to mobile (<768px). Charts stack vertically. Filter bar collapses to dropdown.                                             | P0       |
| **Drill-down View**              | Clicking student name opens detail modal with quiz history, lesson timeline, time-on-task chart, xp progress.                                      | P0       |

### P1 — Nice to Have

| Requirement                | Acceptance Criteria                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Engagement Trend Chart** | Line chart showing engagement over 4 weeks. Can toggle "Aktif vs Perlu Perhatian" segments.               |
| **Filter by Segment**      | Dropdown to filter table to only show students in selected segment(s).                                    |
| **Bulk Message Action**    | Checkbox to select multiple students, bulk "send message" action (integration with notifications module). |
| **Export to CSV**          | Button to export visible analytics data (filtered, sorted) to CSV.                                        |
| **Cached Offline View**    | Service worker caches analytics data from last load, available offline.                                   |
| **Comparison View**        | Select 2 students, side-by-side comparison of metrics.                                                    |
| **Per-Module Analytics**   | Drill into course → course_module → see completion %, time spent, avg quiz score per module.              |

### P2 — Future Considerations

| Requirement                        | Notes                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| **Predictive Churn Model**         | ML model to predict dropouts 2 weeks in advance. Requires Phase 5C+.                      |
| **Real-time Engagement Pulse**     | WebSocket stream showing "Student X just completed Lesson Y". Very nice but expensive.    |
| **Teacher-customizable Dashboard** | Drag-drop widget builder for each teacher's dashboard. Requires widget persistence layer. |
| **Cohort Analysis**                | Compare engagement metrics across 2 courses / 2 cohorts. Requires aggregation work.       |

---

## 6. Success Metrics

### Leading Indicators (Real-time, intra-sprint)

| Metric                          | Target                    | Measurement                                                         |
| ------------------------------- | ------------------------- | ------------------------------------------------------------------- |
| **First Paint Time (Skeleton)** | <500ms                    | Browser DevTools, Lighthouse. Test on 4G throttle.                  |
| **Time to Interactive (Data)**  | <2s                       | Lighthouse TTI. Cache hit rate increases.                           |
| **Scroll FPS**                  | ≥50 FPS                   | Chrome DevTools Performance tab. VirtualList test with 100+ rows.   |
| **Cache Hit Rate**              | ≥70%                      | React Query DevTools. Count cache hits vs misses in 1-hour session. |
| **Dark Mode File Coverage**     | 10+ components with dark: | Find dark: files in `src/features/analytics/components/`.           |

### Lagging Indicators (End of sprint/month)

| Metric                                  | Target               | Measurement                                                            |
| --------------------------------------- | -------------------- | ---------------------------------------------------------------------- |
| **Teacher Engagement Session Duration** | +15% avg             | Analytics.events table: avg session time on /#/app/teacher/dashboards. |
| **Struggle Alert CTR**                  | ≥20%                 | Count clicks on "Perlu Perhatian" badges → open intervention modal.    |
| **Mobile Analytics Sessions**           | ≥30% of total        | Analytics.events filtered by user-agent containing "mobile".           |
| **Student Drill-down View Opens**       | ≥10 per teacher/week | Count opens of student detail modal. Shows teacher is using it.        |
| **Page Abandonment Rate**               | <5%                  | Count users who load analytics then immediately navigate away.         |

---

## 7. Open Questions

| #   | Pertanyaan                                                                        | Owner          | Blocking?                           |
| --- | --------------------------------------------------------------------------------- | -------------- | ----------------------------------- |
| 1   | Should we show XP and badges in the analytics table, or only in drill-down?       | Product/Design | Tidak                               |
| 2   | Do we need real-time engagement pulse (WebSocket) or is 5-min refresh acceptable? | Eng Lead       | Tidak (P2+)                         |
| 3   | Should admin see aggregated analytics across all teachers, or stay per-teacher?   | Product        | Tidak (P2+)                         |
| 4   | Which virtual list library: react-window, TanStack VirtualList, or other?         | Engineering    | Ya — need decision before Sprint 5C |
| 5   | Should offline mode (Service Worker cache) be P0 or P1?                           | Eng Lead       | Tidak (P1)                          |

---

## 8. Timeline & Phases

### Phase 5A — Skeleton + Segment UI (2–3 days)

- [ ] Add `AnalyticsSkeleton` component with pulsing bars
- [ ] Add `EngagementSegmentBadge` component (Aktif/Berkembang/Perlu Perhatian/Pasif)
- [ ] Integrate skeleton into `TeacherAnalyticsDashboard` with useQuery
- [ ] Add segment summary card (% breakdown)
- [ ] Dark mode variants for skeleton

**Deliverable:** Skeleton + segment badges visible on load, no lag

### Phase 5B — Virtual List + Caching (2–3 days)

- [ ] Implement VirtualList in `StudentProgressTable` (migrate from standard map)
- [ ] Add `staleTime: 5 * 60 * 1000` to useTeacherAnalytics hook
- [ ] Measure scroll FPS, ensure ≥50
- [ ] Test with 100+ rows
- [ ] Mobile responsive adjustments

**Deliverable:** Smooth scrolling, no jank, 70% cache hit rate

### Phase 5C — Early Warning + Mobile (2–3 days)

- [ ] Wire up `latest_quiz_score < passing_score AND last_accessed_at > 7 days` → "Perlu Perhatian" badge
- [ ] Implement intervention modal (click badge)
- [ ] Add dark mode to all components (10+ files with dark:)
- [ ] Mobile layout: stack charts, collapse filters
- [ ] Test on real mobile device (iOS/Android)

**Deliverable:** Early warning visible, mobile responsive, dark mode complete

### Phase 5D — Polish + Testing (1–2 days)

- [ ] Write tests for VirtualList, segment logic, caching
- [ ] E2E: teacher loads analytics → identifies struggling student → clicks early warning badge → opens modal
- [ ] Perf audit on 4G throttle
- [ ] Accessibility: screen reader, keyboard nav

**Deliverable:** All tests pass, production-ready

---

## 9. Dependensi & Risiko

### Technical Dependencies

1. **React Query v5** — Already in use. Need `useQuery(..., { staleTime: ... })`
2. **Recharts** — Already in use for charts. Ensure responsive on mobile.
3. **VirtualList Library** — Need to pick (react-window, TanStack). Estimate: 1 day to integrate.
4. **Tailwind Dark Mode** — Already configured. Ensure `dark:` variants in all new/updated components.
5. **Supabase RLS** — `get_teacher_analytics()` RPC already exists and enforces role checks.

### Integration Risks

| Risk                                | Mitigation                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| **VirtualList breaks keyboard nav** | Test keyboard navigation (Tab, arrow keys). Ensure focus trap works.                    |
| **Large dataset (1000+ students)**  | Pagination in RPC: `get_teacher_analytics(p_limit: 50, p_cursor)`. Load more on scroll. |
| **Cache stale-ness**                | If teacher expects live updates, 5 min lag is too long. Add "refresh now" button.       |
| **Mobile chart rendering**          | Recharts can be slow on mobile. Test on 4G, optimize if needed.                         |
| **Dark mode contrast**              | Ensure WCAG AA contrast on dark backgrounds. Test with axe DevTools.                    |

### Edge Cases to Handle

1. **Empty class** — Show empty state: "Belum ada siswa enrolled" + "Enroll siswa sekarang"
2. **Teacher with 0 quizzes given** — Show "Belum ada quiz diberikan" + encourage teacher to create one
3. **Student with 0 activity** — Still show in list with "Belum ada aktivitas"
4. **Struggle score = NULL** — Default to 0, show as low risk
5. **Mobile keyboard appears** → shifts layout. Test with OS keyboard simulators.

---

## 10. Technical Notes

### RPC: `get_teacher_analytics(p_course_id UUID, p_limit INT, p_cursor_student_id UUID)`

**Returns:** Paginated list of students with:

- `student_id`, `student_name`
- `completion_pct` — course completion %
- `struggle_score` — 0–11
- `time_spent_minutes`
- `last_active` — last lesson access date
- `quiz_avg_score`

**RLS Check:** Must be teacher of course (checked in RPC)

### Hook: `useTeacherAnalytics(courseId, options?)`

```typescript
const { data, isLoading, error } = useTeacherAnalytics(courseId, {
  staleTime: 5 * 60 * 1000, // 5 min
  gcTime: 30 * 60 * 1000, // 30 min
})
```

### VirtualList Pattern (Example)

```tsx
import { useVirtual } from 'react-window'

;<VirtualList height={600} itemCount={students.length} itemSize={50}>
  {({ index, style }) => (
    <div style={style} key={students[index].id}>
      <StudentRow student={students[index]} />
    </div>
  )}
</VirtualList>
```

### Dark Mode Example

```tsx
<div
  className="
  bg-white dark:bg-gray-900
  text-gray-900 dark:text-gray-100
  border border-gray-200 dark:border-gray-700
  rounded-lg p-4
"
>
  Content
</div>
```

### Skeleton Component Structure

```tsx
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" /> {/* Header */}
      <Skeleton className="h-20 w-full" /> {/* Summary card */}
      {/* Table header */}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
      {/* Table rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
```

---

## 11. Success Checklist

- [ ] Skeleton screen appears <500ms on page load
- [ ] Data loads in <2s, no blank white page
- [ ] Virtual list scrolls 60 FPS with 100+ students
- [ ] All 4 segments visible with badge and %
- [ ] Early warning badge appears for struggle_score ≥7
- [ ] Clicking badge opens intervention modal
- [ ] Cache hit rate ≥70%
- [ ] All components have dark: variants
- [ ] Mobile layout responsive (<768px)
- [ ] Drill-down modal shows quiz history + time chart
- [ ] Tests written: VirtualList, segment logic, caching
- [ ] E2E flow: load → identify student → click badge → modal opens
- [ ] Perf audit on 4G: load <3s
- [ ] Accessibility: screen reader, keyboard nav pass

---

## 12. References

- **Database:** `/docs/DATABASE.md` — `course_stats`, `course_progress`, `student_lesson_signals`, `learning_events`
- **Analytics System:** `/docs/ANALYTICS.md` — engagement segments, struggle detection, RPCs
- **Gamification:** `/docs/GAMIFICATION.md` — XP, badges, leaderboard
- **Architecture:** `/docs/ARCHITECTURE.md` — RLS, multi-tenancy, realtime
- **Security:** `/docs/SECURITY.md` — role checks, data isolation
- **Design System:** `/docs/design-system.md` — Tailwind, dark mode, component patterns
