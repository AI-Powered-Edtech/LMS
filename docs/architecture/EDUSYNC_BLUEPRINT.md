# EduSync LMS — Architecture Blueprint

## Current State Summary

| Dimension | Status | Maturity |
|-----------|--------|----------|
| Database schema | 157 migrations (001–825), RLS, multi-tenant | Production-ready |
| Migration safety | All migrations idempotent, schema verified | Production-ready |
| Auth + Invite flow | 3-guard chain, Google OAuth, class join-code flow | Production-ready |
| Service layer | Feature-module services + legacy services coexist | In consolidation |
| Feature modules | Quizzes, Analytics, Gamification, Guidance, Struggle | Mostly modular |
| AI Tutor | Groq edge function (ai-tutor), sessions, rate limiting | MVP functional |
| State management | AuthContext + React Query + Zustand (stores per feature) | Improving |
| Performance | Lazy loading in routes, code splitting active | Improving |
| Testing | Vitest + Playwright setup, minimal coverage | Needs work |

---

## 1. Target Folder Structure

Current structure is good. The goal is to migrate everything to the **feature module pattern** that quizzes already demonstrates.

```
src/
├── app/                          # Bootstrap — KEEP AS-IS
│   ├── providers.tsx             # QueryClientProvider wrapper
│   ├── queryClient.ts            # React Query config
│   └── routes.tsx                # ← NEW: extract routes from App.tsx
│
├── components/                   # Shared UI components only
│   ├── guards/                   # Auth/Tenant/Role guards — KEEP
│   ├── layout/                   # Layout, Header, Sidebar — KEEP
│   └── ui/                       # ← NEW: reusable primitives
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── DataTable.tsx         # Virtualized table (TanStack Table)
│       ├── InfiniteList.tsx      # Virtualized infinite scroll
│       └── EmptyState.tsx
│
├── config/                       # — KEEP AS-IS
├── constants/                    # — KEEP AS-IS
│
├── contexts/                     # REDUCE: only truly global state
│   ├── AuthContext.tsx           # KEEP — auth + tenant + roles
│   ├── ThemeContext.tsx          # KEEP — light/dark
│   └── ToastContext.tsx          # KEEP — notifications UI
│   # DELETE: ClassroomContext, CalendarContext, GradebookContext,
│   #         StudentProgressContext, CommentContext, BuilderContext,
│   #         ModerationContext, ModuleConfigContext
│   # These move to feature-level Zustand stores or React Query
│
├── domain/                       # Domain models — KEEP & EXPAND
│   ├── course/
│   ├── lesson/
│   ├── module/
│   ├── block/
│   ├── enrollment/               # ← NEW
│   ├── quiz/                     # ← NEW (move from features/quizzes/types)
│   └── user/                     # ← NEW
│
├── features/                     # Feature modules — PRIMARY ORGANIZATION
│   ├── quizzes/                  # ✅ DONE — exemplar pattern
│   │   ├── api/                  # Service calls
│   │   ├── components/           # Feature UI
│   │   ├── hooks/                # Feature hooks
│   │   ├── queries/              # React Query hooks + mutations
│   │   ├── store/                # Zustand store
│   │   ├── types/                # TypeScript types
│   │   └── utils/                # Feature utilities
│   │
│   ├── courses/                  # ← MIGRATE from pages + services
│   │   ├── api/
│   │   │   ├── courseService.ts
│   │   │   └── enrollmentService.ts
│   │   ├── components/
│   │   │   ├── CourseCard.tsx
│   │   │   ├── CourseCatalog.tsx
│   │   │   └── CourseDetail.tsx
│   │   ├── queries/
│   │   │   ├── courseQueries.ts
│   │   │   └── enrollmentQueries.ts
│   │   └── types/
│   │
│   ├── lessons/                  # ← MIGRATE from LessonViewer
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── LessonSidebar.tsx
│   │   │   ├── ArticleViewer.tsx
│   │   │   ├── VideoViewer.tsx
│   │   │   └── ProgressReporter.tsx
│   │   ├── queries/
│   │   └── store/                # Viewer state (replaces useViewerReducer)
│   │
│   ├── course-builder/           # ← MIGRATE from pages/CourseBuilder
│   │   ├── api/
│   │   │   ├── courseService.ts
│   │   │   ├── moduleService.ts
│   │   │   ├── lessonService.ts
│   │   │   └── blockService.ts
│   │   ├── components/
│   │   ├── queries/
│   │   ├── store/                # Builder state (replaces BuilderContext)
│   │   └── types/
│   │
│   ├── ai-tutor/                 # ← MIGRATE from services + components
│   │   ├── api/
│   │   │   ├── aiTutorService.ts
│   │   │   └── aiPromptBuilder.ts
│   │   ├── components/
│   │   │   ├── AITutorPanel.tsx
│   │   │   ├── AITutorInput.tsx
│   │   │   └── AITutorTyping.tsx
│   │   ├── hooks/
│   │   │   └── useAISession.ts
│   │   ├── store/
│   │   │   └── aiTutorStore.ts   # Session state (replaces localStorage)
│   │   └── types/
│   │
│   ├── gradebook/                # ← MIGRATE from pages + GradebookContext
│   │   ├── api/
│   │   ├── components/
│   │   ├── queries/
│   │   └── store/                # Replaces GradebookContext
│   │
│   ├── analytics/                # ← MIGRATE from pages + services
│   │   ├── api/
│   │   ├── components/
│   │   └── queries/
│   │
│   ├── classroom/                # ← MIGRATE from ClassroomContext + services
│   │   ├── api/
│   │   ├── components/
│   │   ├── queries/
│   │   └── store/                # Replaces ClassroomContext
│   │
│   ├── gamification/             # ← MIGRATE
│   │   ├── api/
│   │   ├── components/
│   │   └── queries/
│   │
│   ├── social/                   # Forum, discussions, comments
│   │   ├── api/
│   │   ├── components/
│   │   └── queries/
│   │
│   ├── admin/                    # Admin features
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/                # Admin sub-pages
│   │   └── queries/
│   │
│   └── notifications/            # ← MIGRATE from NotificationContext
│       ├── api/
│       ├── components/
│       └── store/                # Replaces NotificationContext
│
├── hooks/                        # Shared hooks (cross-feature)
│   ├── useDebounce.ts
│   ├── usePagination.ts
│   └── useMediaQuery.ts
│
├── lib/                          # External library wrappers
│   └── supabase.ts               # Re-export from services/supabase/client
│
├── pages/                        # THIN route handlers only
│   ├── Dashboard.tsx             # import { StudentDashboard } from '@/features/...'
│   ├── TeacherDashboard.tsx
│   ├── Login.tsx                 # Auth pages stay here
│   ├── VerifyEmail.tsx
│   └── ...                       # Each page = <Feature Component /> wrapper
│
├── services/                     # DEPRECATE — move to features/*/api/
│   └── supabase/                 # KEEP — shared Supabase client
│       ├── client.ts
│       ├── auth.ts
│       └── realtime.ts
│
└── utils/                        # Shared utilities — KEEP
    ├── cn.ts
    └── useTenantQuery.ts
```

