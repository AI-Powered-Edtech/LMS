# EduSync LMS — Backup & Recovery

## Overview

EduSync relies on Supabase's managed PostgreSQL for all persistent data. This document describes backup procedures, recovery steps, retention policies, and recovery objectives.

---

## 1. Supabase Automated Backups (Pro Plan)

Supabase Pro provides:

- **Daily automated backups** retained for 7 days
- **Point-in-time recovery (PITR)** — restore to any second within the last 7 days
- Backups are stored in Supabase-managed object storage (separate region)
- Backups include the full database: schema, data, RLS policies, functions, triggers

### Accessing Backups

1. Navigate to Supabase Dashboard → Project → Database → Backups
2. Select a restore point (daily snapshot or PITR timestamp)
3. Click "Restore" — Supabase will provision a new database from the snapshot
4. Update `VITE_SUPABASE_URL` in environment variables if restoring to a new project

> Note: PITR restores replace the current database. Coordinate with the team before initiating.

---

## 2. Manual pg_dump Procedure

Run a manual dump before any major migration or release:

```bash
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --no-owner \
  --no-acl \
  --format=custom \
  > backup_$(date +%Y%m%d).sql
```

Replace `[password]` and `[host]` with values from the Supabase dashboard under Settings → Database → Connection string.

### Storing Manual Backups

- Upload to a secure off-site location (e.g., encrypted S3 bucket or Google Cloud Storage)
- Never commit dump files to the repository
- Encrypt before upload: `gpg --symmetric --cipher-algo AES256 backup_YYYYMMDD.sql`
- Retain manual dumps for 90 days minimum

### Automating Monthly Dumps (optional cron)

```bash
# /etc/cron.d/edusync-backup
0 2 1 * * postgres pg_dump "postgresql://postgres:$DB_PASS@$DB_HOST:5432/postgres" \
  --no-owner --no-acl --format=custom \
  > /backups/edusync_$(date +\%Y\%m\%d).sql
```

---

## 3. Recovery Procedures

### 3a. Restore from Supabase Dashboard (recommended)

1. Go to Supabase Dashboard → Database → Backups
2. Choose restore point (PITR or daily snapshot)
3. Click "Restore to new project" or "Restore in place"
4. Wait for provisioning (typically 5–20 minutes)
5. Run smoke tests against restored database
6. Update environment variables if a new project URL was created
7. Notify team via incident channel

### 3b. Restore from pg_dump via psql

```bash
psql "postgresql://postgres:[password]@[host]:5432/postgres" \
  --single-transaction \
  < backup_YYYYMMDD.sql
```

For custom-format dumps:

```bash
pg_restore \
  --dbname "postgresql://postgres:[password]@[host]:5432/postgres" \
  --no-owner \
  --no-acl \
  --single-transaction \
  backup_YYYYMMDD.sql
```

> Always run on a staging clone first to verify the dump is valid before touching production.

---

## 4. Monthly Test Restore Procedure

Perform a test restore on the first Monday of each month:

1. **Create staging clone** — in Supabase Dashboard, branch or restore to a new staging project
2. **Restore latest backup** into the clone
3. **Run migration scripts** (`supabase db push --linked` against the clone)
4. **Run smoke tests**: login, dashboard load, quiz submit, certificate generation
5. **Document result** in the monthly ops log (date, restore time, issues found)
6. **Delete clone** after verification to avoid cost

If the test restore reveals issues, file a P2 incident and investigate within 1 business day.

---

## 5. Data Retention Policy

| Data Category             | Retention Period         | Notes                                    |
| ------------------------- | ------------------------ | ---------------------------------------- |
| Application logs (Sentry) | 90 days                  | Rotate after 90 days via Sentry settings |
| Supabase query logs       | 7 days (Pro plan)        | Supabase managed                         |
| Edge Function logs        | 7 days                   | Supabase managed                         |
| User activity events      | 90 days (hot), 2y (cold) | Hot in `activity_events`, archive to S3  |
| Financial/payment records | 7 years                  | Required by Indonesian tax law (UU HPP)  |
| Certificates              | Indefinite               | `certificates` table never purged        |
| Quiz attempts             | 2 years                  | Archive after 2 years, retain aggregates |
| Deleted user data         | 30 days soft-delete      | Hard-delete after 30-day grace period    |

---

## 6. Backup Verification Checklist

Run after every backup event (automated or manual):

- [ ] Backup file exists and is non-zero in size
- [ ] `pg_restore --list` returns expected table list (no errors)
- [ ] Row counts for key tables match pre-backup counts (`courses`, `enrollments`, `quiz_attempts`)
- [ ] RLS policies present in restored schema
- [ ] `auth.users` count matches expected user count
- [ ] Edge Functions deployed and accessible in restored project
- [ ] Test login succeeds with dev account

---

## 7. RTO / RPO Targets

| Metric                          | Target     | Notes                                          |
| ------------------------------- | ---------- | ---------------------------------------------- |
| Recovery Time Objective (RTO)   | < 4 hours  | Time from incident declaration to full service |
| Recovery Point Objective (RPO)  | < 24 hours | Maximum acceptable data loss window            |
| PITR minimum granularity        | 1 second   | Available on Supabase Pro with PITR enabled    |
| Monthly restore test completion | 100%       | No skipped months                              |

---

## 8. Contacts

| Role             | Responsibility                       |
| ---------------- | ------------------------------------ |
| On-call engineer | Initiates restore, runs smoke tests  |
| DB lead          | Approves PITR restores on production |
| Supabase support | Escalation for platform-level issues |

Open a Supabase support ticket at: https://supabase.com/dashboard/support/new
