# CC8: Frontend Runtime Compatibility

**Started:** Phase 1  
**Duration:** Phase 1-6  
**Owner:** Frontend

## Tujuan

Memastikan frontend compatibility sepanjang migration dengan per-flow cutover matrix dan React Query parity.

## Current Frontend Facts

These facts come from the existing codebase (`CLAUDE.md`):

- **Framework:** React 19 + Vite 6 + TypeScript 5.8 + Tailwind CSS v4
- **Routing:** React Router v7 with `HashRouter` — all links use `/#/` prefix
- **Server state:** React Query v5
- **Local state:** Zustand v5 (quiz player only)
- **Auth:** Supabase JS v2 (`useAuth()` hook returns `{ user, profile, role, tenantId }`)
- **Route prefixes:** `/#/app/student/...`, `/#/app/teacher/...`, `/#/app/admin/...`
- **Language:** All user-visible text in Bahasa Indonesia

## Hash Routing Compatibility

The frontend uses `HashRouter` from React Router v7. The VIL backend never sees the hash fragment (`/#/...`) because browsers do not send it to the server. This means:

1. VIL only serves the static SPA bundle at `/` (or `/index.html`)
2. All client-side routing happens in the browser via hash changes
3. VIL API endpoints live under `/api/...` — no collision with hash routes
4. No server-side route rewriting needed (unlike `BrowserRouter` which requires catch-all)

**VIL static file serving:**

```rust
// vil-backend/src/main.rs — serve SPA
use axum::routing::get_service;
use tower_http::services::{ServeDir, ServeFile};

let spa = get_service(
    ServeDir::new("static/dist")
        .not_found_service(ServeFile::new("static/dist/index.html"))
);

let app = Router::new()
    .nest("/api", api_routes())
    .fallback_service(spa);  // all non-/api paths serve SPA
```

## CORS Configuration for VIL Backend

During migration, the frontend may call both Supabase and VIL endpoints. VIL must allow cross-origin requests from the dev and production origins.

**File:** `vil-backend/src/main.rs`

```rust
use axum::http::{HeaderName, HeaderValue, Method};
use tower_http::cors::CorsLayer;

fn cors_layer() -> CorsLayer {
    let origins = [
        "http://localhost:5173",         // Vite dev server
        "http://localhost:4173",         // Vite preview
        "https://app.edusync.id",        // Production
        "https://staging.edusync.id",    // Staging
    ];

    CorsLayer::new()
        .allow_origin(
            origins
                .iter()
                .map(|o| o.parse::<HeaderValue>().unwrap())
                .collect::<Vec<_>>(),
        )
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("authorization"),
            HeaderName::from_static("idempotency-key"),
            HeaderName::from_static("x-request-id"),
            HeaderName::from_static("x-conflict-resolution"),
            HeaderName::from_static("x-tenant-id"),
        ])
        .expose_headers([
            HeaderName::from_static("x-request-id"),
            HeaderName::from_static("x-idempotent-replay"),
        ])
        .allow_credentials(true)
        .max_age(std::time::Duration::from_secs(3600))
}

// Apply to router
let app = Router::new()
    .nest("/api", api_routes())
    .fallback_service(spa)
    .layer(cors_layer());
```

## CSP Header Configuration

Match the current Vite development security model. In production, VIL serves these headers:

**File:** `vil-backend/src/middleware/security_headers.rs`

```rust
use axum::{http::Request, middleware::Next, response::Response};

pub async fn security_headers(
    req: Request<axum::body::Body>,
    next: Next,
) -> Response {
    let mut resp = next.run(req).await;
    let headers = resp.headers_mut();

    // CSP — allow Supabase origins during migration, tighten in Phase 6
    headers.insert(
        "content-security-policy",
        concat!(
            "default-src 'self'; ",
            "script-src 'self' 'unsafe-inline'; ",          // Vite injects inline scripts
            "style-src 'self' 'unsafe-inline'; ",            // Tailwind
            "img-src 'self' data: blob: https://*.supabase.co; ",
            "font-src 'self'; ",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com; ",
            "frame-src 'self' blob:; ",                      // SCORM iframes
            "worker-src 'self' blob:; ",                     // Service worker
            "media-src 'self' blob:; ",
        ).parse().unwrap(),
    );

    headers.insert("x-content-type-options", "nosniff".parse().unwrap());
    headers.insert("x-frame-options", "SAMEORIGIN".parse().unwrap());
    headers.insert("referrer-policy", "strict-origin-when-cross-origin".parse().unwrap());

    resp
}
```

## Feature Flag System for Per-Flow Cutover

Feature flags control which backend each API call uses. Flags are stored in a TypeScript config and can be overridden per-user via `localStorage` for testing.

**File:** `src/config/backendFlags.ts`

```typescript
/**
 * Backend routing flags.
 * Each flow points to either 'supabase' (current) or 'vil' (migrated).
 * Flip one flag at a time per the cutover matrix.
 */
export type BackendTarget = 'supabase' | 'vil';

const BACKEND_FLAGS: Record<string, BackendTarget> = {
  auth:           'supabase',  // Phase 1: flip to 'vil'
  courses:        'supabase',  // Phase 2
  lessons:        'supabase',  // Phase 2
  quizzes:        'supabase',  // Phase 2
  ai_tutor:       'supabase',  // Phase 3
  ai_essay:       'supabase',  // Phase 3
  ai_content:     'supabase',  // Phase 3
  notifications:  'supabase',  // Phase 4
  storage:        'supabase',  // Phase 5
};

/**
 * Get the backend target for a flow.
 * Checks localStorage override first (for per-user testing).
 */
export function getBackendTarget(flow: string): BackendTarget {
  // Check localStorage override
  try {
    const overrides = localStorage.getItem('backend_flag_overrides');
    if (overrides) {
      const parsed = JSON.parse(overrides) as Record<string, BackendTarget>;
      if (parsed[flow]) return parsed[flow];
    }
  } catch {
    // Ignore parse errors
  }

  return BACKEND_FLAGS[flow] ?? 'supabase';
}

/**
 * Set a localStorage override for testing.
 * Usage in browser console: setBackendOverride('courses', 'vil')
 */
export function setBackendOverride(flow: string, target: BackendTarget): void {
  try {
    const current = JSON.parse(localStorage.getItem('backend_flag_overrides') ?? '{}');
    current[flow] = target;
    localStorage.setItem('backend_flag_overrides', JSON.stringify(current));
    console.log(`Backend flag: ${flow} -> ${target}. Reload to apply.`);
  } catch {
    console.error('Failed to set backend override');
  }
}

// Expose for browser console testing
if (typeof window !== 'undefined') {
  (window as Record<string, unknown>).__setBackendOverride = setBackendOverride;
}
```

### Using Feature Flags in React Query Hooks

**File:** `src/features/courses/queries/useCourses.ts` (example pattern)

```typescript
import { useQuery } from '@tanstack/react-query';
import { getBackendTarget } from '@/config/backendFlags';
import { supabase } from '@/services/supabase/client';
import { vilClient } from '@/services/vil/client';

export function useCourses(filters: CourseFilters) {
  const backend = getBackendTarget('courses');

  return useQuery({
    // Query key is UNCHANGED — same cache regardless of backend
    queryKey: ['courses', 'list', filters],
    queryFn: async () => {
      if (backend === 'vil') {
        const { data } = await vilClient.get('/api/courses', { params: filters });
        return data;
      }
      // Supabase path (current)
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, status, created_at')
        .match(filters);
      if (error) throw error;
      return data;
    },
  });
}
```

## Per-Flow Cutover Matrix

| Flow           | Phase | VIL Endpoint          | Feature Flag      | Rollback Plan              |
| -------------- | ----- | --------------------- | ----------------- | -------------------------- |
| Auth Login     | 1     | POST /api/auth/login  | `auth`            | Flip flag back to supabase |
| Course List    | 2     | GET /api/courses      | `courses`         | Flip flag back to supabase |
| Course Detail  | 2     | GET /api/courses/:id  | `courses`         | Flip flag back to supabase |
| Lesson View    | 2     | GET /api/lessons/:id  | `lessons`         | Flip flag back to supabase |
| Quiz Submit    | 2     | POST /api/quiz/submit | `quizzes`         | Flip flag back to supabase |
| AI Tutor       | 3     | POST /api/ai/tutor    | `ai_tutor`        | Flip flag back to supabase |
| AI Essay       | 3     | POST /api/ai/essay    | `ai_essay`        | Flip flag back to supabase |
| Notifications  | 4     | WS /ws/notifications  | `notifications`   | Flip flag back to supabase |
| File Upload    | 5     | POST /api/storage     | `storage`         | Flip flag back to supabase |

## React Query Parity Checklist

When migrating a flow to VIL, the React Query contract must remain identical:

```typescript
// Query key factory — MUST NOT CHANGE during migration
export const queryKeys = {
  courses: {
    all: ['courses'] as const,
    lists: () => [...queryKeys.courses.all, 'list'] as const,
    list: (filters: CourseFilters) => [...queryKeys.courses.lists(), filters] as const,
    details: () => [...queryKeys.courses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.courses.details(), id] as const,
  },
  quizzes: {
    all: ['quizzes'] as const,
    detail: (id: string) => [...queryKeys.quizzes.all, id] as const,
    attempt: (id: string) => [...queryKeys.quizzes.all, 'attempt', id] as const,
  },
  lessons: {
    all: ['lessons'] as const,
    detail: (id: string) => [...queryKeys.lessons.all, id] as const,
  },
};
```

Parity requirements for each migrated flow:

- Query keys unchanged (same cache key = seamless cutover)
- Return types identical (TypeScript interfaces preserved)
- Error shapes match PostgREST format (`{ message, code, details }`)
- Stale times preserved (no React Query config changes)
- Invalidation behavior same (same `queryClient.invalidateQueries` calls)

## VIL API Client

**File:** `src/services/vil/client.ts`

```typescript
import axios from 'axios';
import { supabase } from '@/services/supabase/client';

const VIL_BASE_URL = import.meta.env.VITE_VIL_API_URL ?? 'http://localhost:3001';

export const vilClient = axios.create({
  baseURL: VIL_BASE_URL,
  timeout: 30_000,
  withCredentials: true,
});

// Attach auth token from Supabase session (during migration)
vilClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  // Request ID for observability correlation
  config.headers['X-Request-Id'] = crypto.randomUUID();
  return config;
});

// Transform errors to match PostgREST shape
vilClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      throw {
        message: error.response.data?.message ?? 'Unknown error',
        code: error.response.data?.code ?? String(error.response.status),
        details: error.response.data?.details ?? null,
        status: error.response.status,
      };
    }
    throw { message: 'Network error', code: '0', details: null, status: 0 };
  },
);
```

## Frontend-Backend Observability Correlation

```typescript
// Already wired in vilClient interceptor above.
// For Supabase calls, add via React Query's queryFn wrapper:
function withRequestId<T>(fn: () => Promise<T>): Promise<T> {
  const requestId = crypto.randomUUID();
  // Log for frontend correlation
  console.debug(`[API] request=${requestId}`);
  return fn();
}
```

Correlation flow:

1. Frontend generates `X-Request-Id` UUID
2. Sent as header on every API call
3. VIL logs with `request_id` field via `tracing`
4. Frontend error logs include request ID
5. Grafana trace viewer shows full request lifecycle

## Implementation Steps

### Phase 1 (Week 11-22)

1. Create `src/config/backendFlags.ts` with all flags set to `'supabase'`
2. Create `src/services/vil/client.ts` with auth token forwarding
3. Add `VITE_VIL_API_URL` to `.env` files
4. Add `X-Request-Id` header to Supabase fetch wrapper

### Phase 2 (Week 23-36)

1. Flip `courses` and `lessons` flags to `'vil'` after VIL endpoints pass parity tests
2. Update React Query hooks to use dual-backend pattern (example above)
3. Run k6 load comparison: Supabase vs VIL for same queries

### Phase 3 (Week 37-44)

1. Flip `quizzes`, `ai_tutor`, `ai_essay`, `ai_content` flags
2. Verify circuit breaker fallbacks work through feature flag path

### Phase 4-5 (Week 45-58)

1. Flip `notifications` (WebSocket) and `storage` flags
2. Test PWA offline queue with VIL sync endpoint

### Phase 6 (Week 59-72)

1. Remove Supabase code paths from all hooks
2. Remove feature flag conditionals (all flows on VIL)
3. Remove `supabase-js` dependency
4. Tighten CSP: remove `*.supabase.co` from `connect-src`

## Cutover Rehearsal Playbook

Before each phase gate:

1. Seed staging: `supabase db reset && psql < seed.sql`
2. Dual-run: both backends serve same traffic, compare response bodies
3. Flip flag for one flow, run automated tests
4. Rollback: flip flag back, verify no data loss
5. Load comparison: `k6 run --vus 50 --duration 60s cutover-test.js`
6. Auth cycle: login, navigate, logout, login again
7. Offline replay: queue 10 operations offline, reconnect, verify all sync

## Verification Commands

```bash
# 1. Verify backendFlags.ts compiles
npx tsc --noEmit src/config/backendFlags.ts

# 2. Verify VIL client compiles
npx tsc --noEmit src/services/vil/client.ts

# 3. Check CORS from dev server
curl -sI -X OPTIONS http://localhost:3001/api/courses \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control

# 4. Verify CSP header
curl -sI http://localhost:3001/ | grep content-security-policy

# 5. Verify feature flag override works (browser console)
# window.__setBackendOverride('courses', 'vil')
# localStorage.getItem('backend_flag_overrides')

# 6. Check VIL health
curl -s http://localhost:3001/health | jq .

# 7. Verify React Query keys are unchanged after migration
# Run existing tests — if query keys changed, cache would break
pnpm test -- --grep "query" 2>&1 | tail -5
```

## Exit Criteria

- [ ] Feature flag system functional with localStorage override
- [ ] Per-flow cutover working for all flows in the matrix
- [ ] React Query parity confirmed (keys, types, errors, stale times unchanged)
- [ ] VIL CORS allows dev and production origins
- [ ] CSP headers match current security posture
- [ ] VIL client forwards Supabase auth tokens during migration
- [ ] `X-Request-Id` propagated on all API calls for observability
- [ ] Cutover rehearsal completed for at least one flow

## Referensi

- Related: [03_STAGING_ENVIRONMENT.md](./03_STAGING_ENVIRONMENT.md) untuk staging environment
- Related: [06_OFFLINE_QUEUE_SEMANTICS.md](./06_OFFLINE_QUEUE_SEMANTICS.md) untuk offline handling
- Related: [05_GRACEFUL_DEGRADATION.md](./05_GRACEFUL_DEGRADATION.md) untuk error handling
- Contract 6 di main plan document
