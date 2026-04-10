# Parallel Session Prompts — Sesi 1-5 (Copy-Paste untuk Notion AI)

<aside>
🎯

**5 prompt siap pakai untuk 5 sesi Notion AI paralel.**

Masing-masing sesi independen — bisa dijalankan bersamaan tanpa dependency antar sesi.

Copy-paste setiap blok ke thread baru Notion AI.

</aside>

<aside>
⚠️

**Aturan paralel:**

- Sesi 1 & 2 boleh paralel (Phase 0A lanjutan & Phase 0B-0D — area berbeda)
- Sesi 3, 4, 5 (Phase 1A, 1B, 1C-1D) secara logis sekuensial, tapi **prompt generation bisa paralel** — hasilnya dieksekusi berurutan
- Setiap sesi menghasilkan 1 halaman Agent Task Queue baru di bawah Main Plan
</aside>

---

## Sesi 1 — Phase 0A Week 2-4 (Service Layer Refactor Lanjutan)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 0: Frontend Abstraction Layer — Week 1-10 Detail](https://www.notion.so/https://www.notion.so/b8bf6c6b0ff14370a7e8c8965c6efa01)
- [Spec 2: Frontend Runtime Compatibility Contract](https://www.notion.so/https://www.notion.so/662f7d41ec7f4607a825f104dba69e33)
- [Spec 1: Auth & Session Parity Contract](https://www.notion.so/https://www.notion.so/9d46671841b94553a52962dfd09c072c)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 0A Week 2-4`

Tujuan halaman:
- melanjutkan Week 1
- memecah refactor service layer berikutnya menjadi task-task kecil siap copas
- fokus pada refactor service/query layer yang aman untuk multi-agent
- jangan sentuh redesign auth besar di wave ini
- gunakan format yang sama seperti [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Cakupan wave:
- refactor 15+ service files lanjutan
- cluster sederhana dulu: lessons, classroom, attendance, discussions, notifications read path, parent hooks yang ringan
- tambahkan verify commands per cluster
- tambahkan merge order dan dependency order
- semua task harus cocok untuk coding CLI agents kecil

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Semua teks UI harus Bahasa Indonesia jika ada string UI.
7. Jika ada ambiguity, ikuti spec yang sudah locked, jangan improvisasi.
8. Jika menemukan coupling besar, tandai BLOCKED.

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

## Sesi 2 — Phase 0B-0D (Auth, Realtime, Storage Abstraction)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 0: Frontend Abstraction Layer — Week 1-10 Detail](https://www.notion.so/https://www.notion.so/b8bf6c6b0ff14370a7e8c8965c6efa01)
- [Spec 1: Auth & Session Parity Contract](https://www.notion.so/https://www.notion.so/9d46671841b94553a52962dfd09c072c)
- [Spec 2: Frontend Runtime Compatibility Contract](https://www.notion.so/https://www.notion.so/662f7d41ec7f4607a825f104dba69e33)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 0B-0D`

Tujuan:
- auth abstraction (AuthProvider interface, wrap Supabase auth, stub VIL auth)
- realtime abstraction (RealtimeClient interface, wrap Supabase realtime, stub VIL WS)
- storage abstraction (StorageClient interface, wrap Supabase storage, stub VIL S3)
- CI-safe task packs untuk model kecil
- setiap task harus sangat ketat karena area ini sensitif

Wajib:
- semua keputusan auth mengikuti [Spec 1: Auth & Session Parity Contract](https://www.notion.so/https://www.notion.so/9d46671841b94553a52962dfd09c072c)
- semua keputusan runtime frontend mengikuti [Spec 2: Frontend Runtime Compatibility Contract](https://www.notion.so/https://www.notion.so/662f7d41ec7f4607a825f104dba69e33)
- jangan mengubah behavior kontrak tanpa parity task
- pecah menjadi task kecil dengan Input/Output/Code/Verify/Stop If
- AuthProvider harus cover: signIn, signUp, signInWithOAuth, signOut, getSession, onAuthStateChange, refreshSession, exchangeCodeForSession, MFA flows
- RealtimeClient harus cover: subscribe, track/untrack (presence), broadcast — 9 consumer files
- StorageClient harus cover: upload, download, remove, getPublicUrl — 5 consumer files

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Semua teks UI harus Bahasa Indonesia jika ada string UI.
7. Jika ada ambiguity, ikuti spec yang sudah locked, jangan improvisasi.
8. Jika menemukan coupling besar atau behavior change, tandai BLOCKED.

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

## Sesi 3 — Phase 1A (VIL Server Scaffold)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 1: VIL Server Scaffold + Auth — Week 11-22 Detail](https://www.notion.so/https://www.notion.so/65123c0b728949559ac6e6d61505671e)
- [Spec 3: VIL Runtime, Worker & CI Operations](https://www.notion.so/https://www.notion.so/03bce3edf2464666a0047fbf1fc29d40)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 1A`

Fokus:
- Rust workspace scaffold: `edusync-api/` dengan crates (server, models, auth, middleware, services)
- VilApp bootstrap dengan `.observer(true)`, health endpoint, ready endpoint
- PostgreSQL connection via `vil_db_sqlx` ke database yang SAMA dengan Supabase
- Generate Rust structs untuk core tables (profiles, tenants, courses, classes, users)
- Reverse proxy: request yang belum di-handle → forward ke Supabase
- Docker Compose setup (VIL server + PostgreSQL + PgBouncer + Nginx)
- Nginx routing config (VIL vs Supabase split)
- CORS configuration untuk frontend localhost:5173 dan production domain
- CSP header update di index.html
- CI/CD bootstrap (cargo build, cargo test, cargo clippy)
- Observability baseline: VIL Observer dashboard, Prometheus metrics, vil_log, vil_otel
- Error response adapter (match Supabase PostgREST error format)

Gunakan VIL built-ins secara agresif:
- `.observer(true)` untuk monitoring
- `JwtAuth` untuk auth middleware placeholder
- `RateLimit` untuk rate limiting
- Auto-generated /health, /ready, /metrics endpoints

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Jika ada ambiguity, ikuti spec yang sudah locked, jangan improvisasi.
7. Jika menemukan dependency ke Phase 0 yang belum selesai, tandai BLOCKED.

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

## Sesi 4 — Phase 1B (Auth Implementation)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 1: VIL Server Scaffold + Auth — Week 11-22 Detail](https://www.notion.so/https://www.notion.so/65123c0b728949559ac6e6d61505671e)
- [Spec 1: Auth & Session Parity Contract](https://www.notion.so/https://www.notion.so/9d46671841b94553a52962dfd09c072c)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Gap Analysis & Codebase Findings dari Deep Dive](https://www.notion.so/https://www.notion.so/d1d3a74e25004ea0b168da3a42f47620)
- [Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)](https://www.notion.so/https://www.notion.so/73757d6162304c67b9452ba0088cf01a)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 1B`

Fokus:
- auth.users schema migration plan (Supabase auth.users → public.users)
- JWT issuance via VIL built-in JwtAuth (custom claims: sub, email, roles[], tenant_id, exp, iat)
- Password hashing dual-format (try VIL → fallback Supabase bcrypt/argon2 → re-hash on success)
- Session management (access token 1hr + refresh token 30d, proactive refresh 5min before expiry)
- PKCE OAuth flow Google (callback routing sesuai Spec 1 §5 audit)
- Email verification (Resend/SendGrid/SMTP)
- MFA implementation (TOTP generation, QR enrollment, recovery codes, verification)
- Forgot/reset password flow
- 9 auth RPCs (get_auth_bootstrap PALING KRITIS, ensure_profile_exists, accept_invitation, enroll_student, validate_invitation, public_lookup_class, onboard_student_join_class, create_school_tenant, + forgot password)
- Rate limiting per auth endpoint (VIL built-in RateLimit)
- API response format standardization (match PostgREST error shape)
- Error response parity dengan frontend handleSupabaseError()

Semua task harus mengikuti auth parity contract secara ketat.
Jika ada ambiguity, prioritaskan [Spec 1: Auth & Session Parity Contract](https://www.notion.so/https://www.notion.so/9d46671841b94553a52962dfd09c072c).

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Jika ada ambiguity, ikuti Spec 1 yang sudah locked.
7. Password hash compatibility adalah CRITICAL — test dengan existing user data.
8. get_auth_bootstrap RPC harus return shape IDENTIK dengan Supabase version.
9. Jika menemukan gap auth yang belum di-spec, tandai BLOCKED.

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

## Sesi 5 — Phase 1C-1D (Tenant Guard, RBAC, Auth Verification)

```
Baca dan jadikan source of truth halaman-halaman ini terlebih dahulu:

- [EduSync](https://www.notion.so/https://www.notion.so/32f9453fab5580f3a5e5d87d6c46b200)
- [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b)
- [Full Migration Becomes Possible — Multi-Agent Execution Model](https://www.notion.so/https://www.notion.so/8b907d086a5042569489e649aca8927f)
- [Phase 1: VIL Server Scaffold + Auth — Week 11-22 Detail](https://www.notion.so/https://www.notion.so/65123c0b728949559ac6e6d61505671e)
- [Spec 1: Auth & Session Parity Contract](https://www.notion.so/https://www.notion.so/9d46671841b94553a52962dfd09c072c)
- [Spec 3: VIL Runtime, Worker & CI Operations](https://www.notion.so/https://www.notion.so/03bce3edf2464666a0047fbf1fc29d40)
- [Spec 4: Infrastructure, Data Layer & Operational Gaps — 15 Temuan Baru](https://www.notion.so/https://www.notion.so/24943c65b9ae46a899bec8829b02f5de)
- [Agent Bootstrap Context — VIL Framework Reference untuk EduSync](https://www.notion.so/https://www.notion.so/f2f6b969e8c64b6c9bffacaf474d765f)
- [Gap Analysis & Codebase Findings dari Deep Dive](https://www.notion.so/https://www.notion.so/d1d3a74e25004ea0b168da3a42f47620)

Referensi VIL:
- https://github.com/OceanOS-id/VIL

Tugas:
Buat halaman baru di bawah [Main Plan — Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](https://www.notion.so/https://www.notion.so/ace54d0159584b0c8330eaad52e6e05b) dengan judul:

`Agent Task Queue — Phase 1C-1D`

Fokus:
- TenantGuard middleware (extract tenant_id dari JWT, inject ke semua query — menggantikan get_my_tenant_id() + auto_set_tenant_id())
- RbacGuard middleware (VIL built-in RbacPolicy dengan wildcard permissions — Role::new("teacher").permission("courses:*"))
- Map 5 roles: student | teacher | admin | parent | principal
- Role resolution dari user_roles table (BUKAN profiles.role)
- Port RLS policies table-by-table untuk auth-related tables
- Auth E2E verification tests (3 test accounts: teacher/student/admin @edusync.dev)
- Login/signup/OAuth/logout/MFA full cycle test
- Multi-tenant isolation verification (user A tidak bisa akses data tenant B)
- Feature flag switch test (Supabase auth ↔ VIL auth)
- Auth callback redirect verification (routing path sesuai Spec 1 §5)
- Parity tests: identical input ke Supabase dan VIL → assert identical output
- Shadow mode dry-run untuk auth endpoints
- Cutover drill: switch flag, verify, rollback, verify again
- Sentry error capture verification untuk VIL errors

Aturan kerja:
1. Anggap halaman-halaman di atas sebagai source of truth final.
2. Jangan buat keputusan arsitektur baru yang bertentangan dengan spec.
3. Jangan turunkan scope menjadi partial migration — targetnya full migration via multi-agent execution.
4. Setiap task harus: self-contained, punya dependency jelas, punya Input / Output / Edit only / Do not touch, punya code siap copas, punya verify commands, punya stop/block criteria.
5. Semua task harus cocok untuk model AI kecil / coding CLI agents.
6. Security tests harus cover: tenant isolation, role escalation prevention, JWT tampering rejection.
7. Jika menemukan RLS policy yang terlalu complex untuk middleware, tandai BLOCKED.
8. Jika ada gap antara Spec 1 dan actual codebase behavior, tandai BLOCKED.

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

## Parallelism Map

| **Sesi** | **Phase**              | **Depends On**                       | **Paralel Dengan**                   |
| -------- | ---------------------- | ------------------------------------ | ------------------------------------ |
| Sesi 1   | 0A Week 2-4            | Phase 0A Week 1 selesai              | Sesi 2, 3, 4, 5                      |
| Sesi 2   | 0B-0D                  | Phase 0A Week 1 selesai              | Sesi 1, 3, 4, 5                      |
| Sesi 3   | 1A (Scaffold)          | Tidak ada (Rust workspace baru)      | Sesi 1, 2, 4, 5                      |
| Sesi 4   | 1B (Auth)              | Phase 1A scaffold selesai (eksekusi) | Sesi 1, 2, 3, 5 (prompt gen paralel) |
| Sesi 5   | 1C-1D (Guard + Verify) | Phase 1B auth selesai (eksekusi)     | Sesi 1, 2, 3, 4 (prompt gen paralel) |

<aside>
✅

**Semua 5 prompt bisa di-generate paralel.** Eksekusi task-nya yang harus respect dependency order: Sesi 3 → 4 → 5 untuk Phase 1, sedangkan Sesi 1 & 2 bisa dieksekusi independen kapan saja setelah Phase 0A Week 1.

</aside>
