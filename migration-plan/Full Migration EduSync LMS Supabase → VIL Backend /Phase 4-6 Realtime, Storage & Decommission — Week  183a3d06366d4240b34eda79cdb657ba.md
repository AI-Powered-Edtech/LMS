# Phase 4-6: Realtime, Storage & Decommission — Week 53-72 Detail

<aside>
🎯

**Goal:** Migrasi Realtime → VIL WebSocket, Storage → S3/MinIO, lalu decommission Supabase sepenuhnya.

**Duration:** 20 minggu | **Effort:** ~250 jam | **Deliverable:** Zero Supabase dependencies, production fully on VIL

</aside>

---

# Phase 4: Realtime Migration (Minggu 53-60, ~120 jam)

---

## Week 53-55: VIL WebSocket Server

### Week 53: WebSocket Architecture

```rust
// crates/api-server/src/websocket.rs
use vil_server::websocket::{WebSocket, Room, Message};
use std::collections::HashMap;
use uuid::Uuid;

/// Room types for EduSync
pub enum RoomType {
    /// Course builder collaborative editing (useBuilderChannel)
    Builder { course_id: Uuid },
    /// Notification channel per user
    Notifications { user_id: Uuid },
    /// Discussion thread updates
    Discussion { thread_id: Uuid },
    /// Parent-teacher messaging
    Messaging { thread_id: Uuid },
    /// Classroom live updates
    Classroom { class_id: Uuid },
    /// Group assignment collaboration
    GroupAssignment { assignment_id: Uuid },
}

/// Builder room with presence tracking
pub struct BuilderRoom {
    pub course_id: Uuid,
    pub participants: HashMap<Uuid, Participant>,
}

#[derive(Clone, Serialize)]
pub struct Participant {
    pub user_id: Uuid,
    pub name: String,
    pub cursor_position: Option<CursorPos>,
    pub joined_at: DateTime<Utc>,
}

impl Room for BuilderRoom {
    type Event = BuilderEvent;

    async fn on_join(&mut self, ws: &WebSocket, user: &Claims) {
        let participant = Participant {
            user_id: user.sub.parse().unwrap(),
            name: user.email.clone(),
            cursor_position: None,
            joined_at: Utc::now(),
        };
        self.participants.insert(participant.user_id, participant.clone());
        // Broadcast presence to all participants
        ws.broadcast(BuilderEvent::UserJoined(participant)).await;
    }

    async fn on_leave(&mut self, ws: &WebSocket, user_id: Uuid) {
        self.participants.remove(&user_id);
        ws.broadcast(BuilderEvent::UserLeft(user_id)).await;
    }

    async fn on_message(&mut self, ws: &WebSocket, msg: BuilderEvent) {
        match msg {
            BuilderEvent::CursorMove { user_id, position } => {
                if let Some(p) = self.participants.get_mut(&user_id) {
                    p.cursor_position = Some(position);
                }
                ws.broadcast(msg).await;
            }
            BuilderEvent::ContentUpdate { .. } => {
                ws.broadcast(msg).await;
            }
            _ => {}
        }
    }
}
```

### Week 54: pg_notify → LISTEN/NOTIFY

```sql
-- Replace Supabase Realtime postgres_changes with pg_notify triggers

-- Notifications table trigger
CREATE OR REPLACE FUNCTION notify_new_notification() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'notifications',
        json_build_object(
            'table', 'notifications',
            'action', TG_OP,
            'user_id', NEW.user_id,
            'data', row_to_json(NEW)
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_notification
    AFTER INSERT ON notifications
    FOR EACH ROW EXECUTE FUNCTION notify_new_notification();

-- Discussion comments trigger
CREATE OR REPLACE FUNCTION notify_new_comment() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'discussions',
        json_build_object(
            'table', 'discussion_comments',
            'action', TG_OP,
            'thread_id', NEW.thread_id,
            'data', row_to_json(NEW)
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```rust
// crates/api-server/src/pg_listener.rs
use sqlx::postgres::PgListener;

