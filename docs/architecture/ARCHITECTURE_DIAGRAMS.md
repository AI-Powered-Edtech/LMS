# EduSync Architecture Diagram Pack

> Generated: 2026-03-18 | Post Phase 0-6 Refactor

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                 │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    React Application                       │  │
│  │                                                           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌───────────┐  │  │
│  │  │  Auth    │  │  Theme  │  │  Toast   │  │  Error    │  │  │
│  │  │ Provider │  │ Provider│  │ Provider │  │ Boundary  │  │  │
│  │  └────┬────┘  └─────────┘  └──────────┘  └───────────┘  │  │
│  │       │                                                   │  │
│  │  ┌────▼──────────────────────────────────────────────┐   │  │
│  │  │              Feature Modules (11)                  │   │  │
│  │  │                                                    │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │  │
│  │  │  │ courses  │ │ lessons  │ │ quizzes  │          │   │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘          │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │  │
│  │  │  │analytics │ │gamifica- │ │notifica- │          │   │  │
│  │  │  │          │ │tion      │ │tions     │          │   │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘          │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │  │
│  │  │  │announce- │ │ai-tutor  │ │modera-   │          │   │  │
│  │  │  │ments     │ │          │ │tion      │          │   │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘          │   │  │
│  │  │  ┌──────────┐ ┌──────────┐                        │   │  │
│  │  │  │assign-   │ │question- │                        │   │  │
│  │  │  │ments     │ │bank      │                        │   │  │
│  │  │  └──────────┘ └──────────┘                        │   │  │
│  │  └───────────────────────┬────────────────────────────┘   │  │
│  │                          │                                │  │
│  │  ┌───────────────────────▼────────────────────────────┐   │  │
│  │  │           React Query Cache Layer                   │   │  │
│  │  │    (tenant-scoped keys via createQueryKeys)         │   │  │
│  │  └───────────────────────┬────────────────────────────┘   │  │
│  └──────────────────────────┼────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼───────────────────────────────────┐
│                        SUPABASE                                  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  PostgREST   │  │    Auth      │  │   Edge Functions      │  │
│  │  (REST API)  │  │  (GoTrue)    │  │                       │  │
│  │              │  │              │  │  ┌─────────────────┐  │  │
│  │  RPC calls   │  │  JWT tokens  │  │  │  AI Tutor       │  │  │
│  │  CRUD ops    │  │  Sessions    │  │  │  (Groq/OpenAI)  │  │  │
│  │              │  │              │  │  └─────────────────┘  │  │
│  └──────┬───────┘  └──────────────┘  └───────────────────────┘  │
│         │                                                        │
│  ┌──────▼───────────────────────────────────────────────────┐   │
│  │                    PostgreSQL                             │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │              Row Level Security (RLS)                │ │   │
│  │  │   tenant_id = get_my_tenant_id() on ALL tables      │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐ │   │
│  │  │  courses  │ │  lessons  │ │  quizzes  │ │profiles │ │   │
│  │  │  classes  │ │  progress │ │  attempts │ │  roles  │ │   │
│  │  │  modules  │ │  blocks   │ │  answers  │ │ tenants │ │   │
│  │  └───────────┘ └───────────┘ └───────────┘ └─────────┘ │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │   │
│  │  │ Realtime     │  │ pg_cron      │  │ Storage        │ │   │
│  │  │ (websocket)  │  │ (background) │  │ (files)        │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────────┘ │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                      COMPONENT LAYER                         │
│                                                              │
│   Dashboard.tsx    Analytics.tsx    QuizPlayer.tsx   ...      │
│       │                │                │                    │
│       │ calls hook     │ calls hook     │ calls hook         │
└───────┼────────────────┼────────────────┼────────────────────┘
        │                │                │
        ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                   REACT QUERY HOOK LAYER                     │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  const { tenantId } = useAuth()  ← owns tenantId   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   useQuery({                                                 │
│     queryKey: featureKeys.detail(tenantId!, id),             │
│     queryFn:  () => service.fetch(id, tenantId!),            │
│     enabled:  !!tenantId && !!id,                            │
│   })                                                         │
│                                                              │
│   useMutation({                                              │
│     mutationFn: (data) => service.create(data, tenantId!),   │
│     onSuccess:  () => invalidateQueries(featureKeys.all()),  │
│   })                                                         │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Query Key: [scope, tenantId, ...rest]               │   │
│   │  Created by: createQueryKeys(scope) from lib/        │   │
│   └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ calls service
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   FEATURE SERVICE LAYER                       │
│                                                              │
│   features/{domain}/api/{domain}Service.ts                   │
│                                                              │
│   export async function fetch(id: string, tenantId: string) {│
│     return supabase                                          │
│       .from('table')                                         │
│       .select('*')                                           │
│       .eq('id', id)                                          │
│       .eq('tenant_id', tenantId)  ← defense-in-depth        │
│   }                                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ Supabase client
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE / POSTGRESQL                       │
│                                                              │
│   PostgREST translates to SQL:                               │
│                                                              │
│   SELECT * FROM table                                        │
│   WHERE id = $1                                              │
│     AND tenant_id = $2           ← from service              │
│     AND tenant_id = get_my_tenant_id()  ← RLS policy         │
│                                                              │
│   Both filters must pass. Triple-layer isolation.            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Tenant Security Layers

