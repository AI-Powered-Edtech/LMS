# Principal — Feature Module

Dashboard eksekutif untuk kepala sekolah: metrics, analytics, report generator, survey

## Arsitektur

```
src/features/principal/
├── api/           # Supabase service layer
├── components/    # React components
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── utils/         # Utility functions
└── __tests__/     # Unit tests (vitest)
```

## Status

**Complete** — Phase 30: Principal Dashboard.

## Key Features

- Executive Metrics
- Before-After Analytics
- Report Generator
- Survey System

## Pages

- `src/pages/PrincipalDashboard.tsx` — Principal dashboard

## Routes

- `/#/app/principal/dashboard` — Dashboard utama
- `/#/app/principal/settings` — Pengaturan
- `/#/app/principal/report` — Report generator
- `/#/app/principal/analytics` — Analytics
- `/#/app/principal/survey` — Survey system
