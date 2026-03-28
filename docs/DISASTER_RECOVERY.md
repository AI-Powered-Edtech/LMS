# EduSync LMS — Disaster Recovery Plan

## Overview

This document defines EduSync's disaster recovery (DR) strategy, covering database restores, Edge Function rollbacks, frontend rollbacks, migration rollbacks, and incident response procedures. It complements the existing [Backup & Recovery](./backup-recovery.md) and [Incident Runbook](./incident-runbook.md) docs.

---

## 1. Recovery Objectives

| Metric                         | Target  | Rationale                                                                                                      |
| ------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------- |
| Recovery Point Objective (RPO) | 1 hour  | PITR granularity on Supabase Pro covers 7 days; manual `pg_dump` before deployments provides additional safety |
| Recovery Time Objective (RTO)  | 4 hours | Covers detection (15 min), triage (30 min), restore (1-2 hr), smoke tests (30 min), and DNS propagation        |
| Monthly DR drill completion    | 100%    | No skipped months — test restore on first Monday of each month                                                 |

---

## 2. Supabase Database Backup Strategy

### 2a. Automated Backups (Supabase Pro)

- **Daily snapshots** retained for 7 days
- **Point-in-Time Recovery (PITR)** with 1-second granularity over 7-day window
- Backups include schema, data, RLS policies, functions, triggers, and extensions
- Stored in Supabase-managed object storage (separate region from primary)

### 2b. Manual Backups (`pg_dump`)

Run a manual dump **before every production migration** and **weekly** as a secondary safety net:

```bash
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --no-owner \
  --no-acl \
  --format=custom \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Storage:** Encrypt with `gpg --symmetric --cipher-algo AES256` and upload to an off-site encrypted bucket (S3/GCS). Retain for 90 days. Never commit dump files to the repository.

### 2c. Automated Weekly Dump (cron)

```bash
# /etc/cron.d/edusync-backup — runs every Sunday at 02:00 UTC
0 2 * * 0 postgres pg_dump "postgresql://postgres:$DB_PASS@$DB_HOST:5432/postgres" \
  --no-owner --no-acl --format=custom \
  > /backups/edusync_$(date +\%Y\%m\%d).sql \
  && gpg --batch --yes --symmetric --cipher-algo AES256 \
       --passphrase-file /etc/edusync-backup.key \
       /backups/edusync_$(date +\%Y\%m\%d).sql \
  && aws s3 cp /backups/edusync_$(date +\%Y\%m\%d).sql.gpg s3://edusync-backups/weekly/
```

---

## 3. Database Restore Procedures

### 3a. PITR Restore (Recommended)

1. Navigate to **Supabase Dashboard > Database > Backups**
2. Select a restore point (PITR timestamp or daily snapshot)
3. Choose **Restore in place** (replaces current DB) or **Restore to new project**
4. Wait for provisioning (typically 5-20 minutes)
5. If restored to a new project, update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in environment variables
6. Run smoke tests (login, dashboard, quiz submit, certificate generation)
7. Notify team in the incident channel

> **WARNING:** PITR restore in place replaces the current database. Coordinate with the team and obtain DB lead approval before initiating.

### 3b. Restore from `pg_dump`

```bash
# Decrypt backup first
gpg --decrypt backup_YYYYMMDD.sql.gpg > backup_YYYYMMDD.sql

# Restore using pg_restore
pg_restore \
  --dbname "postgresql://postgres:[password]@[host]:5432/postgres" \
  --no-owner \
  --no-acl \
  --single-transaction \
  backup_YYYYMMDD.sql
```

> Always test the restore on a staging clone first before touching production.

### 3c. Partial Table Restore

If only specific tables are affected (e.g., corrupted `quiz_attempts`):

1. Restore the full backup to a **staging project**
2. Export the specific table: `pg_dump --table=quiz_attempts --data-only --format=plain staging_db > quiz_attempts_data.sql`
3. Review the SQL to verify data integrity
4. Import to production: `psql production_db < quiz_attempts_data.sql`

---

## 4. Edge Function Rollback Procedure

Edge Functions are deployed via the Supabase CLI. Each deployment is atomic — the previous version remains until the new one is healthy.

### Rollback Steps

1. Identify the broken function in **Supabase Dashboard > Edge Functions > Logs**
2. Check git history for the last working version:
   ```bash
   git log --oneline supabase/functions/<function-name>/
   ```
3. Checkout the last known-good version:
   ```bash
   git checkout <good-commit-sha> -- supabase/functions/<function-name>/
   ```
4. Deploy the reverted function:
   ```bash
   supabase functions deploy <function-name> --project-ref <ref>
   ```
5. Verify via health check or manual test
6. Create a forward-fix commit on `main` to preserve history:
   ```bash
   git commit -m "fix: revert <function-name> to <good-commit-sha> due to [reason]"
   ```

### Emergency: Disable a Function

If a function is causing cascading failures and cannot be quickly fixed:

```bash
# Remove the function entirely (stops serving requests)
supabase functions delete <function-name> --project-ref <ref>
```

> Re-deploy after the fix. Deletion is reversible by redeploying.

---

## 5. Database Migration Rollback Strategy

### Prevention

- Always test migrations on a staging clone before production
- Include a `-- rollback:` comment block in each migration file with the inverse SQL
- Never run destructive migrations (`DROP`, `ALTER TYPE`) without a tested rollback plan

### Rollback with `supabase migration repair`

If a migration was applied but needs to be undone:

1. Run the inverse SQL manually:
   ```bash
   psql "postgresql://postgres:[password]@[host]:5432/postgres" < rollback_NNNN.sql
   ```
2. Mark the migration as reverted in the schema history:
   ```bash
   supabase migration repair <migration_version> --status reverted --project-ref <ref>
   ```
3. Verify schema state matches expectations
4. Document the rollback in the incident report

### Rollback Sequence for Multi-Migration Deploys

If multiple migrations were applied together and need rollback:

1. Rollback in **reverse order** (latest migration first)
2. Test each rollback step on staging before applying to production
3. After all rollbacks, verify `supabase migration list` shows the correct state

---

## 6. Frontend Rollback (Vercel)

Vercel provides instant rollback to any previous deployment.

### Steps

1. Open **Vercel Dashboard > Project > Deployments**
2. Find the last known-good deployment (green checkmark)
3. Click the three-dot menu > **Promote to Production**
4. Verify the rollback is live within 30 seconds
5. Investigate the broken deployment and fix forward on a branch

### Rollback via CLI

```bash
# List recent deployments
vercel ls edusync-lms

