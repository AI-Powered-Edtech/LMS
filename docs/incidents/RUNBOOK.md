# EduSync Incident Runbook

This runbook is the single entry point for responders during an incident.
Pair it with [`ON_CALL.md`](../ON_CALL.md) (rotation, tools, comms) and
[`DISASTER_RECOVERY.md`](../DISASTER_RECOVERY.md) (restore procedures).

---

## 1. Severity Taxonomy

| Severity | Definition                                                                         | Example                                                |
| -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **P0**   | Total outage, data loss, or security breach affecting all users                    | API down, database corruption, leaked service role key |
| **P1**   | Critical feature broken for most users, no workaround                              | Quiz submission fails, login broken, AI Creator 5xx    |
| **P2**   | Degraded UX for some users or a non-critical feature                               | Slow dashboard load, one report export fails          |
| **P3**   | Cosmetic, low-impact, or single-user issue                                         | Typo, stale cache for a single tenant                  |

### Response SLA per severity

| Severity | Detection (acknowledge) | First public update | Resolve target |
| -------- | ----------------------- | ------------------- | -------------- |
| **P0**   | 15 min                  | 30 min              | 2 hours        |
| **P1**   | 30 min                  | 1 hour              | 4 hours        |
| **P2**   | 2 hours                 | 4 hours             | next business day |
| **P3**   | next business day       | n/a                 | backlog        |

Declaration rule: if in doubt, declare one severity higher. You can always
downgrade once scope is understood.

---

## 2. Incident Flow (all severities)

1. **Acknowledge** the page/alert and drop a note in `#incidents`.
2. **Declare** severity. Create an incident ticket and a dedicated Slack
   thread. Assign **Incident Commander (IC)**, **Scribe**, and **Comms Lead**.
3. **Stabilize** first (stop the bleeding) before root-causing.
4. **Communicate** per SLA: internal updates every 30 min for P0/P1 until
   resolved; public status page for user-visible impact.
5. **Resolve** and verify (smoke tests + synthetic probes green).
6. **Post-mortem** within 5 business days. Blameless. Template in `ON_CALL.md`.

---

## 3. Runbooks

### 3.1 High load / 429 rate spikes

**Symptom:** `http_req_failed` > 1%, rate-limit middleware logs show spiking
`429`, Grafana panel "API RPS" crosses capacity line.

**Steps:**

1. Check Grafana dashboard `api-latency-and-errors` and the `edge-rate-limit`
   panel to confirm the traffic source (anonymous vs. authenticated, per-IP
   vs. per-user).
2. Inspect rate-limit logs:
   ```bash
   kubectl logs -l app=edusync-api -n prod --since=15m | grep 'rate_limit'
   ```
3. **Scale backend**: bump HPA min-replicas and/or raise the limit temporarily:
   ```bash
   kubectl scale deploy/edusync-api -n prod --replicas=12
   ```
4. **Bump rate-limit** via feature flag (admin UI -> Feature Flags) — flag
   `rate_limit.multiplier` to `2.0` for 30 minutes. Document the override in
   the incident thread.
5. If the source is a single bad actor, block at the WAF / Cloudflare layer.
6. After the spike subsides, revert the flag and resize HPA to normal.

### 3.2 Auth outage

**Symptom:** Login p95 > 5s or login error rate > 5%, `/auth/login` 5xx,
Supabase auth dashboard shows degradation.

**Steps:**

1. Check Supabase status page and our own auth synthetic probe.
2. If JWT validation is the issue: **rotate JWT secret**
   (forces logout-all) per `docs/security/SECRET_ROTATION_SOP.md`.
3. If OAuth provider is degraded: toggle the provider off via feature flag
   `auth.oauth.<provider>.enabled=false`. Users fall back to email/password.
4. If email/password is broken: enable **magic-link fallback** via flag
   `auth.magic_link.enabled=true`.
5. Post banner in-app (flag `banner.auth_degraded`) directing users to retry.
6. Once Supabase is healthy, re-enable OAuth, remove banner.

### 3.3 AI quota exceeded (Groq / provider)

**Symptom:** AI Creator / AI Tutor returns `429` or `503` from provider,
Sentry sees `AIQuotaExceededError`.

**Steps:**

1. Check provider dashboard (Groq console) for quota usage and reset window.
2. **Disable AI surfaces** via feature flag:
   - `ai.creator.enabled=false`
   - `ai.tutor.enabled=false`
3. Enable the degraded-mode banner: `banner.ai_unavailable=true`.
4. If another provider is configured (OpenAI, Anthropic), **switch provider**
   via `ai.default_provider` flag.
5. File a ticket to upgrade the quota / add a second provider.
6. Re-enable once quota is available.

### 3.4 Security incident (token leak, SQLi, suspected breach)