/// Listen to PostgreSQL NOTIFY events and forward to WebSocket rooms
pub async fn start_pg_listener(pool: &PgPool, ws_manager: &WsManager) {
    let mut listener = PgListener::connect_with(&pool).await.unwrap();
    listener.listen_all(vec!["notifications", "discussions", "classroom"]).await.unwrap();

    while let Ok(notification) = listener.recv().await {
        let payload: serde_json::Value = serde_json::from_str(notification.payload()).unwrap();
        let channel = notification.channel();

        match channel {
            "notifications" => {
                let user_id = payload["user_id"].as_str().unwrap();
                ws_manager.send_to_user(user_id, payload).await;
            }
            "discussions" => {
                let thread_id = payload["thread_id"].as_str().unwrap();
                ws_manager.send_to_room(&format!("discussion:{}", thread_id), payload).await;
            }
            _ => {}
        }
    }
}
```

### Week 55: Reconnection & Message Buffering

```rust
/// WebSocket connection with exponential backoff reconnection
/// Frontend side (TypeScript) — replaces SupabaseRealtimeProvider
pub struct VilRealtimeProvider {
    reconnect_attempts: u32,
    max_reconnect_delay: Duration,
    message_buffer: Vec<PendingMessage>,  // Buffer messages during disconnect
}

impl VilRealtimeProvider {
    /// Reconnect with exponential backoff
    fn get_reconnect_delay(&self) -> Duration {
        let base = Duration::from_secs(1);
        let delay = base * 2u32.pow(self.reconnect_attempts.min(5));
        delay.min(self.max_reconnect_delay)  // Cap at 30 seconds
    }

    /// Flush buffered messages after reconnect
    async fn on_reconnect(&mut self, ws: &WebSocket) {
        for msg in self.message_buffer.drain(..) {
            ws.send(msg).await;
        }
        self.reconnect_attempts = 0;
    }
}
```

---

## Week 55-58: Port 9 Realtime Consumers

### Week 55-56: Course Builder (Highest Complexity)

**`useBuilderChannel.ts` → VIL WebSocket**

```tsx
// BEFORE (Supabase Realtime)
const channel = supabase.channel(`builder:${courseId}`)
  .on('broadcast', { event: 'content-update' }, handler)
  .subscribe()

// AFTER (VIL WebSocket via RealtimeProvider)
const subscription = realtimeProvider.subscribe(`builder:${courseId}`, {
  type: 'broadcast',
})
subscription.on('content-update', handler)
```

**`useBuilderPresence.ts` → VIL Presence**

```tsx
// BEFORE
channel.track({ user_id, name, cursor })

// AFTER
subscription.track({ user_id, name, cursor })
// VIL WebSocket room handles presence automatically
```

### Week 56-57: Notifications

**`useNotifications.ts` + `useAdminNotifications.ts`**

```tsx
// BEFORE (postgres_changes)
supabase.channel('notifications')
  .on('postgres_changes', { event: 'INSERT', table: 'notifications', filter: `user_id=eq.${userId}` }, handler)

// AFTER (pg_notify → VIL WebSocket)
realtimeProvider.subscribe(`notifications:${userId}`, {
  type: 'postgres_changes',
  table: 'notifications',
  event: 'INSERT',
})
```

**Catatan:** EduSync sudah minimize WebSocket usage (polling preference untuk Supabase Free Tier). Dengan VIL self-hosted, bisa lebih agresif — real WebSocket instead of polling. Smart polling dari Phase 31C bisa di-retire atau keep sebagai fallback.

### Week 57-58: Remaining Consumers

| **Hook/File** | **Minggu** | **Catatan** |
| --- | --- | --- |
| `discussionQueries.ts` | W57 | postgres_changes → pg_notify |
| `useMessages.ts` | W57 | Parent-teacher messaging broadcast |
| `MessageThread.tsx` | W57 | Message thread updates |
| `classroomService.ts` | W58 | Class live updates |
| `groupAssignmentService.ts` | W58 | Group assignment broadcast |

---

## Week 58-60: Phase 4 Verification

### Testing Checklist

- [ ]  Collaborative builder works with 2+ users simultaneously
- [ ]  Cursor positions update in real-time
- [ ]  Notifications arrive within 1 second
- [ ]  Reconnection with exponential backoff (disconnect WiFi → reconnect)
- [ ]  No message loss on reconnect (buffered messages flush)
- [ ]  Parent-teacher messaging real-time
- [ ]  Discussion thread updates real-time
- [ ]  Load test: 100+ concurrent WebSocket connections

### Frontend Reconnection Test

```tsx
// tests/e2e/realtime.spec.ts
test('WebSocket reconnection', async () => {
  // 1. Connect to builder room
  // 2. Verify presence shows 2 users
  // 3. Simulate network disconnect (kill WS)
  // 4. Wait for reconnection (exponential backoff)
  // 5. Verify presence restored
  // 6. Verify buffered messages received
})
```

<aside>
🚪

**Gate 5:** Jika realtime tidak reliable (message loss, presence gaps) → Keep Supabase Realtime, hanya migrasi REST endpoints.

</aside>

---

# Phase 5: Storage Migration (Minggu 61-66, ~80 jam)

---

## Week 61-62: S3/MinIO Setup

### Week 61: Deploy Object Storage

```yaml
# docker-compose.yml addition
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
```

### Week 62: VIL Storage Service

```rust
// crates/services/src/storage.rs
use aws_sdk_s3::Client as S3Client;

