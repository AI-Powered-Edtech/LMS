# EduSync LMS — Screen Specifications

> Per-screen component breakdown, data sources, current gaps, dan implementation notes.
> Companion document to `UX_BLUEPRINT.md` (design system) dan `USER_FLOWS.md` (user journeys).

---

## Legend

| Symbol | Meaning |
|--------|---------|
| `[UI]` | Needs shared UI component from `src/components/ui/` |
| `[API]` | Data from React Query hook (API call) |
| `[HARD]` | Currently hardcoded — needs API migration |
| `[NEW]` | Component/feature doesn't exist yet |
| `[FIX]` | Existing but broken or incomplete |
| `✅` | Already implemented correctly |

---

## 1. Student Dashboard (`src/pages/Dashboard.tsx`)

### Current: ~630 lines | Target: ~300 lines (extract sub-components)

### Component Tree

```
<Dashboard>
  ├─ <WelcomeCard>                          ✅ (partial — streak/XP from API)
  │    ├─ User name from useAuth()          ✅
  │    ├─ Streak count                      [API] useGamificationStats()
  │    ├─ XP total                          [API] useUserPoints()
  │    └─ Level display                     [API] useUserLevel()
  │
  ├─ <MyClasses>                            ✅
  │    ├─ [UI] Card × N                     [NEW] extract to ClassCard
  │    ├─ [UI] EmptyState                   [NEW] "Belum ada kelas"
  │    ├─ [UI] Skeleton                     [NEW] loading state
  │    └─ Join class modal                  ✅ (extract to JoinClassModal)
  │
  ├─ <DeadlineAssignments>                  ✅ (data from API)
  │    ├─ [UI] Card × 3                     [NEW]
  │    ├─ [UI] EmptyState                   [NEW]
  │    ├─ [UI] Skeleton                     [NEW]
  │    └─ Countdown badge                   ✅
  │
  ├─ <ContinueLearning>                     ✅ (data from API)
  │    ├─ [UI] Card × 4                     [NEW]
  │    ├─ [UI] EmptyState                   [NEW]
  │    ├─ [UI] Skeleton                     [NEW]
  │    └─ Progress bar per course           ✅
  │
  ├─ <ScheduleToday>                        [HARD] ❌ REMOVE or wire to Calendar API
  │
  ├─ <LatestAnnouncements>                  [HARD] ❌ needs useAnnouncements()
  │    ├─ [UI] Card × 2                     [NEW]
  │    └─ [UI] EmptyState                   [NEW]
  │
  ├─ <LeaderboardSnapshot>                  [HARD] ❌ needs useLeaderboard()
  │    ├─ Real rank from API                [API]
  │    └─ Progress to next rank             [API]
  │
  ├─ <LearningHub>                          ✅
  │    └─ Hub items from navigation.ts      ✅
  │
  ├─ <ProgressGamification>                 ✅ (partial)
  │    ├─ XP card                           ✅
  │    ├─ Achievements card                 ✅
  │    └─ Quiz history                      ✅
  │
  ├─ <BadgeModal>                           ✅ (extract from Dashboard)
  └─ <QuizHistoryModal>                     ✅ (extract from Dashboard)
```

### Data Sources

| Section | Hook | Status |
|---------|------|--------|
| Welcome | `useAuth()` | ✅ |
| My Classes | `useClassroomQueries()` | ✅ |
| Deadlines | `useAssignments()` (from services) | ✅ |
| Continue Learning | `useCourseQueries()` | ✅ |
| Schedule | **NONE** | [HARD] remove or implement |
| Announcements | `useAnnouncementQueries()` | ✅ exists, not wired to Dashboard |
| Leaderboard | `useLeaderboardQueries()` | ✅ exists, not wired to Dashboard |
| Progress | `useGamificationQueries()` | ✅ |

### Refactor Plan

1. Extract 3 inline modals → separate files
2. Wire hardcoded sections to React Query hooks
3. Add `[UI] Skeleton` per section
4. Add `[UI] EmptyState` per section
5. Target: 300 lines (from 630)

---

## 2. Lesson Viewer (`src/pages/LessonViewer.tsx` + `src/components/LessonViewer/`)

### Component Tree

