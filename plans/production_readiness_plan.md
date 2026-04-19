# EduSync LMS: Production Readiness & Feature Maturity Program

## Phase 0: Truth Alignment & Debt Burn-down

- [ ] Audit and rewrite `docs/deploy-checklist.md` to reflect the VIL/Rust architecture (remove Supabase RLS steps).
- [ ] Update `deploy.yml` health check to target `/api/v1/health` instead of Supabase functions.
- [ ] Synchronize environment variables across frontend, backend, and `docker-compose.yml` (e.g., ensure `JWT_REFRESH_SECRET` is present).
- [ ] Remove dead legacy code (e.g., Supabase chunks in Vite config, outdated scripts).
- [ ] Normalize database migration numbering and documentation.

## Phase 1: Identity, Security & Tenancy Hardening

- [ ] Implement full Google OAuth flow (complete the stubbed `exchangeCodeForSession`).
- [ ] Build a distributed rate-limiting middleware (replace in-process `RwLock` with Redis or equivalent).
- [ ] Implement transactional email delivery for password resets and verification resends.
- [ ] Write strict cross-tenant leakage contract tests for all generic `/api/v1/data/:table` and RPC endpoints.
- [ ] Add audit logging for privileged tenant-level actions.

## Phase 2: Core Learning Product Parity

- [ ] Implement a formal course publishing workflow with governance states (Draft, Review, Published).
- [ ] Add role-scoped collaborator permissions to the Course Builder.
- [ ] Build a robust media ingestion and processing pipeline (AV transcoding, malware scanning).
- [ ] Optimize Course Builder performance (target: < 2s load, < 300ms autosave ack).

## Phase 3: Assessment Integrity & Gradebook Maturity

- [ ] Finalize the canonical gradebook schema and remove legacy sentinel row patterns.
- [ ] Implement a grading policy engine (weighting, late penalties, overrides).
- [ ] Build a manual review queue for suspicious quiz attempts (anti-cheat proctoring signals).
- [ ] Add strict audit trails for all grade modifications.

## Phase 4: Communication, Parent, and School Ops

- [ ] Implement a resilient notification delivery queue with retries and a Dead Letter Queue (DLQ).
- [ ] Create a notification preference matrix and digest engine by user role.
- [ ] Harden parent-child linkage governance and privacy boundaries.

## Phase 5: AI Safety, Quality, and Economics

- [ ] Implement an AI moderation and safety layer.
- [ ] Add cost budget caps and usage quotas per tenant/user for AI endpoints.
- [ ] Create an audit trail for AI prompts and outputs.
- [ ] Build a human-in-the-loop override path for AI-graded essays.

## Phase 6: Platform Excellence, SRE, and Compliance

- [ ] Enforce hard gates in CI (`cargo fmt`, `cargo clippy`, bundle size must fail the build on error).
- [ ] Add backend integration tests to the CI pipeline.
- [ ] Configure security headers (CSP, HSTS, X-Frame-Options) at the Nginx/reverse proxy layer.
- [ ] Define and instrument feature-level SLOs and SLIs.
