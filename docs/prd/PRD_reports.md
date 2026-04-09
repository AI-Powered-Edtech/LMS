# PRD — Reports (PPDB, Finance/SPP, Academic Export)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live (V1 Foundation, PDF Export Phase 5A)
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/reports/`

---

## 1. Problem Statement

Admin sekolah dan guru memerlukan laporan terstruktur untuk compliance, financial tracking, dan student records:

- **PPDB (Penerimaan Peserta Didik Baru)** — Must track applications, acceptance rates, enrollment pipeline per academic year
- **SPP (Sumbangan Pembinaan Pendidikan)** — Must report collection status, overdue accounts, family contact info for follow-up
- **Academic Reports** — Transcript per student, class progress report, teacher salary deduction due to student failure
- **Saat ini:** Report data tersebar across multiple pages. No structured export. Admin manually compile to Excel.
- **Cost:** 5–10 hours per month admin time wasted on report compilation

**Dampak Bisnis:**

- Compliance risk: Can't prove PPDB transparency to school board on demand
- Financial risk: Overdue SPP not tracked systematically, revenue loss
- Student risk: No transcript export capability → parents unhappy, regulatory concern
- Churn risk: Admin abandons LMS for Google Sheets + manual processes

**Siapa yang terdampak:**

- Admin Sekolah (School Admin): Time-consuming manual reporting
- Guru (Teacher): Need to provide student transcripts, attendance records
- Orang Tua (Parents): Need official transcripts for student transfer
- Regulator: School board audits require documented PPDB/enrollment process

---

## 2. Goals

1. **Automated Report Generation** — Admin clicks "Generate PPDB Report" → PDF/CSV generated in <5s, download-ready
2. **Real-time PPDB Pipeline** — Dashboard showing applications received, reviewed, accepted, declined, enrolled. Exportable as table/chart.
3. **SPP Collection Dashboard** — Admin sees per-family collection status (paid, pending, overdue). Batch export overdue list.
4. **Student Academic Transcript** — Teacher/admin exports student transcript (courses, grades, attendance, XP, badges). PDF format.
5. **Scheduled Report Email** — Admin can schedule monthly PPDB/SPP report to school leadership. Email auto-sends report attachment.
6. **Compliance-ready Data** — All reports include required fields (student ID, name, date, signatures placeholder for print-out).

---

## 3. Non-Goals

1. **Custom Report Builder** — No drag-drop report designer in v1. Fixed templates only (PPDB, SPP, Transcript, Attendance).
2. **Data Warehouse / BI Tool** — No standalone BI tool or SQL query builder. Reports are pre-baked RPCs.
3. **Real-time Report Streaming** — No live-updating report dashboard. Reports are point-in-time snapshots.
4. **Payroll Integration** — No automatic payroll deduction for teachers. Reports just show data, no HR integration.
5. **Multi-school Rollup** — No district-level aggregated reports. Per-school only.
6. **OCR / Document Upload** — No scanning PPDB documents or processing images. Reports generated from DB data only.

---

## 4. User Stories

### Untuk Admin Sekolah (School Admin)

- **As an admin**, I want to generate a PPDB report (applications, accepted, enrolled) and export to PDF/CSV, so I can email it to school leadership.
- **As an admin**, I want to see per-family SPP collection status (paid amount, pending, overdue date) in a table, so I know who to follow up with.
- **As an admin**, I want to filter SPP by status (overdue >7 days, overdue >30 days), so I can prioritize follow-up calls.
- **As an admin**, I want to export SPP overdue list with family names + contact info, so I can bulk-message parents.
- **As an admin**, I want to schedule a monthly PPDB report to be emailed to principal + treasurer, so I don't have to do it manually.
- **As an admin**, I want to see a PPDB vs enrollment trend (applications → accepted → enrolled), so I understand conversion rates.
- **As an admin**, I want to generate an academic summary report (top 10 students by GPA, courses, enrollment trends), so I provide insights to leadership.

### Untuk Guru (Teacher)

- **As a teacher**, I want to export a student transcript (courses, grades, attendance, XP, badges), so I can provide it to parent or student transferring schools.
- **As a teacher**, I want to print attendance sheet (student names, dates, mark present/absent), so I can use it in class.
- **As a teacher**, I want to bulk export class grades to Excel, so I can share with admin or backup locally.
- **As a teacher**, I want to see class progress report (% students who passed, avg score, time-on-task), so I report to principal.

### Untuk Orang Tua (Parent - Future)

- **As a parent**, I want to view/download my child's transcript and progress report, so I understand their academic standing.

---

## 5. Requirements

### P0 — Must Have

| Requirement                 | Acceptance Criteria                                                                                                                                                 | Priority |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **PPDB Report Page**        | Admin page at `/#/app/admin/reports/ppdb` with table: (applicant_name, status, date_applied, date_enrolled). Buttons: Filter, Export CSV, Export PDF.               | P0       |
| **SPP Collection Report**   | Admin page at `/#/app/admin/reports/spp` with table: (family_name, student_name, total_amount, paid, pending, overdue_date). Status badge (paid, pending, overdue). | P0       |
| **Filters on Reports**      | Date range picker, status filter (dropdown), search by name. Apply filters instantly.                                                                               | P0       |
| **CSV Export**              | Button to export table data to CSV. File name: `PPDB_2026-03-22.csv`. Open in Excel/Sheets.                                                                         | P0       |
| **PDF Export**              | Button to export report to PDF. Include header (school name, report date), data table, footer. Use html2pdf or pdfkit.                                              | P0       |
| **Student Transcript**      | Teacher/admin can generate student transcript (courses taken, final grade, attendance %, xp, badges). Export PDF.                                                   | P0       |
| **Report List Page**        | Admin page at `/#/app/admin/reports` listing all reports (PPDB, SPP, Academic, Attendance). Quick-link to generate or download.                                     | P0       |
| **Skeleton Screen on Load** | Report pages load with skeleton. Data populated in <2s.                                                                                                             | P0       |
| **Dark Mode Support**       | All report components have `dark:` Tailwind classes. Tables readable in dark mode.                                                                                  | P0       |
| **Error Handling**          | Export fails gracefully with user-friendly error message. Retry button.                                                                                             | P0       |