```
<LessonViewer>
  │
  ├─ Route: no moduleId → <CourseBrowser>
  │    ├─ Expandable course cards               ✅
  │    ├─ Module list under each course          ✅
  │    └─ [NEW] [UI] Skeleton for course list
  │
  └─ Route: has moduleId → <LessonPlayer>
       │
       ├─ [NEW] <Breadcrumb>                     Course → Module → Lesson
       │
       ├─ <LessonSidebar>                        ✅ (virtualized)
       │    ├─ Module title + progress bar        ✅
       │    ├─ Lesson list (virtual scroll)       ✅
       │    ├─ Status icons (check/play/lock)     ✅
       │    └─ [FIX] Mobile: collapsible drawer
       │
       ├─ <ContentArea>
       │    ├─ <VideoViewer>                      ✅
       │    │    ├─ HTML5 player (no download)     ✅
       │    │    ├─ Anti-skip mechanism             ✅
       │    │    ├─ Transcript panel                ✅
       │    │    └─ Network recovery overlay        ✅
       │    │
       │    ├─ <ArticleViewer>                    ✅
       │    │    ├─ Reading time tracker            ✅
       │    │    ├─ Scroll progress                 ✅
       │    │    └─ Sticky progress banner          ✅
       │    │
       │    ├─ <QuizViewer>                       ✅
       │    └─ <AssignmentViewer>                  ✅
       │
       ├─ [NEW] <CompletionBar>
       │    └─ "Lanjut ke Pelajaran Berikutnya" button
       │
       ├─ <ProgressReporter>                      ✅ (background, debounced)
       │
       ├─ <AITutorPanel>                          ✅
       │    ├─ Chat interface                      ✅
       │    ├─ Suggested questions                 ✅
       │    ├─ [FIX] Mobile: collapsible sheet
       │    └─ Context-aware per lesson            ✅
       │
       └─ <DiscussionBoard>                       ✅
```

### Key Improvements

| Item | Type | Priority |
|------|------|----------|
| Breadcrumb navigation | [NEW] | High |
| "Next Lesson" button | [NEW] | High |
| Mobile sidebar as drawer | [FIX] | High |
| Mobile AI panel as bottom sheet | [FIX] | Medium |
| useViewerReducer → Zustand | [FIX] | Medium |
| Skeleton per content type | [NEW] | Medium |

---

## 3. Quiz Player (`src/features/quizzes/components/player/QuizPlayer.tsx`)

### Component Tree

```
<QuizPlayer>                                  ✅ (well-architected)
  ├─ <QuizHeader>                             ✅
  │    ├─ Title, question counter              ✅
  │    ├─ Save status indicator                ✅
  │    ├─ Online/offline indicator             ✅
  │    └─ Timer display                        ✅
  │
  ├─ <TabSwitchWarning>                       ✅ (floating, amber)
  ├─ <OfflineNotification>                    ✅ (floating)
  │
  ├─ <QuestionPalette>                        ✅
  │    ├─ Desktop: grid sidebar               ✅
  │    ├─ Mobile: horizontal scroll            ✅
  │    └─ Color-coded states                   ✅
  │
  ├─ <QuizBody>                               ✅
  │    ├─ Question text (LaTeX support)        ✅
  │    ├─ Answer options                       ✅
  │    ├─ Flag button (F shortcut)             ✅
  │    └─ [NEW] Transition animation between questions
  │
  ├─ <QuizFooter>                             ✅
  │    ├─ Prev/Next buttons                    ✅
  │    └─ Finish review button                 ✅
  │
  ├─ <QuizReviewScreen>                       ✅
  │    └─ [NEW] Answer status highlighting
  │
  └─ <QuizResultsView>                        ✅
       ├─ Pass/Fail/Pending UI                 ✅
       ├─ Performance badge                    ✅
       ├─ Confetti animation                   ✅
       └─ Action buttons                       ✅
```

### Status: **Polish only** — architecture is solid from Phase 3.

---

## 4. Teacher Dashboard (`src/pages/TeacherDashboard.tsx`)

### Current: ~238 lines | Issues: some hardcoded data

### Component Tree

```
<TeacherDashboard>
  ├─ <WelcomeHeader>                          ✅
  │    └─ Quick action buttons                 ✅
  │
  ├─ <AlertsSection>                          ✅ (partial)
  │    ├─ Pending grading count               [HARD] needs real API data
  │    ├─ At-risk students                    [HARD] needs analytics API
  │    └─ [UI] Card with colored border       [NEW]
  │
  ├─ <ActiveClasses>                          ✅ (partial)
  │    ├─ [UI] Card × N                       [NEW]
  │    ├─ Student count                        ✅
  │    ├─ Class average                        [HARD] needs real API
  │    └─ Active assignments count             ✅
  │
  ├─ <TeachingTools>                          ✅
  │    └─ Quick links grid                     ✅
  │
  └─ <RecentActivity>                         [HARD] needs real API
       ├─ [UI] Timeline component              [NEW]
       └─ Activity items                       [HARD]
```

