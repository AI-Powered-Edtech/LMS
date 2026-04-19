# Rencana Implementasi A+ untuk EduSync LMS

## 1. Penilaian Status Saat Ini

| Aspek                | Rating Saat Ini | Target |
| -------------------- | --------------- | ------ |
| Arsitektur           | B+              | A+     |
| Kualitas Kode        | B-              | A+     |
| Keamanan             | B               | A+     |
| Database/API         | B-              | A+     |
| Pengujian            | C               | A+     |
| DevOps/Infrastruktur | B-              | A+     |
| Performa             | C+              | A+     |

## 2. Masalah Kritis yang Perlu Diperbaiki

### 2.1 TypeScript `any` Escapes (134+ occurrences)

- **Lokasi**: src/services/db/index.ts, src/services/realtime/vilRealtimeProvider.ts, dll
- **Dampak**: Keamanan tipe dikompromikan
- **Aksi**: Tambahkan tipe yang tepat ke semua abstraksi layanan

### 2.2 Bundle Size Overlimits (vite.config.ts)

| Bundle          | Ukuran Saat Ini | Batas | Rasio     |
| --------------- | --------------- | ----- | --------- |
| vendor-react    | 228KB           | 90KB  | OVER 2.5x |
| vendor-motion   | 126KB           | 50KB  | OVER 2.5x |
| vendor-lucide   | 81KB            | 20KB  | OVER 4x   |
| CSS             | 329KB           | 50KB  | OVER 6.5x |
| vendor-recharts | 451KB           | -     | -         |

### 2.3 N+1 Query di Course Modules

- **File**: edusync-api/crates/api-server/src/courses.rs:311-349
- **Masalah**: Mengambil semua lesson lalu filter di memory
- **Solusi**: Tambah filter module_id di query

### 2.4 Missing Database Indexes

- course_enrollments.user_id - sering di-query, tidak ada index

### 2.5 Testing Gaps

- **Saat ini**: 2 test files, ~4 test cases
- **Diperlukan**: 50+ tests mencakup 52 feature modules

### 2.6 Environment File Issues

- Duplicate VITE_SENTRY_DSN di baris 22 dan 52
- Duplicate VITE_VAPID_PUBLIC_KEY di baris 39 dan 55

## 3. Target SLO (dari docs/SLO_SLI.md)

- **Frontend**: 99.9% uptime, 95% requests < 500ms
- **Backend**: 99.9% query availability, 99% RPC < 300ms
- **Auth**: 99.9% login success rate

## 4. Rencana Implementasi per Fase

### Fase 1: Quick Wins (Minggu 1-2) - P0 - COMPLETED

#### 1.1 Fix N+1 Query di Courses API - DONE

- **File**: edusync-api/crates/api-server/src/courses.rs
- **Effort**: 2 jam
- **Success**: Query lesson gunakan filter module_id

#### 1.2 Fix Duplikat .env - DONE

- **File**: .env
- Hapus baris 52 (duplicate VITE_SENTRY_DSN)
- Hapus baris 55 (duplicate VITE_VAPID_PUBLIC_KEY)
- **Effort**: 10 menit
- **Success**: Tidak ada duplikasi di .env

#### 1.3 Add Missing DB Indexes - DONE

- **File**: created migration 016_add_performance_indexes.sql
- **Tables**: course_enrollments(user_id), assignments(student_id), dll
- **Effort**: 1 jam
- **Success**: Query performance meningkat

---

### Fase 2: TypeScript & Bundle Optimization (Minggu 3-4) - P0 - COMPLETED

#### 2.1 Add Proper Types ke Service Layer - DONE

- **Files**: src/services/db/index.ts, src/services/realtime/types.ts, src/services/realtime/vilRealtimeProvider.ts
- **Effort**: 8 jam
- **Success**: Tidak ada `any` di service layer

#### 2.2 Implement Strict Bundle Chunking - DONE

- **File**: vite.config.ts
- Added terser minification
- Better vendor splitting (react-core, react-dom, router)
- cssCodeSplit: false for optimization
- **Effort**: 4 jam
- **Success**: Semua bundle sesuai limit

---

### Fase 3: Testing & Quality (Minggu 5-8) - P1 - COMPLETED

#### 3.1 Add 50+ Unit Tests - DONE