### Migration Strategy (Incremental)

Do NOT rewrite everything at once. Migrate feature-by-feature:

| Phase | Feature | Effort | Priority |
|-------|---------|--------|----------|
| 0 | Extract routes → `app/routes.tsx` | S | High |
| 1 | Courses + Enrollment | M | High |
| 2 | Lessons + Progress | M | High |
| 3 | Course Builder | L | Medium |
| 4 | AI Tutor | M | Medium |
| 5 | Gradebook | M | Medium |
| 6 | Analytics | S | Low |
| 7 | Classroom | S | Low |
| 8 | Social / Forum | S | Low |
| 9 | Admin | M | Low |
| 10 | Gamification | S | Low |

Each phase:
1. Create `features/{name}/` structure
2. Move services → `features/{name}/api/`
3. Create React Query hooks → `features/{name}/queries/`
4. Move components → `features/{name}/components/`
5. Replace Context with Zustand store if needed
6. Update page imports
7. Delete old service files

---

## 2. Service Layer Architecture

### Current Problem

Three calling patterns coexist:

```
Pattern A: Component → supabase.from() directly    (legacy)
Pattern B: Component → service.fetchX()             (intermediate)
Pattern C: Component → useQuery(queryKey, service)   (target)
```

### Target Pattern

Every data interaction follows this pipeline:

```
Component
  → React Query hook (useQuery / useMutation)
    → Service function (pure async, no React)
      → Supabase client (.from() or .rpc())
        → PostgreSQL (RLS enforced)
```

### Service Layer Contract

```typescript
// features/courses/api/courseService.ts
// Pure functions. No React. No state. No side effects.
// Input: primitives + tenantId. Output: typed data or throw.

export const courseService = {
  list: async (tenantId: string, filters?: CourseFilters): Promise<Course[]> => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, status, subject, level, created_by, published_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toCourse); // domain mapper
  },

  getById: async (courseId: string, tenantId: string): Promise<CourseDetail> => { ... },
  create: async (input: CreateCourseInput, tenantId: string): Promise<Course> => { ... },
  publish: async (courseId: string, tenantId: string): Promise<void> => { ... },
};
```

### React Query Layer

```typescript
// features/courses/queries/courseQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService } from '../api/courseService';
import { useAuth } from '@/contexts/AuthContext';

const courseKeys = {
  all:     (tenantId: string) => ['courses', tenantId] as const,
  list:    (tenantId: string, filters?: CourseFilters) =>
                [...courseKeys.all(tenantId), 'list', filters] as const,
  detail:  (tenantId: string, courseId: string) =>
                [...courseKeys.all(tenantId), courseId] as const,
};

export function useCourses(filters?: CourseFilters) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: courseKeys.list(tenantId!, filters),
    queryFn: () => courseService.list(tenantId!, filters),
    enabled: !!tenantId,
  });
}

export function usePublishCourse() {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => courseService.publish(courseId, tenantId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all(tenantId!) }),
  });
}
```

### When to Use What

| Tool | Use Case |
|------|----------|
| React Query | Server data (courses, users, grades, progress) |
| Zustand | Complex client state (quiz player, course builder, AI chat session) |
| Context | Auth/Theme/Toast only (truly app-global, rarely changes) |
| localStorage | Tenant hint, pending invite token only |

---

## 3. Modular LMS Feature System

### Module Registry Pattern

EduSync already has `public.modules` (feature modules) and `tenant_modules` (per-tenant activation). Extend this to the frontend.

```typescript
// src/config/moduleRegistry.ts
import { lazy } from 'react';

export interface FeatureModule {
  slug: string;
  name: string;
  icon: string;
  routes: RouteConfig[];
  navItems: NavItem[];
  // Lazy-loaded entry point
  component: React.LazyExoticComponent<any>;
}

export const moduleRegistry: Record<string, FeatureModule> = {
  'quiz-engine': {
    slug: 'quiz-engine',
    name: 'Quiz Engine',
    icon: 'ClipboardCheck',
    component: lazy(() => import('@/features/quizzes/QuizModule')),
    routes: [
      { path: 'quizzes', roles: ['student'] },
      { path: 'quiz-manager', roles: ['teacher', 'admin'] },
      { path: 'question-bank', roles: ['teacher', 'admin'] },
    ],
    navItems: [
      { label: 'Kuis Saya', path: '/app/student/quizzes', roles: ['student'] },
      { label: 'Kelola Kuis', path: '/app/teacher/quiz-manager', roles: ['teacher'] },
    ],
  },
  'ai-tutor': {
    slug: 'ai-tutor',
    name: 'AI Tutor',
    icon: 'Bot',
    component: lazy(() => import('@/features/ai-tutor/AITutorModule')),
    routes: [/* ... */],
    navItems: [/* ... */],
  },
  'gamification': {
    slug: 'gamification',
    name: 'Gamification',
    icon: 'Trophy',
    component: lazy(() => import('@/features/gamification/GamificationModule')),
    routes: [/* ... */],
    navItems: [/* ... */],
  },
  // ... etc
};
```

### Tenant-Aware Module Loading

