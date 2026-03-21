# EduSync LMS — Environments

## Overview

EduSync operates in three environments. Each has its own Supabase project (or local stack), its own environment variables, and distinct feature flag states.

---

## 1. Environment Summary

| Environment | Frontend URL                | Supabase                    | Deployed on       |
| ----------- | --------------------------- | --------------------------- | ----------------- |
| Local       | http://localhost:5173       | Local (`supabase start`)    | Developer machine |
| Staging     | https://staging.edusync.dev | Supabase staging project    | Vercel preview    |
| Production  | https://app.edusync.id      | Supabase production project | Vercel production |

---

## 2. Local Environment

Used for all feature development and unit testing.

### Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase CLI: `npm i -g supabase`
- Docker (for local Supabase)

### Starting local Supabase

```bash
supabase start
```

This starts PostgreSQL, GoTrue (auth), Storage, and Edge Functions locally on default ports.

### Running the app

```bash
pnpm install
cp .env.example .env.local
# fill in values from `supabase status`
pnpm dev
```

### .env.local Template

```env
# Supabase (get values from `supabase status` after `supabase start`)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase status>

# Sentry — leave blank for local (disables Sentry)
VITE_SENTRY_DSN=

# Feature flags — all enabled locally for development
VITE_FF_AI_TUTOR=true
VITE_FF_GAMIFICATION=true
VITE_FF_CERTIFICATES=true
VITE_FF_ANALYTICS=true
VITE_FF_SOCIAL=true
VITE_FF_ATTENDANCE=true
```

---

## 3. Staging Environment

Used for QA, integration testing, and pre-release validation. Mirrors production schema and data (with anonymized seeds).

### .env.staging Template

```env
# Supabase staging project
VITE_SUPABASE_URL=https://[staging-project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=<staging anon key>

# Sentry — staging DSN (separate project in Sentry)
VITE_SENTRY_DSN=https://[staging-key]@o[org].ingest.sentry.io/[project]

# Feature flags — match production except for experimental features
VITE_FF_AI_TUTOR=true
VITE_FF_GAMIFICATION=true
VITE_FF_CERTIFICATES=true
VITE_FF_ANALYTICS=true
VITE_FF_SOCIAL=true
VITE_FF_ATTENDANCE=true
```

### Deploying to Staging

Vercel automatically creates a preview deployment for every pull request. To deploy a specific branch to the staging URL:

```bash
vercel --env staging
```

---

## 4. Production Environment

Live environment serving real users. No debugging tools, no source maps exposed.

### Environment Variables (set in Vercel Dashboard)

| Variable                 | Description                              |
| ------------------------ | ---------------------------------------- |
| `VITE_SUPABASE_URL`      | Production Supabase project URL          |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose)       |
| `VITE_SENTRY_DSN`        | Sentry DSN for production error tracking |
| `VITE_FF_AI_TUTOR`       | Feature flag: AI Tutor module            |
| `VITE_FF_GAMIFICATION`   | Feature flag: XP, badges, leaderboard    |
| `VITE_FF_CERTIFICATES`   | Feature flag: Certificate generation     |
| `VITE_FF_ANALYTICS`      | Feature flag: Analytics dashboards       |
| `VITE_FF_SOCIAL`         | Feature flag: Forum and social features  |
| `VITE_FF_ATTENDANCE`     | Feature flag: Attendance tracking        |

> Never set `SUPABASE_SERVICE_ROLE_KEY` or any private key in `VITE_*` variables. Service role keys must only exist in Edge Function secrets (Supabase Vault or project secrets).

---

## 5. Key Differences Between Environments

| Concern              | Local                       | Staging                 | Production              |
| -------------------- | --------------------------- | ----------------------- | ----------------------- |
| Source maps          | Enabled                     | Enabled                 | Disabled                |
| Sentry               | Off                         | Enabled (staging DSN)   | Enabled (prod DSN)      |
| React Query devtools | Enabled                     | Disabled                | Disabled                |
| Console logs         | All enabled                 | Warnings + errors only  | Errors only             |
| RLS                  | Enabled (same as prod)      | Enabled                 | Enabled                 |
| Migrations           | Manual (`supabase db push`) | Applied via CI on merge | Applied via CI on merge |
| Seed data            | Full dev seed               | Anonymized staging seed | Real data (no seed)     |

---

## 6. Feature Flags Per Environment

Feature flags are evaluated at runtime from `VITE_FF_*` environment variables. The `useFeatureFlag(flag)` hook reads these values.

| Flag              | Local | Staging | Production               |
| ----------------- | ----- | ------- | ------------------------ |
| `FF_AI_TUTOR`     | true  | true    | true (if OpenAI key set) |
| `FF_GAMIFICATION` | true  | true    | true                     |
| `FF_CERTIFICATES` | true  | true    | true                     |
| `FF_ANALYTICS`    | true  | true    | true                     |
| `FF_SOCIAL`       | true  | true    | true                     |
| `FF_ATTENDANCE`   | true  | true    | true                     |

To disable a feature in production without a code deploy, update the Vercel environment variable and trigger a redeploy.

---

## 7. Secrets Management

| Secret                      | Where stored                   | Who can access         |
| --------------------------- | ------------------------------ | ---------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets | Edge Functions only    |
| `OPENAI_API_KEY`            | Supabase Edge Function secrets | AI Tutor function only |
| `RESEND_API_KEY`            | Supabase Edge Function secrets | Email function only    |
| `VERCEL_TOKEN`              | GitHub Actions secrets         | Deploy workflow only   |
| `VITE_SUPABASE_ANON_KEY`    | Vercel env vars (public)       | Frontend (safe)        |

Never commit `.env.local`, `.env.staging`, or any file containing real credentials to the repository.
