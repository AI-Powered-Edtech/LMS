# Analytics — Feature Module

Dashboard analitik untuk memantau engagement, progress, dan performa siswa

## Arsitektur

```
src/features/analytics/
├── api/           # Supabase service layer
├── queries/       # React Query hooks & query keys
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── components/    # React components (dark mode + skeleton)
└── __tests__/     # Unit tests (vitest)
```

## File yang Ada

```
│   __tests__/analyticsService.test.ts
│   __tests__/trackingService.test.ts
│   api/analyticsService.ts
│   api/trackingService.ts
│   components/ActiveNowIndicator.tsx
│   components/CohortBuilder.tsx
│   components/CourseOverviewCard.tsx
│   components/DeadEndDetector.tsx
│   components/EarlyWarningPanel.tsx
│   components/EngagementDashboard.tsx
│   components/EngagementRadar.tsx
│   components/EngagementTrend.tsx
│   components/FunnelBuilder.tsx
│   components/FunnelChart.tsx
│   components/FunnelComparison.tsx
│   components/GuideAnalytics.tsx
│   components/GuideBuilder.tsx
│   components/LessonBreakdownTable.tsx
│   components/LiveActivityFeed.tsx
│   components/LiveLessonMap.tsx
│   components/PathAnalysisDashboard.tsx
│   components/PathComparison.tsx
│   components/PathFlowDiagram.tsx
│   components/PredictionCard.tsx
│   components/RetentionHeatmap.tsx
│   components/RiskRadar.tsx
│   components/SegmentPieChart.tsx
│   components/StickinessDashboard.tsx
│   components/StruggleAlertBanner.tsx
│   components/StudentEngagementCard.tsx
│   components/StudentProgressTable.tsx
│   components/TeacherAnalyticsDashboard.tsx
│   context/LearningSessionContext.tsx
│   hooks/useOptionalLearningSession.ts
│   index.ts
│   queries/analyticsQueries.ts
│   types/events.types.ts
│   types/index.ts
│   utils/formatters.ts
```

## Komponen Utama

- **AnalyticsSkeleton** — Loading skeleton untuk halaman Analitik
- **AnalyticsCard** — Kartu untuk menampilkan item Analitik
- **AnalyticsTable** — Tabel data dengan sorting dan pagination
- **AnalyticsStats** — Kartu statistik dan metrik
- **AnalyticsPageHeader** — Header halaman dengan judul dan aksi
- **AnalyticsEmptyState** — Tampilan saat tidak ada data
- **AnalyticsFilterBar** — Bar pencarian dan filter
- **AnalyticsModal** — Dialog modal untuk create/edit
- **AnalyticsForm** — Form input data Analitik
- **AnalyticsDetailView** — Detail view informasi lengkap

## API / Service

| Fungsi                              | Deskripsi                            |
| ----------------------------------- | ------------------------------------ |
| `analyticsService.getAll(tenantId)` | Ambil semua data Analitik per tenant |
| `analyticsService.upsert(payload)`  | Buat atau update data Analitik       |

## Database

- `analytics_events` — Tabel utama Analitik

## Penggunaan

```tsx
import { useAnalyticsData } from '@/src/features/analytics'

function MyComponent() {
  const { data, isLoading } = useAnalyticsData(tenantId)
  if (isLoading) return <AnalyticsSkeleton />
  return <AnalyticsTable data={data} columns={[...]} />
}
```

## Testing

```bash
npx vitest run src/features/analytics
```

## Dokumentasi Terkait

- [DATABASE.md](../../docs/DATABASE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [SECURITY.md](../../docs/SECURITY.md)
