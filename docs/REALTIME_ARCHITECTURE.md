# Arsitektur Realtime EduSync LMS

Dokumen ini menjelaskan lapisan abstraksi realtime di EduSync — dari Supabase Realtime (default) hingga VIL WebSocket backend (Phase 4).

---

## 1. Ikhtisar Arsitektur

EduSync menggunakan lapisan abstraksi realtime sehingga consumer hooks tidak perlu tahu apakah koneksi menggunakan Supabase Realtime atau VIL WebSocket. Pemilihan provider dilakukan sekali saat aplikasi dimulai via variabel lingkungan.

```
Consumer Hook
    │
    ▼
getRealtimeProvider()          ← singleton dari realtimeProvider.ts
    │
    ├── VITE_REALTIME_BACKEND=supabase (DEFAULT)
    │       └── createSupabaseRealtimeProvider()
    │               └── Supabase JS SDK → Supabase Realtime (WebSocket)
    │
    └── VITE_REALTIME_BACKEND=vil
            └── createVilRealtimeProvider()
                    └── Koneksi WebSocket langsung ke Rust server
```

Semua saluran VIL berbagi **SATU** koneksi WebSocket (multiplexed). Setiap saluran memiliki nama unik (mis. `builder:course-123`) yang digunakan untuk routing pesan.

---

## 2. Pola Saluran

### 2.1 `postgres_changes` — Perubahan Database

Digunakan untuk mendengarkan INSERT/UPDATE/DELETE dari tabel PostgreSQL.

```typescript
channel
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    callback
  )
  .subscribe()
```

- **Supabase**: filtering dilakukan di sisi server melalui `pg_notify`
- **VIL**: server mengirim ke saluran spesifik `notifications:{userId}`, sehingga tidak perlu filter sisi klien

### 2.2 `broadcast` — Siaran Antar Klien

Digunakan untuk mengirim aksi secara langsung antar pengguna di saluran yang sama.

```typescript
channel
  .on('broadcast', { event: 'builder_action' }, callback)
  .subscribe()

// Kirim ke semua klien di saluran
await channel.send({ type: 'broadcast', event: 'builder_action', payload: {...} })
```

### 2.3 `presence` — Status Kehadiran Pengguna

Digunakan untuk melacak siapa saja yang sedang aktif di saluran.

```typescript
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    // state = { userId: [{ ...metadata }] }
  })
  .subscribe()

await channel.track({ userId, userName, cursor: { x, y } })
```

---

## 3. Sembilan Consumer Hook

| Hook                                  | Saluran                     | Pola                     | Keterangan                         |
| ------------------------------------- | --------------------------- | ------------------------ | ---------------------------------- |
| `useNotifications`                    | `notifications:{userId}`    | `postgres_changes`       | Notifikasi INSERT/UPDATE real-time |
| `useAdminNotifications`               | `notifications:{userId}`    | `postgres_changes`       | Notifikasi khusus admin            |
| `useBuilderChannel` (course-builder)  | `builder:{courseId}`        | `broadcast` + `presence` | Kolaborasi editor kursus           |
| `useBuilderChannel` (courses/builder) | `builder:{courseId}`        | `broadcast`              | Versi alternatif builder           |
| `classroomService`                    | `classroom:{classId}`       | `postgres_changes`       | Update kelas real-time             |
| `useParentNotifications`              | `notifications:{userId}`    | `postgres_changes`       | Notifikasi orang tua               |
| `useMessages`                         | `messages:{conversationId}` | `postgres_changes`       | Pesan percakapan                   |
| `discussionQueries`                   | `discussions:{courseId}`    | `postgres_changes`       | Diskusi kursus                     |
| `groupAssignmentService`              | `assignments:{groupId}`     | `postgres_changes`       | Tugas kelompok                     |

---

## 4. Protokol Pesan WebSocket

### Client → Server

| Tipe        | Keterangan                           |
| ----------- | ------------------------------------ |
| `join`      | Bergabung ke saluran                 |
| `leave`     | Meninggalkan saluran                 |
| `broadcast` | Kirim pesan ke semua anggota saluran |
| `track`     | Daftarkan data presence              |
| `untrack`   | Hapus data presence                  |
| `ping`      | Heartbeat (setiap 30 detik)          |

```json
{ "type": "join",      "channel": "builder:course-123" }
{ "type": "leave",     "channel": "builder:course-123" }
{ "type": "broadcast", "channel": "builder:course-123", "event": "builder_action", "payload": {...} }
{ "type": "track",     "channel": "builder:course-123", "payload": { "userId": "...", "cursor": {...} } }
{ "type": "untrack",   "channel": "builder:course-123" }
{ "type": "ping" }
```

### Server → Client

| Tipe               | Keterangan                           |
| ------------------ | ------------------------------------ |
| `system`           | Status saluran (SUBSCRIBED / CLOSED) |
| `broadcast`        | Pesan siaran dari klien lain         |
| `presence_sync`    | Update state presence penuh          |
| `postgres_changes` | Perubahan baris database             |
| `pong`             | Respons heartbeat                    |
| `error`            | Pesan error dari server              |

