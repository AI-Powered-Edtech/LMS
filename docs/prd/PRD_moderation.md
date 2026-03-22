# PRD — Moderation (Moderasi)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Draft
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/moderation/`

---

## 1. Problem Statement

EduSync adalah platform pembelajaran untuk anak sekolah (usia 10-18 tahun). Dengan fitur diskusi, forum, dan upload file, platform menjadi target konten yang tidak sesuai: spam, bullying, konten asusila, file berbahaya, dll.

Saat ini, EduSync tidak punya workflow moderasi yang jelas. Admin tidak bisa:

- Review konten yang dilaporkan pengguna (discussions, komentar, file)
- Approve atau reject konten sebelum dipublikasi (atau retroaktif)
- Lihat riwayat keputusan moderasi (apa yang di-reject, alasan kenapa)
- Set kebijakan moderasi per-sekolah (misal: "Moderation mode = strict" require approval all discussions)

**Dampak Bisnis:** Risk compliance (content liability), parent concerns (anak exposed to inappropriate content), school reputational damage, potential legal issues.

**Cost of Not Solving:** Sekolah meninggalkan platform, bad reviews, potential GDPR/data protection violations, admin harus moderasi manual di spreadsheet.

---

## 2. Goals

1. **Content Moderation Workflow**: Report → Review → Approve/Reject workflow yang terintegrasi di dashboard.
2. **User Reporting System**: Siswa/guru bisa report konten tidak sesuai dengan alasan (spam, bullying, inappropriate content, etc.).
3. **Admin Review Queue**: Admin punya dashboard dengan queue of reported content, sorted by priority (report count, severity).
4. **Moderation Decisions & Audit**: Setiap keputusan (approve/reject) di-log dengan moderator, alasan, timestamp.
5. **Automated Flagging (v1.1)**: Auto-flag konten dengan keyword sensitif atau pattern (misal: all-caps = shouting; excessive punctuation = spam).
6. **School-level Moderation Policy**: Admin bisa set "Moderation Mode" (off, lenient, strict) per-sekolah; strict mode blocks new discussions until approved.

---

## 3. Non-Goals

- **AI Content Moderation**: v1 tidak ada ML model untuk detect NSFW images atau hate speech. Hanya keyword-based + user reports.
- **Automated Content Removal**: v1 tidak ada auto-delete based on score. Semua removal require admin approval.
- **Detailed Content Classification**: v1 tidak ada taxonomy (NSFW, hate speech, bullying, spam, etc.). Hanya "approved/rejected" + text reason.
- **Parent/Guardian Portal**: v1 tidak ada portal khusus untuk orang tua lihat activity anak atau report. Admin only.
- **Appeal System**: v1 tidak ada workflow untuk user appeal rejected content. Future enhancement.
- **Cross-tenant Moderation**: v1 no federation/escalation ke platform super-admin. Each tenant self-moderates.

---

## 4. User Stories

### Untuk Admin Sekolah

- As an admin, I want to view a queue of reported content (discussions, comments, files) so that I can review flagged items.
- As an admin, I want to approve or reject reported content, with a reason so that I can moderate appropriately and leave an audit trail.
- As an admin, I want to see moderation history (what was rejected, why, by whom, when) so that I can track decisions and consistency.
- As an admin, I want to set a moderation policy (strict, lenient, off) so that I can customize moderation intensity.
- As an admin, I want to mute or suspend a user so that I can handle repeat offenders.
- As an admin, I want to view content details in context (full discussion thread, parent post) so that I can make informed decisions.

### Untuk Siswa / Guru

- As a user, I want to report inappropriate content with a reason so that I can notify admin of issues.
- As a user, I want to see a "reported" status on content I reported so that I know my report was received.
- As a user, I want to receive a notification if my reported content was handled so that I know action was taken.

### Untuk Platform (Support/Legal)

- As a support team member, I want to query moderation decisions by school/user/keyword for compliance/legal review.
- As a legal team, I want to export all moderation logs for a specific tenant as evidence of due diligence.

---

## 5. Requirements

### P0 — Must Have

| Requirement                    | Acceptance Criteria                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Report Submission**          | Siswa/guru bisa report content (discussion, comment, file) dengan alasan dari dropdown: Spam, Bullying, Inappropriate, Other. Optional text field untuk detail. Store in `content_reports` table (id, reported_by, content_type, content_id, reason, message, status, created_at, tenant_id).              |
| **Moderation Queue Dashboard** | Admin lihat tabel reported content: content preview (first 100 chars), reported_by user name, report reason, report count (if multiple users reported same item), created_at. Sorted by report_count DESC. Paginated (20/page). Status badge (Pending, Approved, Rejected).                                |
| **Content Detail Modal**       | When admin click on queue item, show full content in modal: full text, author, date posted, all reports for this content (user, reason, message). Context: if discussion, show thread. If comment, show parent post + comments.                                                                            |
| **Approve/Reject Action**      | Admin click "Approve" or "Reject" button. Reject: require reason (dropdown + text field). Approve: no reason needed. Action stored in `moderation_actions` table (id, report_id, action, reason, moderator_id, created_at, tenant_id). Queue item disappears after action.                                 |
| **Moderation History**         | Separate page/tab: table of all moderation actions (date, content, action, moderator, reason). Filter by action (approved/rejected), date range, moderator. Paginated. Exportable to CSV.                                                                                                                  |
| **Moderation Policy Setting**  | Admin page to set policy: Moderation Mode = [Off, Lenient, Strict]. On save, store in `tenants.moderation_settings` (JSON). If Strict: new discussions require approval before visible to other users. If Lenient: discussions visible, report-based moderation only. If Off: no moderation.               |
| **User Mute/Suspend**          | Admin can mute (hide content) or suspend (prevent login) user from moderation dashboard. Store in `user_suspension_records` table (user_id, action, reason, moderator_id, created_at, suspended_until, tenant_id). Muted user: can still access, but their posts/comments hidden. Suspended: cannot login. |
| **Email Notification**         | When content reported: send email to admin team (if configured). When content rejected: send notification to content creator. When content approved: send notification to reporter. All emails in Bahasa Indonesia.                                                                                        |
| **Audit Trail**                | All moderation actions (approve, reject, mute, suspend) logged with moderator ID, timestamp, reason. Visible in moderation history.                                                                                                                                                                        |
| **Dark Mode Support**          | All components support dark: variants.                                                                                                                                                                                                                                                                     |
| **Mobile Responsiveness**      | Moderation queue readable on tablet (stack columns if needed). Modal works on mobile.                                                                                                                                                                                                                      |

### P1 — Nice to Have

| Requirement                    | Notes                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Automated Keyword Flagging** | Auto-flag content containing sensitive keywords (misal: violence, drugs, adult, etc.). Flag appears in queue. Not auto-rejected. |
| **Bulk Actions**               | Admin select multiple items and approve/reject all at once (with confirmation).                                                  |
| **Content Search**             | Search moderation history by keyword, user, reason. Full-text search over report messages.                                       |
| **Appeal Workflow**            | User can request appeal of rejected content. Admin gets notification. (Future: auto-approve after moderator review.)             |
| **Moderation Dashboard Stats** | Widget: total reports this week, approval rate, avg time to decision, top reported users/content.                                |
| **Smart Filtering**            | Pre-built filters: "Reports This Week", "High Priority" (5+ reports), "Pending >24h", etc.                                       |
| **Content Creator Response**   | When content rejected, creator can reply with context/explanation. Admin can re-review with new info.                            |
| **Export Compliance Report**   | Admin export moderation decisions for a date range + user list (for legal/audit compliance).                                     |

### P2 — Future Considerations

- **ML-based Content Moderation**: Integrate external API (OpenAI Moderation, perspective.com, etc.) to auto-flag NSFW, hate speech.
- **Parent Notification**: Parents get digest email of their child's activity, including moderation actions.
- **Granular Permissions**: Different moderators have different scopes (misal: one mod only moderates discussions, another only files).
- **Escalation to Platform**: High-severity reports escalate to platform super-admin (e.g., child safety concerns).
- **Public Moderation Log**: Transparency dashboard showing moderation stats (not individual decisions, just aggregates).
- **Integration with External Reporting**: Report to external safety orgs (NCMEC, etc.) if illegal content detected.

---

## 6. Success Metrics

### Leading Indicators

- **Report Submission Rate**: >50% of inappropriate content reported by users (vs. none reported currently). Track: count of reports/week.
- **Moderation Response Time**: 80%+ of reports reviewed within 4 hours. Track: avg time from report to action.
- **Queue Clear Rate**: <5% of reports pending >24 hours. Target: <10 items in queue at any time.
- **Approval vs Rejection Ratio**: Track ratio (e.g., 70% approved, 30% rejected) to detect over-moderation or under-moderation.

### Lagging Indicators

- **Content Removal Rate**: Reduction in inappropriate content visible to students. Track: count of rejected posts/week (should increase, then stabilize).
- **User Satisfaction**: Survey students: "Does the platform feel safe?" Target: >80% say "yes".
- **Admin Time Spent**: Time to moderate <30 min/day (includes queue review + decisions). Track via analytics.
- **Compliance Incidents**: Zero escalations to legal/compliance due to moderation issues (baseline: currently no moderation, high risk).
- **User Complaints**: Reduction in "inappropriate content" support tickets. Track: tickets/month (should decrease after launch).

---

## 7. Open Questions

| #   | Pertanyaan                                                                                | Owner                | Blocking?                                                      |
| --- | ----------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------- |
| 1   | Apakah report dengan keyword sensitif otomatis block/quarantine content?                  | Product              | Ya — clarify auto-block policy                                 |
| 2   | Apakah reject content hapus selamanya atau just hide dari students tapi admin bisa lihat? | Product/Legal        | Ya — clarify retention policy                                  |
| 3   | Siapa bisa submit report: hanya guru/admin atau juga siswa?                               | Product              | Tidak — plan: semua role, disable untuk potential abuse di v2  |
| 4   | Apakah "Muted" user bisa lihat posts mereka sendiri atau completely hidden?               | Product/Design       | Tidak — muted user lihat posts sendiri tapi tidak others'      |
| 5   | Timezone untuk moderation timestamps: use user timezone atau school timezone?             | Engineering          | Tidak — use school timezone (simpler, consistent)              |
| 6   | Apakah file uploads perlu pre-moderation (scan) sebelum upload diizinkan?                 | Engineering/Security | Ya — need virus scan + MIME type validation (separate feature) |

---

## 8. Timeline & Phases

**Phase 1 (Week 1-2): MVP — Report & Review**

- `content_reports` table + RLS
- Report submission UI (dropdown + message)
- Moderation queue dashboard
- Approve/reject workflow
- Moderation history view

**Phase 2 (Week 3-4): User Management & Notifications**

- Mute/suspend user actions
- Email notifications (admin, reporter, creator)
- Moderation policy settings (off/lenient/strict)
- Moderation stats widget

**Phase 3 (Week 5-6): Polish & Automation**

- Keyword-based auto-flagging
- Bulk actions (select + approve/reject multiple)
- Content search
- Export compliance report
- Dark mode + mobile responsiveness

**Phase 4 (Week 7-8): Launch & Iterate**

- QA + bug fixes
- Gradual rollout to beta schools
- Admin training materials
- Monitoring + iteration based on feedback

**Hard Deadline**: 2026-05-30 (moderation feature live + 3+ schools using)

---

## 9. Dependensi & Risiko

### Technical Dependencies

- `content_reports` table (NEW) — columns: id, reported_by (FK profiles), content_type (enum: discussion/comment/file), content_id (UUID), reason (text), message (text), status (enum: pending/approved/rejected), created_at, updated_at, tenant_id. RLS: readable by admin of tenant only.
- `moderation_actions` table (NEW) — columns: id, report_id (FK content_reports), action (enum: approved/rejected/muted), reason (text), moderator_id (FK profiles), created_at, tenant_id. RLS: readable by admin of tenant only.
- `user_suspension_records` table (NEW) — columns: id, user_id (FK profiles), action (enum: muted/suspended), reason (text), moderator_id (FK profiles), created_at, suspended_until (nullable), tenant_id. RLS: readable by admin of tenant only.
- `tenants.moderation_settings` (JSON) — add column: moderation_mode (enum: off/lenient/strict), keywords (array of strings).
- Email service — Supabase should have email auth configured; use Resend or SendGrid for transactional emails.
- React Query v5 — for invalidation after moderation action.

### Integration Risks

- **Large Report Queue**: If school has 100+ pending reports, queue loads slow. Mitigation: paginate (20/page), add cache layer, background jobs to auto-age old reports.
- **Content Deletion Regression**: If admin rejects discussion, system must cascade-delete comments + quiz attempts. Risk: orphaned data. Mitigation: use soft delete + mark as `is_moderated_removed = true` (don't hard delete).
- **False Positives**: Auto-flagging may flag innocent content. Mitigation: keyword list curated by humans, flag doesn't auto-reject (review required), allow appeal.
- **Privacy Concern**: Moderators see all user content (including private messages if future feature). Mitigation: RLS + audit log every moderator action.
- **Timezone Confusion**: Reports say "flagged at 2PM" but which timezone? Mitigation: always store UTC, display in school timezone.

### Edge Cases

- **Multiple Admins Moderation**: If 2 admins review same report simultaneously, one overwrites other. Mitigation: add "locked_by" + timestamp; if already locked by another admin, show toast "under review".
- **User Deleted After Report**: Report created at 2PM, user deleted at 3PM. Who handles the report? Mitigation: keep user soft-deleted; moderation still works; when approved/rejected, log "user deleted" as context.
- **Content Reported, Then Edited**: Report flagged discussion v1, author edits to v2. Does report still apply? Mitigation: store content snapshot in report; show both versions to moderator.
- **Strict Mode Approval Bottleneck**: If only 1 admin, all new discussions block waiting for approval. Mitigation: alert if queue >10 items; suggest promote another moderator.

---

## 10. Moderation Policy Logic

**Moderation Mode: Off**

- No reports accepted (UI disabled)
- All content visible immediately
- No moderation queue

**Moderation Mode: Lenient**

- Reports accepted
- New content visible immediately
- Only reported content reviewed (reactive)
- Lower priority, <24h SLA

**Moderation Mode: Strict**

- Reports accepted
- New discussions/files require approval before visible (proactive)
- New comments on discussions don't require approval (inherit parent approval)
- Higher priority, <4h SLA
- Show "Pending Approval" badge to author until approved

**Suspension Levels:**

- **Muted**: User's content hidden from others, but visible to author. No notification sent.
- **Suspended**: User cannot login. Email sent: "Your account has been suspended. Contact admin."
- **Permanently Suspended**: No re-login allowed. (Delete auth.users account.)

---

## 11. Email Templates (Bahasa Indonesia)

**Template: Report Submitted (to Admin)**

```
Subjek: Konten Dilaporkan — [Content Type]