### Data Sources to Wire

| Section | Needed Hook | Exists? |
|---------|-------------|---------|
| Pending grading | `useGradebookQueries()` | ✅ hook exists |
| At-risk students | `useAnalyticsQueries()` | ✅ hook exists |
| Class averages | `useClassroomQueries()` | ✅ hook exists |
| Recent activity | needs new endpoint | ❌ |

---

## 5. Shared UI Components Needed (`src/components/ui/`)

### Phase UX-1: Core (10 components)

```
src/components/ui/
  ├─ Button.tsx
  │    Props: variant (primary|secondary|ghost|danger)
  │           size (sm|md|lg), loading, icon, fullWidth, disabled
  │    Notes: Replace all inline button styles across app
  │
  ├─ Card.tsx
  │    Props: padding (sm|md|lg), hover, onClick, className
  │    Notes: Wrapper with consistent border, radius, shadow
  │
  ├─ Modal.tsx
  │    Props: open, onClose, title, size (sm|md|lg|xl), children
  │    Notes: Replace 8+ inline modals. Backdrop blur, focus trap.
  │
  ├─ Badge.tsx
  │    Props: variant (info|success|warning|danger|neutral), size (sm|md)
  │    Notes: Status indicators, counts, labels
  │
  ├─ Skeleton.tsx
  │    Props: variant (text|circle|rect|card), width, height, count
  │    Notes: Replace all spinner-based loading with skeletons
  │
  ├─ EmptyState.tsx
  │    Props: icon, title, description, action: { label, onClick }
  │    Notes: Every list/data section needs one
  │
  ├─ Input.tsx
  │    Props: label, error, icon, size (sm|md|lg), type, placeholder
  │    Notes: Consistent form fields
  │
  ├─ Select.tsx
  │    Props: options, value, onChange, placeholder, label, error
  │    Notes: Consistent dropdowns
  │
  ├─ Tabs.tsx
  │    Props: tabs: { id, label, icon?, count? }[], activeTab, onChange
  │    Notes: Multi-view pages (Quiz, Assignments, Profile)
  │
  └─ DataTable.tsx
       Props: columns, data, sortable, pagination, loading, emptyState
       Notes: Gradebook, admin pages, any tabular data
```

### Phase UX-2: Enhanced (8 components)

```
src/components/ui/
  ├─ VirtualList.tsx        — @tanstack/react-virtual wrapper
  ├─ InfiniteList.tsx       — useInfiniteQuery + VirtualList
  ├─ SearchInput.tsx        — Input + debounce (useDebouncedSearch)
  ├─ ConfirmDialog.tsx      — Modal + danger/warning variant
  ├─ Avatar.tsx             — Image with fallback initials
  ├─ ProgressBar.tsx        — Animated, color variants
  ├─ Dropdown.tsx           — Trigger + menu, click-outside
  └─ Breadcrumb.tsx         — Navigation breadcrumbs
```

### Component Usage Map

| Component | Pages Using It |
|-----------|---------------|
| Button | ALL pages (40+) |
| Card | Dashboard, Courses, Quiz, Leaderboard, Calendar, Announcements |
| Modal | Dashboard (3), Courses (2), QuizManager (1), ClassManagement (1), Assignments (1) |
| Badge | Quiz, Assignments, Announcements, Forum, Leaderboard |
| Skeleton | ALL pages (replace spinners) |
| EmptyState | Dashboard (5 sections), Quiz, Assignments, Courses, Forum, Calendar |
| Input | Login, Profile, Forum, Calendar, QuizManager, CourseBuilder |
| Select | Quiz (class filter), Analytics (filters), Calendar (category) |
| Tabs | Quiz (2 tabs), Assignments (3 tabs), Profile (4 tabs) |
| DataTable | Gradebook, UserManagement, AdminAnalytics |

---

## 6. Layout Components Enhancement

### Header (`src/components/layout/Header.tsx`)

