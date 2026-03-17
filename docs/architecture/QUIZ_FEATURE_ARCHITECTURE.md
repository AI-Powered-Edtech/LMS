# Final Quiz Feature Architecture for EduSync

Dokumen ini mendefinisikan arsitektur *frontend* spesifik untuk modul **Quiz Engine** di EduSync. Sebagai modul paling kompleks dan berisiko tinggi (*high-stakes*) di dalam LMS, arsitektur ini memisahkan logika UI, sinkronisasi waktu, pencegahan kecurangan, dan komunikasi *autosave* agar tetap *performant* dan dapat diandalkan pada koneksi yang lambat sekalipun.

---

## 1. Feature Structure (Domain: `features/quizzes`)

Sesuai dengan standar arsitektur berbasis fitur EduSync, modul ini diisolasi penuh di `src/features/quizzes`.

```text
src/features/quizzes/
├── api/
│   └── quiz.service.ts          # Integrasi langsung ke Supabase RPC & Tables
├── queries/
│   ├── quiz.queries.ts          # useQuery untuk data fetching (attempt, questions)
│   └── quiz.mutations.ts        # useMutation untuk actions (submit, save)
├── store/
│   └── quizPlayer.store.ts      # Zustand state untuk jawaban sementara & UI stat
├── hooks/
│   ├── useQuizAttempt.ts        # Wrapper untuk logic inisialisasi kuis
│   ├── useQuizTimer.ts          # Timer presisi tinggi berbasis sinkronisasi server
│   ├── useAutosaveAnswers.ts    # Debounced background saving
│   └── useAntiCheat.ts          # Deteksi tab switch, focus loss, devtools
├── components/
│   ├── player/
│   │   ├── QuizPlayer.tsx       # Komponen utama kontainer kuis
│   │   ├── QuizTimer.tsx        # Indikator waktu (warning merah saat < 1 menit)
│   │   ├── QuizNavigation.tsx   # Pagination soal, grid nomor soal
│   │   ├── QuizQuestion.tsx     # Renderer soal (parsing Rich Text / Markdown)
│   │   ├── QuizProgress.tsx     # Progress bar indikator soal terjawab
│   │   └── QuizSubmitModal.tsx  # Konfirmasi akhir dengan peringatan soal kosong
│   ├── questions/
│   │   ├── MultipleChoice.tsx   # Renderer untuk pilihan ganda
│   │   ├── TrueFalse.tsx        # Renderer untuk benar/salah
│   │   ├── ShortAnswer.tsx      # Input teks singkat
│   │   └── EssayInput.tsx       # Editor Rich Text untuk essay
│   └── shared/
│       └── AutosaveIndicator.tsx# Label kecil "Saved at 10:42 AM" / "Saving..."
├── utils/
│   ├── answerParser.ts          # Normalisasi format JSON jawaban
│   └── timeSync.ts              # Utilitas perhitungan offset waktu server-klien
└── types/
    └── quiz.types.ts            # Tipe data TypeScript untuk entitas kuis
```

---

## 2. Core Flows & Patterns

### A. Autosave Flow (Optimistic & Resilient)
Menghindari hilangnya jawaban siswa akibat koneksi terputus:
1. **User Action**: Siswa memilih opsi 'A' pada soal no 3.
2. **Local State Update**: Zustand store (`quizPlayer.store.ts`) langsung ter-update. UI merespon tanpa *delay* (0ms latency).
3. **Debounce Trigger**: Hook `useAutosaveAnswers` mendeteksi perubahan state dan memulai hitung mundur (misal: 1500ms).
4. **Background RPC Call**: Jika tidak ada input baru selama 1.5 detik, fungsi memanggil mutasi React Query ke `v1_save_partial_answers` (Migration 94).
5. **UI Feedback**: Komponen `AutosaveIndicator` berubah dari *"Saving..."* menjadi *"Saved at 10:45 AM"*. Jika gagal, indikator berubah menjadi *"Offline - Retrying..."* dan jawaban ditampung di *queue* lokal.

### B. Server-Authoritative Timer Sync
Waktu ujian tidak boleh bisa dimanipulasi dengan mengganti jam di komputer klien.
1. Saat komponen `QuizPlayer` dimuat, ambil `started_at` dan `expires_at` dari *database*.
2. `timeSync.ts` menghitung *offset* antara jam komputer lokal dan waktu server (PostgreSQL `now()`).
3. `useQuizTimer` menggunakan `setInterval` murni untuk UI (hanya mengupdate angka di layar), tetapi referensi perhitungan sisanya tetap mengacu ke absolut `expires_at` server dikurangi *offset*.
4. **Hard Stop**: Jika waktu lokal mencapai 00:00, panggil fungsi *force submit* secara otomatis, sembari mengunci UI menggunakan Modal statis yang tidak bisa di-*dismiss*.

### C. Anti-Cheat Hooks (`useAntiCheat.ts`)
Mengamankan integritas ujian dengan mendeteksi anomali:
1. **Visibility Change**: Mendengarkan event `visibilitychange`. Jika tersembunyi (Tab *switch*), increment `tab_switch_count`.
2. **Window Blur**: Mendengarkan event `blur`. Jika aplikasi kehilangan fokus aplikasi lain, catat *Focus Loss*.
3. **Telemetry Push**: Jika terdeteksi, panggil `api.recordCheatingSignal('TAB_SWITCH')` secara diam-diam (*silent RPC call*).
4. UI merender peringatan keras jika terdeteksi, *"Warning: You have left the quiz tab. This action has been recorded."*

---

## 3. Komponen Utama & Interaksi

### 1. `useQuizPlayerStore` (Zustand)
Menjadi "otak" sementara selama kuis berlangsung, memisahkan logika UI kompleks dari komponen React.
```typescript
interface QuizPlayerState {
  answers: Record<string, string | string[]>; // { question_id: answer_data }
  currentQuestionIndex: number;
  isSubmitting: boolean;
  setAnswer: (questionId: string, answer: any) => void;
  goToQuestion: (index: number) => void;
  // ...
}
```

### 2. `QuizPlayer.tsx` (Orchestrator)
Komponen ini mengumpulkan semua *hook* dan merender struktur dasar tanpa memiliki *state* lokal yang berat. Menggunakan Data Router (v6) untuk mendapatkan parameter URL. Tidak ada `supabase.from()` di dalam sini.

### 3. `QuizNavigation.tsx`
Menampilkan *grid* nomor soal (1-20). 
- Kotak warna **Abu-abu**: Belum dijawab.
- Kotak warna **Biru/Hijau**: Sudah dijawab.
- Kotak berkedip/Border tebal: Soal yang sedang aktif.

---

## 4. Error Handling & Edge Cases

- **Token Expiry**: Jika API Supabase mengembalikan 401 saat kuis berlangsung (sesi JWT habis), **JANGAN** me-reload halaman. Sebuah komponen global `SessionRefreshModal` akan *pop up* meminta pengguna memasukkan ulang *password* mereka *in-place*. Setelah sukses, *autosave queue* dilanjutkan.
- **Offline Mode**: Jika koneksi terputus (`navigator.onLine === false`), `AutosaveIndicator` menampilkan status "Offline". Aplikasi menyimpan paket jawaban secara berurut di `localStorage` atau IndexedDB. Saat koneksi pulih, *hook* `useAutosaveAnswers` membilas antrean tersebut ke server.

Arsitektur ini memastikan EduSync Quiz Engine mampu melayani ribuan siswa secara konkuren dengan rasa aman penuh terhadap stabilitas jawaban dan tenggat waktu.