```typescript
// src/hooks/useEnabledModules.ts
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { moduleRegistry } from '@/config/moduleRegistry';

export function useEnabledModules() {
  const { tenantId } = useAuth();

  const { data: enabledSlugs = [] } = useQuery({
    queryKey: ['tenant-modules', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_modules')
        .select('modules(slug)')
        .eq('tenant_id', tenantId!)
        .eq('is_enabled', true);
      return data?.map((d: any) => d.modules?.slug).filter(Boolean) ?? [];
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 min — modules rarely change
  });

  return enabledSlugs
    .map(slug => moduleRegistry[slug])
    .filter(Boolean);
}
```

### Dynamic Route Generation

```typescript
// src/app/routes.tsx
import { Suspense } from 'react';
import { useEnabledModules } from '@/hooks/useEnabledModules';
import { AppLoading } from '@/components/layout/AppLoading';

export function DynamicFeatureRoutes() {
  const modules = useEnabledModules();

  return modules.flatMap(mod =>
    mod.routes.map(route => (
      <Route
        key={`${mod.slug}-${route.path}`}
        path={route.path}
        element={
          <RoleGuard allowedRoles={route.roles}>
            <Suspense fallback={<AppLoading />}>
              <mod.component />
            </Suspense>
          </RoleGuard>
        }
      />
    ))
  );
}
```

### Dynamic Sidebar

```typescript
// In Sidebar.tsx
const modules = useEnabledModules();
const { role } = useAuth();

const dynamicNavItems = modules
  .flatMap(mod => mod.navItems)
  .filter(item => item.roles.includes(role));
```

This gives you:
- Admin enables "AI Tutor" for Tenant A → sidebar shows AI Tutor nav, routes load
- Admin disables "Gamification" for Tenant B → no nav item, routes return 404
- New feature module = add to registry + create feature folder. Zero changes to Layout/Router

---

## 4. AI Tutor Integration Architecture

### Current State

```
Frontend (AITutorPanel)
  → aiTutorService.askTutor()
    → supabase.functions.invoke('ai-tutor')
      → Groq API (llama-3.1-70b-versatile)
      → Session management (ai_tutor_sessions)
      → Interaction logging (ai_tutor_interactions)
      → Rate limiting (ai_tutor_rate_limits)
```

### Target Architecture (Production Scale)

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│                                                  │
│  AITutorPanel ←→ Zustand Store ←→ React Query    │
│       │              │                           │
│       ▼              ▼                           │
│  aiTutorService   Session Cache                  │
│       │          (in-memory)                     │
│       ▼                                          │
└───────┼──────────────────────────────────────────┘
        │ supabase.functions.invoke('ai-tutor')
        ▼
┌─────────────────────────────────────────────────┐
│              EDGE FUNCTION LAYER                 │
│                                                  │
│  ┌──────────────────────────────────────┐        │
│  │         ai-tutor/index.ts            │        │
│  │                                      │        │
│  │  1. Auth check (JWT)                 │        │
│  │  2. Rate limit check (per-minute +   │        │
│  │     daily, per-tenant)               │        │
│  │  3. Cache lookup (semantic search)   │──┐     │
│  │  4. Context assembly                 │  │     │
│  │  5. LLM call                         │  │     │
│  │  6. Response + async logging         │  │     │
│  └──────────────────────────────────────┘  │     │
│                    │                       │     │
│                    ▼                       │     │
│  ┌─────────────────────────┐               │     │
│  │   LLM Provider Router   │◄──────────────┘     │
│  │                         │                     │
│  │  Primary: Groq          │                     │
│  │  Fallback: OpenAI       │                     │
│  │  Cost cap: per-tenant   │                     │
│  └─────────────────────────┘                     │
└──────────────────┼───────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│                  DATABASE                        │
│                                                  │
│  ai_tutor_sessions     (conversation state)      │
│  ai_tutor_messages     (message history)         │
│  ai_tutor_cache        (semantic cache, pgvector)│
│  ai_tutor_rate_limits  (per-user throttle)       │
│  ai_tutor_interactions (analytics/billing)       │
│  ai_tutor_feedback     (quality signal)          │
└─────────────────────────────────────────────────┘
```

### Key Improvements for Production

#### 4a. LLM Provider Fallback Chain

```typescript
// supabase/functions/ai-tutor/llm-router.ts
interface LLMProvider {
  name: string;
  call: (messages: Message[], model: string) => Promise<string>;
  isAvailable: () => Promise<boolean>;
}

