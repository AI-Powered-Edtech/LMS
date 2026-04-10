# Routing Compatibility Decision — Phase 0A

## Status

LOCKED for Phase 0A

## Active Routing Reality

- Frontend aktif memakai **path-based routing**: `/app/`
- App.tsx uses BrowserRouter (NOT HashRouter)
- Hash routing adalah LEGACY dari old Supabase auth flow - perlu di-migrate
- Phase 0A TIDAK mengubah routing frontend (sudah path-based)
- API abstraction harus netral terhadap mode routing

## Decision

- Semua task 0A berjalan di atas path-based routing yang sudah ada
- Hash routing adalah legacy yang sudah tidak digunakan

## Done

- [x] Path-based routing acknowledged as current truth (BrowserRouter)
- [x] Hash routing identified as legacy (from old Supabase auth)
- [x] Migration does NOT need to preserve hash routing