```json
{ "type": "system",         "channel": "builder:course-123", "event": "SUBSCRIBED" }
{ "type": "broadcast",      "channel": "builder:course-123", "event": "builder_action", "payload": {...} }
{ "type": "presence_sync",  "channel": "builder:course-123", "state": { "userId": [{...}] } }
{ "type": "postgres_changes","channel": "notifications:uid", "payload": { "eventType": "INSERT", "table": "notifications", "new": {...}, "old": {} } }
{ "type": "pong" }
{ "type": "error", "message": "Akses ditolak" }
```

---

## 5. Strategi Rekoneksi — Exponential Backoff

Ketika koneksi WebSocket terputus, VIL provider otomatis mencoba koneksi ulang:

| Percobaan | Delay                |
| --------- | -------------------- |
| 0         | 1.000 ms             |
| 1         | 2.000 ms             |
| 2         | 4.000 ms             |
| 3         | 8.000 ms             |
| 4         | 16.000 ms            |
| 5+        | 30.000 ms (maksimum) |
| > 10      | Berhenti mencoba     |

**Rumus:** `min(1000 × 2^attempt, 30000)`

**Saat rekoneksi berhasil:**

1. Re-join semua saluran yang sebelumnya berlangganan
2. Re-track presence untuk saluran yang memiliki data presence
3. Server mengirim `system.SUBSCRIBED` yang memicu `subscribeCallback('SUBSCRIBED')` di setiap saluran
4. Consumer hooks yang memiliki logika `onReconnect` (mis. `useBuilderChannel`) akan menerima notifikasi

---

## 6. Pemilihan Provider

Provider dipilih sekali saat aplikasi dimulai (biasanya di `main.tsx` atau `App.tsx`):

```typescript
import {
  setRealtimeProvider,
  createSupabaseRealtimeProvider,
  createVilRealtimeProvider,
} from '@/services/realtime'

const backend = import.meta.env.VITE_REALTIME_BACKEND

if (backend === 'vil') {
  setRealtimeProvider(createVilRealtimeProvider())
} else {
  // Default: Supabase Realtime
  setRealtimeProvider(createSupabaseRealtimeProvider())
}
```

Consumer hooks tidak perlu diubah — semuanya menggunakan `getRealtimeProvider()` dari abstraksi.

---

## 7. Variabel Lingkungan

| Variabel                | Nilai Default            | Keterangan                            |
| ----------------------- | ------------------------ | ------------------------------------- |
| `VITE_REALTIME_BACKEND` | `supabase`               | Pilih provider: `supabase` atau `vil` |
| `VITE_WS_URL`           | `ws://localhost:8080/ws` | URL WebSocket server VIL              |

Contoh `.env.local` untuk development VIL:

```env
VITE_REALTIME_BACKEND=vil
VITE_WS_URL=ws://localhost:8080/ws
```

Contoh `.env.production` untuk production:

```env
VITE_REALTIME_BACKEND=vil
VITE_WS_URL=wss://api.edusync.id/ws
```

---

## 8. Autentikasi Token

VIL provider membaca JWT dari localStorage secara otomatis dan menambahkannya ke URL WebSocket:

```
wss://api.edusync.id/ws?token=<JWT>
```

Urutan pencarian token:

1. `localStorage.getItem('sb-access-token')`
2. `localStorage.getItem('access_token')`
3. Kunci auth Supabase otomatis (`sb-*-auth-token`) — diparsing dari JSON

---

## 9. Prosedur Rollback

Jika VIL WebSocket mengalami masalah di production:

1. Ubah `VITE_REALTIME_BACKEND` dari `vil` ke `supabase` di variabel lingkungan
2. Rebuild dan redeploy frontend
3. Tidak ada perubahan kode yang diperlukan — provider Supabase tetap tersedia sebagai fallback

Rollback sepenuhnya transparan bagi consumer hooks karena semua menggunakan abstraksi `getRealtimeProvider()`.

---

## 10. Struktur File

```
src/services/realtime/
├── types.ts                    — Interface AppRealtimeChannel, RealtimeProvider, dll.
├── realtimeProvider.ts         — Singleton factory (getRealtimeProvider / setRealtimeProvider)
├── supabaseRealtimeProvider.ts — Implementasi Supabase (default/fallback)
├── vilRealtimeProvider.ts      — Implementasi VIL WebSocket (Phase 4)
└── index.ts                    — Re-ekspor semua
```

---

## 11. Catatan Pengembangan

- Log `[VilRealtime]` hanya muncul di mode development (`import.meta.env.DEV`)
- Heartbeat ping dikirim setiap 30 detik untuk mencegah timeout koneksi
- Pesan yang dikirim sebelum koneksi siap dimasukkan ke antrian dan dikirim saat `onopen`
- Satu instance provider = satu koneksi WebSocket — semua saluran dimultipleks di atasnya