const providers: LLMProvider[] = [
  { name: 'groq', call: callGroq, isAvailable: checkGroq },
  { name: 'openai', call: callOpenAI, isAvailable: checkOpenAI },
];

export async function routeLLMCall(messages: Message[]): Promise<LLMResponse> {
  for (const provider of providers) {
    try {
      if (await provider.isAvailable()) {
        const response = await provider.call(messages, getModel(provider.name));
        return { text: response, provider: provider.name };
      }
    } catch (e) {
      console.error(`${provider.name} failed, trying next...`);
      continue;
    }
  }
  throw new Error('All LLM providers unavailable');
}
```

#### 4b. Semantic Cache with pgvector

Already partially implemented. To make it production-grade:

```sql
-- Similarity search for cached answers
CREATE OR REPLACE FUNCTION search_tutor_cache(
  p_tenant_id uuid,
  p_course_id uuid,
  p_embedding vector(768),
  p_threshold float DEFAULT 0.85
)
RETURNS TABLE(answer text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT answer, 1 - (question_embedding <=> p_embedding) AS similarity
  FROM ai_tutor_cache
  WHERE tenant_id = p_tenant_id
    AND course_id = p_course_id
    AND 1 - (question_embedding <=> p_embedding) > p_threshold
  ORDER BY question_embedding <=> p_embedding
  LIMIT 1;
$$;
```

Cache hit = skip LLM call entirely = ~0 cost, ~50ms response.

#### 4c. Per-Tenant Cost Tracking

```sql
CREATE TABLE IF NOT EXISTS ai_usage_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  month date NOT NULL, -- '2026-03-01'
  total_requests int DEFAULT 0,
  total_tokens_in int DEFAULT 0,
  total_tokens_out int DEFAULT 0,
  estimated_cost_usd numeric(10,4) DEFAULT 0,
  budget_limit_usd numeric(10,4) DEFAULT 50.00, -- configurable per tenant
  UNIQUE (tenant_id, month)
);
```

Edge function checks budget before LLM call:
```typescript
const { data: billing } = await supabase
  .from('ai_usage_billing')
  .select('estimated_cost_usd, budget_limit_usd')
  .eq('tenant_id', tenantId)
  .eq('month', currentMonth)
  .single();

if (billing && billing.estimated_cost_usd >= billing.budget_limit_usd) {
  return new Response(JSON.stringify({
    error: 'AI budget exceeded for this month',
    suggestion: 'Contact your administrator to increase the AI budget'
  }), { status: 429 });
}
```

#### 4d. Context-Aware Tutoring

Current `get_tutor_context` returns lesson content + progress. Enhance:

```sql
-- Add: recent quiz mistakes for targeted tutoring
SELECT question_text, correct_answer, student_answer
FROM quiz_answers qa
JOIN quiz_questions qq ON qq.id = qa.question_id
JOIN quiz_attempts qat ON qat.id = qa.attempt_id
WHERE qat.student_id = p_user_id
  AND qa.is_correct = false
  AND qa.created_at > now() - interval '7 days'
ORDER BY qa.created_at DESC
LIMIT 5;
```

This lets the tutor say: "I noticed you struggled with recursion on your last quiz. Let me explain it differently..."

---

## 5. Architecture for 100k Students

### 5a. Database Layer

#### Connection Pooling (Critical)

Supabase uses PgBouncer. For 100k students with ~10% concurrent:

```
10,000 concurrent users
× ~3 queries per page load
= 30,000 queries/minute peak
```

**Config needed:**
- Supabase Pro plan minimum (connection pooling enabled by default)
- Set pool mode to `transaction` (not `session`) for RPC-heavy workloads
- Monitor via `pg_stat_activity` and `pgbouncer SHOW POOLS`

#### Read Replicas

For analytics-heavy queries that don't need real-time data:

```typescript
// services/supabase/client.ts
export const supabase = createClient(url, anonKey);       // Primary (reads + writes)
export const supabaseRead = createClient(replicaUrl, anonKey); // Read replica

