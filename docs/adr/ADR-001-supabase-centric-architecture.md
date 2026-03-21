# ADR-001: Supabase-Centric Architecture (No Traditional Backend)

**Status:** Accepted
**Date:** 2026-01-01
**Deciders:** Engineering Team

---

## Context

EduSync is a multi-tenant LMS for Indonesian schools. The team needed to choose an architecture that:

1. Could be shipped quickly by a small team
2. Handled multi-tenancy with strong data isolation
3. Scaled to thousands of concurrent student users
4. Did not require managing server infrastructure

Options considered:
- **Option A:** Traditional backend (Node.js/Express + PostgreSQL) + React frontend
- **Option B:** Supabase as the entire backend (PostgreSQL + Auth + Edge Functions + RLS)
- **Option C:** Firebase/Firestore with React frontend

---

## Decision

We chose **Option B: Supabase-centric architecture** with no traditional backend server.

Architecture layers:
```
Presentation  → React 19 + Vite + Tailwind CSS
Service       → Supabase JS Client v2 (direct DB access via RLS)
Logic         → PostgreSQL functions / RPCs + Row Level Security
External API  → Supabase Edge Functions (Deno) for AI, email, webhooks
Database      → PostgreSQL 15 (Supabase managed)
```

---

## Rationale

**Why Supabase over Option A:**
- Row Level Security (RLS) enforces multi-tenant isolation at the DB layer — impossible to accidentally leak data across tenants
- No server to maintain, patch, or scale
- Supabase Auth handles JWT tokens, session management, and OAuth out of the box
- Direct DB access from the frontend is safe because RLS is always enforced

**Why Supabase over Option C (Firebase):**
- PostgreSQL is relational — courses, modules, lessons, quizzes have natural relational structure
- SQL functions (RPCs) allow complex analytics queries that would require Cloud Functions in Firebase
- Existing team expertise in PostgreSQL

---

## Consequences

**Positive:**
- No backend server to maintain
- RLS enforces tenant isolation by default — security is structural, not incidental
- Realtime subscriptions available without extra infrastructure
- Cost scales with usage (not provisioned capacity)

**Negative:**
- Edge Functions run in Deno, not Node.js — some npm packages unavailable
- Complex business logic must live in SQL (PostgreSQL functions), which requires SQL expertise
- Cannot use Express middleware patterns for request validation

**Constraints that follow from this decision:**
- All CRUD must go through Supabase JS client (never bypass RLS with `service_role` key in the frontend)
- Edge Functions are only for external integrations (AI, email, payments) — not for CRUD
- Secrets must live in Supabase environment variables, never in frontend code
