# PRD — Struggle Detection & Intervention

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live (Algorithm Refinement Phase)
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/struggle/`

---

## 1. Problem Statement

Guru memiliki keterbatasan dalam mengidentifikasi siswa yang kesulitan sebelum terlambat. Saat ini:

- **Reaktif, bukan proaktif:** Guru baru tau siswa kesulitan setelah nilai jelek atau deadline terlewat
- **Tidak ada early warning:** Tidak ada alert otomatis untuk siswa yg show signs of struggle (e.g., long inactivity, low quiz scores)
- **Manual monitoring expensive:** Guru harus scroll spreadsheet untuk spot patterns
- **No intervention playbook:** Bahkan jika guru tau siswa kesulitan, tidak ada suggested action atau support resources
- **Missed intervention window:** By time guru notices, siswa sudah demotivated, high dropout risk

**Dampak Bisnis:**

- Student dropout rate naik (especially struggling students with no intervention)
- Teacher dissatisfaction: feels like fighting fire (reactive) instead of preventing (proactive)
- Parent complaints: "Why wasn't my child getting help earlier?"
- Competitive disadvantage: Ruangguru has predictive churn, EduSync has none

**Siapa yang terdampak:**

- Siswa (Student): Not receiving support early → disengagement → dropout
- Guru (Teacher): Manual effort to track → burnout
- Admin: Tracking student attrition rates
- Orang Tua (Parent): Child failing, wants to know why guru didn't reach out

---

## 2. Goals

1. **Early Warning System** — Detect struggling students within 24–48 hours of struggle signals appearing. Alert teacher so they can intervene.
2. **Struggle Score Transparency** — Explain to teacher WHY a student is flagged (e.g., "3 quiz failures in a row", "No activity for 7 days").
3. **Intervention Playbook** — Suggest concrete actions for teacher (e.g., "Send message", "Assign easier lesson", "Schedule 1-on-1").
4. **Struggle Segment Visibility** — Teacher sees 4 engagement segments on dashboard (Aktif, Berkembang, Perlu Perhatian, Pasif). Filter/bulk-action per segment.
5. **Peer Benchmarking** — Show student's metrics vs class average (e.g., "Quiz score: 45% (class avg: 68%)"), so teacher understand severity.
6. **Longitudinal Tracking** — Teacher can see student's struggle history (timeline of struggles, interventions taken, outcomes).

---

## 3. Non-Goals

1. **Fully Automated Intervention** — No AI chatbot or auto-generated tutoring plans yet. Teacher must approve + execute.
2. **Predictive Churn ML Model** — No ML model to predict dropouts 2 weeks ahead. v1 uses rule-based heuristics only.
3. **Parental Notifications** — No direct parent alerts (compliance + privacy concern). Teacher responsible for parent communication.
4. **Multi-stakeholder Collaboration** — No group tutoring assignment or peer support matching. Just teacher-to-student.
5. **Gamification Incentives for Struggling Students** — No special XP bonus or streak resets for at-risk students. That's future.
6. **Intervention Outcome Analytics** — No analytics showing "which interventions work best". Just log interventions, analyze later.

---

## 4. User Stories

### Untuk Guru (Teacher)

- **As a teacher**, I want to see a list of struggling students (sorted by risk level), so I can prioritize interventions.
- **As a teacher**, I want to understand WHY a student is flagged (e.g., "Quiz failure rate 50%, no activity 5 days"), so I can address root cause.
- **As a teacher**, I want suggested actions (send message, assign easier lesson, schedule 1-on-1), so I know what to do next.
- **As a teacher**, I want to see the struggling student's data vs class average, so I understand severity.
- **As a teacher**, I want to bulk-message all "Perlu Perhatian" students at once, so I don't reach out individually.
- **As a teacher**, I want to track what interventions I took for each student, so I can review what worked.
- **As a teacher**, I want to see student's recovery trajectory (struggle → intervention → improvement), so I understand impact of my support.
- **As a teacher**, I want alerts pushed to me (notification, email) when a student suddenly shows struggle signals, so I'm not relying on me checking dashboard.

### Untuk Siswa (Student)

- **As a student**, I want to understand if I'm struggling (clear metric), so I can take corrective action.
- **As a student**, I want to see suggested resources/help when I'm flagged as struggling, so I know what to do.
- **As a student**, I want to opt-in to peer tutoring or extra help requests, so I don't feel singled out.

### Untuk Orang Tua (Parent - Future)

- **As a parent**, I want to see if my child is flagged as struggling and what support the teacher is providing, so I can support at home.

---

## 5. Requirements

### P0 — Must Have

| Requirement                      | Acceptance Criteria                                                                                                                                                                                                     | Priority                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --- |
| **Struggle Detection Algorithm** | Based on: (1) quiz failure rate (% of attempts with score <60%), (2) last access age (days since last lesson activity), (3) time-on-task (avg time per lesson). Composite score 0–11. Threshold: ≥7 = "Perlu Perhatian" | P0                                                 |
| **Struggle Alert Component**     | Modal/panel showing: student name, struggle_score, reason (e.g., "Quiz failures x3"), comparison vs class avg. Appears when teacher opens analytics or dashboard.                                                       | P0                                                 |
| **Suggested Actions**            | Provide teacher with 3–5 action buttons: (1) Send message, (2) Assign easier lesson, (3) Schedule 1-on-1, (4) Mark for parent contact, (5) Refer to counselor.                                                          | P0                                                 |
| **Struggle Student List**        | Page at `/#/app/teacher/struggles` listing struggling students per course. Sortable by risk score, filterable by segment.                                                                                               | P0                                                 |
| **Intervention Log**             | When teacher takes action, log it: { student_id, action_type, timestamp, outcome_expected (optional) }. Visible in student's struggle history.                                                                          | P0                                                 |
| **Segment Filtering**            | Teacher can filter students by segment (Aktif, Berkembang, Perlu Perhatian, Pasif). Segment badges visible on student list.                                                                                             | P0                                                 |
| **Peer Benchmarking**            | Show metric comparison: "Student's quiz avg: 45%                                                                                                                                                                        | Class avg: 68%" + visual indicator (red vs green). | P0  |
| **Dark Mode Support**            | All struggle components have `dark:` Tailwind classes.                                                                                                                                                                  | P0                                                 |
| **Skeleton Screen on Load**      | Struggle list loads with skeleton. Data populated in <2s.                                                                                                                                                               | P0                                                 |

### P1 — Nice to Have

| Requirement                  | Acceptance Criteria                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Real-time Alerts**         | Notification badge on bell icon when new struggle signals detected. Click to open alert panel.                             |
| **Email Alert to Teacher**   | Option to receive email when student flagged as struggling (configurable frequency: immediate, daily digest, weekly).      |
| **Struggle Trend Chart**     | Line chart showing struggle_score over time per student. Intervention markers on chart.                                    |
| **Recovery Dashboard**       | Show students who recovered (struggle_score dropped below 7) in last 2 weeks. Highlight teacher's effective interventions. |
| **AI-suggested Lessons**     | Based on struggling student's weak topics, suggest easier lessons to assign (requires AI Tutor integration).               |
| **Peer Tutoring Matcher**    | Suggest high-performing student who can tutor the struggling student (requires matching logic).                            |
| **Parent Alert Template**    | Pre-written message template teacher can send to parent (customizable).                                                    |
| **Bulk Intervention Action** | Checkbox to select multiple students, apply intervention (e.g., "Assign lesson to all") at once.                           |

### P2 — Future Considerations

| Requirement                             | Notes                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Predictive Churn Model**              | ML model to predict dropouts 2 weeks in advance. Requires historical data + training. Phase 5C+.                  |
| **Causal Analysis**                     | Why is student struggling? (e.g., "Concept gaps in algebra" vs "Disengagement"). Requires learning path analysis. |
| **Dynamic Resource Allocation**         | Auto-assign tutor or counselor based on availability + match. Requires integration with counseling module.        |
| **Student Self-awareness Gamification** | Student sees own struggle signals, gets XP for "asking for help" or "completing catch-up lesson".                 |
| **District-level Risk Dashboard**       | Admin sees school-wide struggle trends (% struggling, intervention success rate).                                 |

---

## 6. Success Metrics

### Leading Indicators (Real-time, intra-sprint)

| Metric                         | Target                                   | Measurement                                                               |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------- |
| **Struggle Detection Latency** | <48 hours from signal to alert           | Timestamp of struggle signal vs alert creation.                           |
| **Struggle Score Accuracy**    | ≥80% correlation with teacher assessment | Survey: teacher rates if system correctly identifies struggling students. |
| **False Positive Rate**        | <20%                                     | Count: students flagged but teacher disagrees they're struggling.         |
| **Alert Click-through Rate**   | ≥40%                                     | Count: teacher clicks on struggle alert / total alerts shown.             |
| **Action Button CTR**          | ≥30%                                     | Count: teacher clicks suggested action / alerts shown.                    |
| **Dark Mode File Coverage**    | 10+ components                           | Count `dark:` variants in `src/features/struggle/components/`.            |
| **Skeleton Load Time**         | <500ms first paint                       | Browser DevTools, Lighthouse.                                             |