// Usage in analytics service:
export const analyticsService = {
  getTeacherDashboard: async (tenantId: string) => {
    const { data } = await supabaseRead  // ← read replica
      .rpc('get_teacher_analytics', { p_tenant_id: tenantId });
    return data;
  },
};
```

#### RLS Performance at Scale

RLS adds overhead per query. For hot paths:

```sql
-- GOOD: RLS uses indexed column
CREATE POLICY "..."
  USING (tenant_id = public.get_my_tenant_id());
-- ↑ Uses idx on tenant_id — fast

-- BAD: RLS with subquery
CREATE POLICY "..."
  USING (id IN (SELECT course_id FROM enrollments WHERE student_id = auth.uid()));
-- ↑ Subquery on every row — slow at scale

-- BETTER: Use a security-definer RPC for complex access patterns
-- and skip the subquery in the policy
```

**Rule**: Keep RLS policies to simple equality checks on indexed columns. For complex access patterns, use SECURITY DEFINER RPCs.

#### Partitioning for Large Tables

At 100k students, these tables will be massive:

```sql
-- lesson_progress: 100k students × 50 lessons = 5M rows
-- quiz_attempts: 100k × 20 quizzes × 3 attempts = 6M rows
-- ai_tutor_messages: high volume

-- Partition by tenant for multi-tenant isolation + performance
-- (only if single-tenant tables exceed 10M rows)
CREATE TABLE lesson_progress_partitioned (
  LIKE lesson_progress INCLUDING ALL
) PARTITION BY HASH (tenant_id);

-- 8 partitions for even distribution
CREATE TABLE lesson_progress_p0 PARTITION OF lesson_progress_partitioned
  FOR VALUES WITH (MODULUS 8, REMAINDER 0);
-- ... repeat for p1-p7
```

For most EduSync deployments, **indexing is sufficient** — partitioning only needed if a single tenant has millions of rows.

### 5b. Frontend Performance

#### Code Splitting (Critical — Easy Win)

Current: 30+ pages eagerly imported = large initial bundle.

```typescript
// app/routes.tsx — ALL pages lazy loaded
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const TeacherDashboard = lazy(() => import('@/pages/TeacherDashboard'));
const LessonViewer = lazy(() => import('@/features/lessons/LessonViewer'));
const QuizPlayer = lazy(() => import('@/features/quizzes/QuizPlayer'));
// ... etc

// Wrap in Suspense
<Route path="dashboard" element={
  <Suspense fallback={<AppLoading />}>
    <Dashboard />
  </Suspense>
} />
```

**Expected impact**: Initial bundle from ~2MB → ~400KB. Each page loads on demand.

#### Virtualization for Large Lists

Student roster (1000+ per class), quiz attempts list, forum threads:

```typescript
// components/ui/VirtualList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualList<T>({ items, renderItem, estimateSize = 60 }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
  });

  return (
    <div ref={parentRef} style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.key} style={{
            position: 'absolute',
            top: virtualRow.start,
            height: virtualRow.size,
            width: '100%',
          }}>
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Infinite Scroll Pagination

Replace "load all" patterns with cursor-based pagination:

```typescript
// features/courses/queries/courseQueries.ts
export function useInfiniteCourses(filters?: CourseFilters) {
  const { tenantId } = useAuth();

  return useInfiniteQuery({
    queryKey: ['courses', tenantId, 'infinite', filters],
    queryFn: async ({ pageParam = 0 }) => {
      return courseService.list(tenantId!, {
        ...filters,
        offset: pageParam,
        limit: 20,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.flat().length;
    },
    initialPageParam: 0,
  });
}
```

#### React Query Stale Time Strategy

```typescript
// Different stale times by data volatility
const STALE_TIMES = {
  STATIC: 30 * 60 * 1000,      // 30 min — modules, tenant config
  MODERATE: 5 * 60 * 1000,     // 5 min — courses, lessons (current default)
  DYNAMIC: 30 * 1000,          // 30 sec — progress, notifications
  REALTIME: 0,                 // Always refetch — chat messages, live quiz
};
```

