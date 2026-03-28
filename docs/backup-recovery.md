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
