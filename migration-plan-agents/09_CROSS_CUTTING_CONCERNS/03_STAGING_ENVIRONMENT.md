# CC3: Staging Environment

**Started:** Phase 1  
**Duration:** Throughout Phase 1-6  
**Owner:** DevOps/Backend

## Tujuan

Menyediakan staging environment yang isolated untuk parallel testing dan development sebelum production cutover.

## Arsitektur Staging

```
┌─────────────────┐     ┌─────────────────┐
│   Production    │     │    Staging      │
│  Supabase DB    │────▶│   Supabase DB   │
│   (Primary)     │     │   (Replicated)  │
└─────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Staging VIL   │
                    │     Server      │
                    └─────────────────┘
```

## Komponen

### Staging VIL Server

- Mirrors production VIL configuration
- Separate database connection (replicated from production)
- Isolated from production traffic
- URL: `https://staging-vil.edusync.internal`

### Preview Deployments

Per-branch deployment untuk setiap PR:

- Automatic deployment on PR create/update
- Unique URL per branch: `https://pr-{number}.staging.edusync.internal`
- Isolated database (reset per deployment)
- Auto-cleanup on PR close

### E2E Test Environment

- Dedicated test environment untuk Playwright tests
- Database seeded dengan test data
- Isolated from staging/production
- Reset between test runs

### Parity Tests

Dual-run verification: call both Supabase and VIL with same input, compare outputs:

```typescript
// Example parity test
async function testCourseListParity() {
  const supabaseResult = await supabase.from('courses').select('*')
  const vilResult = await vilClient.courses.list()

  assert.deepEqual(supabaseResult.data, vilResult.data)
}
```

## Setup Steps

### Phase 1 (Week 11-14)

1. **Create staging database**
   - Provision new Supabase project for staging
   - Configure read replica (or use direct connection with limited permissions)

2. **Deploy staging VIL server**
   - Build VIL with staging config
   - Deploy to staging infrastructure
   - Configure environment variables

3. **Setup data synchronization**
   - Nightly sync from production to staging
   - Anonymize PII data
   - Verify data integrity

### Phase 2-3 (Week 23-44)

1. **Configure preview deployments**
   - GitHub Actions workflow for auto-deploy
   - PR comment with preview URL

2. **Setup E2E test environment**
   - Dedicated Supabase project for tests
   - Test data seeding scripts

3. **Implement parity test suite**
   - Compare outputs between Supabase and VIL
   - Report discrepancies

### Phase 4-6 (Week 45-72)

1. **Full staging parity**
   - Same infrastructure as production
   - Load testing in staging before production
   - Cutover rehearsals

## Environment Matrix

| Env         | Backend       | Database         | Frontend URL                    | Use Case            |
| ----------- | ------------- | ---------------- | ------------------------------- | ------------------- |
| Development | VIL (local)   | Local Postgres   | localhost:5173                  | Local dev           |
| Staging     | VIL (staging) | Staging Supabase | staging.edusync.internal        | Integration testing |
| Preview     | VIL (preview) | Preview Supabase | pr-{n}.staging.edusync.internal | PR testing          |
| E2E         | VIL (e2e)     | E2E Supabase     | e2e.edusync.internal            | Automated tests     |
| Production  | VIL (prod)    | Prod Supabase    | app.edusync.id                  | Live                |

## Data Management

### Staging Data Sync

```bash
# Nightly sync script
#!/bin/bash
# Sync production to staging (with anonymization)
pg_dump $PROD_DB | anonymize.py | psql $STAGING_DB
```

Anonymization rules:

- emails → `user{n}@test.edusync.dev`
- names → `Test User {n}`
- phone numbers → `+6200000000{n}`
- addresses → `Test Address {n}`

## Exit Criteria

- [ ] Staging VIL server operational
- [ ] Staging database syncs from production
- [ ] Preview deployments working for PRs
- [ ] E2E environment isolated and functional
- [ ] Parity tests passing for all migrated endpoints

## Referensi

- Related: [01_MONITORING_OBSERVABILITY.md](./01_MONITORING_OBSERVABILITY.md) untuk staging monitoring
- Related: [08_FRONTEND_RUNTIME_COMPATIBILITY.md](./08_FRONTEND_RUNTIME_COMPATIBILITY.md) untuk frontend cutover
- Production Readiness: [docs/MASTER_PRODUCTION_READINESS_PLAN.md](../docs/MASTER_PRODUCTION_READINESS_PLAN.md)