pub struct StorageService {
    client: S3Client,
    bucket: String,
    public_url: String,  // CDN or direct S3 URL
}

impl StorageService {
    pub async fn upload(
        &self,
        path: &str,
        data: Vec<u8>,
        content_type: &str,
    ) -> Result<String, Error> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(path)
            .body(data.into())
            .content_type(content_type)
            .send()
            .await?;

        Ok(format!("{}/{}", self.public_url, path))
    }

    pub async fn delete(&self, path: &str) -> Result<(), Error> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(path)
            .send()
            .await?;
        Ok(())
    }

    pub fn get_public_url(&self, path: &str) -> String {
        format!("{}/{}", self.public_url, path)
    }

    /// Generate presigned upload URL (for direct browser upload)
    pub async fn presigned_upload(
        &self,
        path: &str,
        expires_in: Duration,
    ) -> Result<String, Error> {
        // Generate presigned PUT URL
        // Frontend uploads directly to S3 (bypasses VIL server)
    }
}
```

**Create buckets:**

- `edusync-videos` — Video uploads (HLS streaming)
- `edusync-files` — Assignment submissions, documents
- `edusync-avatars` — Profile photos
- `edusync-certificates` — Generated PDF certificates
- `edusync-scorm` — SCORM packages

---

## Week 63-64: Dual-Write Period

```rust
/// During transition: write to BOTH storages
pub async fn upload_dual(
    supabase_storage: &SupabaseStorage,
    s3_storage: &StorageService,
    bucket: &str,
    path: &str,
    data: Vec<u8>,
) -> Result<String, Error> {
    // Write to S3 (new — primary)
    let s3_url = s3_storage.upload(path, data.clone(), "application/octet-stream").await?;

    // Write to Supabase Storage (old — temporary, best-effort)
    let _ = supabase_storage.upload(bucket, path, &data).await;

    Ok(s3_url)  // Return S3 URL as canonical
}
```

---

## Week 65: Background File Migration

```bash
#!/bin/bash
# scripts/migrate-storage.sh
# Migrate ALL existing files from Supabase Storage to S3

BUCKETS=("videos" "files" "avatars" "certificates" "scorm")

for bucket in "${BUCKETS[@]}"; do
    echo "=== Migrating bucket: $bucket ==="
    
    # List all files in Supabase bucket
    supabase storage ls --bucket "$bucket" --recursive | while read file; do
        echo "  Migrating: $file"
        
        # Download from Supabase
        supabase storage download --bucket "$bucket" --path "$file" > /tmp/migrate_file
        
        # Upload to S3
        aws s3 cp /tmp/migrate_file "s3://edusync-${bucket}/${file}"
        
        # Update URL in database
        OLD_URL="https://xxx.supabase.co/storage/v1/object/public/${bucket}/${file}"
        NEW_URL="https://cdn.edusync.id/${bucket}/${file}"
        
        psql "$DATABASE_URL" -c "
            UPDATE lesson_resources SET url = '${NEW_URL}' WHERE url = '${OLD_URL}';
            UPDATE profiles SET avatar_url = '${NEW_URL}' WHERE avatar_url = '${OLD_URL}';
            UPDATE submission_files SET file_url = '${NEW_URL}' WHERE file_url = '${OLD_URL}';
        "
        
        echo "  ✅ Done: $file"
    done
