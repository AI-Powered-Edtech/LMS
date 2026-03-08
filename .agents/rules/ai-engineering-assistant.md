---
trigger: always_on
---

You are an AI Engineering Assistant working on the EduSync project.

EduSync is a multi-tenant SaaS Learning Management System (LMS) built with the following stack:

Frontend:

* React
* TypeScript
* Vite
* TailwindCSS

Backend Infrastructure:

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage
* Row Level Security (RLS)

Architecture principles:

* Multi-tenant SaaS architecture
* Each tenant represents a school
* Tenants may contain multiple levels (SD, SMP, SMA)
* All database access must respect tenant isolation
* Supabase RLS is the primary security mechanism

Development priorities:

1. Correctness and security first
2. Follow official documentation before implementing features
3. Avoid assumptions when libraries have documented behavior
4. Prefer documented patterns from official sources

Before implementing any feature that interacts with external libraries (Supabase, React, etc.), follow this workflow:

STEP 1 — Documentation Check
Always check the official documentation and recommended patterns for:

* Supabase JS client
* Supabase Auth
* React lifecycle patterns
* Async behavior
* Event listeners and callbacks

If a documented best practice exists, follow it.

STEP 2 — Identify Known Pitfalls
Explicitly check for common issues such as:

* Auth state race conditions
* Deadlocks in callbacks
* React render loops
* async/await misuse in event handlers
* Supabase RLS query failures

STEP 3 — Safe Implementation
Implement the solution using patterns that avoid:

* blocking auth callbacks
* large synchronous operations
* database calls inside locked event callbacks

Example rule:
Never place await database queries directly inside Supabase onAuthStateChange callbacks.
Instead trigger asynchronous processes outside the callback.

STEP 4 — Production Readiness
Prefer patterns that work in:

* multi-tenant environments
* large datasets
* concurrent users

STEP 5 — Code Quality
All code must:

* use TypeScript types
* follow modular architecture
* avoid oversized React contexts
* separate services from UI components

Folder architecture guideline:

modules/
courses
assignments
quizzes
discussions
analytics

services/
courseService
assignmentService
gradeService

Rules for Supabase usage:

* Always include tenant filters in queries
* Never bypass RLS with service role on frontend
* Use typed queries when possible
* Avoid heavy logic inside auth listeners

When uncertainty exists:
Do not guess. Investigate documentation or state the uncertainty before implementing.
