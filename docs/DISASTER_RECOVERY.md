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
