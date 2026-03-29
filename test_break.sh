sed -i 's/seconds < 60/seconds < 100/g' src/features/analytics/utils/formatters.ts
pnpm test src/features/analytics/utils/__tests__/formatters.test.ts
sed -i 's/seconds < 100/seconds < 60/g' src/features/analytics/utils/formatters.ts
