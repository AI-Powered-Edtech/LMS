# EduSync LMS — UX Blueprint

> Living document: screens, flows, dan design decisions untuk UI/UX redesign.
> Dibuat setelah Phase 0-6 architecture refactor selesai (2026-03-18).
>
> **Companion documents:**
> - [`USER_FLOWS.md`](USER_FLOWS.md) — Detailed screen-by-screen user flows per role, edge cases, state transitions
> - [`SCREEN_SPECS.md`](SCREEN_SPECS.md) — Per-screen component breakdown, data sources, implementation order

---

## 1. Design Foundation

### 1.1 Current Stack

| Layer | Tool | Notes |
|-------|------|-------|
| CSS Framework | Tailwind CSS 4.x | Vite plugin, `@theme` block in `index.css` |
| Component Library | **None** (custom-built) | This is the gap to fill |
| Icons | Lucide React | Consistent across all pages |
| Animation | Motion (Framer Motion) | Page transitions, modals, dropdowns |
| Utility | `cn()` = clsx + tailwind-merge | `src/utils/cn.ts` |
| Fonts | Inter (body) + Nunito (headings) | Google Fonts |
| Theme | Light/Dark via class toggle | `ThemeContext.tsx`, `dark:` variants |
| Charts | Recharts | Analytics pages |
| Virtualization | @tanstack/react-virtual | Only in LessonSidebar |
| DnD | @hello-pangea/dnd | CourseBuilder |

### 1.2 Design Tokens (Existing)

```
Colors:
  Primary    — blue-600 (actions, links, focus rings)
  Secondary  — indigo-600 (education brand)
  Success    — green-500/emerald-500
  Warning    — orange-500/amber-500
  Danger     — red-500/red-600
  Neutral    — slate-50..slate-950
  XP/Reward  — yellow-400..amber-600
  AI         — purple-500..purple-600

Typography:
  Heading    — Nunito (font-bold to font-extrabold)
  Body       — Inter (font-normal to font-semibold)
  Sizes      — text-xs(12) text-sm(14) text-base(16) text-lg(18) text-xl(20) text-2xl(24) text-3xl(30)

Spacing:
  Base unit  — 4px (Tailwind default)
  Cards      — p-4 sm:p-6 (16px / 24px)
  Sections   — gap-6 (24px), space-y-6

Border Radius:
  Small      — rounded-lg (8px)
  Medium     — rounded-xl (12px)
  Large      — rounded-2xl (16px)
  Card       — rounded-3xl (24px) — current default

Shadows:
  Subtle     — shadow-sm
  Card       — shadow-sm (with border)
  Elevated   — shadow-lg
  Modal      — shadow-xl + backdrop-blur
```

### 1.3 Design Principles

1. **Clarity over decoration** — Setiap pixel harus punya fungsi
2. **Progressive disclosure** — Hub → Page → Detail, bukan semua sekaligus
3. **Skeleton-first loading** — Bukan spinner, tapi skeleton yang mirip real content
4. **Empty states are guidance** — Bukan "no data", tapi "here's what to do next"
5. **Mobile-first, desktop-enhanced** — Base design for mobile, enhance for desktop
6. **Consistent patterns** — Same action = same component = same behavior everywhere

---

## 2. User Roles & Personas

### 2.1 Student (Siswa)

**Goal:** Belajar secara efektif, track progress, complete assignments on time.

**Key needs:**
- Quick access ke materi yang sedang dipelajari (continue learning)
- Clear deadline visibility (tugas & kuis)
- Progress feedback (XP, level, streaks)
- AI tutor saat stuck

**Daily flow:**
```
Login → Dashboard → Continue Learning → Complete Lesson → Take Quiz → Check Leaderboard → Logout
```

### 2.2 Teacher (Guru)

**Goal:** Manage classes, create content, track student performance, grade work.

**Key needs:**
- Overview semua kelas sekaligus
- Quick access ke grading (pending submissions)
- Content creation tools (course builder, AI creator)
- Student performance alerts

**Daily flow:**
```
Login → Dashboard → Check Alerts → Grade Submissions → Create Content → Review Analytics → Logout
```

### 2.3 Admin (Administrator)

