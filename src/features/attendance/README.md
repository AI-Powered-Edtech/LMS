# Attendance — Feature Module

Sistem tracking kehadiran siswa per kelas dan sesi

## Arsitektur

```
src/features/attendance/
├── api/           # API service layer
├── queries/       # React Query hooks & query keys
├── types/         # TypeScript interfaces
├── components/    # React components
└── __tests__/     # Unit tests (vitest)
```

## Status

**Complete** — Attendance tracking untuk teacher dan student.

## Key Tables

| Table                | Purpose                            |
| -------------------- | ---------------------------------- |
| `attendance_records` | Kehadiran per siswa per sesi kelas |

## Pages

- `src/pages/ScanAttendance.tsx` — Teacher scan kehadiran
- `src/pages/StudentAttendance.tsx` — Student view kehadiran