### Lagging Indicators (End of sprint/month)

| Metric                                        | Target                                                | Measurement                                                  |
| --------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| **Intervention Conversion Rate**              | ≥50% of flagged students receive intervention         | Track: action logged / students flagged.                     |
| **Student Recovery Rate**                     | ≥60% of intervened students recover within 2 weeks    | Track: struggle_score drops <7 after intervention.           |
| **Dropout Rate (Struggling cohort)**          | -25% vs control                                       | Track: dropout % in group flagged + intervened vs control.   |
| **Teacher Session Duration (struggles page)** | ≥5 min avg                                            | analytics_events: avg time on `/#/app/teacher/struggles`.    |
| **Student Engagement After Alert**            | +15% lesson completion                                | Track: completion % in 7 days after parent/student notified. |
| **Teacher Satisfaction**                      | ≥7/10 ("Helpful for identifying struggling students") | NPS survey at end of sprint.                                 |

---

## 7. Open Questions

| #   | Pertanyaan                                                                            | Owner              | Blocking?                                          |
| --- | ------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------- |
| 1   | Struggle score thresholds: what's the best cutoff (5, 6, 7, 8) for "Perlu Perhatian"? | Data/Product       | Ya — need A/B test                                 |
| 2   | Should we weight quiz failures vs inactivity equally, or one more important?          | Product/Data       | Ya — needs domain expert input                     |
| 3   | Should alerts be real-time or batch (once per day)?                                   | Eng Lead           | Tidak (batch for now, real-time Phase 5C)          |
| 4   | Should parent be notified automatically or teacher chooses?                           | Compliance/Product | Ya — regulatory concern                            |
| 5   | Should struggling students see their own struggle score?                              | Product/UX         | Tidak (can show "you may need help" but not score) |
| 6   | How to handle false positives (e.g., student sick for 1 week → low activity)?         | Product            | Tidak (manual override button for teacher)         |

---

## 8. Timeline & Phases

### Phase 5A — Algorithm + Alert UI (2–3 days)

- [ ] Refine struggle detection algorithm (quiz failure rate + inactivity + time-on-task)
- [ ] Calculate struggle_score for all students (RPC: `compute_struggle_scores()`)
- [ ] Build `StruggleAlertPanel` component (shows score, reason, action buttons)
- [ ] Integrate alert into analytics dashboard + teacher dashboard
- [ ] Add segment badges (Aktif, Berkembang, Perlu Perhatian, Pasif)
- [ ] Dark mode variants

**Deliverable:** Struggle scores calculated, alerts visible on dashboard, segment badges shown

### Phase 5B — Struggle List + Interventions (2–3 days)

- [ ] Create struggle list page at `/#/app/teacher/struggles`
- [ ] Build filters (segment, course, date range, search)
- [ ] Implement suggested action buttons
- [ ] Create intervention log table (track actions taken)
- [ ] Implement logging: when teacher clicks action, log it (RPC + table)
- [ ] Add peer benchmarking card (vs class average)
- [ ] Mobile responsive

**Deliverable:** Struggle list page functional, interventions loggable, benchmarking visible

### Phase 5C — Real-time Alerts + Student View (2–3 days)

- [ ] Implement notification badge on struggles menu
- [ ] Build real-time alert subscription (Supabase realtime)
- [ ] Create student-facing "Perlu Perhatian" indicator (not full score, just flag)
- [ ] Student view of suggested resources / support requests
- [ ] Email alert option for teachers (configurable)
- [ ] Accessibility testing

**Deliverable:** Real-time alerts working, student view functional, email tested

### Phase 5D — Testing + Refinement (1–2 days)

- [ ] Write tests: algorithm accuracy, alert logic, intervention logging
- [ ] E2E: teacher loads struggles → identifies student → clicks action → logs intervention
- [ ] Validate algorithm accuracy with real data (survey teachers)
- [ ] Measure false positive rate
- [ ] Perf audit

**Deliverable:** All tests pass, algorithm validated, production-ready

---

## 9. Dependensi & Risiko

### Technical Dependencies