```
┌──────────────────────────────────────────────────────────────┐
│                    SECURITY LAYER STACK                        │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│  LAYER 1: REACT QUERY CACHE (Frontend)                        │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│    Query Key Structure:                                       │
│    ['courses', 'tenant-abc-123', 'list', filters]             │
│                   ▲                                           │
│                   │                                           │
│            tenantId REQUIRED                                  │
│            (enforced by createQueryKeys TypeScript type)       │
│                                                               │
│    Effect: Tenant A's cache NEVER collides with Tenant B      │
│    Even if same courseId exists in both tenants                │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│  LAYER 2: SERVICE FUNCTION (Application)                      │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│    supabase.from('courses')                                   │
│      .select('*')                                             │
│      .eq('tenant_id', tenantId)   ← explicit filter           │
│                                                               │
│    Effect: Even if RLS is misconfigured, service              │
│    still filters by tenant. Defense-in-depth.                 │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│  LAYER 3: ROW LEVEL SECURITY (Database)                       │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│    CREATE POLICY "tenant_isolation" ON courses                │
│    USING (tenant_id = public.get_my_tenant_id())              │
│                                                               │
│    Effect: PostgreSQL enforces tenant isolation at             │
│    the storage engine level. Cannot be bypassed               │
│    by application code.                                       │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│  LAYER 4: JWT CLAIMS (Authentication)                         │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│    get_my_tenant_id() reads from:                             │
│    1. JWT claim: request.jwt.claims -> 'tenant_id'            │
│    2. Fallback: profiles.tenant_id WHERE id = auth.uid()      │
│                                                               │
│    Effect: Tenant identity is cryptographically signed         │
│    in the JWT token. Cannot be spoofed.                       │
│                                                               │
│  ═══════════════════════════════════════════════════════════  │
│  LAYER 5: SECURITY DEFINER FUNCTIONS (Privileged)             │
│  ═══════════════════════════════════════════════════════════  │
│                                                               │
│    All 17 SECURITY DEFINER functions have:                    │
│    SET search_path TO 'public'                                │
│                                                               │
│    Effect: Prevents function hijacking via                    │
│    SET search_path = malicious_schema                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘

  Attack Surface Analysis:
  ┌──────────────────────────┬───────────┬────────────────────┐
  │ Attack Vector            │ Blocked?  │ By Which Layer     │
  ├──────────────────────────┼───────────┼────────────────────┤
  │ Cache poisoning          │ ✅ Yes    │ Layer 1 (keys)     │
  │ API parameter tampering  │ ✅ Yes    │ Layer 2 (service)  │
  │ Direct DB access         │ ✅ Yes    │ Layer 3 (RLS)      │
  │ JWT token forgery        │ ✅ Yes    │ Layer 4 (crypto)   │
  │ Function hijacking       │ ✅ Yes    │ Layer 5 (path)     │
  │ Cross-tenant enumeration │ ✅ Yes    │ Layers 2+3         │
  └──────────────────────────┴───────────┴────────────────────┘
```

---

## 4. Feature Module Map