Anda menerima laporan baru:
- Konten: [Content Preview]
- Alasan: [Report Reason]
- Dilaporkan oleh: [User Name] — [Timestamp]
- Link: [Link to Moderation Queue]

Silakan review dan ambil tindakan.
```

**Template: Content Rejected (to Creator)**

```
Subjek: Konten Anda Tidak Disetujui

Konten Anda telah ditinjau oleh tim moderasi dan tidak memenuhi kebijakan kami:
- Alasan: [Rejection Reason]
- Konten: [Snippet]

Anda dapat mengedit dan kirim ulang, atau hubungi admin untuk pertanyaan.
```

**Template: User Suspended (to User)**

```
Subjek: Akun Anda Ditangguhkan

Akun Anda telah ditangguhkan karena pelanggaran kebijakan komunitas.
Silakan hubungi admin sekolah untuk informasi lebih lanjut.

Email Admin: [Contact]
```

---

## 12. Database Schema References

**Tables:**

- `content_reports` (NEW)
- `moderation_actions` (NEW)
- `user_suspension_records` (NEW)
- `tenants.moderation_settings` (JSON column, NEW)

**RPC Functions:**

- `submit_report(content_type, content_id, reason, message)` — Create report
- `moderate_content(report_id, action, reason)` — Approve/reject + create moderation_action
- `suspend_user(user_id, action, reason, suspended_until)` — Mute/suspend
- `get_moderation_queue(limit, offset)` — Fetch pending reports ordered by report_count DESC
- `export_moderation_log(start_date, end_date)` — CSV export for compliance

**RLS Policies:**

- `content_reports`: Visible to admin of tenant only. Reportee can see own reports.
- `moderation_actions`: Visible to admin of tenant only.
- `user_suspension_records`: Visible to admin only.

---

## 13. Success Checklist (Dev)

- [ ] `content_reports` table + RLS policy
- [ ] `moderation_actions` table + RLS policy
- [ ] `user_suspension_records` table + RLS policy
- [ ] Report submission form (dropdown reason + message)
- [ ] Moderation queue dashboard (table + sorting/pagination)
- [ ] Content detail modal (context view)
- [ ] Approve/reject actions + confirmation dialog
- [ ] Moderation history view + filters
- [ ] Mute/suspend user actions
- [ ] Moderation policy settings (off/lenient/strict)
- [ ] Email notifications (admin, reporter, creator)
- [ ] Auto-flag keywords (optional for v1)
- [ ] Bulk actions (optional for v1)
- [ ] Dark mode support
- [ ] Mobile responsiveness
- [ ] Error handling + Bahasa Indonesia
- [ ] React Query hooks + invalidation
- [ ] Unit tests (>80% coverage)
- [ ] E2E tests (report submission, moderation workflow)
- [ ] Export CSV functionality
- [ ] Documentation: README.md
