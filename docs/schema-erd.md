# EduSync LMS — Schema ERD

This document shows the core entity relationships for the EduSync LMS database.

The schema contains **84 tables** across 8 functional domains. All tenant-scoped tables include a `tenant_id` column enforced by Row Level Security.

> Generated from `supabase/migrations/000_baseline.sql` (consolidated from migrations 001–840).

---

## Core Domain Map