### P1 — Nice to Have

| Requirement                  | Acceptance Criteria                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Scheduled Report Email**   | Admin sets cron (e.g., "1st of month, 9 AM") to email report to recipients. Uses Edge Function `schedule-report-email`. |
| **PPDB Trend Chart**         | Line chart showing applications received, accepted, enrolled over months.                                               |
| **SPP Trend Chart**          | Bar chart showing SPP collection trend (paid vs pending) over months.                                                   |
| **Attendance Report**        | Teacher can generate blank attendance sheet (date columns, student rows) and print/export.                              |
| **Class Progress Report**    | Teacher generates summary: "10 students, 80% passed quiz, avg score 75, 5 hrs avg time-on-task".                        |
| **Batch Student Transcript** | Export transcripts for all students in a course at once (ZIP file).                                                     |
| **Report History**           | Admin can view/re-download previously generated reports. List with timestamp.                                           |
| **Print-friendly Format**    | Report layout optimized for printing (margins, page breaks, no color dependency).                                       |
| **Custom Report Title**      | Admin can add custom note/title to report (e.g., "Q1 2026 PPDB Report").                                                |

### P2 — Future Considerations

| Requirement                       | Notes                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Custom Report Builder**         | Drag-drop interface to create custom report templates. Requires template persistence layer. Phase 5C+. |
| **Real-time Report Dashboard**    | Dashboard showing live PPDB and SPP metrics that auto-refresh. Phase 5C+.                              |
| **Data Warehouse Export**         | Bulk export of all tables to data warehouse (for analysis). Requires external API.                     |
| **Advanced Analytics in Reports** | Predictive churn, segmentation by performance, cohort analysis. Phase 5C+.                             |
| **Digital Signature**             | Reports can be digitally signed (compliance). Requires PKI integration.                                |
| **Multi-format Export**           | Export to XML, JSON, or custom format. Currently CSV/PDF only.                                         |