done

echo "=== Migration complete ==="
```

---

## Week 66: Phase 5 Verification

### 🆕 CSP Header Update

```html
<!-- index.html — update Content-Security-Policy -->
<!-- Add S3/CDN domain to img-src and connect-src -->
<meta http-equiv="Content-Security-Policy" content="
  img-src 'self' data: blob: https://cdn.edusync.id https://api.dicebear.com;
  connect-src 'self' https://api.edusync.id wss://api.edusync.id https://cdn.edusync.id;
">
```

### Verification Checklist

- [ ]  All files migrated to S3 (count matches)
- [ ]  Supabase Storage reads disabled
- [ ]  Public URLs updated in database
- [ ]  Upload works (video, file, avatar)
- [ ]  Delete works
- [ ]  Presigned upload works (direct browser → S3)
- [ ]  CSP headers updated
- [ ]  CDN caching works
- [ ]  E2E tests pass

---

# Phase 6: Supabase Decommission (Minggu 67-72, ~50 jam)

---

## Week 67-68: Remove Supabase SDK

### Day 1: Remove from package.json

```bash
pnpm remove @supabase/supabase-js
pnpm remove supabase  # CLI devDependency
```

### Day 2-3: Remove Supabase Implementation Files

```bash
# Remove Supabase implementations (keep interfaces!)
rm src/services/api/supabaseApiClient.ts
rm src/services/auth/SupabaseAuthProvider.ts
rm src/services/realtime/SupabaseRealtimeProvider.ts
rm src/services/storage/SupabaseStorageProvider.ts
rm src/services/supabase/client.ts

# Verify no remaining imports
grep -r "supabase" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
# Should only find: references in comments, env var names, migration docs
```

### Day 4-5: Update Environment

```bash
# .env — remove Supabase vars, add VIL vars
# REMOVE:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...

# ADD/KEEP:
VITE_API_URL=https://api.edusync.id
VITE_WS_URL=wss://api.edusync.id/ws
VITE_STORAGE_URL=https://cdn.edusync.id
VITE_API_BACKEND=vil  # No longer needed but keep for safety
```

```tsx
// src/vite-env.d.ts — UPDATE
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_STORAGE_URL: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
}
```

---

## Week 69-70: Remove Edge Functions & Config

### Day 1: Remove Edge Functions

```bash
rm -rf supabase/functions/
```

### Day 2: Remove Supabase Config

```bash
rm supabase/config.toml
rm -rf supabase/.temp/
# Keep supabase/migrations/ as historical reference (or move to edusync-api/migrations/)
# Keep supabase/seed/ for reference
```

### Day 3-4: 🆕 Update Sentry

```tsx
// src/utils/sentry.ts — update DSN and configuration
// Ensure VIL API errors are captured
// Update source maps upload for new build pipeline
```

### Day 5: 🆕 Update PWA Service Worker

```tsx
// Update cache strategy for VIL API endpoints
// Old: cache Supabase API responses
// New: cache VIL API responses
// Update precache manifest
```

---

## Week 71: Database Cleanup

### Remove RLS Policies (Now Enforced in Rust)

```sql
-- For each table, drop RLS (now handled by TenantGuard + RbacGuard middleware)
-- Run AFTER verifying VIL middleware handles all access control correctly

ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_parent_links DISABLE ROW LEVEL SECURITY;
-- ... repeat for all 82+ tables with RLS

-- Remove auto_set_tenant_id triggers (now handled by VIL middleware)
-- But KEEP the functions as reference
```

### 🆕 PostgreSQL Hosting Decision

| **Option** | **Pros** | **Cons** | **Cost** |
| --- | --- | --- | --- |
| **Keep Supabase PostgreSQL** | Zero migration effort, proven reliability | Still paying Supabase, dependency remains | $25/mo (Pro) |
| **Neon** | Serverless, autoscaling, branching | Cold starts, new vendor | ~$19/mo |
| **AWS RDS** | Battle-tested, full control | More ops work, higher cost | ~$30-50/mo |
| **Self-hosted (VPS)** | Cheapest, full control | All ops on you, backup responsibility | ~$10-20/mo |

**Rekomendasi:** Keep Supabase PostgreSQL untuk 3 bulan pertama setelah decommission. Migrasi DB terakhir setelah confidence level tinggi.

---

## Week 72: Final Verification & Launch

### Final Test Suite

```bash
#!/bin/bash
# scripts/final-verification.sh