1. **Supabase RLS + RPCs** — Existing RPCs:
   - `get_at_risk_students(course_id)` — returns students with struggle_score ≥7
   - `get_struggle_alerts(user_id)` — returns alerts for teacher
   - May need to refine/add new RPCs

2. **Database Tables:**
   - `student_lesson_signals` — `total_time_spent`, `last_accessed_at`, `latest_quiz_score` (already exist)
   - `struggle_alerts` — new table for alert tracking (if not exists)
   - `intervention_log` — new table to track actions (if not exists)

3. **React Query** — Already in use. Cache with `staleTime: 5 * 60 * 1000` (5 min)

4. **Tailwind Dark Mode** — Ensure `dark:` variants on all components

### Integration Risks

| Risk                                     | Mitigation                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| **False Positives (e.g., sick student)** | Add teacher override button: "Not actually struggling". Let teacher dismiss alerts. |
| **Struggle score churn**                 | Don't recalculate every minute. Use 5-min refresh. Batch recalc via pg_cron.        |
| **Alert fatigue**                        | Limit alerts: max 1 per day per student. Consolidate into digest.                   |
| **Lag between signal and alert**         | Accept 24–48 hour lag for v1. Real-time is Phase 5C+.                               |
| **Student privacy**                      | Struggle score is teacher-only. Student doesn't see numeric score, just flag.       |
| **Bias in algorithm**                    | Monitor: do some student groups get flagged more? May indicate bias.                |

### Edge Cases to Handle

1. **New student with no activity yet** — struggle_score = NULL, don't flag yet
2. **Student excused absence (parent note)** — Teacher should manually override alert
3. **Student withdrew from course** — Don't show in struggles list
4. **Teacher with no struggling students** — Show empty state: "Semua siswa dalam kondisi baik!"
5. **Intervention logged but student still struggling** — Show follow-up reminder after 3 days
6. **Multiple interventions logged for 1 student** — Timeline view showing all actions
7. **Student recovered** — Move out of "Perlu Perhatian" segment, celebrate in dashboard

---

## 10. Technical Architecture

### Struggle Score Calculation

```
struggle_score = (quiz_failure_weight × quiz_failure_pct) +
                 (inactivity_weight × inactivity_days_pct) +
                 (time_on_task_weight × time_on_task_pct)

Where:
- quiz_failure_weight = 0.4 (40% of score)
- inactivity_weight = 0.35 (35% of score)
- time_on_task_weight = 0.25 (25% of score)

Quiz failure: % of attempts with score < 60% (last 10 attempts)
Inactivity: (days since last_accessed_at) / 30 (capped at 1.0 for ≥30 days)
Time on task: 1 - (avg_time_per_lesson / expected_time), capped at 0–1

Result: struggle_score = 0–11
- 0–3: Aktif (low risk)
- 4–6: Berkembang (developing)
- 7–9: Perlu Perhatian (needs attention)
- 10–11: Pasif (critical, high risk)
```

### RPC: Compute Struggle Scores