**Symptom:** Leaked secret in repo/log, abnormal auth audit events, WAF
SQLi signatures firing, Sentry shows unauthorized access.

**Steps:**

1. **Declare P0.** Assemble IC + Security Lead + Legal (if PII involved).
2. **Rotate immediately** (in this order):
   - `JWT_SECRET` — forces logout-all of every user.
   - Supabase service role key and anon key.
   - OAuth client secrets per provider.
   - Database role passwords (`pg_password` for app role).
   Use `docs/security/SECRET_ROTATION_SOP.md` for exact commands.
3. **Audit query log** for the suspected window:
   ```sql
   SELECT usename, query, query_start, client_addr
     FROM pg_stat_activity
     WHERE query_start > now() - interval '24 hours';
   ```
   Also pull Supabase audit logs and WAF logs.
4. **Scope impact**: identify affected users/rows. If PII is exfiltrated,
   trigger the breach-notification workflow (see Legal).
5. **CVE triage** for any third-party CVE: check `cargo audit` and
   `pnpm audit`, patch the affected dependency, redeploy.
6. Post a public status page update if user data is affected.
7. Post-mortem is mandatory, published externally for PII incidents.

### 3.5 Database: long-running query

**Symptom:** `pg_stat_activity` shows queries > 30s, API p95 latency spikes,
connection pool saturation.

**Steps:**

1. Identify the offender:
   ```sql
   SELECT pid, now() - query_start AS duration, state, query
     FROM pg_stat_activity
     WHERE state != 'idle'
       AND now() - query_start > interval '30 seconds'
     ORDER BY duration DESC;
   ```
2. **Cancel** (soft) or **terminate** (hard) the offending PID:
   ```sql
   SELECT pg_cancel_backend(<pid>);    -- try first
   SELECT pg_terminate_backend(<pid>); -- escalate if cancel ignored
   ```
3. Capture the `EXPLAIN (ANALYZE, BUFFERS)` plan on staging.
4. Add/adjust an index, rewrite the query, or add a statement timeout on the
   relevant role:
   ```sql
   ALTER ROLE app SET statement_timeout = '10s';
   ```
5. File a ticket with the EXPLAIN output attached.

### 3.6 Database: replica lag > 5s

**Symptom:** Grafana `pg_replication_lag_seconds` > 5, read-replica users
seeing stale data.

**Steps:**

1. Confirm lag:
   ```sql
   -- on replica
   SELECT now() - pg_last_xact_replay_timestamp() AS lag;
   ```
2. Check master load (CPU, IOPS, `pg_stat_activity`). Heavy writes or a
   long transaction on master is the usual cause.
3. If lag > 30s and still climbing: **promote a new replica** and redirect
   read traffic. In Supabase, request a failover via the dashboard or
   `supabase db promote <replica-id>`.
4. Investigate master: look for table bloat, missing indexes on hot updates,
   or a runaway batch job.
5. Document in the incident thread before resolving.

### 3.7 Restore from backup

**Symptom:** Data corruption, accidental destructive migration, or a security
incident requiring rollback.

**Steps:**

1. **Freeze writes** if possible: flip `maintenance_mode=true` feature flag.
2. Identify target **PITR timestamp** — latest good point just before the
   incident. Verify via `pg_stat_activity` / audit log.
3. **Test on staging first**: restore to a new Supabase project using PITR,
   run the data-integrity script in `scripts/db-integrity-check.ts`.
4. **Restore production** using `pg_restore` for offline dumps:
   ```bash
   pg_restore --clean --no-owner --no-acl \
     --dbname="postgresql://postgres:$DB_PASS@$DB_HOST:5432/postgres" \
     backup_<timestamp>.sql
   ```
   Or use Supabase PITR UI for in-place recovery.
5. Run smoke tests (`pnpm e2e:prod-smoke`) and reconcile any data written
   after the PITR point that must be replayed.
6. Remove maintenance mode, post status update, schedule post-mortem.

See [`DISASTER_RECOVERY.md`](../DISASTER_RECOVERY.md) for full DR procedure.

---

## 4. Quick Reference

| Action                      | Where                                                      |
| --------------------------- | ---------------------------------------------------------- |
| Declare incident            | `#incidents` Slack + PagerDuty "Create Incident"           |
| Feature flags               | Admin -> Feature Flags (`/admin/feature-flags`)            |
| Scale API                   | `kubectl scale deploy/edusync-api -n prod --replicas=N`    |
| Rotate JWT                  | `docs/security/SECRET_ROTATION_SOP.md`                     |
| Restore DB                  | `docs/DISASTER_RECOVERY.md`                                |
| Status page                 | `https://status.edusync.example.com` (statuspage.io)       |
| On-call schedule            | `docs/ON_CALL.md`                                          |