echo "=== EduSync VIL Migration — Final Verification ==="

# 1. TypeScript + Lint
echo "[1/6] Running validate..."
pnpm validate

# 2. E2E Tests
echo "[2/6] Running E2E tests..."
pnpm test:e2e

# 3. Check for Supabase remnants
echo "[3/6] Checking for Supabase references..."
SUPABASE_REFS=$(grep -r "supabase" src/ --include="*.ts" --include="*.tsx" -l | grep -v node_modules | grep -v ".d.ts" | wc -l)
if [ "$SUPABASE_REFS" -gt 0 ]; then
    echo "⚠️  WARNING: $SUPABASE_REFS files still reference 'supabase'"
    grep -r "supabase" src/ --include="*.ts" --include="*.tsx" -l | grep -v node_modules
else
    echo "✅ No Supabase references found"
fi

# 4. Load tests
echo "[4/6] Running smoke test..."
pnpm load:smoke

# 5. Stress test
echo "[5/6] Running stress test..."
k6 run tests/load/stress.js

# 6. Build
echo "[6/6] Building production bundle..."
pnpm build

echo "=== All checks passed! Migration complete! 🎉 ==="
```

### Final Checklist

| **Criteria** | **Target** | **Status** |
| --- | --- | --- |
| Zero `@supabase/supabase-js` dependency | Not in `package.json` | ⬜ |
| Zero Supabase SDK imports | No imports in `src/` | ⬜ |
| All E2E tests pass | 51/51 Playwright tests | ⬜ |
| Load tests pass | P99 < 100ms API, < 2min grading | ⬜ |
| Stress tests pass | 2000 VU, error rate < 1% | ⬜ |
| 3 dev accounts work | teacher/student/admin @[edusync.dev](http://edusync.dev) | ⬜ |
| OAuth (Google) works | Login → hash routing redirect | ⬜ |
| MFA works | TOTP enroll/verify | ⬜ |
| Realtime works | Builder presence, notifications | ⬜ |
| Storage works | Upload/download/delete via S3 | ⬜ |
| Background jobs run | Digests, analytics refresh, cleanup | ⬜ |
| LTI works | Canvas/Moodle integration | ⬜ |
| AI functions work | Tutor, grading, content gen | ⬜ |
| PDF generation works | Certificates, reports | ⬜ |
| PWA updated | Service worker caches VIL endpoints | ⬜ |
| Sentry updated | Error tracking VIL server | ⬜ |
| Documentation updated | [CLAUDE.md](http://CLAUDE.md), [AGENTS.md](http://AGENTS.md), docs/* | ⬜ |
| Observability running | Grafana dashboards, vil_otel | ⬜ |

<aside>
🎉

**Gate 6: SUCCESS!** EduSync production berjalan fully on VIL. Supabase dependency = ZERO.

**Post-launch monitoring (2 minggu):**

- Keep Supabase PostgreSQL as fallback selama 2 minggu
- Monitor error rates, latency, user complaints
- Jika stable → migrasi DB ke self-hosted/Neon (opsional)
- Celebrate! 🦀🎉
</aside>

---

## Post-Migration Benefits

| **Benefit** | **Detail** |
| --- | --- |
| **Single binary deployment** | `cargo build --release` → satu binary, deploy ke mana saja tanpa runtime dependency |
| **6 Grafana dashboards** | Built-in VIL observability — request rate, latency, error rate, DB connections, memory, CPU |
| **Cost reduction** | ~$20/mo VPS vs $25/mo Supabase Pro + Edge Function limits + connection pooling limits |
| **Performance** | ~41K req/s vs ~500-2K req/s (Supabase Edge Functions) |
| **Dogfooding complete** | [vastar.id](http://vastar.id) platform built with VIL — strongest proof that the curriculum works |
| **AI crate ecosystem** | 51 AI crates ready for v2 features (AI Tutor improvements, code review, plagiarism v2) |
| **Full control** | No vendor lock-in, no rate limits, no pricing surprises |