```
Current: 155 lines ✅ (mostly good)

Improvements:
  ├─ [UI] Avatar component (replace inline avatar)
  ├─ [UI] Badge for notification count
  ├─ [UI] Dropdown for profile menu (replace inline)
  └─ Mobile: simplified with hamburger menu
```

### Sidebar (`src/components/layout/Sidebar.tsx`)

```
Current: 183 lines ✅ (mostly good)

Improvements:
  ├─ Collapsible on tablet (icons only)
  ├─ [NEW] Active route indicator animation
  ├─ [NEW] Notification badges on nav items
  └─ Mobile: bottom nav (BottomNav.tsx exists)
```

---

## 7. Pages Needing Most Work

### Priority Matrix

| Page | Hardcoded Data | Missing Skeletons | Missing EmptyStates | Component Extraction | Total Gaps |
|------|:-:|:-:|:-:|:-:|:-:|
| Dashboard | 3 sections | 4 | 5 | 3 modals | **15** |
| TeacherDashboard | 3 sections | 3 | 2 | 0 | **8** |
| LessonViewer | 0 | 2 | 1 | breadcrumb, next-lesson | **5** |
| Quiz Page | 0 | 1 | 1 | 0 | **2** |
| Assignments | 0 | 1 | 1 | 0 | **2** |
| Leaderboard | 0 | 1 | 0 | weekly toggle | **2** |
| Calendar | 0 | 1 | 1 | 0 | **2** |
| Forum | 0 | 1 | 0 | 0 | **1** |

---

## 8. Implementation Order

### Phase UX-1: Design System (Days 1-3)

```
Day 1: Button, Card, Badge, Skeleton, EmptyState
Day 2: Modal, Input, Select, Tabs
Day 3: DataTable + integration tests
```

### Phase UX-2: Dashboard Redesign (Days 4-6)

```
Day 4: Extract Dashboard sub-components + wire API data
Day 5: Teacher Dashboard wire API data + skeletons
Day 6: Layout improvements (sidebar, breadcrumbs)
```

### Phase UX-3: Learning Experience (Days 7-10)

```
Day 7: LessonViewer — breadcrumb + next lesson + mobile
Day 8: Quiz Player polish (transitions, mobile)
Day 9: Assignments tabs + upload progress
Day 10: SearchInput + useDebouncedSearch integration
```

### Phase UX-4: Polish (Days 11-13)

```
Day 11: Leaderboard redesign (weekly toggle, podium)
Day 12: Calendar + Announcements skeleton/empty states
Day 13: Final pass — consistency audit, dark mode check
```

---

## 9. Design Token Reference (Quick)

```css
/* Use these consistently across all UI components */

/* Colors */
--primary:    blue-600        /* Actions, links, focus */
--secondary:  indigo-600      /* Education brand */
--success:    emerald-500     /* Completed, passed */
--warning:    amber-500       /* Deadlines, caution */
--danger:     red-500         /* Errors, destructive */
--neutral:    slate-50..950   /* Backgrounds, borders, text */

/* Radius */
--radius-sm:  rounded-lg      /* 8px — inputs, badges */
--radius-md:  rounded-xl      /* 12px — buttons, cards */
--radius-lg:  rounded-2xl     /* 16px — panels */

/* Shadows */
--shadow-card:    shadow-sm + border border-slate-200
--shadow-modal:   shadow-xl + backdrop-blur-md
--shadow-hover:   shadow-md (on hover)

/* Typography */
--font-heading:   font-family: Nunito
--font-body:      font-family: Inter

/* Animation */
--transition:     200ms ease-out (default)
--stagger:        50ms per item
```

---

## 10. File Output Map

After Phase UX-1, the file structure should be:

```
src/components/ui/
  ├─ index.ts                  ← barrel export
  ├─ Button.tsx
  ├─ Card.tsx
  ├─ Modal.tsx
  ├─ Badge.tsx
  ├─ Skeleton.tsx
  ├─ EmptyState.tsx
  ├─ Input.tsx
  ├─ Select.tsx
  ├─ Tabs.tsx
  └─ DataTable.tsx
```

After Phase UX-2, add:

```
src/components/ui/
  ├─ VirtualList.tsx
  ├─ InfiniteList.tsx
  ├─ SearchInput.tsx
  ├─ ConfirmDialog.tsx
  ├─ Avatar.tsx
  ├─ ProgressBar.tsx
  ├─ Dropdown.tsx
  └─ Breadcrumb.tsx
```
