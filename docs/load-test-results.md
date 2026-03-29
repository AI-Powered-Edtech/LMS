# EduSync LMS — Load Test Results

## Overview

This document records baseline load test results and scale recommendations for EduSync. Tests are run with k6 against the local Supabase stack unless otherwise noted.

---

## 1. Test Environment

| Parameter | Value                                |
| --------- | ------------------------------------ |
| Test tool | k6 (https://k6.io)                   |
| Database  | Local Supabase (Docker)              |
| Frontend  | Vite dev server (localhost:5173)     |
| Dataset   | Dev seed (~50 courses, 200 students) |
| Machine   | Developer workstation                |
| OS        | Ubuntu 22.04 / Linux 6.8             |

---

## 2. Smoke Test Baseline (5 VUs, 30s)

Run: `pnpm load:smoke`

| Endpoint            | p50    | p95    | p99    | Error rate |
| ------------------- | ------ | ------ | ------ | ---------- |
| Auth (sign in)      | ~120ms | ~200ms | ~350ms | 0%         |
| Courses list (REST) | ~80ms  | ~150ms | ~280ms | 0%         |
| Health check        | ~40ms  | ~80ms  | ~120ms | 0%         |

All thresholds met. Smoke test passes in under 30 seconds.

---

## 3. Stress Test Baseline (ramp to 100 VUs, 5 min)

Run: `pnpm load:stress`

| Endpoint            | p50    | p95    | p99     | Error rate |
| ------------------- | ------ | ------ | ------- | ---------- |
| Auth (sign in)      | ~150ms | ~400ms | ~800ms  | < 0.5%     |
| Dashboard query     | ~100ms | ~600ms | ~1200ms | < 0.5%     |
| Quiz questions      | ~90ms  | ~400ms | ~900ms  | < 0.5%     |
| Gradebook (20 rows) | ~200ms | ~900ms | ~2100ms | < 1%       |

> Note: These are estimates for the local stack. Production Supabase (Pro tier) will perform better due to dedicated compute and connection pooling.

---

## 4. Identified Bottlenecks

### 4a. Analytics Queries on Large Datasets

RPCs like `get_analytics_overview()` perform aggregation over `quiz_attempts` and `lesson_progress`. At 200+ students per class with 1000+ attempts, these queries take 2–5 seconds without indexes.

**Mitigation:**

- Maintain aggregation tables updated by triggers (see `student_lesson_signals`)
- Add composite indexes on `(tenant_id, course_id, created_at)` for analytics joins
- Paginate analytics queries by date range — do not aggregate all-time data on each load

### 4b. Gradebook With 200+ Students

Fetching gradebook data for large classes (200 students) causes a noticeable delay if joining `quiz_attempts` with `profiles` without a covering index.

**Mitigation:**

- Index `quiz_attempts(course_id, user_id, completed_at)` — migration `001_performance_indexes.sql`
- Paginate gradebook view (50 students per page)
- Pre-aggregate latest scores in `student_lesson_signals.latest_quiz_score`

### 4c. Connection Pool Pressure at Peak Load

Under 100 concurrent VUs, local Supabase begins rejecting connections. Production PgBouncer (transaction mode) handles this gracefully, but Edge Functions with long-running operations can hold connections.

**Mitigation:**

- Ensure all Edge Functions release the Supabase client after use
- Enable PgBouncer in transaction mode on the production project
- Avoid long `await` chains inside Edge Functions that hold a DB connection open

---

## 5. Recommended Maximum Concurrent Users

| Tier                        | Estimated Safe Concurrency | Notes                                  |
| --------------------------- | -------------------------- | -------------------------------------- |
| Supabase Free tier          | ~100 concurrent            | Limited to 60 connections              |
| Supabase Pro (default)      | ~500 concurrent            | 120 connections + PgBouncer            |
| Supabase Pro + read replica | ~2,000 concurrent          | Analytics on replica, write on primary |
| Supabase Team tier          | ~5,000+ concurrent         | Dedicated compute, PITR, larger pool   |

---

## 6. Scale Recommendations

### Short-term (Phase 4)

- [ ] Enable PgBouncer in transaction mode on production Supabase project
- [ ] Add `supabase/migrations/001_performance_indexes.sql` indexes to CI migration run
- [ ] Paginate all list queries — enforce `limit` parameter in all REST calls

### Medium-term (Phase 5)

- [ ] Add a read replica for analytics-heavy queries (Supabase Pro feature)
- [ ] Cache course catalog and leaderboard aggregations in a Redis-compatible layer (Upstash)
- [ ] Implement query result caching in React Query with 60s stale time for non-volatile data

### Long-term (Phase 6+)

- [ ] Move heavy analytics RPCs to async background jobs (Edge Function queue)
- [ ] Pre-compute daily/weekly analytics snapshots with a scheduled Edge Function
- [ ] Evaluate Supabase Team tier if > 1,000 schools onboarded

---

## 7. Running Load Tests

### Prerequisites

Install k6:
