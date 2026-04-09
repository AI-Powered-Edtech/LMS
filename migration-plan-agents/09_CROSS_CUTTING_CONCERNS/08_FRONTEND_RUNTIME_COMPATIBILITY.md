# CC8: Frontend Runtime Compatibility

**Started:** Phase 1  
**Duration:** Phase 1-6  
**Owner:** Frontend

## Tujuan

Memastikan frontend compatibility sepanjang migration dengan per-flow cutover matrix dan React Query parity.

## Per-Flow Cutover Matrix

| Flow          | Phase | VIL Endpoint         | Feature Flag       | Rollback         |
| ------------- | ----- | -------------------- | ------------------ | ---------------- |
| Auth Login    | 1     | POST /auth/login     | `use_vil_auth`     | Nginx → Supabase |
| Course List   | 2     | GET /courses         | `use_vil_courses`  | Supabase API     |
| Course Detail | 2     | GET /courses/:id     | `use_vil_courses`  | Supabase API     |
| Lesson View   | 2     | GET /lessons/:id     | `use_vil_lessons`  | Supabase API     |
| Quiz Submit   | 2     | POST /quiz/submit    | `use_vil_quiz`     | Supabase Edge Fn |
| AI Tutor      | 3     | POST /ai/tutor       | `use_vil_ai`       | Supabase Edge Fn |
| Notifications | 4     | WS /ws/notifications | `use_vil_realtime` | Polling fallback |
| File Upload   | 5     | POST /storage/upload | `use_vil_storage`  | Supabase Storage |

## Feature Flags

```typescript
// Feature flags configuration
const FEATURE_FLAGS = {
  use_vil_auth: false,
  use_vil_courses: false,
  use_vil_lessons: false,
  use_vil_quiz: false,
  use_vil_ai: false,
  use_vil_realtime: false,
  use_vil_storage: false,
}

// Override from localStorage for testing
if (localStorage.getItem('ff_override')) {
  Object.assign(FEATURE_FLAGS, JSON.parse(localStorage.getItem('ff_override')))
}
```

## React Query Parity Checklist

```typescript
// React Query key factory must remain unchanged
export const queryKeys = {
  courses: {
    all: ['courses'] as const,
    lists: () => [...queryKeys.courses.all, 'list'] as const,
    list: (filters: CourseFilters) => [...queryKeys.courses.lists(), filters] as const,
    details: () => [...queryKeys.courses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.courses.details(), id] as const,
  },
  // ... other entities
}
```

Parity requirements:

- Query keys unchanged
- Return types identical
- Error shapes match PostgREST format
- Stale times preserved
- Invalidation behavior same

## Privileged Operations

Operations requiring special handling:

| Operation          | Privilege     | Migration Path              |
| ------------------ | ------------- | --------------------------- |
| Tenant switch      | Admin         | Dual-write to both backends |
| User role change   | Admin         | VIL only after Phase 1      |
| Course publish     | Teacher       | VIL only after Phase 2      |
| Quiz create        | Teacher       | VIL only after Phase 2      |
| Student enrollment | Teacher/Admin | VIL only after Phase 2      |

## PWA Migration

Service worker updates:

```javascript
// PWA service worker - handle VIL backend
const VIL_API = 'https://vil.edusync.internal'
const SUPABASE_API = 'https://xxx.supabase.co'

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request))
  }
})

async function handleApiRequest(request) {
  const flag = await getFeatureFlag('use_vil_api')
  const target = flag ? VIL_API : SUPABASE_API

  return fetch(`${target}${new URL(request.url).pathname}`, {
    ...request,
    headers: { ...request.headers, 'X-Request-ID': generateRequestId() },
  })
}
```

## Frontend↔Backend Observability Correlation

Request ID propagation:

```typescript
// Add X-Request-ID to all API requests
const apiClient = createApiClient({
  baseURL: API_BASE,
  hooks: {
    onRequest: (config) => {
      config.headers['X-Request-ID'] = generateUUID()
      return config
    },
  },
})
```

Correlation flow:

1. Frontend generates request ID
2. Sent as `X-Request-ID` header
3. Backend logs with request ID
4. Frontend error logs include request ID
5. Trace viewer shows full request lifecycle

## Implementation Steps

### Phase 1 (Week 11-22)

1. Setup feature flags system
2. Implement VIL auth in frontend
3. Add request ID tracking

### Phase 2 (Week 23-36)

1. Per-flow feature flags
2. React Query parity verification
3. Course/Lesson cutover

### Phase 3 (Week 37-44)

1. Quiz cutover
2. AI service cutover

### Phase 4-5 (Week 45-58)

1. Realtime cutover
2. Storage cutover

### Phase 6 (Week 59-72)

1. Final frontend cleanup
2. Remove Supabase abstraction
3. PWA service worker final update

## Cutover Rehearsal Playbook

Before each gate:

1. Seeded staging (`supabase db reset` + `seed.sql`)
2. Dual-run verification
3. Per-flow cutover test
4. Rollback rehearsal
5. Load comparison (k6)
6. Auth cycle test
7. Offline replay test

## Exit Criteria

- [ ] Feature flags system functional
- [ ] Per-flow cutover working
- [ ] React Query parity confirmed
- [ ] All privileged operations handled
- [ ] PWA service worker updated
- [ ] Frontend↔Backend correlation working

## Referensi

- Related: [03_STAGING_ENVIRONMENT.md](./03_STAGING_ENVIRONMENT.md) untuk staging environment
- Related: [06_OFFLINE_QUEUE_SEMANTICS.md](./06_OFFLINE_QUEUE_SEMANTICS.md) untuk offline handling
- Contract 6 di main plan document
