# Secrets Policy

How EduSync LMS handles environment secrets (DB credentials, JWT keys, S3 keys,
third-party API tokens). Complements [`security/SECRET_ROTATION_SOP.md`](security/SECRET_ROTATION_SOP.md),
which documents the step-by-step rotation procedure for Supabase-era secrets.

## Golden rule

**Never commit `.env` to git.** Only `.env.example` is tracked. The `.env` file
is listed in both the repo-root `.gitignore` and `edusync-api/.gitignore`.

If you think you just committed a secret: stop, rotate the secret immediately,
then see "When a secret leaks" below.

## Local development

```bash
cd edusync-api
cp .env.example .env
# Edit .env and replace every `change-me` with a dev/test value.
```

Dev values should be obviously-dev (`dev-jwt-secret-0000…`, the MinIO creds
from `docker-compose.yml`, etc.) so they are never confused with production
material. Do not copy production secrets to a developer laptop.

## Production

Do **not** ship a `.env` file to production hosts. Inject secrets at deploy
time from a secrets manager — pick one per environment:

| Environment | Recommended store                   |
| ----------- | ----------------------------------- |
| Staging     | Doppler, 1Password Connect          |
| Production  | HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager |
| CI          | GitHub Actions encrypted secrets    |

Deploy tooling (systemd `EnvironmentFile=`, Kubernetes `Secret` + `envFrom`,
Fly.io `fly secrets set`, etc.) reads from the manager and writes the values
into the process environment. The application never sees a file on disk.

## Rotation policy

| Secret                  | Routine cadence | Trigger for emergency rotation |
| ----------------------- | --------------- | ------------------------------ |
| `JWT_SECRET`            | Quarterly       | Suspected token theft; contributor offboarding with prior access |
| `JWT_REFRESH_SECRET`    | Quarterly       | Same as JWT_SECRET             |
| DB password (`DATABASE_URL`) | Yearly     | Leaked backup, suspicious auth logs |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Per-tenant lifecycle, min. yearly | Bucket enumeration, unexpected egress |
| `GROQ_API_KEY`          | Yearly, or on vendor alert | Cost anomaly, vendor breach |
| `VAPID_PRIVATE_KEY`     | Only on compromise (rotating invalidates every push subscription) | Suspected leak |
| `WHATSAPP_ACCESS_TOKEN` | Per Meta token TTL (default 60 d) | Unexpected message sends |
| `SMTP_PASSWORD`         | Yearly          | Bounce/reputation anomalies    |

JWT rotation uses the two-key overlap pattern described in
`security/SECRET_ROTATION_SOP.md` step 3 — deploy with the new key as the
signer while still accepting tokens signed by the old key, wait one refresh
TTL, then remove the old key.

## When a secret leaks

Assume compromise from the moment a secret lands anywhere it should not
(public commit, screenshot, chat log, CI job log, fork, etc.).

1. **Revoke** the credential in its source system (Groq dashboard, IAM, DB
   `ALTER USER ... PASSWORD`, Meta app dashboard).
2. **Rotate** — generate a new secret and update the secrets manager. Redeploy
   so all running processes pick up the new value.
3. **Audit** — review `audit_logs` and upstream provider logs for the leaked
   window to detect use:
   - JWT leak: check `auth_events` for sessions older than the rotation
     timestamp and force-logout.
   - DB password leak: check `pg_stat_activity` and connection logs for
     non-deploy source IPs.
   - S3 key leak: check bucket access logs for unexpected `GetObject` /
     `ListBucket`.
4. **Scrub the artefact** — if the leak was in git history, force-push a
   rewritten history (coordinate with the team; see
   `security/SECRET_ROTATION_SOP.md`). A committed secret must be treated as
   compromised even after rewrite, because clones persist — rotation is
   non-negotiable.
5. **Post-mortem** — file an incident note under `docs/incidents/` with
   timeline, blast radius, and follow-ups.

## Files & their status

| Path                         | Tracked?     | Purpose                          |
| ---------------------------- | ------------ | -------------------------------- |
| `edusync-api/.env`           | Gitignored   | Your local secrets — never commit |
| `edusync-api/.env.example`   | Tracked      | Placeholder schema, safe to read |
| `edusync-api/.gitignore`     | Tracked      | Enforces `.env` exclusion        |
| `.gitignore` (repo root)     | Tracked      | Enforces `.env*` exclusion for frontend |

If you add a new secret, add the key (with a placeholder value) to
`edusync-api/.env.example` in the same PR, and add a row to the rotation
table above.