**Goal:** Manage school operations, users, modules, billing.

**Key needs:**
- System-wide overview
- User management
- Module configuration per tenant
- Financial oversight

**Daily flow:**
```
Login → Dashboard → Check System Health → Manage Users → Configure Modules → Review Reports → Logout
```

---

## 3. Screen Inventory & Redesign Specs

### Legend

| Symbol | Meaning |
|--------|---------|
| (current) | Existing implementation, needs improvement |
| (new) | New screen/component to build |
| (redesign) | Major layout change needed |

---

### 3.1 STUDENT SCREENS

#### S1. Student Dashboard `/` (redesign)

**Current state:** 630 lines, hardcoded schedule data, mock leaderboard rank, inline modals.

**Problems:**
- Schedule data is hardcoded (not from API)
- Leaderboard rank is hardcoded (#12)
- Weekly progress is hardcoded (60%)
- No skeleton loading for courses section
- 3 inline modals bloat the component
- Mixed English/Indonesian labels

**Redesign spec:**

```
┌─────────────────────────────────────────────────────────┐
│ Welcome Card                                            │
│ "Selamat Datang, {name}!"                              │
│ Streak: 🔥 5 hari  |  XP: ⭐ 1,250  |  Level: 🎓 3   │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐ ┌──────────────────────────────┐
│ Kelas Saya           │ │ Tugas Mendekati Deadline      │
│ [ClassCard] [ClassCard] │ [AssignmentItem]             │
│ [+ Gabung Kelas]     │ │ [AssignmentItem]              │
│                      │ │ [AssignmentItem]              │
│                      │ │ [→ Lihat Semua]               │
└──────────────────────┘ └──────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Lanjutkan Belajar                                       │
│ [CourseCard] [CourseCard] [CourseCard] [CourseCard]     │
│                                    [→ Lihat Semua]      │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐ ┌──────────────────────────────┐
│ Pengumuman Terbaru   │ │ Leaderboard (from API)        │
│ [AnnouncementItem]   │ │ Your rank: #{rank}            │
│ [AnnouncementItem]   │ │ Progress to next rank         │
└──────────────────────┘ └──────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Ruang Belajar (Hub)                                     │
│ [Smart Player] [Kuis] [Pusat Tugas] [Tugas Kelompok]  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Progress & Gamification                                 │
│ [XP Card] [Achievements Card] [Quiz Progress Card]      │
└─────────────────────────────────────────────────────────┘
```

**Key changes:**
- Remove hardcoded data → use React Query hooks
- Extract modals to separate components
- Add skeleton loading for each section
- Add empty states for each section
- Consistent Indonesian labels
- Remove schedule section (use Calendar page instead, or fetch from API)

---

#### S2. Lesson Viewer `/lesson`, `/courses/:courseId` (redesign)

**Current state:** Split-panel with sidebar (virtualized) + content area + AI tutor panel.

**Problems:**
- `useViewerReducer` should migrate to Zustand (consistency with quiz)
- No breadcrumb navigation
- Mobile layout needs improvement
- No "next lesson" prompt after completion

**Redesign spec:**

```
Desktop:
┌──────────┬──────────────────────────────┬──────────┐
│ Lesson   │ Content Area                 │ AI Tutor │
│ Sidebar  │                              │ Panel    │
│ (250px)  │ [Video/Article/Quiz/Assign]  │ (320px)  │
│          │                              │          │
│ Module 1 │ ┌──────────────────────┐     │ [Chat]   │
│  ✅ L1   │ │                      │     │ [Input]  │
│  ▶ L2    │ │   Video Player       │     │          │
│  🔒 L3   │ │                      │     │          │
│ Module 2 │ └──────────────────────┘     │          │
│  🔒 L4   │                              │          │
│  🔒 L5   │ Progress: ████████░░ 80%     │          │
│          │                              │          │
│          │ [Discussion / Comments]       │          │
└──────────┴──────────────────────────────┴──────────┘

Mobile:
┌──────────────────────────────┐
│ ← Course Title    [☰] [🤖]  │ ← sidebar toggle + AI toggle
├──────────────────────────────┤
│ Content Area (full width)    │
│ [Video/Article/Quiz/Assign]  │
│                              │
│ Progress: ████████░░ 80%     │
│                              │
│ [← Prev] [Complete ✓] [→]   │
│                              │
│ [Discussion / Comments]      │
└──────────────────────────────┘
```

**Key changes:**
- Add breadcrumb: Course → Module → Lesson
- Add "Complete & Next" button after lesson end
- Mobile: collapsible sidebar + collapsible AI panel
- Migrate useViewerReducer → Zustand store
- Add skeleton loading per content type

---

#### S3. Quiz Player `/quiz` (current — polish)

**Current state:** Well-architected (Phase 3 hardening). QuizPlayer + Header + Body + Footer + Palette + Timer + Autosave.

**Polish items:**
- Add transition animation between questions
- Better mobile QuestionPalette (horizontal scroll instead of grid)
- Add confetti on quiz pass (already exists in QuizResultsView)
- Improve QuizReviewScreen with answer highlighting

---

#### S4. Assignments `/assignments` (current — improve)

**Key improvements:**
- Tab view: Pending | Submitted | Graded
- Add empty state per tab
- Deadline countdown (e.g., "2 hari lagi")
- Add file upload progress indicator

---

#### S5. Leaderboard `/leaderboard` (current — improve)

**Key improvements:**
- Weekly vs All-time toggle
- Current user highlighted in list
- Top 3 podium display
- Add class filter

---

#### S6. Certificates `/certificates` (current)

**Already optimized** in Phase 6 (615KB → 22KB). Minimal changes needed.

---

### 3.2 TEACHER SCREENS

#### T1. Teacher Dashboard `/teacher-dashboard` (redesign)

**Current state:** 238 lines, some hardcoded data (class averages, activity feed).

**Problems:**
- Class average is hardcoded (85%)
- Activity feed is hardcoded
- No real pending grading count integration
- Missing student at-risk alerts from analytics

**Redesign spec:**

```
┌─────────────────────────────────────────────────────────┐
│ Welcome + Quick Actions                                 │
│ "Selamat Datang, {name}!"                              │
│ [Kelola Materi] [Buat Tugas] [Buat Kuis]              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🔔 Perlu Perhatian                                     │
│ [AlertCard: X tugas perlu dikoreksi]                   │
│ [AlertCard: Y siswa at-risk]                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Kelas Aktif                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│ │ Kelas 8A│ │ Kelas 8B│ │ Kelas 9A│                   │
│ │ 32 siswa│ │ 28 siswa│ │ 30 siswa│                   │
│ │ Avg: 82%│ │ Avg: 75%│ │ Avg: 88%│                   │
│ │ [Detail] │ │ [Detail] │ │ [Detail] │                 │
│ └─────────┘ └─────────┘ └─────────┘                   │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐ ┌──────────────────────────────┐
│ Peralatan Mengajar   │ │ Aktivitas Terbaru (from API) │
│ [Buku Nilai]         │ │ [ActivityItem]                │
│ [Analitik]           │ │ [ActivityItem]                │
│ [SpeedGrader]        │ │ [ActivityItem]                │
└──────────────────────┘ └──────────────────────────────┘
```

**Key changes:**
- Real data from API (class averages, activity feed, pending grading)
- At-risk student alerts from analytics feature module
- Skeleton loading per section
- Empty states

---

#### T2. Course Builder `/teaching/course-builder` (current — minor polish)

**Already well-built.** Polish items:
- Add drag handle visual feedback
- Module completion % indicator
- Better empty state for new course

---

#### T3. Quiz Manager `/teaching/quiz-manager` (current — improve)

**Key improvements:**
- Published/Draft/Archived tabs
- Bulk assign to multiple classes
- Assignment status indicators per class

---

#### T4. SpeedGrader `/grader` (current — improve)

**Key improvements:**
- Submission queue sidebar
- Rubric panel alongside submission
- Quick score buttons
- "Next ungraded" button

---

#### T5. Analytics `/analytics` (current — improve)

**Key improvements:**
- Date range selector
- Export to PDF
- At-risk student highlighting
- Comparison between classes

---

### 3.3 ADMIN SCREENS

#### A1. Admin Dashboard `/admin/administration` (current)

**Key improvements:**
- System health overview card
- Active users count (real-time)
- Module enable/disable toggles with confirmation
- Recent audit log entries

---

#### A2. User Management `/admin/users` (current)

**Key improvements:**
- Search + filter (by role, status)
- Bulk actions (invite, deactivate)
- Role change with audit trail
- Pagination (useInfiniteQuery)

---

## 4. Core User Flows

### 4.1 Student Learning Flow (Critical Path)

```
                    ┌─────────┐
                    │  Login  │
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │Dashboard│
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼────┐ ┌──▼──┐ ┌───▼────┐
         │ Courses │ │Quiz │ │Assign- │
         │ Browser │ │List │ │ments   │
         └────┬────┘ └──┬──┘ └───┬────┘
              │         │        │
         ┌────▼────┐ ┌──▼──┐ ┌──▼───┐
         │ Lesson  │ │Quiz │ │Submit│
         │ Viewer  │ │Play │ │Work  │
         └────┬────┘ └──┬──┘ └──┬───┘
              │         │       │
              └────┬────┘───────┘
                   │
              ┌────▼────┐
              │Complete │
              │+XP +Badge│
              └────┬────┘
                   │
              ┌────▼────┐
              │ Next    │
              │ Activity│
              └─────────┘
```

**UX Requirements:**
1. Dashboard → Course harus max 2 klik
2. Lesson completion harus auto-track (ProgressReporter sudah ada)
3. Quiz submit harus ada konfirmasi + review screen
4. XP reward harus ada visual feedback (sudah ada confetti)
5. "Continue Learning" harus selalu visible di dashboard

---

### 4.2 Teacher Grading Flow

```
         ┌──────────┐
         │Dashboard │
         │ Alert:   │
         │ "5 tugas │
         │  pending"│
         └────┬─────┘
              │ click alert
         ┌────▼─────┐
         │Speed-    │
         │Grader    │
         │          │
         │ [Queue]  │
         │ [Rubric] │
         │ [Score]  │
         └────┬─────┘
              │ grade
         ┌────▼─────┐
         │ Next     │
         │ Ungraded │
         └────┬─────┘
              │ repeat until done
         ┌────▼─────┐
         │ All Done │
         │ Summary  │
         └──────────┘
```

**UX Requirements:**
1. Alert di dashboard harus clickable → langsung ke SpeedGrader
2. SpeedGrader harus punya queue (sidebar list of submissions)
3. "Next ungraded" button untuk speed
4. Grading summary saat selesai

---

### 4.3 Teacher Content Creation Flow

```
         ┌──────────┐
         │Dashboard │
         └────┬─────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼────┐ ┌─▼──────┐ ┌▼────────┐
│Course  │ │Quiz    │ │AI       │
│Builder │ │Manager │ │Creator  │
└───┬────┘ └─┬──────┘ └┬────────┘
    │        │         │
┌───▼────┐ ┌─▼──────┐ ┌▼────────┐
│Add     │ │Create  │ │Generate │
│Modules │ │Questions│ │from Doc │
│+Lessons│ │         │ │         │
└───┬────┘ └─┬──────┘ └┬────────┘
    │        │         │
    └────┬───┘─────────┘
         │
    ┌────▼─────┐
    │ Assign   │
    │ to Class │
    └────┬─────┘
         │
    ┌────▼─────┐
    │ Publish  │
    └──────────┘
```

---

### 4.4 Student Join Class Flow

```
   ┌──────────────┐        ┌───────────────┐
   │ Deep Link    │        │ Dashboard     │
   │ /?join=XH2K7 │        │ [Gabung Kelas]│
   └──────┬───────┘        └──────┬────────┘
          │                       │
          └───────┬───────────────┘
                  │
           ┌──────▼──────┐
           │ Join Modal  │
           │ Enter Code  │
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │ Success     │
           │ Animation   │
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │ Class Page  │
           └─────────────┘
```

---

## 5. Shared UI Component Spec (`src/components/ui/`)

### 5.1 Priority Components (Phase UX-1)

| # | Component | Used In | Props |
|---|-----------|---------|-------|
| 1 | `Button` | Everywhere | `variant: primary\|secondary\|ghost\|danger`, `size: sm\|md\|lg`, `loading`, `icon`, `fullWidth` |
| 2 | `Card` | Dashboard, lists | `padding: sm\|md\|lg`, `hover`, `onClick` |
| 3 | `Modal` | 8+ modals across app | `open`, `onClose`, `title`, `size: sm\|md\|lg\|xl` |
| 4 | `Badge` | Status indicators | `variant: info\|success\|warning\|danger\|neutral`, `size: sm\|md` |
| 5 | `Skeleton` | All loading states | `variant: text\|circle\|rect\|card`, `width`, `height`, `count` |
| 6 | `EmptyState` | All list pages | `icon`, `title`, `description`, `action: { label, onClick }` |
| 7 | `Input` | Forms | `label`, `error`, `icon`, `size: sm\|md\|lg` |
| 8 | `Select` | Filters, forms | `options`, `value`, `onChange`, `placeholder` |
| 9 | `Tabs` | Multi-view pages | `tabs: { id, label, icon?, count? }[]`, `activeTab`, `onChange` |
| 10 | `DataTable` | Gradebook, admin | `columns`, `data`, `sortable`, `pagination`, `loading` |

### 5.2 Enhanced Components (Phase UX-2)

| # | Component | Used In | Props |
|---|-----------|---------|-------|
| 11 | `VirtualList` | Long lists | `items`, `renderItem`, `itemHeight`, `overscan` |
| 12 | `InfiniteList` | Paginated lists | `queryFn`, `renderItem`, `emptyState` |
| 13 | `SearchInput` | Course search, user search | `value`, `onChange`, `debounceMs`, `placeholder` |
| 14 | `ConfirmDialog` | Destructive actions | `title`, `message`, `onConfirm`, `variant: danger\|warning` |
| 15 | `Avatar` | Users | `src`, `name` (fallback initials), `size` |
| 16 | `ProgressBar` | XP, lessons | `value`, `max`, `color`, `label`, `showPercent` |
| 17 | `Dropdown` | Header, actions | `trigger`, `items`, `align` |
| 18 | `Toast` | Already exists (Sonner) | Enhance with consistent styling |

---

## 6. Loading & Error Patterns

### 6.1 Skeleton Loading Rules

```
Page load:       Show AppLoading (header + sidebar skeleton) — ALREADY EXISTS
Section load:    Show SkeletonCard / SkeletonList per section
Component load:  Show inline Skeleton matching final layout
Data refetch:    Keep stale data visible, show subtle refresh indicator
```

**Skeleton components needed:**

```
SkeletonCard     — Card shape with pulsing content lines
SkeletonList     — Repeated SkeletonCard in list layout
SkeletonTable    — Table header + row placeholders
SkeletonText     — Single line of pulsing text
SkeletonAvatar   — Circle placeholder
```

### 6.2 Empty State Rules

Every list/data view MUST have an empty state with:
1. Relevant icon
2. Clear message (what is this section?)
3. Action button (what should user do?)

Examples:
```
Courses (student):   BookOpen icon  → "Belum ada materi"    → [Gabung Kelas]
Assignments:         FileText icon  → "Belum ada tugas"     → [Lihat Jadwal]
Notifications:       Bell icon      → "Semua sudah dibaca"  → [—]
Quiz History:        HelpCircle     → "Belum pernah kuis"   → [Mulai Kuis]
Classes (teacher):   Users icon     → "Belum ada kelas"     → [Buat Kelas]
```

### 6.3 Error UI Rules

```
API Error:      FeatureErrorBoundary (already exists) + retry button
Network Error:  OfflineBanner (already exists) + queue actions
Form Error:     Inline field error + toast summary
Permission:     Redirect to /unauthorized with explanation
404:            Friendly "halaman tidak ditemukan" with [Kembali ke Dashboard]
```

---

## 7. Responsive Breakpoints

```
Mobile:   < 768px  (md)  — Single column, bottom nav, collapsible sidebar
Tablet:   768-1024px     — Two columns, sidebar visible
Desktop:  > 1024px (lg)  — Full layout, three columns where needed
```

### Key responsive behaviors:

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Sidebar | Hidden (bottom nav) | Collapsed (icons only) | Full width |
| Header | Simplified | Full | Full |
| Dashboard grid | 1 col | 2 col | 2-3 col |
| Course cards | 1 col | 2 col | 4 col |
| Lesson Viewer | Stacked | Sidebar + Content | Sidebar + Content + AI |
| Quiz Palette | Horizontal scroll | Grid | Grid sidebar |
| Modals | Full screen | Centered (md) | Centered (lg) |

---

## 8. Animation Guidelines

```
Page transitions:    opacity + translateY(8px), 200ms ease-out  — ALREADY EXISTS
Modal enter:         opacity + scale(0.95→1), 200ms             — ALREADY EXISTS
Modal exit:          opacity + scale(1→0.95), 150ms             — ALREADY EXISTS
List items:          stagger 50ms, opacity + translateY(4px)
Hover:               translateY(-2px) on cards, 150ms
Button press:        scale(0.97), 100ms
Tab switch:          Underline slide animation
Progress bar:        width transition 500ms ease-out
Skeleton pulse:      animate-pulse (Tailwind default)

DON'T animate:
- Large layout shifts
- Content that needs to be read immediately
- Anything on scroll (keep scrolling smooth)
```

---

## 9. Implementation Phases

### Phase UX-1: Design System (Effort: 2-3 hari)

**Goal:** Shared UI primitives sehingga semua halaman konsisten.

```
Tasks:
1. Create src/components/ui/ directory
2. Build 10 core components (Button, Card, Modal, Badge, Skeleton, EmptyState, Input, Select, Tabs, DataTable)
3. Migrate existing inline patterns to use shared components (gradual)
4. Add Storybook-like preview page (optional, low priority)
```

### Phase UX-2: Layout & Navigation (Effort: 2-3 hari)

**Goal:** Improved navigation flow, responsive layouts.

```
Tasks:
1. Sidebar redesign (collapsible, better mobile)
2. Dashboard redesign — Student (remove hardcoded data)
3. Dashboard redesign — Teacher (remove hardcoded data)
4. Add breadcrumb navigation
5. Improve bottom nav for mobile
```

### Phase UX-3: Learning Experience (Effort: 3-5 hari)

**Goal:** Polish critical learning paths.

```
Tasks:
1. Lesson Viewer improvements (breadcrumb, next lesson, mobile)
2. Quiz Player polish (mobile palette, transitions)
3. Assignment flow improvements (tabs, upload progress)
4. Leaderboard redesign (podium, filters)
5. Search with debounce (useDebouncedSearch)
```

### Phase UX-4: Data-Driven Polish (Effort: 2-3 hari)

**Goal:** Replace hardcoded data, add real loading/empty states.

```
Tasks:
1. Dashboard data from API (schedule, leaderboard rank, progress)
2. Skeleton loading for every section
3. Empty states for every list
4. Stale time strategy per domain
5. useInfiniteQuery for long lists
```

---

## 10. Files Reference

| File | Purpose |
|------|---------|
| `src/components/ui/` | NEW — Shared UI primitives |
| `src/config/navigation.ts` | Navigation items config |
| `src/components/layout/` | Header, Sidebar, Layouts |
| `src/pages/Dashboard.tsx` | Student dashboard (630 lines) |
| `src/pages/TeacherDashboard.tsx` | Teacher dashboard (238 lines) |
| `src/components/LessonViewer/` | Lesson viewer components |
| `src/features/quizzes/components/` | Quiz player components |
| `src/utils/cn.ts` | Class utility (clsx + tailwind-merge) |
| `src/index.css` | Tailwind theme config |
| `src/contexts/ThemeContext.tsx` | Dark/light mode |

---

## 11. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Shared UI components | 0 | 18 |
| Hardcoded data in dashboards | 8+ | 0 |
| Pages with skeleton loading | 3 | All |
| Pages with empty states | ~2 | All |
| Dashboard → Lesson clicks | 3-4 | 2 |
| Mobile usability score | ~60% | 85%+ |
| Component duplication | High | Low |
| Build size impact | 14.7s | < 16s |
