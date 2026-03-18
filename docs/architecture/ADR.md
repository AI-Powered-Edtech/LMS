# EduSync — Architecture Decision Records (ADR)

---

## ADR-001: Multi-Tenant Isolation via RLS + tenant_id

**Status**: Accepted
**Date**: 2026-03-18
**Context**: EduSync serves multiple schools/organizations on a shared database. We need tenant isolation without separate databases per tenant.

**Decision**: Use PostgreSQL Row Level Security (RLS) with `tenant_id` column on every tenant-scoped table. All RLS policies use simple equality check: `tenant_id = public.get_my_tenant_id()`.

**Alternatives Considered**:
| Approach | Pros | Cons |
|----------|------|------|
| Database-per-tenant | Perfect isolation | Unmanageable at 100+ tenants, migration nightmare |
| Schema-per-tenant | Good isolation | Same migration problem, connection pool per schema |
| **Shared DB + RLS** | Single codebase, single migration path, Supabase-native | RLS overhead per query, requires discipline |

**Constraints**:
- RLS policies MUST use indexed columns only (tenant_id, user_id)
- Complex access patterns use SECURITY DEFINER RPCs (bypass RLS, enforce in code)
- Every SECURITY DEFINER function MUST have `SET search_path TO 'public'`
- `get_my_tenant_id()` reads from JWT first, falls back to profiles table

**Consequences**:
- All tables need `tenant_id` column — enforced at migration review
- Cross-tenant queries only possible via SECURITY DEFINER (intentional friction)
- At >50k students, monitor RLS overhead via `pg_stat_statements`

---

## ADR-002: Feature Module Architecture

**Status**: Accepted
**Date**: 2026-03-18
**Context**: Codebase has 47 pages, 35+ services, 13 contexts. Without structure, adding features creates spaghetti imports.

**Decision**: Organize code into self-contained feature modules under `src/features/`. Each module owns its api/, components/, hooks/, queries/, store/, and types/. The quizzes module is the exemplar.

**Rules**:
1. Feature modules MAY import from: `src/components/ui/`, `src/contexts/`, `src/domain/`, `src/lib/`, `src/utils/`
2. Feature modules MUST NOT import from other feature modules
3. Cross-feature communication goes through: React Query cache invalidation, or shared domain events
4. Pages (`src/pages/`) are thin route handlers — they import from features, not the other way around

**Migration Strategy**: Incremental, feature-by-feature. Never rewrite. Old services/components coexist until migrated.

**Consequences**:
- New features are self-contained — no changes to App.tsx or Layout
- Code deletion is safe — removing a feature folder removes everything
- Trade-off: some code duplication between features (acceptable — prefer isolation over DRY)

---

## ADR-003: AI Tutor Provider Routing

**Status**: Accepted
**Date**: 2026-03-18
**Context**: AI Tutor uses Groq (llama-3.1-70b). Single provider = single point of failure. LLM providers have outages, rate limits, and varying costs.

**Decision**: Implement a provider fallback chain in the ai-tutor edge function:

```
Primary: Groq (llama-3.1-70b) — fast, cheap
Fallback: OpenAI (gpt-4o-mini) — reliable, higher cost
```

With a circuit breaker: if primary fails 3x in 5 minutes, route all traffic to fallback for 10 minutes.

**Cost Controls**:
- Per-tenant monthly budget in `ai_usage_billing` table
- Edge function checks budget before LLM call
- Hard cap = reject with user-friendly message
- Semantic cache (pgvector) reduces LLM calls by ~30-40%

**Consequences**:
- Requires API keys for 2+ providers (secret management)
- Cost tracking adds ~1ms overhead per request (acceptable)
- Circuit breaker state stored in-memory (edge function) — resets on cold start (acceptable)

---

## ADR-004: Event-Driven Notification System

**Status**: Proposed
**Date**: 2026-03-18
**Context**: Currently 5 systems directly INSERT into notifications table. Adding notification types requires changing source systems. Tight coupling.

**Decision**: Introduce `system_events` table as an event bus. Source systems INSERT events. A trigger-based processor creates notifications.

```
Source → system_events → processor trigger → notifications → realtime channel
```

**Why not a message queue (Redis, RabbitMQ)?**: Supabase doesn't natively support external queues. PostgreSQL triggers provide sufficient throughput for our scale (<10k events/minute). If we outgrow triggers, migrate to edge function workers processing the events table.

**Event Schema**: `(tenant_id, event_type, actor_id, entity_type, entity_id, payload jsonb)`