---

## 6. Success Metrics

### Leading Indicators (Real-time, intra-sprint)

| Metric                         | Target               | Measurement                                                   |
| ------------------------------ | -------------------- | ------------------------------------------------------------- |
| **Report Generation Time**     | <5s                  | Measure from button click to download ready.                  |
| **File Download Success Rate** | 100% (no 500 errors) | Monitor Edge Function + download handler errors.              |
| **CSV/PDF File Size**          | <5 MB                | Monitor exported file sizes.                                  |
| **Dark Mode File Coverage**    | 10+ components       | Count `dark:` variants in `src/features/reports/components/`. |
| **Skeleton Screen Load Time**  | <500ms               | Browser DevTools first paint.                                 |

### Lagging Indicators (End of sprint/month)

| Metric                               | Target                   | Measurement                                           |
| ------------------------------------ | ------------------------ | ----------------------------------------------------- |
| **Admin Reports Generated/week**     | ≥5 per school            | Count via analytics_events or report_audit_log table. |
| **Report Export CTR**                | ≥40%                     | Count exports vs page views.                          |
| **Average Admin Time on Reports**    | -30%                     | Survey or usage_duration in analytics_events.         |
| **Error Rate on Export**             | <1%                      | Count failed exports vs total attempts.               |
| **Scheduled Report Email Open Rate** | ≥60%                     | Email service analytics.                              |
| **Student Transcript Downloads**     | ≥1 per 50 students/month | Count via analytics_events or download log.           |

---

## 7. Open Questions

| #   | Pertanyaan                                                       | Owner            | Blocking?                           |
| --- | ---------------------------------------------------------------- | ---------------- | ----------------------------------- |
| 1   | PPDB: should we include rejection reason in report?              | Product/Business | Tidak                               |
| 2   | SPP: what's the "overdue" threshold (7, 14, 30 days)?            | Finance/Business | Ya — need clarification             |
| 3   | Should reports be paginated in DB or all at once?                | Eng Lead         | Ya — for large datasets             |
| 4   | Should scheduled emails include attachments or link to download? | Product/Security | Ya — attachment vs link tradeoff    |
| 5   | Which PDF library: html2pdf, pdfkit, or node-pdf?                | Engineering      | Ya — need decision before Sprint 5A |
| 6   | Should parent access to transcript be API or only print-to-PDF?  | Product/Security | Tidak (print-to-PDF for v1)         |

---

## 8. Timeline & Phases

### Phase 5A — PPDB + SPP Report Pages (2–3 days)

- [ ] Create report list page at `/#/app/admin/reports` with quick links
- [ ] Build PPDB report page (table, filters, skeleton)
- [ ] Build SPP report page (table, filters, skeleton)
- [ ] Implement filter logic (date range, status, search)
- [ ] Add dark mode variants
- [ ] Create utils for CSV export (simple array-to-CSV)

**Deliverable:** PPDB + SPP reports visible with filters, CSV export working

### Phase 5B — PDF Export + Student Transcript (2–3 days)

- [ ] Implement PDF export (pick library: html2pdf or pdfkit)
- [ ] Add PDF export buttons to PPDB + SPP pages
- [ ] Create student transcript component (courses, grades, attendance, xp, badges)
- [ ] Implement transcript PDF export
- [ ] Test PDF layout, margins, page breaks
- [ ] Dark mode print-friendly CSS

**Deliverable:** PDF exports working for all reports, transcript exportable

### Phase 5C — Scheduled Email + Polish (2–3 days)

- [ ] Create scheduled report Edge Function (similar to `generate-pdf`)
- [ ] Build admin UI to set report schedule + email recipients
- [ ] Implement pg_cron job trigger for scheduled reports
- [ ] Test email delivery (dev + prod)
- [ ] Add report history / audit log
- [ ] Accessibility testing

**Deliverable:** Scheduled reports working, audit trail visible

### Phase 5D — Testing + Optimization (1–2 days)