```sql
CREATE OR REPLACE FUNCTION compute_struggle_scores(
  p_course_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE(
  student_id UUID,
  struggle_score NUMERIC,
  quiz_failure_pct NUMERIC,
  inactivity_days NUMERIC,
  time_on_task_minutes NUMERIC
) AS $$
BEGIN
  -- Implementation: calculate scores for all students in course
  -- Return results with breakdown
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

### Alert Component Pattern

```tsx
export function StruggleAlertPanel({ studentId, onDismiss }: Props) {
  const { data: alert } = useStruggleAlert(studentId)
  if (!alert) return null

  return (
    <div
      className="
      fixed bottom-4 right-4
      bg-red-50 dark:bg-red-900
      border border-red-200 dark:border-red-700
      rounded-lg p-4 max-w-md shadow-lg
    "
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-red-900 dark:text-red-100">
            {alert.studentName} — Perlu Perhatian
          </h3>
          <p className="text-sm text-red-700 dark:text-red-200 mt-1">
            Struggle Score: {alert.struggle_score}/11
          </p>
          <ul className="text-xs text-red-600 dark:text-red-300 mt-2 space-y-1">
            {alert.reasons.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </div>
        <button onClick={onDismiss} className="text-red-500 hover:text-red-700">
          ✕
        </button>
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={() => sendMessage(studentId)}>Kirim Pesan</button>
        <button onClick={() => assignLesson(studentId)}>Assign Lesson</button>
        <button onClick={() => schedule1on1(studentId)}>1-on-1</button>
      </div>
    </div>
  )
}
```

### Hook Pattern: useStruggleStudents

```typescript
export function useStruggleStudents(courseId: string) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: ['struggle-students', courseId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_at_risk_students', { course_id: courseId })
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 min
  })
}
```

### Intervention Log Pattern

```typescript
async function logIntervention(
  studentId: string,
  actionType: 'message' | 'lesson' | '1on1' | 'parent_contact' | 'counselor_referral',
  notes?: string
) {
  const { data, error } = await supabase.from('intervention_log').insert({
    student_id: studentId,
    action_type: actionType,
    notes,
    logged_by: auth.user.id,
    logged_at: new Date(),
    tenant_id: auth.tenantId,
  })

  if (error) throw error
  return data
}
```

### Struggle Segment Assignment

```typescript
function assignSegment(
  struggleScore: number
): 'Aktif' | 'Berkembang' | 'Perlu Perhatian' | 'Pasif' {
  if (struggleScore <= 3) return 'Aktif'
  if (struggleScore <= 6) return 'Berkembang'
  if (struggleScore <= 9) return 'Perlu Perhatian'
  return 'Pasif'
}
```

---

## 11. Database/API Requirements

### New RPCs Required (if not exist)

| RPC                                             | Parameters           | Returns                                                   | Notes                     |
| ----------------------------------------------- | -------------------- | --------------------------------------------------------- | ------------------------- |
| `get_at_risk_students(course_id)`               | course_id UUID       | Array<{student_id, student_name, struggle_score, reason}> | RLS: teacher of course    |
| `get_struggle_alerts(user_id)`                  | user_id UUID         | Array<{alert_id, student_id, timestamp, risk_level}>      | RLS: own alerts only      |
| `compute_struggle_scores(course_id, tenant_id)` | course_id, tenant_id | Void (updates table)                                      | Runs on trigger + pg_cron |

### New Tables Required

| Table              | Columns                                                                                 | Purpose                              |
| ------------------ | --------------------------------------------------------------------------------------- | ------------------------------------ |
| `struggle_alerts`  | id, student_id, teacher_id, course_id, struggle_score, reason, dismissed_at, created_at | Track alerts shown to teacher        |
| `intervention_log` | id, student_id, teacher_id, action_type, notes, logged_at, outcome_date, outcome_notes  | Log teacher interventions + outcomes |

### Existing Tables Used

- `student_lesson_signals` — `total_time_spent`, `last_accessed_at`, `latest_quiz_score`
- `quiz_attempts` — Quiz attempt history, scores
- `lesson_progress` — Lesson completion data
- `course_progress` — Per-student, per-course progress

---

## 12. Success Checklist

- [ ] Struggle detection algorithm implemented and tested
- [ ] Struggle_score calculated for all students
- [ ] Alert component appears on analytics + dashboards
- [ ] Segment badges (Aktif/Berkembang/Perlu Perhatian/Pasif) visible
- [ ] Struggle list page at `/#/app/teacher/struggles` functional
- [ ] Filters work (segment, course, search)
- [ ] Suggested action buttons trigger interventions
- [ ] Intervention logging works (actions persisted)
- [ ] Peer benchmarking card shows class avg vs student
- [ ] Dark mode applied to all components
- [ ] Mobile responsive layout
- [ ] Skeleton screen loads in <500ms
- [ ] False positive rate <20%
- [ ] Intervention CTR ≥30%
- [ ] Recovery rate ≥60% within 2 weeks
- [ ] Tests written: algorithm, alert logic, intervention logging
- [ ] E2E: teacher identifies struggling student → logs intervention
- [ ] Teacher satisfaction survey ≥7/10
- [ ] Accessibility: keyboard nav, aria-labels, screen reader pass

---

## 13. References

- **Database:** `/docs/DATABASE_ARCHITECTURE.md` — student_lesson_signals, quiz_attempts tables
- **Analytics:** `/docs/ANALYTICS.md` — engagement segments, struggle score, early warning
- **Gamification:** `/docs/GAMIFICATION.md` — XP, badges, streaks
- **Architecture:** `/docs/ARCHITECTURE.md` — RLS, multi-tenancy, realtime
- **Design System:** `/docs/design-system.md` — dark mode, component patterns
- **AI Tutor:** `/docs/architecture/AI_TUTOR_CONTEXT_ENGINE.md` — potential integration for suggested lessons
