# EduSync — Technical Roadmap v2

## Purpose

This roadmap sequences all implementation work based on **risk, dependency, and blast radius**. It answers: what to build first, what to pay down first, and what to defer.

---

## Current Technical Debt Inventory

| # | Debt | Risk if Unpaid | Effort | Location |
|---|------|---------------|--------|----------|
| D1 | 30+ pages eagerly imported (no lazy loading) | Slow initial load, grows worse with each page | S | App.tsx |
| D2 | 13 Context providers nested 13 deep | Unnecessary re-renders, hard to debug, tight coupling | M | contexts/ |
| D3 | 3 calling patterns (direct Supabase, service, React Query) | Inconsistent error handling, no caching on some paths | L | services/, pages/ |
| D4 | Legacy routes use ProtectedRoute + RoleRoute alongside new 3-guard chain | Dual guard systems, confusion about which to use | S | App.tsx, components/ |
| D5 | Feature code scattered across pages/, services/, components/ | Hard to find related code, risk of breaking unrelated features | L | src/ |
| D6 | No virtualization for large lists | Browser freeze on 1000+ item lists (gradebook, roster) | M | pages/ |
| D7 | No search system | Users can't find courses, lessons, or forum posts | M | N/A (missing) |
| D8 | AI Tutor single LLM provider (Groq only) | Service outage = AI unavailable | S | supabase/functions/ai-tutor/ |
| D9 | No event system for notifications | Adding notification types requires changing source systems | M | Direct INSERT pattern |
| D10 | No per-tenant AI cost tracking | Uncontrolled AI spend at scale | S | N/A (missing) |
| D11 | TenantContext wrapper still exists with 8+ importers | Unnecessary indirection, migration incomplete | S | contexts/TenantContext.tsx |
| D12 | No integration/E2E test coverage for critical paths | Regressions caught manually | L | tests/ |

---

## Risk-Ordered Implementation Phases

### Phase 0: Quick Wins (Week 1)
> Pay off debt that blocks everything else. Zero risk, high reward.

| Task | Debt | Effort | Risk | Verification |
|------|------|--------|------|-------------|
| Add `React.lazy()` to all page imports in App.tsx | D1 | 2h | None | `npx vite build && ls -la dist/assets/*.js` — no single file >500KB |
| Add `Suspense` boundaries with `<AppLoading />` | D1 | 1h | None | Navigate between pages — loading indicator shows briefly |
| Extract route definitions to `app/routes.tsx` | D4 | 3h | Low | All routes still work. Run app, click every nav item |
| Delete `TenantContext` wrapper, update 8 importers to use `useAuth()` directly | D11 | 2h | Low | `grep -r "useTenant\|TenantContext\|TenantProvider" src/` returns 0 hits (except type re-exports if needed) |

**Exit criteria**: Initial bundle <500KB. All routes work. No TenantContext imports.

---

### Phase 1: Foundation Consolidation (Week 2-3)
> Establish the patterns that all future work depends on.

| Task | Debt | Effort | Risk | Verification |
|------|------|--------|------|-------------|
| Create `src/components/ui/` with shared primitives (Button, Modal, EmptyState) | — | M | None | Storybook or visual check |
| Migrate `CourseService` to feature module pattern (`features/courses/`) | D3, D5 | M | Medium | Course catalog, enrollment, course detail all work |
| Create query key factory in `features/courses/queries/` | D3 | S | Low | React Query DevTools shows proper key hierarchy |
| Reduce Contexts: delete ClassroomContext, CalendarContext, GradebookContext, StudentProgressContext, CommentContext. Replace with React Query | D2 | L | Medium | All pages that used these contexts still load data correctly |

**Risk mitigation for Context deletion**:
- Delete ONE context at a time
- For each: find all `useContext(X)` usages → replace with `useQuery()` call → test → commit → next
- Order by least-used first: ModerationContext (1 page) → CommentContext (1 page) → CalendarContext → etc.

**Exit criteria**: Context count ≤ 5. Courses feature fully modular. All data loaded via React Query or Zustand.

---

### Phase 2: Core Learning Path Hardening (Week 4-5)
> The student learning flow is the most important path. Make it bulletproof.

| Task | Debt | Effort | Risk | Verification |
|------|------|--------|------|-------------|
| Migrate Lessons to feature module (`features/lessons/`) | D3, D5 | M | Medium | LessonViewer, progress tracking, all lesson types work |
| Replace `useViewerReducer` with Zustand store in `features/lessons/store/` | D2 | S | Low | Lesson navigation, completion, sidebar state all work |
| Add error boundaries around LessonViewer and QuizPlayer | — | S | None | Break a network call → user sees error UI, not white screen |
| Migrate AI Tutor to feature module (`features/ai-tutor/`) | D5 | M | Low | AI Tutor panel opens, sends messages, shows history |
| Add LLM provider fallback (Groq → OpenAI) in edge function | D8 | M | Low | Disable Groq API key → system falls back to OpenAI |

