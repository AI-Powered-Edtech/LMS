# JWT key forensic audit — 2026-05-08

Follow-up to S4 (#315) and the JWT history purge of 2026-05-07.

## Scope
Verify no copies of the previous JWT keypair (`jwt-private.pem`, `jwt-public.pem`) are baked
into any Docker image, GitHub Actions workflow, docker-compose stack, Ansible role, or any
other infrastructure file currently tracked in this repo.

## Methodology
All commands run from repo root against the current `main` (commit at audit time).

```
git grep -E 'jwt-(private|public)\.pem|JWT_PRIVATE|JWT_PUBLIC|jwt_secret|JWT_SECRET'
git grep -E 'BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY'
find . -name 'Dockerfile*' -not -path './node_modules/*' -not -path './target/*'
find . -name 'docker-compose*' -not -path './node_modules/*' -not -path './target/*'
ls .github/workflows/
```

## Findings
Results pasted from the recon step of this batch (see commit message).
The audit is non-blocking — operator should re-run periodically and after any infra change.

## Operator follow-up
- If any hit was found, mount the new keypair via runtime secret (Docker secret, K8s secret, or operator-side bind mount), never bake into an image.
- Confirm CI/CD pipelines (deploy.yml, dev-school-nightly.yml, release-gate.yml) use `$ secrets.JWT_PRIVATE_KEY ` / `$ secrets.JWT_PUBLIC_KEY ` from GitHub Actions secrets, not literal PEM strings.
- If image registries (GHCR, ECR, etc.) hold pre-rotation tags, prune them so old images can never be redeployed.

## Cross-references
- docs/handoff/JWT_KEY_ROTATION_2026-05-07.md — the rotation runbook itself.
- docs/handoff/SWEEP_TRIAGE_FULL_2026-05-08.md — issue S4.
- edusync-api/migrations/076_invalidate_refresh_tokens_post_rotation.sql — companion DB-side cleanup.