### 5c. Edge Function Scaling

#### Cold Start Mitigation

Supabase Edge Functions (Deno) have cold starts. For AI Tutor:

```typescript
// Keep-alive: schedule a lightweight ping every 5 min
// via pg_cron or external cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'keep-ai-tutor-warm',
      '*/5 * * * *',
      $$SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/ai-tutor',
        headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
        body := '{"warmup": true}'
      )$$
    );
  END IF;
END $$;
```

#### Queue for Heavy Operations

For operations like batch essay grading, use `pg_net` + edge functions:

```
Teacher clicks "Grade All"
  → Insert into grading_jobs queue
  → pg_notify triggers edge function
  → Edge function processes in background
  → Frontend polls job status via React Query
```

### 5d. Monitoring Dashboard

```sql
-- View for real-time system health
CREATE OR REPLACE VIEW system_health AS
SELECT
  (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '15 minutes')
    AS active_users_15m,
  (SELECT count(*) FROM ai_tutor_messages WHERE created_at > now() - interval '1 hour')
    AS ai_messages_1h,
  (SELECT avg(response_time_ms) FROM ai_tutor_messages
   WHERE created_at > now() - interval '1 hour')
    AS avg_ai_response_ms,
  (SELECT count(*) FROM quiz_attempts WHERE status = 'in_progress')
    AS active_quiz_attempts,
  (SELECT count(*) FROM lesson_progress WHERE completed_at > now() - interval '1 hour')
    AS lessons_completed_1h;
```

---

## 6. Context Provider Reduction Plan

Current: 13 providers nested 13 deep. Target: 3 providers + feature-level stores.

| Current Context | Migration Target | Reason |
|----------------|-----------------|--------|
| AuthContext | **KEEP** | Truly global — auth state |
| ThemeContext | **KEEP** | Truly global — affects all UI |
| ToastContext | **KEEP** | Truly global — any component can toast |
| TenantContext | **DELETE** (after full migration) | Already a thin wrapper over AuthContext |
| NotificationContext | → `features/notifications/store/` | Feature-specific |
| ClassroomContext | → `features/classroom/store/` | Feature-specific |
| CalendarContext | → `features/calendar/store/` | Feature-specific |
| GradebookContext | → `features/gradebook/store/` | Feature-specific |
| StudentProgressContext | → React Query | Pure server state |
| CommentContext | → React Query | Pure server state |
| BuilderContext | → `features/course-builder/store/` | Feature-specific |
| ModerationContext | → `features/admin/store/` | Feature-specific |
| ModuleConfigContext | → React Query (useEnabledModules) | Pure server state |

**Result**: Provider nesting goes from 13 to 3. Each feature manages its own state.

---

## 7. Implementation Priority Matrix

### Phase 1: Foundation (Week 1-2)
- [ ] Extract routes to `app/routes.tsx`
- [ ] Add `React.lazy()` to all page imports
- [ ] Add `Suspense` boundaries
- [ ] Reduce Context providers (delete wrappers, move to React Query)

### Phase 2: Core Features (Week 3-4)
- [ ] Migrate Courses to feature module pattern
- [ ] Migrate Lessons to feature module pattern
- [ ] Create shared `ui/` components (DataTable, VirtualList)

### Phase 3: AI Tutor Hardening (Week 5-6)
- [ ] LLM provider fallback chain
- [ ] Per-tenant cost tracking
- [ ] Semantic cache optimization
- [ ] Context-aware tutoring (quiz mistakes)

### Phase 4: Scale Preparation (Week 7-8)
- [ ] Implement infinite scroll pagination on key pages
- [ ] Add virtualization to student rosters and large lists
- [ ] Read replica configuration for analytics
- [ ] System health monitoring view

### Phase 5: Polish (Week 9-10)
- [ ] Migrate remaining features to module pattern
- [ ] Full test coverage for critical paths
- [ ] Performance audit (Lighthouse, bundle analyzer)
- [ ] Documentation