**Risk mitigation for LessonViewer migration**:
- LessonViewer is the most complex component (11 sub-components + reducer)
- Keep the same component file names — only change import paths
- Test each lesson type: Article, Video, Quiz-in-lesson, Assignment-in-lesson

**Exit criteria**: Student can complete full learning flow (enroll → lesson → quiz → progress) with error boundaries. AI Tutor has fallback provider.

---

### Phase 3: Performance for Scale (Week 6-7)
> Prepare for 10k+ students. These changes are invisible to users but critical.

| Task | Debt | Effort | Risk | Verification |
|------|------|--------|------|-------------|
| Add `VirtualList` component using TanStack Virtual | D6 | M | Low | Render 5000 items — no lag, smooth scroll |
| Virtualize: student roster, gradebook, quiz attempts list, forum threads | D6 | M | Medium | Each page handles 1000+ rows without freezing |
| Implement infinite scroll pagination for courses, notifications | D6 | S | Low | Scroll to bottom → next page loads |
| Add stale time strategy (STATIC/MODERATE/DYNAMIC/REALTIME) | — | S | None | React Query DevTools shows correct stale times |
| Implement `useDebouncedSearch` hook for course/lesson search | D7 | S | None | Type in search → results appear after 300ms debounce |

**Risk mitigation for virtualization**:
- Start with the simplest list (notifications) — verify the pattern
- Then apply to gradebook (most complex — has fixed headers + sorting)
- Test on low-end device (throttle CPU in Chrome DevTools)

**Exit criteria**: No list in the app renders >50 DOM nodes at a time. Search works for courses and lessons.

---

### Phase 4: AI Tutor Production Hardening (Week 8-9)
> Make AI Tutor reliable and cost-effective for 10k+ students.

| Task | Debt | Effort | Risk | Verification |
|------|------|--------|------|-------------|
| Add per-tenant AI cost tracking (`ai_usage_billing` table + edge function check) | D10 | M | Low | Tenant admin sees monthly AI usage. Budget cap blocks requests |
| Optimize semantic cache hit rate (tune similarity threshold) | — | S | Low | Monitor cache hit % — target >30% |
| Add circuit breaker in LLM router | D8 | S | Low | Groq fails 3x → traffic routes to OpenAI for 10min |
| Add AI Tutor analytics dashboard for admin | — | M | Low | Admin sees: messages/day, avg response time, cost, cache hit rate |
| Add prompt fingerprint cache (hash-based, before semantic search) | — | S | None | Identical questions return cached response in <50ms |

**Risk mitigation**:
- Deploy cost tracking BEFORE opening AI Tutor to large tenant
- Set conservative initial budget ($10/tenant/month)
- Monitor first week closely via `ai_tutor_interactions` table

**Exit criteria**: AI Tutor has cost cap, fallback provider, circuit breaker. Admin can see usage metrics.

---

### Phase 5: Event System + Notifications (Week 10-11)
> Decouple notification creation from source systems.

| Task | Debt | Effort | Risk | Verification |
|------|------|--------|------|-------------|
| Create `system_events` table + indexes | D9 | S | None | Table exists, indexes verified via `EXPLAIN` |
| Create event processor trigger | D9 | M | Medium | INSERT event → notification created automatically |
| Migrate quiz.graded notifications to event system | D9 | S | Medium | Grade a quiz → student receives notification (via event, not direct INSERT) |
| Migrate remaining notification sources one by one | D9 | M | Medium | All notifications flow through event system |
| Add event handler config table | — | S | Low | Adding new notification type = INSERT into config, not code change |

**Risk mitigation**:
- Keep direct INSERT as fallback during migration
- Migrate one event type at a time: quiz.graded → assignment.submitted → badge.earned → etc.
- Monitor: compare notification count before/after migration

**Exit criteria**: All notifications flow through `system_events`. Adding a new notification type requires zero code changes.

---

### Phase 6: Feature Module Migration (Week 12-14)
> Complete the feature module pattern across all remaining features.

| Task | Debt | Effort | Priority |
|------|------|--------|----------|
| Migrate Gradebook | D5 | M | High (teacher-facing) |
| Migrate Classroom | D5 | M | High (daily use) |
| Migrate Course Builder | D5 | L | Medium (complex state) |
| Migrate Analytics | D5 | S | Medium |
| Migrate Social/Forum | D5 | S | Low |
| Migrate Gamification | D5 | S | Low |
| Migrate Admin pages | D5 | M | Low |
| Migrate Assignments | D5 | M | Medium |

**Migration checklist per feature**:
1. Create `features/{name}/` folder structure
2. Move service → `features/{name}/api/`
3. Create React Query hooks → `features/{name}/queries/`
4. Move components → `features/{name}/components/`
5. Replace Context with Zustand store if applicable
6. Update page imports
7. Delete old service/component files
8. Verify feature works end-to-end

**Exit criteria**: `src/services/` only contains `supabase/` (shared client). All domain services live in `features/*/api/`.

---

### Phase 7: Testing & Observability (Week 15-16)
> Catch regressions before users do.

