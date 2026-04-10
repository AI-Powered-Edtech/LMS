# Parallel Session Prompts — Sesi 11-12 (Copy-Paste untuk Notion AI)

<aside>
🎯

**2 prompt terakhir untuk melengkapi 12 sesi full migration.**

Sesi 11 & 12 bisa di-generate paralel, tapi eksekusi sequential (Phase 4 → 5-6).

Copy-paste setiap blok ke thread baru Notion AI.

</aside>

<aside>
✅

**Full Session Map — 12 Sesi LENGKAP:**

- ✅ Sesi 1-5: Phase 0A(cont), 0B-0D, 1A, 1B, 1C-1D — [lihat halaman Sesi 1-5](Parallel%20Session%20Prompts%20%E2%80%94%20Sesi%201-5%20(Copy-Paste%20un%20c3bea8a0374b42d9b2620b86fbb367d5.md)
- ✅ Sesi 6-10: Phase 2 Batch 1-4, Phase 3A-3E — [lihat halaman Sesi 6-10](Parallel%20Session%20Prompts%20%E2%80%94%20Sesi%206-10%20(Copy-Paste%20u%20169b49377b9941989e9f06cfb0eadd0d.md)
- 🔵 **Sesi 11-12: Phase 4, Phase 5-6** ← halaman ini
</aside>

---

## Sesi 11 — Phase 4 (Realtime Migration)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 4-6: Realtime, Storage & Decommission — Week 53-72 Detail](https://www.notion.so/183a3d06366d4240b34eda79cdb657ba)
- [Spec 3: VIL Runtime, Worker & CI Operations](https://www.notion.so/03bce3edf2464666a0047fbf1fc29d40)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 4`

Fokus 4A — WebSocket Server (Minggu 53-55):
- vil_ws room support + presence tracking
- pg_notify → LISTEN/NOTIFY forwarding (replace postgres_changes)
- Add triggers ke tables yang butuh realtime
- Reconnection strategy: exponential backoff, no message loss
- Auth integration: JWT validation pada WebSocket handshake
- Tenant isolation: rooms scoped by tenant_id

Fokus 4B — Port 9 Realtime Consumers (Minggu 55-58):
- useBuilderChannel.ts (Broadcast + presence) — HIGH complexity, collaborative editing
- useBuilderPresence.ts (Presence tracking) — Medium
- useNotifications.ts (postgres_changes → pg_notify) — Medium
- useAdminNotifications.ts (postgres_changes → pg_notify) — Medium
- discussionQueries.ts (postgres_changes) — Low
- useMessages.ts (Broadcast) — Medium, parent-teacher messaging
- MessageThread.tsx (Broadcast) — Low
- classroomService.ts (postgres_changes) — Low
- groupAssignmentService.ts (Broadcast) — Low

Fokus 4C — Verification (Minggu 58-60):
- Collaborative builder works with 2+ users simultaneously
- Notifications arrive in real-time
- Reconnection with exponential backoff — no message loss on reconnect
- Presence tracking accurate (who’s online, cursor positions)
- Feature flag switch: Supabase Realtime ↔ VIL WebSocket

Keputusan penting (dari Spec 4 §8):
- pg_notify = ephemeral (notifications, discussions, classroom) — acceptable message loss
- vil_trigger_cdc = durable (builder presence, messaging) — no message loss
- Pilih per channel berdasarkan criticality

Catatan: EduSync sudah minimize WebSocket (polling preference untuk Supabase Free Tier).
VIL WebSocket bisa lebih agresif karena self-hosted — tapi jangan over-engineer.

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Jika ada ambiguity, ikuti spec yang sudah locked, jangan improvisasi.
7. Builder presence adalah area paling complex — pecah menjadi sub-tasks.
8. pg_notify vs vil_trigger_cdc decision per channel harus mengikuti Spec 4 §8.
9. Jika menemukan message ordering issue atau presence sync gap, tandai BLOCKED.

Format output task wajib:
- TASK ID
- OWNER TYPE
- GOAL
- READ FIRST
- EDIT ONLY
- DO NOT TOUCH
- IMPLEMENTATION STEPS
- COPY-PASTE STARTER
- VERIFY
- STOP IF
- OUTPUT FORMAT: DONE / BLOCKED / FILES / VERIFY
```

---

## Sesi 12 — Phase 5-6 (Storage Migration + Supabase Decommission)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 4-6: Realtime, Storage & Decommission — Week 53-72 Detail](https://www.notion.so/183a3d06366d4240b34eda79cdb657ba)
- [Spec 3: VIL Runtime, Worker & CI Operations](https://www.notion.so/03bce3edf2464666a0047fbf1fc29d40)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 5-6`

Fokus Phase 5 — Storage Migration (Minggu 61-66, ~80 jam):
- Deploy MinIO/S3/R2 — configuration + bucket setup
- Configure vil_storage_s3 — connect VIL to S3-compatible storage
- Dual-write period: VIL writes to both Supabase Storage + S3 simultaneously
- Background migration script: copy ALL existing files (videos, submissions, avatars)
  - Inventory semua files di Supabase Storage buckets
  - Batch copy dengan progress tracking
  - Verify integrity (checksum comparison)
- Switch reads to S3 — update StorageClient to read from S3 instead of Supabase
- URL rewriting: update semua getPublicUrl() references di DB dan frontend
  - Scan DB untuk Supabase storage URLs
  - Batch update ke S3 URLs
  - Update frontend StorageClient.getPublicUrl()
- CSP update: update img-src dan connect-src di index.html untuk S3 domain
- Verification: semua file accessible, no broken links, upload/download works

Fokus Phase 6 — Supabase Decommission (Minggu 67-72, ~50 jam):
- Remove @supabase/supabase-js dari package.json
- Remove Supabase abstraction implementations (keep interfaces for reference)
- Remove Edge Functions directory (supabase/functions/)
- Remove Supabase config (supabase/config.toml)
- Remove supabase devDependency (CLI)
- Migrate PostgreSQL hosting jika perlu (Neon/RDS/self-hosted)
- Remove RLS policies dari DB (now enforced in Rust middleware)
- Update Sentry — pastikan error tracking pointing ke VIL endpoints only
- Update PWA service worker — cache strategy untuk VIL API endpoints
  - Audit SW cached request patterns (workbox-window config)
  - Remove Supabase URL patterns from cache
  - Add VIL URL patterns
  - Cache invalidation strategy
- Remove all feature flags (VITE_API_BACKEND, per-flow flags)
- Remove shadow mode infrastructure
- Final full E2E test run (pnpm test:e2e)
- Final load test (k6 run tests/load/stress.js)
- Documentation update: README, deployment docs, architecture docs
- Gate 6 checklist: all tests pass, load tests pass, zero Supabase dependencies

Verifikasi Final:
- grep -r "supabase" src/ — harus = 0 (kecuali komentar/docs)
- grep -r "@supabase" package.json — harus = 0
- pnpm validate — clean
- pnpm test:e2e — 100% pass
- k6 stress test — pass threshold
- VIL Observer dashboard — healthy, no errors
- 0% traffic ke Supabase

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya FULL decommission.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Jika ada ambiguity, ikuti spec yang sudah locked, jangan improvisasi.
7. Storage migration harus punya rollback plan — dual-read period before cutting over.
8. Decommission tasks harus ordered carefully — jangan remove dependency sebelum replacement confirmed working.
9. Jika menemukan hidden Supabase dependency yang belum di-port, tandai BLOCKED.
10. Final verification harus exhaustive — ini adalah last gate sebelum success.

Format output task wajib:
- TASK ID
- OWNER TYPE
- GOAL
- READ FIRST
- EDIT ONLY
- DO NOT TOUCH
- IMPLEMENTATION STEPS
- COPY-PASTE STARTER
- VERIFY
- STOP IF
- OUTPUT FORMAT: DONE / BLOCKED / FILES / VERIFY
```

---

## Parallelism Map — Sesi 11-12

| **Sesi** | **Phase**                    | **Depends On**                                | **Paralel Dengan**           |
| -------- | ---------------------------- | --------------------------------------------- | ---------------------------- |
| Sesi 11  | 4 (Realtime)                 | Phase 3 selesai (semua Edge Functions ported) | Sesi 12 (prompt gen paralel) |
| Sesi 12  | 5-6 (Storage + Decommission) | Phase 4 selesai (realtime migrated)           | Sesi 11 (prompt gen paralel) |

<aside>
🏁

**Setelah Sesi 12 selesai dieksekusi = Gate 6 = MIGRATION COMPLETE! 🎉**

Semua 12 sesi prompt sudah ready. Full migration ~70-75 minggu, ~1,030-1,120 jam kerja.

</aside>

---

## Full Session Map — 12 Sesi LENGKAP

| **Sesi** | **Phase**   | **Fokus**                                     | **Minggu** | **Status**         |
| -------- | ----------- | --------------------------------------------- | ---------- | ------------------ |
| 1        | 0A Week 2-4 | Service layer refactor lanjutan               | 2-4        | ✅ Ready           |
| 2        | 0B-0D       | Auth, Realtime, Storage abstraction           | 3-8        | ✅ Ready           |
| 3        | 1A          | VIL Rust scaffold, Docker, observability      | 11-14      | ✅ Ready           |
| 4        | 1B          | Auth implementation (JWT, MFA, OAuth, RPCs)   | 14-20      | ✅ Ready           |
| 5        | 1C-1D       | TenantGuard, RbacGuard, parity tests          | 18-22      | ✅ Ready           |
| 6        | 2 Batch 1   | Courses, Classes, Lessons, Builder            | 23-28      | ✅ Ready           |
| 7        | 2 Batch 2   | Quizzes, Assignments, Gradebook               | 28-32      | ✅ Ready           |
| 8        | 2 Batch 3-4 | Users, Analytics, Progress + 12 modules       | 32-38      | ✅ Ready           |
| 9        | 3A-3B       | AI Functions + LTI 1.3                        | 39-46      | ✅ Ready           |
| 10       | 3C-3E       | Notifications, Processing, Cron, Workers      | 46-52      | ✅ Ready           |
| **11**   | **4**       | **Realtime migration (WebSocket, presence)**  | **53-60**  | **🔵 Halaman ini** |
| **12**   | **5-6**     | **Storage migration + Supabase decommission** | **61-72**  | **🔵 Halaman ini** |