- [ ] Write tests: report generation, export logic, filters
- [ ] E2E: admin generates PPDB report → downloads CSV → opens in Excel
- [ ] Perf audit: large dataset (1000+ records), export speed
- [ ] Print-friendly testing (Chrome, Firefox, Safari)

**Deliverable:** All tests pass, production-ready, print QA done

---

## 9. Dependensi & Risiko

### Technical Dependencies

1. **Supabase RLS + RPCs** — Need RPCs:
   - `get_ppdb_reports(school_id, filters)`
   - `get_spp_reports(school_id, filters)`
   - `get_student_transcript(student_id)`
   - Estimate: 1 day to implement

2. **PDF Library** — Need to pick:
   - `html2pdf` — Client-side, simple, but rendering issues
   - `pdfkit` — Node.js library, needs Edge Function
   - Recommendation: `html2pdf` for v1 (simpler), upgrade to `pdfkit` if needed

3. **CSV Export** — Can use simple `papaparse` library or custom array-to-CSV util

4. **React Query** — Already in use. Cache report data with `staleTime: 10 * 60 * 1000` (10 min)

5. **Tailwind + Dark Mode** — Already configured. Ensure `dark:` variants for tables.

### Integration Risks

| Risk                              | Mitigation                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| **Large CSV export (1000+ rows)** | Paginate in RPC, load more on scroll. Or offer "export first 500" with checkbox to get all. |
| **PDF rendering slow**            | Test with large datasets. Optimize with CSS or chunked rendering.                           |
| **Email attachment size**         | Keep PDFs <5 MB. If too large, send link instead.                                           |
| **Timezone issues in dates**      | All dates must respect user's timezone. Use `Intl.DateTimeFormat`.                          |
| **Dark mode print**               | Print stylesheet must override colors. Test with `@media print`.                            |
| **Scheduled job failure**         | Monitor pg_cron job success. Alert admin if job fails.                                      |

### Edge Cases to Handle

1. **No PPDB data** — Show empty state: "Belum ada pendaftar"
2. **No SPP data** — Show empty state: "Belum ada pembayaran"
3. **Student with no transcript** — Show message: "Siswa belum mengikuti kursus apapun"
4. **Export with no data after filter** — Show message: "Tidak ada data untuk filter yang dipilih"
5. **PDF generation timeout** — Show retry button, timeout after 30s
6. **Email send failure** — Log error, show retry, notify admin

---

## 10. Technical Architecture

### Report Types & Routes

| Report Type    | Admin Route                             | RPC                                    | Export Format |
| -------------- | --------------------------------------- | -------------------------------------- | ------------- |
| PPDB           | `/#/app/admin/reports/ppdb`             | `get_ppdb_reports(school_id, filters)` | CSV, PDF      |
| SPP            | `/#/app/admin/reports/spp`              | `get_spp_reports(school_id, filters)`  | CSV, PDF      |
| Transcript     | `/#/app/teacher/reports/transcript`     | `get_student_transcript(student_id)`   | PDF           |
| Attendance     | `/#/app/teacher/reports/attendance`     | `get_attendance_report(course_id)`     | CSV, PDF      |
| Class Progress | `/#/app/teacher/reports/class-progress` | `get_class_progress_report(course_id)` | PDF           |

### CSV Export Pattern

```typescript
function exportToCSV<T extends Record<string, any>>(data: T[], filename: string) {
  const headers = Object.keys(data[0] || {})
  const csv = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => `"${row[h]}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}
```

### PDF Export Pattern (html2pdf)

```typescript
import html2pdf from 'html2pdf.js'

function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId)
  const options = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
  }
  html2pdf().set(options).from(element).save()
}
```

### PDF Export Pattern (Edge Function, pdfkit)

```typescript
// supabase/functions/generate-pdf/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { PDFDocument, PDFPage } from 'https://deno.land/x/pdfjs@0.19.0/mod.ts'

