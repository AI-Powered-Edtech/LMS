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
