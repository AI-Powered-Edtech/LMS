# Quizzes Feature Module

This module is the canonical home for all quiz-related logic in EduSync.

## Architecture

```
src/features/quizzes/
├── api/           # RPC calls (v1_start_quiz_attempt, v1_submit_quiz_attempt, etc.)
├── queries/       # React Query hooks
├── hooks/         # Custom React hooks (useQuizTimer, useAutosave, etc.)
├── store/         # Zustand state management for quiz player state
├── types/         # TypeScript interfaces
├── components/    # React components
│   ├── analytics/ # QuizStatsOverview
│   ├── player/    # QuizPlayer, QuizHeader, QuizBody, QuizFooter, QuizReviewScreen
│   └── student/   # QuizCard, QuizResultsView, StartQuizModal
└── utils/         # Utility functions
```

## Status

**Complete** — Phase 5 (Quiz Engine Refactor) is done.

All quiz logic lives in this module. Entry pages:

- `src/pages/Quiz.tsx` — quiz player page (student-facing)
- `src/pages/QuizManager.tsx` — quiz creation/management (teacher-facing)

## Key RPCs

| RPC                                                     | Purpose                        |
| ------------------------------------------------------- | ------------------------------ |
| `v1_start_quiz_attempt(p_quiz_id)`                      | Start or resume a quiz attempt |
| `v1_save_partial_answers(p_attempt_id, p_answers)`      | Autosave in-progress answers   |
| `v1_submit_quiz_attempt(p_attempt_id, p_final_answers)` | Submit and auto-grade attempt  |
| `v1_get_quiz_results(p_attempt_id)`                     | Fetch attempt results          |

## Anti-Cheat System (v2)

Sistem anti-cheat diimplementasikan di `hooks/useAntiCheat.ts` dan terintegrasi penuh di `QuizPlayer.tsx`.

### Event Types & Severity Weights

| Event                       | Severity Points | Keterangan                                     |
| --------------------------- | --------------- | ---------------------------------------------- |
| `TAB_SWITCH`                | 2               | Student berpindah tab browser                  |
| `WINDOW_BLUR`               | 1               | Window kehilangan fokus                        |
| `COPY_PASTE`                | 3               | Paste event terdeteksi di halaman quiz         |
| `DEVTOOLS_OPEN`             | 5               | DevTools terbuka (window size differential)    |
| `KEYBOARD_SHORTCUT_BLOCKED` | 3               | Shortcut diblokir (F12, Ctrl+Shift+I/J/C, dll) |
| `CONTEXT_MENU`              | 1               | Klik kanan di halaman quiz                     |

### Deteksi yang Aktif

- **Tab/Window visibility**: `visibilitychange` dan `blur` event
- **DevTools**: Polling 1 detik — bandingkan `window.outerWidth - window.innerWidth > 160` atau `outerHeight - innerHeight > 160`
- **Keyboard shortcuts**: `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U`, `Ctrl+S` — semua di-prevent default
- **Context menu**: `contextmenu` event di-prevent default
- **Copy/paste**: `paste` event dicatat sebagai sinyal kecurangan
- **Print prevention**: `@media print { display: none }` CSS diinjeksi ke `<head>` saat quiz aktif

### UI Warning

Jika total severity score ≥ threshold, banner peringatan DevTools ditampilkan di atas `QuizPlayer`. Semua sinyal dikirim ke RPC `record_cheating_signal` dan disimpan di `quiz_cheating_signals` table.

---

## Teacher Live Monitor

Komponen `QuizLiveMonitor` (di `components/teacher/`) memungkinkan guru memantau progres siswa secara real-time selama quiz berlangsung.

### Cara Kerja

- **Polling**: setiap 10 detik (bukan WebSocket — sesuai kebijakan Free Tier)
- **RPC**: `get_quiz_live_status(p_quiz_id, p_tenant_id)` — mengembalikan daftar siswa yang sedang mengerjakan, sudah selesai, dan belum mulai
- **Data yang ditampilkan**: nama siswa, status (`in_progress` / `submitted` / `graded`), jumlah soal terjawab, waktu tersisa, sinyal kecurangan (flag count)

### Status Flow

```
not_started → in_progress → submitted → grading → graded
                                      ↘ dead_letter (grading gagal permanen)
```

---

## Grading Worker (v2 — Production Hardened)

Edge Function `grade-quiz-attempt` di `supabase/functions/grade-quiz-attempt/` memproses item dari `quiz_submission_queue`.

### Retry Logic (Exponential Backoff)

| Attempt | Delay sebelum retry          |
| ------- | ---------------------------- |
| 1st     | 30 detik                     |
| 2nd     | 2 menit                      |
| 3rd     | 10 menit                     |
| 4th+    | Dead letter (permanen gagal) |

RPC `v1_schedule_retry_submission` mengupdate `next_retry_at`, `retry_count`, dan `last_error` di `quiz_submission_queue`. RPC `v1_mark_dead_letter` mengubah status ke `dead_letter` setelah 3 retry.

### Circuit Breaker

Worker mengembalikan `503 Service Unavailable` dan berhenti memproses jika terdapat ≥ 5 failures dalam window 1 menit terakhir. Ini mencegah cascade failure dan melindungi koneksi database.

### Stuck Item Recovery

Items yang sudah berstatus `PROCESSING` selama > 2 menit dianggap stuck (worker crash) dan di-release kembali ke status `pending` agar bisa diproses ulang.

### Essay / Short Answer Handling

Soal bertipe `ESSAY` atau `SHORT_ANSWER` tidak di-auto-grade. Attempt langsung diberi status `submitted` dan menunggu penilaian manual dari guru via SpeedGrader.

### Kolom Tambahan di `quiz_submission_queue`

| Kolom           | Tipe          | Keterangan                             |
| --------------- | ------------- | -------------------------------------- |
| `retry_count`   | `integer`     | Jumlah retry yang sudah dilakukan      |
| `next_retry_at` | `timestamptz` | Waktu minimum boleh diproses ulang     |
| `last_error`    | `text`        | Pesan error terakhir (untuk debugging) |
| `error_detail`  | `jsonb`       | Stack trace / detail error terstruktur |

---

## Related Documentation

- [docs/DATABASE_ARCHITECTURE.md](../../../docs/DATABASE_ARCHITECTURE.md) — Quiz engine schema
- [docs/architecture/QUIZ_SYSTEM_ARCHITECTURE.md](../../../docs/architecture/QUIZ_SYSTEM_ARCHITECTURE.md)
