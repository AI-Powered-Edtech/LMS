# EduSync On-Call Guide

This document defines who is on-call, how they are contacted, which tools
they use, and what is expected before/during/after a shift. For the actual
response procedures during an incident, see
[`docs/incidents/RUNBOOK.md`](./incidents/RUNBOOK.md).

---

## 1. Rotation Schedule (weekly template)

On-call shifts rotate **weekly, Monday 09:00 WIB -> following Monday 09:00 WIB**.
Primary carries the pager 24/7; Secondary covers only if Primary does not
acknowledge within 10 minutes.

| Week start   | Primary           | Secondary         | Manager on-call |
| ------------ | ----------------- | ----------------- | --------------- |
| 2026-04-13   | @alice (backend)  | @bob (frontend)   | @carol          |
| 2026-04-20   | @bob (frontend)   | @dave (platform)  | @carol          |
| 2026-04-27   | @dave (platform)  | @eve (data)       | @carol          |
| 2026-05-04   | @eve (data)       | @alice (backend)  | @carol          |

Rotation lives in PagerDuty (`edusync-prod` schedule). Swaps must be done in
PagerDuty AND announced in `#oncall` at least 24h ahead.

Compensation: one TOIL day per week of primary on-call, per HR policy.

---

## 2. Escalation Contacts

| Role                        | Primary contact       | Backup                |
| --------------------------- | --------------------- | --------------------- |
| Incident Commander (IC)     | current primary       | current secondary     |
| Engineering Manager on-call | @carol                | @frank (VP Eng)       |
| Security Lead               | @grace                | @henry                |
| Database / Platform         | @dave                 | @ivan                 |
| Frontend Lead               | @bob                  | @jane                 |
| Product / Comms             | @kate                 | @leo                  |
| Legal / DPO (PII breach)    | legal@edusync.example | dpo@edusync.example   |
| Executive (P0 > 2h)         | @mia (CTO)            | @nate (CEO)           |

### Severity -> Escalation Matrix

| Severity | Notify immediately                                            | Escalate if unresolved after |
| -------- | ------------------------------------------------------------- | ---------------------------- |
| **P0**   | Primary, Secondary, Manager, Security (if relevant), CTO      | 30 min -> exec; 2h -> CEO    |
| **P1**   | Primary, Secondary, Manager                                   | 1h -> Manager; 4h -> exec    |
| **P2**   | Primary                                                       | next business day -> Manager |
| **P3**   | ticket only                                                   | n/a                          |

---

## 3. Tools

| Purpose                 | Tool                                                   | Link / Command                                    |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Paging & schedule       | PagerDuty (primary) / Opsgenie (backup)                | `edusync-prod` service                            |
| Error tracking          | Sentry                                                 | https://sentry.io/organizations/edusync           |
| Metrics & dashboards    | Grafana (Prometheus + Loki)                            | https://grafana.edusync.example.com               |
| Logs (structured)       | Loki / Supabase Logs                                   | via Grafana                                       |
| Mobile crash monitoring | Google Play Console + Firebase Crashlytics             | Play Console -> Quality -> Android vitals         |
| Status page             | statuspage.io                                          | https://status.edusync.example.com                |
| Feature flags           | In-app Admin UI                                        | `/admin/feature-flags`                            |
| Runbook                 | `docs/incidents/RUNBOOK.md`                            | (this repo)                                       |
| Load test               | k6                                                     | `tests/load/play-store-readiness.js`              |
| Secrets / rotation      | 1Password + `docs/security/SECRET_ROTATION_SOP.md`     | 1Password vault `edusync-prod`                    |

**Play Console alerts:** ensure the on-call Primary is added as a user with
the "Alert" permission so crash-rate and ANR spikes page automatically.

---

## 4. Communication Channels