**Consequences**:
- Source systems become simpler (emit event, don't know about notifications)
- New notification types = new row in event handler config, not code change
- Trade-off: trigger execution adds latency (~5-10ms) vs direct INSERT
- At scale: partition system_events by month, auto-clean >90 days

---

## ADR-005: Read Replica Strategy

**Status**: Proposed (implement at 50k+ students)
**Date**: 2026-03-18
**Context**: Analytics queries (get_teacher_analytics, course_stats, gradebook) are read-heavy and can be served from stale data. At 50k+ students they compete with write-heavy paths (lesson_progress, quiz_attempts).

**Decision**: When scale requires it, add a Supabase read replica. Route analytics and gradebook queries to the replica.

```typescript
// Primary client — all writes + real-time reads
export const supabase = createClient(PRIMARY_URL, ANON_KEY);

// Read replica — analytics, gradebook, reports
export const supabaseRead = createClient(REPLICA_URL, ANON_KEY);
```

**Which queries go to replica**:
| Query | Staleness OK? | Target |
|-------|--------------|--------|
| lesson_progress (own) | No | Primary |
| course_progress (own) | 30s OK | Replica |
| get_teacher_analytics | 5min OK | Replica |
| course_stats | 15min OK (cron-refreshed) | Replica |
| gradebook | 1min OK | Replica |
| quiz_attempts (active) | No | Primary |

**Consequences**:
- Frontend needs 2 Supabase client instances
- Service functions must document which client they use
- Replica lag is typically <1s on Supabase, but design for up to 30s

---

## ADR-006: State Management Hierarchy

**Status**: Accepted
**Date**: 2026-03-18
**Context**: The app uses 13 React Context providers, React Query, Zustand, and localStorage. No clear rule for which tool to use when.

**Decision**: Strict hierarchy:

| Data Type | Tool | Example |
|-----------|------|---------|
| Server state (CRUD) | React Query | Courses, lessons, grades, progress |
| Complex client state | Zustand | Quiz player, course builder, AI chat |
| App-global state | React Context | Auth (3 contexts max: Auth, Theme, Toast) |
| Persistence hints | localStorage | activeTenantId, pendingInviteToken |
| URL state | React Router | Current page, query params, filters |

**Rules**:
- If data comes from the database → React Query (never Context)
- If state is feature-local and complex → Zustand store inside `features/{name}/store/`
- Context is only for state that 90%+ of components need (auth, theme)
- Never cache server data in Context or Zustand — that's React Query's job

**Consequences**:
- Context provider count drops from 13 to 3
- Each feature module manages its own state
- React Query DevTools becomes the primary debugging tool for data issues

---

## ADR-007: Route Protection Chain

**Status**: Accepted
**Date**: 2026-03-18
**Context**: The app needs to enforce authentication, email verification, tenant access, and role permissions. Previously these checks were scattered across ProtectedRoute, RoleRoute, and inline checks.

**Decision**: Three-layer guard chain, applied once at the route level:

```
AuthGuard → TenantGuard → RoleGuard
```

| Guard | Checks | Redirect |
|-------|--------|----------|
| AuthGuard | Session exists, email verified | /login or /verify-email |
| TenantGuard | User has active tenant | /workspace-selector |
| RoleGuard | User's role matches allowed roles | /unauthorized |

**Rules**:
- AuthGuard is the ONLY place email verification is enforced
- ProtectedRoute (legacy) checks auth + role but NOT email — defers to AuthGuard
- Feature-specific guards (CourseEnrollmentGuard) are additional, not replacements
- Guards never fetch data — they read from AuthContext (already loaded)

**Consequences**:
- No redirect loops (each guard has exactly one concern)
- Legacy routes work because they're nested under AuthGuard parent route
- Adding a new guard layer (e.g., SubscriptionGuard) = insert between TenantGuard and RoleGuard

---

## ADR-008: Supabase Edge Function Boundaries

**Status**: Accepted
**Date**: 2026-03-18
**Context**: Some operations need server-side logic that can't run in the browser (LLM calls, secure grading, batch processing). Supabase Edge Functions (Deno) handle these.

**Decision**: Edge functions are used ONLY when at least one of these is true:
1. External API call with secrets (LLM providers, payment)
2. Computation that must be tamper-proof (quiz grading, score calculation)
3. Batch processing too heavy for a database trigger
4. Operations requiring service_role key

**Current edge functions**:
| Function | Reason |
|----------|--------|
| ai-tutor | External LLM API + secrets |
| ai-grade-essay | External LLM + tamper-proof grading |
| grade-quiz-attempt | Tamper-proof score calculation |
| load-quiz-data | Secure quiz data assembly (anti-cheat) |
| process-progress-events | Batch processing |
| generate-ai-content | External LLM API |

**Rules**:
- CRUD operations stay in the browser via Supabase client + RLS (never edge function)
- Edge functions always validate JWT (auth check first)
- Edge functions use service_role key for writes that bypass RLS
- Cold start mitigation: keep-alive cron ping for critical functions (ai-tutor)

**Consequences**:
- Minimal edge function count (6) — most logic stays in database or browser
- Each edge function is independently deployable
- Cold starts only affect non-critical paths (AI is non-critical)