serve(async (req) => {
  const { reportType, filters } = await req.json()
  const data = await fetchReportData(reportType, filters)
  const pdf = await generatePDF(reportType, data)

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report.pdf"`,
    },
  })
})
```

### Report Data Query Pattern

```typescript
export function useReportData(reportType: 'ppdb' | 'spp', filters: ReportFilters) {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: ['report', reportType, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(`get_${reportType}_reports`, {
        school_id: tenantId,
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        status: filters.status,
      })
      if (error) throw error
      return data
    },
    staleTime: 10 * 60 * 1000, // 10 min
  })
}
```

### Report Scheduler Pattern (Scheduled Email)

```typescript
// Edge Function triggered by pg_cron
async function scheduleReportEmail(
  schoolId: string,
  reportType: 'ppdb' | 'spp',
  recipients: string[],
  schedule: string // cron expression
) {
  // 1. Generate report PDF
  const pdf = await generatePDF(reportType, data)

  // 2. Send email with attachment
  await sendEmail({
    to: recipients,
    subject: `Report ${reportType.toUpperCase()} - ${new Date().toLocaleDateString('id-ID')}`,
    body: 'Laporan otomatis terlampir.',
    attachments: [{ filename: 'report.pdf', data: pdf }],
  })

  // 3. Log in audit table
  await logReportGeneration(schoolId, reportType, 'scheduled')
}
```

---

## 11. Database/API Requirements

### New RPCs Required

| RPC                                    | Parameters                            | Returns                                                                | Notes                                                      |
| -------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| `get_ppdb_reports(school_id, filters)` | school_id, date_from, date_to, status | Array<{applicant_name, status, date_applied, date_enrolled}>           | RLS: school_id must match                                  |
| `get_spp_reports(school_id, filters)`  | school_id, date_from, date_to, status | Array<{family_name, student_name, total, paid, pending, overdue_date}> | RLS: school_id must match                                  |
| `get_student_transcript(student_id)`   | student_id                            | {courses, grades, attendance, xp, badges}                              | RLS: auth.uid() must be student or teacher/admin of school |
| `get_attendance_report(course_id)`     | course_id                             | Array<{date, student_name, present}>                                   | RLS: teacher of course                                     |

### New Tables (if not exist)

| Table               | Columns                                                             | Purpose                          |
| ------------------- | ------------------------------------------------------------------- | -------------------------------- |
| `report_audit_log`  | id, school_id, report_type, generated_by, generated_at, file_url    | Audit trail of generated reports |
| `scheduled_reports` | id, school_id, report_type, recipients, schedule, next_run, enabled | Store scheduled report configs   |

### Existing Tables Used

- `enrollments` — PPDB pipeline
- `invoices` — SPP payment tracking
- `quiz_attempts` — Academic grades
- `attendance_records` — Student attendance
- `course_progress` — Course completion
- `xp_profiles`, `student_badges` — Transcript data

---

## 12. Success Checklist

- [ ] PPDB report page loads with skeleton in <500ms
- [ ] SPP report page loads with skeleton in <500ms
- [ ] Filters work: date range, status, search
- [ ] CSV export button generates file in <2s
- [ ] PDF export button generates file in <5s
- [ ] Student transcript PDF includes courses, grades, attendance, XP, badges
- [ ] All tables dark mode compatible
- [ ] CSV/PDF open correctly in Excel/Sheets/Acrobat
- [ ] Print-friendly CSS tested (Chrome, Firefox, Safari)
- [ ] Scheduled email job works (test with dev account)
- [ ] Report audit log populated on each export
- [ ] Tests written: report generation, export logic, filters
- [ ] E2E: admin generates PPDB → downloads CSV → opens
- [ ] Error handling: timeouts, network failures, no data cases
- [ ] Accessibility: keyboard nav, aria-labels, screen reader pass

---

## 13. References

- **Database:** `/docs/DATABASE_ARCHITECTURE.md` — tables, RPC reference
- **Architecture:** `/docs/ARCHITECTURE.md` — multi-tenancy, RLS, Edge Functions
- **Analytics:** `/docs/ANALYTICS.md` — engagement metrics, signals
- **Design System:** `/docs/design-system.md` — dark mode, print CSS
- **Edge Functions:** Supabase docs on functions, scheduled jobs
