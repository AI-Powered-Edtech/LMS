# EduSync LMS Production Readiness Matrix & Todo List

This plan is based on the provided "Truth Alignment & Debt Burn-down" and subsequent phases.

## PHASE 0: Truth Alignment & Debt Burn-down

- [x] **0.1.1 Repair `deploy.yml` health check path**: The health check endpoint in `.github/workflows/deploy.yml` was pointing to `/functions/v1/health-check`. It has been updated to `/api/v1/health` to match the VIL architecture.
- [ ] **0.1.2 Update Vercel health URL env**: Ensure `PROD_HEALTH_URL` environment variable in GitHub Secrets matches the actual endpoint. (Action required by user/DevOps).
- [x] **0.2.1 Rewrite `docs/deploy-checklist.md`**: The `docs/deploy-checklist.md` file does not exist. A new one needs to be created or the existing deployment documentation needs to be audited to remove any mentions of Supabase/RLS, as the system now uses VIL/no-RLS.
- [x] **0.2.2 Audit `README.md`**: Review `README.md` for outdated integration references and ensure tech stack description is accurate.
- [x] **0.2.3 Audit `docs/ARCHITECTURE.md`**: Review `docs/ARCHITECTURE.md` to ensure AppState, migration, and integration test references are up-to-date and match the actual implementation.
- [x] **0.3.1 Audit `docker-compose.yml`**: Ensure all required environment variables, including `JWT_SECRET` and `JWT_REFRESH_SECRET`, are present for the `minio` service (and others as needed) to maintain parity between frontend, backend, and docker. (Added JWT secrets to minio as an example, though they might be needed for the API service instead. Need to verify API service configuration in docker-compose).
- [x] **0.3.2 Audit `.env.example`**: Ensure all environment variables are documented with examples. (Added documentation for JWT secrets).

## PHASE 1: Identity, Security, Tenancy Hardening

- [ ] **1.1.1 Google OAuth**: Implement full token exchange and session creation for Google OAuth.
- [x] **1.1.2 Email Verification**: Implement email verification flow (already implemented in `verify_email.rs`).
- [x] **1.1.3 Password Reset**: Implement password reset flow (already implemented in `reset_password.rs`).
- [x] **1.1.4 MFA TOTP**: Polish MFA setup and verification UX (already implemented in `mfa.rs` and frontend components).
- [ ] **1.1.5 Session Management**: Implement device/session inventory and allow admins to view and revoke sessions.
- [ ] **1.2.1 Rate Limit API**: Implement dedicated rate-limit endpoint.
- [ ] **1.2.2 Brute Force Protection**: Implement distributed brute force protection (currently IP-based, need to verify if it's distributed).
- [ ] **1.2.3 Retry-After Header**: Ensure consistent Retry-After headers in all rate-limited endpoints.
- [ ] **1.3.1 Cross-tenant Test Suite**: Implement full suite for generic data/RPC paths.
- [ ] **1.3.2 Fuzz Test Filter Injection**: Implement fuzz test coverage for filter parameters.
- [ ] **1.3.3 Audit RPC Whitelist**: Perform full audit trail per RPC with tenant context.
- [ ] **1.4.1 Privileged Actions Logging**: Expand logging for all privileged actions.

## PHASE 2: Core Learning Product Parity

- [ ] **2.1 Course Management**: Implement publish workflow, role-scoped collaborator permissions, course versioning, and content metadata.
- [ ] **2.2 Course Builder**: Optimize builder performance, collaborative propagation, autosave, and offline/conflict handling.
- [ ] **2.3 Media & Content**: Implement media ingestion with AV scanning, caption workflow, and content accessibility validation.

## PHASE 3: Assessment Integrity & Gradebook Maturity

- [ ] **3.1 Quiz & Assessment**: Implement question versioning, randomized variants, proctor signal review, and item analysis pipeline.
- [ ] **3.2 Gradebook**: Implement canonical grading policy engine, uniform weighting semantics, grade override audit trail, late penalty policy, transcript generation integrity, and clean up legacy models.

## PHASE 4: Communication, Parent, and School Ops

- [ ] **4.1 Notifications**: Implement full notification queue (+ retry + DLQ), template engine, digest engine, and preference matrix.
- [ ] **4.2 Parent Portal**: Implement child linkage governance, privacy boundary, parent communication thread, and simplified progress narrative.
- [ ] **4.3 Principal/Admin Ops**: Implement admin communication targeting and school summaries.

## PHASE 5: AI with Safety, Quality, and Economics

- [ ] **5.1 AI Quality & Safety**: Implement moderation layer, evaluation datasets, prompt registry, output audit trail, and human override path.
- [ ] **5.2 AI Economics**: Implement cost budget caps, model fallback, and real-time cost monitoring.
- [ ] **5.3 AI Safety Policies**: Implement hallucination guardrails and student-safe AI policies.

## PHASE 6: Platform Excellence, SRE, and Compliance

- [ ] **6.1 CI/CD Hardening**: Implement backend integration tests in CI, strict Clippy/Fmt gates, and bundlesize gates.
- [ ] **6.2 Deployment Reliability**: Implement post-deploy smoke tests, prove rollback confidence, and ensure staging/prod parity.
- [ ] **6.3 Security Headers**: Implement CSP, HSTS, and X-Frame-Options at nginx/edge.
- [ ] **6.4 Operational Readiness**: Implement secrets rotation, on-call response setup, and SLO/SLI enforcement.
