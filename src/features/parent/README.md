# Parent — Feature Module

Portal orang tua untuk monitoring anak: nilai, kehadiran, pesan, laporan

## Arsitektur

```
src/features/parent/
├── api/           # API service layer
├── components/    # React components
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── utils/         # Utility functions
└── __tests__/     # Unit tests (vitest)
```

## Status

**Complete** — Phase 29: Parent Portal.

## Key Features

- OTP Registration untuk orang tua
- Mobile Dashboard
- WhatsApp Digest
- Messaging
- Monthly Reports

## Pages

- `src/pages/ParentDashboard.tsx` — Parent portal dashboard

## Routes

- `/#/app/parent/dashboard` — Dashboard utama
- `/#/app/parent/nilai` — Nilai anak
- `/#/app/parent/kehadiran` — Kehadiran anak
- `/#/app/parent/pesan` — Messaging
- `/#/app/parent/laporan` — Laporan bulanan