| Task | Debt | Effort | Priority |
|------|------|--------|----------|
| E2E tests for critical path: login → enroll → lesson → quiz → progress | D12 | L | Critical |
| E2E test for invite flow: admin invite → user register → role assigned | D12 | M | Critical |
| Unit tests for domain mappers and service functions | D12 | M | High |
| Add `system_health` view for monitoring | — | S | Medium |
| Add `pg_stat_statements` monitoring for slow queries | — | S | Medium |
| Add error tracking (Sentry or similar) | — | M | High |

**Critical path E2E test**:
```typescript
// tests/e2e/critical-path.spec.ts
test('student completes full learning flow', async ({ page }) => {
  // Login as student
  await page.goto('/#/login');
  await page.fill('[type="email"]', 'student@edusync.dev');
  await page.fill('[type="password"]', 'password');
  await page.click('button[type="submit"]');

  // Navigate to course
  await expect(page).toHaveURL(/dashboard/);
  await page.click('text=Python Basics');

  // Complete lesson
  await page.click('text=Mark Complete');

  // Take quiz
  await page.click('text=Start Quiz');
  // ... answer questions
  await page.click('text=Submit');

  // Verify progress updated
  await page.goto('/#/dashboard');
  await expect(page.locator('.progress-bar')).toHaveAttribute('data-value', /[1-9]/);
});
```

**Exit criteria**: Critical path E2E passes in CI. Error tracking active. Slow query monitoring in place.

---

### Phase 8: Scale Preparation (When approaching 50k students)
> These are deferred until needed. Don't over-engineer early.

| Task | Trigger | Effort |
|------|---------|--------|
| Add Supabase read replica for analytics/gradebook | Analytics queries >500ms | M |
| Partition `system_events` by month | Events table >10M rows | S |
| Auto-cleanup old notifications (>90 days) | Notifications table >5M rows | S |
| Add full-text search (pg_trgm or Meilisearch) | Users request search frequently | M |
| Implement queue pattern for batch operations (essay grading) | Essay grading edge fn timeout | L |
| CDN for lesson videos / external video hosting | Storage bandwidth costs spike | M |
| Segment realtime channels by class (not tenant) | WebSocket connection count >5k | S |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Phase |
|------|-----------|--------|------------|-------|
| LessonViewer migration breaks progress tracking | Medium | High | Test every lesson type. Keep trigger logic unchanged. | Phase 2 |
| Context deletion causes missing data in pages | Medium | Medium | Delete one at a time. Test each page after. | Phase 1 |
| AI cost spike from unexpected usage | High | Medium | Budget caps (Phase 4). Start with $10/tenant. | Phase 4 |
| Event system trigger too slow under load | Low | Medium | Monitor trigger execution time. Fallback to edge function worker. | Phase 5 |
| Feature module migration breaks imports | Medium | Low | Use TypeScript compiler — broken imports = compile error. | Phase 6 |
| E2E tests flaky due to timing | High | Low | Use Playwright auto-waiting. Avoid arbitrary sleep(). | Phase 7 |
| Read replica lag causes stale gradebook data | Low | Low | Only route truly stale-tolerant queries to replica. | Phase 8 |

---

## Decision Log

Decisions that should NOT be revisited without strong evidence:

| Decision | Rationale | ADR |
|----------|-----------|-----|
| RLS for tenant isolation | Supabase-native, single migration path | ADR-001 |
| Feature module pattern | Proven at quiz module scale, prevents spaghetti | ADR-002 |
| React Query for server state | Built-in caching, devtools, stale-while-revalidate | ADR-006 |
| 3-guard chain for routes | Single concern per guard, no redirect loops | ADR-007 |
| Edge functions only for external API / secure compute | Minimize deployment surface, keep logic in DB/browser | ADR-008 |

---

## Timeline Summary

```
Week  1     : Phase 0 — Quick wins (lazy loading, route extract, TenantContext cleanup)
Week  2-3   : Phase 1 — Foundation (Courses module, Context reduction)
Week  4-5   : Phase 2 — Core learning path (Lessons, AI Tutor module, error boundaries)
Week  6-7   : Phase 3 — Performance (virtualization, pagination, search)
Week  8-9   : Phase 4 — AI hardening (cost tracking, fallback, circuit breaker)
Week 10-11  : Phase 5 — Event system (notifications decoupling)
Week 12-14  : Phase 6 — Remaining feature modules
Week 15-16  : Phase 7 — Testing & observability
When needed  : Phase 8 — Scale preparation (read replica, partitioning)
```

### Milestones

| Milestone | Week | Deliverable |
|-----------|------|-------------|
| M1: Fast Load | 1 | Bundle <500KB, lazy loading active |
| M2: Clean Architecture | 3 | Courses modular, ≤5 contexts |
| M3: Bulletproof Learning | 5 | Full learning path with error boundaries + AI fallback |
| M4: Scale Ready (10k) | 7 | Virtualized lists, paginated queries |
| M5: AI Production | 9 | Cost caps, fallback, monitoring |
| M6: Event-Driven | 11 | Notifications decoupled |
| M7: Fully Modular | 14 | All features in feature modules |
| M8: Observable | 16 | E2E tests, error tracking, monitoring |