| Channel                    | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `#incidents` (Slack)       | Incident declaration, IC-led coordination, timeline log  |
| `#oncall` (Slack)          | Shift handoffs, pager swaps, routine on-call chatter     |
| `#eng-announce` (Slack)    | Broadcast to engineering at large (P0/P1 only)           |
| Status page (statuspage.io)| Public user-facing updates (P0/P1 with user impact)      |
| Email (broadcast)          | Tenant admins for multi-hour P0 incidents                |
| In-app banner              | Via feature flag (`banner.*`) — degraded-mode messaging  |

### Update cadence (during incident)

- **P0:** Internal update every 30 min, public status update every hour.
- **P1:** Internal update every hour, public only if user-visible.
- **P2+:** Updates on status changes only.

---

## 5. Post-Mortem Template (Blameless)

Create a doc in `docs/incidents/pm-YYYY-MM-DD-<slug>.md` within 5 business
days of incident resolution. Use this structure:

```markdown
# Post-Mortem: <incident title>

- **Date / time:** <UTC, WIB>
- **Severity:** P0 / P1 / ...
- **Duration:** detection -> resolved
- **Incident Commander:** @handle
- **Scribe:** @handle

## 1. Summary
One-paragraph summary of what happened and who was impacted.

## 2. Impact
- Users affected: count / percentage / tenant list
- Features affected
- Data loss: none / scope
- SLA breach: yes / no

## 3. Timeline (UTC)
| Time  | Event                                              |
| ----- | -------------------------------------------------- |
| 10:02 | Alert fired: http_req_failed > 5%                  |
| 10:05 | @alice acknowledged                                |
| ...   | ...                                                |

(Link to the `#incidents` Slack thread for the raw log.)

## 4. Root Cause Analysis
Use the 5-Whys or a causal chain. Be specific about the underlying
cause, not just the trigger. Blameless language: focus on systems
and decisions, not people.

## 5. What Went Well
- ...

## 6. What Went Poorly
- ...

## 7. Action Items
| Owner   | Action                                   | Due date   | Ticket |
| ------- | ---------------------------------------- | ---------- | ------ |
| @dave   | Add index on `quiz_attempts(user_id)`    | 2026-04-30 | LMS-?? |
| @bob    | Add k6 threshold for submission p95      | 2026-04-24 | LMS-?? |

Every action item must have an owner, a due date, and a tracking ticket.
```

Blameless rule: describe the situation as a responder encountered it.
Replace "X caused the outage" with "the system behaved this way because...".

---

## 6. On-Call Checklist

### Before your shift (do the Friday before)

- [ ] Acknowledge the rotation in PagerDuty; confirm phone is configured.
- [ ] Verify push & SMS delivery with a test page.
- [ ] Read the last 2 weeks of post-mortems and open P1/P2 incidents.
- [ ] Skim the latest changes in `CHANGELOG.md` and merged PRs since
      last handoff.
- [ ] Confirm access: Sentry, Grafana, Supabase, Play Console, 1Password,
      `kubectl` context for `prod`, feature-flag admin, status page.
- [ ] Make sure your laptop can reach production from your on-call location
      (VPN works, no planned travel without connectivity).

### During your shift

- [ ] Respond to pages within 10 minutes (ack in PagerDuty and `#incidents`).
- [ ] Follow `docs/incidents/RUNBOOK.md` — don't improvise if a runbook exists.
- [ ] Keep a scratch timeline in the Slack thread (the Scribe will formalize it).
- [ ] Update the status page for user-visible P0/P1.
- [ ] If you need help, escalate early — it is not a failure to call backup.
- [ ] For any unusual observation, file a follow-up ticket even if non-urgent.

### After your shift (Monday handoff)

- [ ] 15-minute handoff call with the incoming Primary, walk through:
      open incidents, pending action items, flaky alerts, pending deploys.
- [ ] Post a short summary in `#oncall`: # of pages, notable events,
      recommended watch-items for next week.
- [ ] Ensure every incident from your week has a ticket and an owner for
      the post-mortem.
- [ ] File TOIL day with your manager.
