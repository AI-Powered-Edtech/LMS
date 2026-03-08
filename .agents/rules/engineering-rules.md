---
trigger: always_on
---

You are an AI engineering agent working on EduSync LMS.

Before writing or modifying any code you MUST follow these engineering rules.

--------------------------------------------------

THINK BEFORE CODING

Before implementing a change, always analyze:

1. Which domain this feature belongs to
   - identity
   - tenant
   - academic
   - learning
   - assessment
   - activity

2. Whether the logic should live in:
   - database (SQL, RLS, RPC)
   - edge function
   - frontend

Prefer database logic whenever possible.

--------------------------------------------------

MULTI-TENANT SAFETY

EduSync is a multi-tenant platform.

Rules:

- All tenant data must include tenant_id
- Queries must enforce tenant isolation
- No query should expose cross-tenant data
- RLS policies must be respected

If a table contains tenant data and lacks tenant_id,
suggest adding it before continuing.

--------------------------------------------------

SECURITY RULES

Never:

- bypass Row Level Security
- expose service keys in frontend
- store secrets in client code

Secrets must only exist in:

- Supabase Edge Functions
- Supabase environment variables

--------------------------------------------------

DATABASE-FIRST PRINCIPLE

EduSync is database-centric.

Prefer implementing logic in:

1. SQL functions (RPC)
2. database triggers
3. views

Avoid moving important business logic to the frontend.

--------------------------------------------------

PERFORMANCE RULES

Always design queries to scale.

Avoid:

- full table scans
- SELECT *
- unpaginated queries
- deeply nested joins

Prefer:

- pagination
- indexed columns
- aggregation tables
- materialized views for analytics

--------------------------------------------------

EDGE FUNCTION RULES

Use Edge Functions only when necessary.

Appropriate uses:

- email sending
- AI integrations
- payment webhooks
- background jobs
- certificate generation

Do NOT use edge functions for simple CRUD.

--------------------------------------------------

MODULAR LMS RULES

EduSync is a modular LMS.

New features must respect the module system.

When implementing a new feature:

1. check whether it belongs to an existing module
2. ensure it can be toggled per tenant
3. avoid tightly coupling modules together

--------------------------------------------------

CODE QUALITY RULES

When writing code:

- prefer small composable functions
- avoid duplication
- write clear names
- keep files modular
- add comments for complex logic

Do not generate unnecessarily complex abstractions.

--------------------------------------------------

DOCUMENTATION RULE

When introducing new architecture or systems:

Update the relevant documentation:

- DOMAIN_MAP.md
- DATABASE_ARCHITECTURE.md
- USERFLOW.md
- ENGINEERING_ROADMAP.md

Documentation must stay synchronized with code.

--------------------------------------------------

FINAL CHECK BEFORE COMMIT

Before finishing any task verify:

1. tenant isolation is preserved
2. RLS policies are respected
3. no secrets leaked to frontend
4. performance impact considered
5. documentation updated if necessary

Only then finalize the change.