```
src/features/
│
├── courses/                    ★ Core Domain
│   ├── api/courseService.ts         CRUD, enrollment check
│   ├── queries/courseQueries.ts     useCourses, useCreateCourse, ...
│   ├── queries/courseKeys.ts        createQueryKeys('courses')
│   └── types/index.ts              Course, CourseInsert, CourseUpdate
│
├── lessons/                    ★ Core Domain
│   ├── api/lessonService.ts         fetch, progress, offline queue
│   ├── queries/lessonQueries.ts     useLesson, useUpdateProgress, ...
│   ├── queries/lessonKeys.ts        createQueryKeys('lessons') + progress
│   └── types/index.ts              Lesson, LessonProgress, Quiz types
│
├── quizzes/                    ★ Core Domain (Hardened Phase 3)
│   ├── api/
│   │   ├── quizPlayer.service.ts    start, submit, save, heartbeat
│   │   ├── quizManager.service.ts   CRUD quiz, questions, grading
│   │   ├── quizAssignment.service.ts assign to classes
│   │   └── quizzes.service.ts       barrel export
│   ├── components/
│   │   ├── player/                  QuizPlayer, Timer, Palette, ...
│   │   └── student/                 QuizCard, Results, StartModal
│   ├── hooks/
│   │   ├── useQuizTimer.ts          per-attempt countdown
│   │   ├── useAutosaveAnswers.ts    debounced save + tenant invalidation
│   │   ├── useAntiCheat.ts          tab-switch detection
│   │   └── useQuizHeartbeat.ts      liveness ping
│   ├── queries/
│   │   ├── queryKeys.ts             createQueryKeys('quiz') + 10 extensions
│   │   ├── quizPlayer.queries.ts    4 queries (all tenant-scoped)
│   │   ├── quizPlayer.mutations.ts  6 mutations (tenant-scoped invalidation)
│   │   └── quizManager.queries.ts   6 queries + 12 mutations
│   ├── store/quizPlayer.store.ts    Zustand (resets on attempt change)
│   └── types/quizzes.types.ts
│
├── analytics/                  Phase 4
│   ├── api/analyticsService.ts      teacher analytics, tenant overview
│   ├── queries/analyticsQueries.ts  useTeacherAnalytics, useRefreshStats
│   └── types/index.ts              TeacherAnalyticsData, AnalyticsError
│
├── gamification/               Phase 4
│   ├── api/
│   │   ├── gamificationService.ts   streaks, badges
│   │   └── leaderboardService.ts    leaderboard + realtime subscription
│   ├── queries/
│   │   ├── gamificationQueries.ts   useUserStreak, useUserBadges
│   │   └── leaderboardQueries.ts    useLeaderboard (with embedded realtime)
│   └── types/index.ts
│
├── notifications/              Phase 5
│   ├── api/notificationService.ts   fetch, send, mark read, subscribe
│   ├── queries/notificationQueries.ts useNotifications (with realtime)
│   └── types/index.ts
│
├── announcements/              Phase 5
│   ├── api/announcementService.ts   CRUD, RSVP
│   ├── queries/
│   │   ├── announcementKeys.ts
│   │   └── announcementQueries.ts   useAnnouncements, useSave, useDelete
│   └── types/index.ts
│
├── ai-tutor/                   Phase 2
│   ├── api/
│   │   ├── aiTutorService.ts        askTutor (Edge Function)
│   │   └── promptBuilder.ts         context + difficulty classification
│   ├── queries/aiTutorQueries.ts    useAskTutor mutation
│   └── types/index.ts              DifficultyLevel, AITutorMessage
│
├── moderation/                 Phase 1
│   └── queries/moderationQueries.ts useModerationReports, useSubmitReport
│
├── assignments/                Pre-existing
│   ├── hooks/useAssignments.ts
│   └── types.ts
│
└── question-bank/              Pre-existing
    └── components/              QuestionCard, Editor, SearchModal


  Shared Infrastructure:
  ┌─────────────────────────────────────────────────────┐
  │ src/lib/queryKeys.ts                                │
  │   createQueryKeys(scope) → TenantScopedKey factory  │
  │   Used by ALL 13 query key factories                │
  │                                                     │
  │ src/contexts/AuthContext.tsx                         │
  │   useAuth() → { user, tenantId, activeTenant, ... } │
  │   Single source of truth for identity + tenant      │
  │                                                     │
  │ src/components/FeatureErrorBoundary.tsx              │
  │   Wraps quiz + lesson viewer for graceful failure    │
  └─────────────────────────────────────────────────────┘
```

---

## Appendix: Key Counts

| Category | Count |
|----------|-------|
| Feature modules | 11 |
| React Query hooks | 35+ |
| Query key factories | 13 |
| Zustand stores | 4 (classroom, calendar, quiz, module-config) |
| Context providers | 4 (Auth, Theme, Toast, ErrorBoundary) |
| Backward compat shims | 10 |
| Realtime subscriptions | 3 (notifications, leaderboard, classroom) |
| SECURITY DEFINER functions | 17 (all with SET search_path) |