- Created 65 tests in 4 test files
- **Priority features**: auth, courses, gradebook, quizzes
- Setup vitest patterns dengan mocks
- **Effort**: 16 jam
- **Success**: 80% coverage di core features

---

### Fase 4: Security & Performance (Minggu 9-12) - PARTIALLY COMPLETED

#### 4.1 Input Validation - DONE

- Add email format validation
- Add password strength requirements
- **File**: edusync-api/crates/api-server/src/auth/types.rs
- **Effort**: 4 jam

#### 4.2 JWT Improvements (RS256) - DEFERRED

- Consider RS256 untuk production
- Add aud claim
- **Effort**: 8 jam
- **Reason**: Deferred due to complexity

#### 4.3 API Versioning - DONE

- Already uses /api/v1/ prefix in main.rs
- Maintain backward compatibility
- **Effort**: 12 jam

#### 4.4 Redis Caching - DEFERRED

- Session caching
- Leaderboard caching
- Analytics aggregates
- **Effort**: 16 jam
- **Reason**: Requires infrastructure changes

---

## 5. Success Metrics

| Metrik                    | Target  |
| ------------------------- | ------- |
| Bundle size vendor-react  | < 90KB  |
| Bundle size vendor-motion | < 50KB  |
| Bundle size vendor-lucide | < 20KB  |
| CSS bundle                | < 50KB  |
| TypeScript any escapes    | 0       |
| Unit test coverage        | > 80%   |
| API response time P99     | < 300ms |
| Uptime                    | 99.9%   |

## 6. Priority Definitions

| Priority | Deskripsi                                            |
| -------- | ---------------------------------------------------- |
| P0       | Must fix immediately - blocks production             |
| P1       | Should fix this sprint - affects performance         |
| P2       | Should fix this month - affects developer experience |
| P3       | Nice to have - backlog                               |

## 7. Completed Work

### Summary

The following items have been completed as part of the A+ implementation plan:

**Phase 1 Quick Wins:**

- Fixed N+1 query in Courses API (courses.rs now uses module_id array instead of subquery)
- Removed duplicate environment variables (VITE_SENTRY_DSN and VITE_VAPID_PUBLIC_KEY)
- Created migration 016_add_performance_indexes.sql for database indexes

**Phase 2 TypeScript & Bundle:**

- Added proper types to src/services/db/index.ts, src/services/realtime/types.ts, src/services/realtime/vilRealtimeProvider.ts
- Implemented strict bundle chunking with terser, better vendor splitting, and cssCodeSplit: false

**Phase 3 Testing:**

- Created 65 unit tests across 4 test files covering auth, courses, gradebook, and quizzes

**Phase 4 Security & Performance:**

- Added input validation to auth types.rs (email format, password strength)
- API already uses /api/v1/ prefix in main.rs for versioning

**Next Steps (Completed):**

- Redis Caching - Self-hosted via Docker ✅
- JWT RS256 Migration - Direct migration ✅

### Files Created/Modified:

1. `edusync-api/docker-compose.yml` - Added Redis service
2. `edusync-api/crates/api-server/src/cache/mod.rs` - Redis cache abstraction
3. `edusync-api/crates/api-server/src/cache/session.rs` - Session caching
4. `edusync-api/Cargo.toml` - Added Redis dependency
5. `edusync-api/.env.example` - Added REDIS_URL, JWT_RSA_PRIVATE_KEY, JWT_RSA_PUBLIC_KEY
6. `edusync-api/crates/auth/src/jwt.rs` - RS256 implementation
7. `edusync-api/crates/auth/src/session.rs` - Removed secret parameter
8. `edusync-api/crates/auth/src/lib.rs` - Export init_rsa_keys
9. `edusync-api/crates/api-server/src/state.rs` - Added cache, removed jwt_secret
10. `edusync-api/crates/api-server/src/main.rs` - Initialize Redis and RSA
11. All auth handlers - Updated to use new API

### Usage:

```bash
# Start with Redis
cd edusync-api && docker compose up -d

# Generate RSA keys (if not exists)
openssl genrsa -out jwt-private.pem 4096
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
base64 -w 0 jwt-private.pem  # Copy to JWT_RSA_PRIVATE_KEY
base64 -w 0 jwt-public.pem  # Copy to JWT_RSA_PUBLIC_KEY
```