# Promote a specific deployment
vercel promote <deployment-url>
```

> Vercel rollback does NOT rollback database migrations or Edge Functions. Coordinate all layers if a full rollback is needed.

---

## 7. Full Disaster Recovery Procedure

For a complete platform-level disaster (e.g., Supabase region outage, data corruption):

### Phase 1: Triage (0-15 minutes)

- [ ] Acknowledge incident in team channel
- [ ] Identify scope: database, auth, edge functions, frontend, or all
- [ ] Assign incident commander
- [ ] Post initial status update (use template from incident runbook)

### Phase 2: Isolate (15-30 minutes)

- [ ] If frontend is serving errors: rollback via Vercel (Section 6)
- [ ] If Edge Functions are failing: disable affected functions (Section 4)
- [ ] If database is corrupted: stop all writes by enabling maintenance mode
- [ ] Communicate to users: "Kami sedang melakukan pemeliharaan sistem"

### Phase 3: Restore (30 min - 3 hours)

- [ ] Database: initiate PITR restore (Section 3a) or pg_dump restore (Section 3b)
- [ ] Edge Functions: redeploy from last known-good git commit (Section 4)
- [ ] Frontend: promote last known-good Vercel deployment (Section 6)
- [ ] Migrations: rollback if needed (Section 5)

### Phase 4: Validate (30 minutes)

- [ ] Login with test accounts (teacher, student, admin)
- [ ] Verify dashboard loads with correct data
- [ ] Submit a quiz and verify grading works
- [ ] Check analytics queries return data
- [ ] Verify Edge Functions respond (health-check endpoint)
- [ ] Check RLS is active on all tenant-scoped tables

### Phase 5: Post-Incident (within 24 hours)

- [ ] Post resolved status update
- [ ] Write post-incident report (use template in incident-runbook.md)
- [ ] Identify and schedule preventive actions
- [ ] Update this DR plan if gaps were found

---

## 8. Incident Response Checklist (Quick Reference)

| Step | Action                              | Owner              | Time Limit |
| ---- | ----------------------------------- | ------------------ | ---------- |
| 1    | Detect (alert fires or user report) | On-call engineer   | -          |
| 2    | Acknowledge in team channel         | On-call engineer   | 15 min     |
| 3    | Assess severity (P1-P4)             | On-call engineer   | 15 min     |
| 4    | Post initial status update          | On-call engineer   | 15 min     |
| 5    | Isolate affected systems            | On-call engineer   | 30 min     |
| 6    | Execute restore/rollback            | On-call + DB lead  | 1-3 hr     |
| 7    | Run validation suite                | On-call engineer   | 30 min     |
| 8    | Post resolved status                | On-call engineer   | Immediate  |
| 9    | Write post-incident report          | Incident commander | 24 hr      |

---

## 9. Contact & Escalation

| Role             | Responsibility                               | Escalation Trigger        |
| ---------------- | -------------------------------------------- | ------------------------- |
| On-call engineer | First responder, executes runbook            | Always                    |
| DB lead          | Approves PITR restores, reviews rollback SQL | P1/P2 database issues     |
| Engineering lead | Overall incident command for P1              | Unresolved after 30 min   |
| Supabase support | Platform-level issues beyond our control     | Supabase outage suspected |

Supabase support: https://supabase.com/dashboard/support/new

---

## 10. DR Drill Schedule

Perform a full DR drill on the **first Monday of each month**:

1. Create a staging clone from latest PITR snapshot
2. Restore the backup into the clone
3. Run migration scripts against the clone
4. Execute the Phase 4 validation checklist
5. Document results in `docs/incidents/dr-drill-YYYY-MM-DD.md`
6. Delete the staging clone after verification
7. Update this document if the drill reveals gaps

| Month   | Status    | Notes       |
| ------- | --------- | ----------- |
| 2026-04 | Scheduled | First drill |

---

## Related Documentation

- [Backup & Recovery](./backup-recovery.md) — detailed backup procedures and retention policy
- [Incident Runbook](./incident-runbook.md) — incident scenarios and response templates
- [Deploy Checklist](./deploy-checklist.md) — pre-deployment verification steps
- [Security](./SECURITY.md) — security model and RLS policies
