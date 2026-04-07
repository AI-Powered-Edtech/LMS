# EduSync LMS — Component Registry

> Living registry of all key components in the codebase.
> Last Updated: 2026-04-05

---

## Summary

| Category          | Active | Deprecated | Under Review | Total |
| ----------------- | ------ | ---------- | ------------ | ----- |
| Feature Modules   | 49     | 0          | 0            | 49    |
| Edge Functions    | 26     | 0          | 0            | 26    |
| Shared Hooks      | 17     | 0          | 0            | 17    |
| Utility Functions | 30+    | 0          | 0            | 30+   |
| UI Primitives     | 30+    | 0          | 0            | 30+   |
| Context Providers | 3      | 0          | 0            | 3     |
| Zustand Stores    | 3      | 0          | 0            | 3     |

**Codebase Version**: `ff4edf1` (latest tag: `v0.3-core-lms-complete`)
**Total Commits**: 636
**Branch**: `main`

---

## Feature Registry

| Component Name       | Short Description                                                                                       | Status | Last Updated | Codebase Version | Notes                        |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------ | ------------ | ---------------- | ---------------------------- |
| `accessibility`      | WCAG 2.1 AA compliance tools (font size, contrast, keyboard)                                            | Active | 2026-04-02   | ff4edf1          | Phase 30                     |
| `adaptive-paths`     | Adaptive learning paths based on student performance; dedicated mgmt page `src/pages/AdaptivePaths.tsx` | Active | 2026-04-05   | ff4edf1          | Phase 31                     |
| `administration`     | Tenant management, school config, bulk import, finance dashboard                                        | Active | 2026-04-02   | ff4edf1          | Phase 28                     |
| `ai-authoring`       | AI content generation from files or lessons (unified)                                                   | Active | 2026-04-05   | ff4edf1          | Phase 39A - NEW              |
| `ai-quiz-gen`        | AI quiz generation (re-export wrapper)                                                                  | Active | 2026-04-05   | ff4edf1          | Wrapper over ai-authoring    |
| `ai-recommendations` | AI-based learning recommendations                                                                       | Active | 2026-04-02   | ff4edf1          | Phase 30                     |
| `ai-tutor`           | AI learning assistant chat                                                                              | Active | 2026-04-02   | ff4edf1          | Uses Groq LLM                |
| `analytics`          | Engagement, progress & performance analytics                                                            | Active | 2026-04-02   | ff4edf1          | Phase 30                     |
| `announcements`      | School announcement system                                                                              | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `assignments`        | Assignment management & submission                                                                      | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `attendance`         | Student attendance tracking                                                                             | Active | 2026-04-02   | ff4edf1          | Phase 29                     |
| `auth`               | Authentication (login, register, password reset, invite)                                                | Active | 2026-04-02   | ff4edf1          | Core                         |
| `calendar`           | Academic calendar with events                                                                           | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `certificates`       | Certificate template customization                                                                      | Active | 2026-04-02   | ff4edf1          | Phase 26                     |
| `classroom`          | Class management & student roster                                                                       | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `courses`            | Course creation & management                                                                            | Active | 2026-04-02   | ff4edf1          | Core                         |
| `creator`            | AI content generator (re-export wrapper)                                                                | Active | 2026-04-05   | ff4edf1          | Wrapper over ai-authoring    |
| `dashboards`         | Customizable dashboard widgets                                                                          | Active | 2026-04-02   | ff4edf1          | Phase 30                     |
| `discussions`        | Course discussion forum                                                                                 | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `gamification`       | XP, badges, levels, streaks, leaderboards                                                               | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `gradebook`          | Digital gradebook                                                                                       | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `guidance`           | In-app guides, tooltips, walkthroughs                                                                   | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `interactive-blocks` | Interactive lesson blocks (drag-drop, flashcard, etc.)                                                  | Active | 2026-04-02   | ff4edf1          | Phase 26                     |
| `lessons`            | Lesson content with blocks & video                                                                      | Active | 2026-04-02   | ff4edf1          | Core                         |
| `lti`                | LTI 1.3 integration for external LMS                                                                    | Active | 2026-04-02   | ff4edf1          | Phase 26                     |
| `moderation`         | Content moderation                                                                                      | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `notifications`      | Real-time notifications                                                                                 | Active | 2026-04-02   | ff4edf1          | Uses polling (not WebSocket) |
| `onboarding`         | User onboarding flows                                                                                   | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `parent`             | Parent portal for child monitoring                                                                      | Active | 2026-04-02   | ff4edf1          | Phase 29                     |
| `peer-review`        | Peer assessment system                                                                                  | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `plagiarism`         | Plagiarism detection; dashboard page `src/pages/PlagiarismDashboard.tsx` with stats & color-coding      | Active | 2026-04-05   | ff4edf1          | Phase 31                     |
| `principal`          | Executive dashboard for school heads                                                                    | Active | 2026-04-02   | ff4edf1          | Phase 30                     |
| `profile`            | User profile management                                                                                 | Active | 2026-04-02   | ff4edf1          | Core                         |
| `progress`           | Student progress tracking                                                                               | Active | 2026-04-02   | ff4edf1          | Phase 26                     |
| `question-bank`      | Reusable question repository                                                                            | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `quests`             | Learning quests system                                                                                  | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `quizzes`            | Quiz engine with anti-cheat                                                                             | Active | 2026-04-02   | ff4edf1          | Phase 26                     |
| `recommendations`    | Content recommendations                                                                                 | Active | 2026-04-02   | ff4edf1          | Phase 26                     |
| `reports`            | Academic & financial report generation                                                                  | Active | 2026-04-02   | ff4edf1          | Phase 28                     |
| `rubrics`            | Dynamic rubric builder                                                                                  | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `search`             | Global search                                                                                           | Active | 2026-04-02   | ff4edf1          | Phase 27                     |
| `semester`           | Semester management: create/close semesters, clone courses, bulk promote students, rapor digital        | Active | 2026-04-05   | ff4edf1          | Phase 39B — NEW              |
| `settings`           | User settings (API-only)                                                                                | Active | 2026-04-02   | ff4edf1          | Core                         |
| `storage`            | File & media management                                                                                 | Active | 2026-04-02   | ff4edf1          | Core                         |
| `struggle`           | Student struggle detection                                                                              | Active | 2026-04-02   | ff4edf1          | Phase 26                     |
| `video`              | Video upload & playback                                                                                 | Active | 2026-04-05   | ff4edf1          | WCAG 1.2.2 caption support   |
| `xapi`               | xAPI Learning Record Store (API-only)                                                                   | Active | 2026-04-02   | ff4edf1          | Phase 26                     |

---

## Logic Registry

### Shared Hooks (`src/hooks/`)

| Component Name       | Short Description                               | Status | Last Updated | Codebase Version | Notes  |
| -------------------- | ----------------------------------------------- | ------ | ------------ | ---------------- | ------ |
| `useToast`           | Zustand-based toast notification store          | Active | 2026-04-02   | ff4edf1          | Global |
| `useDebounce`        | Debounce any value with configurable delay      | Active | 2026-04-02   | ff4edf1          | Global |
| `useNetworkStatus`   | Detect online/offline status for PWA            | Active | 2026-04-02   | ff4edf1          | Global |
| `usePageTitle`       | Dynamic document title management               | Active | 2026-04-02   | ff4edf1          | Global |
| `useRoleBasedPath`   | Role-based navigation path resolution           | Active | 2026-04-02   | ff4edf1          | Global |
| `useLazyImage`       | Lazy loading image with intersection observer   | Active | 2026-04-02   | ff4edf1          | Global |
| `useNavBadges`       | Navigation badge count management               | Active | 2026-04-02   | ff4edf1          | Global |
| `usePWA`             | PWA installation and update detection           | Active | 2026-04-02   | ff4edf1          | Global |
| `usePWAInstall`      | PWA install prompt handling                     | Active | 2026-04-02   | ff4edf1          | Global |
| `useModuleConfig`    | Feature flag/module configuration               | Active | 2026-04-02   | ff4edf1          | Global |
| `usePageHelp`        | Page help tooltip management                    | Active | 2026-04-02   | ff4edf1          | Global |
| `useSyncQueueCount`  | Offline sync queue count                        | Active | 2026-04-02   | ff4edf1          | Global |
| `useReducedMotion`   | Accessibility - respect user motion preferences | Active | 2026-04-02   | ff4edf1          | Global |
| `useFormSubmit`      | Form submission with loading/error states       | Active | 2026-04-02   | ff4edf1          | Global |
| `useDraftAutosave`   | Auto-save form drafts to localStorage           | Active | 2026-04-02   | ff4edf1          | Global |
| `useArrowNavigation` | Keyboard arrow navigation handling              | Active | 2026-04-02   | ff4edf1          | Global |
| `useUndoableAction`  | Undo/redo functionality wrapper                 | Active | 2026-04-02   | ff4edf1          | Global |

### Context Providers (`src/contexts/`)

| Component Name   | Short Description                                                  | Status | Last Updated | Codebase Version | Notes |
| ---------------- | ------------------------------------------------------------------ | ------ | ------------ | ---------------- | ----- |
| `AuthContext`    | User authentication, session, roles, permissions, tenant switching | Active | 2026-04-02   | ff4edf1          | Core  |
| `ThemeContext`   | Theme (light/dark/system), high contrast, font size                | Active | 2026-04-02   | ff4edf1          | Core  |
| `BuilderContext` | Course builder context                                             | Active | 2026-04-02   | ff4edf1          | Core  |

### Zustand Stores

| Component Name          | Short Description                               | Status | Last Updated | Codebase Version | Notes           |
| ----------------------- | ----------------------------------------------- | ------ | ------------ | ---------------- | --------------- |
| `useQuizPlayerStore`    | Quiz player state (answers, navigation, flags)  | Active | 2026-04-02   | ff4edf1          | quizzes feature |
| `useCreatorBridgeStore` | AI quiz data bridge between Creator and Builder | Active | 2026-04-05   | ff4edf1          | creator feature |
| `useToast` (Zustand)    | Toast notification store                        | Active | 2026-04-02   | ff4edf1          | Global          |

### UI Components (`src/components/ui/`)

| Component Name             | Short Description                                     | Status | Last Updated | Codebase Version | Notes |
| -------------------------- | ----------------------------------------------------- | ------ | ------------ | ---------------- | ----- |
| `Button`                   | Primary UI button with variants, sizes, loading state | Active | 2026-04-02   | ff4edf1          | Core  |
| `Input`                    | Form input with label, error, icon support            | Active | 2026-04-02   | ff4edf1          | Core  |
| `Select`                   | Dropdown select with options                          | Active | 2026-04-02   | ff4edf1          | Core  |
| `Modal`                    | Modal dialog with focus trap, escape key, backdrop    | Active | 2026-04-02   | ff4edf1          | Core  |
| `Toast` / `ToastContainer` | Toast notification UI                                 | Active | 2026-04-02   | ff4edf1          | Core  |
| `Badge`                    | Status/count badge                                    | Active | 2026-04-02   | ff4edf1          | Core  |
| `Avatar`                   | User avatar image                                     | Active | 2026-04-02   | ff4edf1          | Core  |
| `Card`                     | Card container                                        | Active | 2026-04-02   | ff4edf1          | Core  |
| `Skeleton`                 | Loading placeholder                                   | Active | 2026-04-02   | ff4edf1          | Core  |
| `Spinner`                  | Loading spinner                                       | Active | 2026-04-02   | ff4edf1          | Core  |
| `Tooltip`                  | Tooltip overlay                                       | Active | 2026-04-02   | ff4edf1          | Core  |
| `Tabs`                     | Tab navigation                                        | Active | 2026-04-02   | ff4edf1          | Core  |
| `Breadcrumb`               | Breadcrumb trail                                      | Active | 2026-04-02   | ff4edf1          | Core  |
| `EmptyState`               | Empty content placeholder                             | Active | 2026-04-02   | ff4edf1          | Core  |
| `FormField`                | Form field wrapper                                    | Active | 2026-04-02   | ff4edf1          | Core  |
| `ErrorBoundary`            | React error boundary                                  | Active | 2026-04-02   | ff4edf1          | Core  |
| `VirtualTable`             | Virtualized table for large datasets                  | Active | 2026-04-02   | ff4edf1          | Core  |
| `MathRenderer`             | Math equation rendering                               | Active | 2026-04-02   | ff4edf1          | Core  |
| `OptimizedImage`           | Optimized image with lazy loading                     | Active | 2026-04-02   | ff4edf1          | Core  |
| `OfflineBanner`            | Offline mode indicator                                | Active | 2026-04-02   | ff4edf1          | Core  |
| `InstallPrompt`            | PWA install prompt                                    | Active | 2026-04-02   | ff4edf1          | Core  |
| `PrefetchLink`             | Link with prefetching                                 | Active | 2026-04-02   | ff4edf1          | Core  |
| `BulkActionBar`            | Bulk selection action bar                             | Active | 2026-04-02   | ff4edf1          | Core  |
| `HelpButton`               | Help tooltip button                                   | Active | 2026-04-02   | ff4edf1          | Core  |

### Layout Components (`src/components/layout/`)

| Component Name    | Short Description        | Status | Last Updated | Codebase Version | Notes |
| ----------------- | ------------------------ | ------ | ------------ | ---------------- | ----- |
| `Layout`          | Main layout wrapper      | Active | 2026-04-02   | ff4edf1          | Core  |
| `StudentLayout`   | Student role layout      | Active | 2026-04-02   | ff4edf1          | Core  |
| `TeacherLayout`   | Teacher role layout      | Active | 2026-04-02   | ff4edf1          | Core  |
| `AdminLayout`     | Admin role layout        | Active | 2026-04-02   | ff4edf1          | Core  |
| `ParentLayout`    | Parent role layout       | Active | 2026-04-02   | ff4edf1          | Core  |
| `PrincipalLayout` | Principal role layout    | Active | 2026-04-02   | ff4edf1          | Core  |
| `Sidebar`         | Navigation sidebar       | Active | 2026-04-02   | ff4edf1          | Core  |
| `MobileSidebar`   | Mobile sidebar           | Active | 2026-04-02   | ff4edf1          | Core  |
| `Header`          | Page header              | Active | 2026-04-02   | ff4edf1          | Core  |
| `BottomNav`       | Mobile bottom navigation | Active | 2026-04-02   | ff4edf1          | Core  |
| `AppShell`        | App shell container      | Active | 2026-04-02   | ff4edf1          | Core  |

### Guard Components (`src/components/guards/`)

| Component Name          | Short Description                       | Status | Last Updated | Codebase Version | Notes |
| ----------------------- | --------------------------------------- | ------ | ------------ | ---------------- | ----- |
| `AuthGuard`             | Protect routes requiring authentication | Active | 2026-04-02   | ff4edf1          | Core  |
| `RoleResolver`          | Resolve user roles                      | Active | 2026-04-02   | ff4edf1          | Core  |
| `CourseEnrollmentGuard` | Check course enrollment status          | Active | 2026-04-02   | ff4edf1          | Core  |

---

## Function Registry

### Edge Functions (`supabase/functions/`)

| Component Name               | Short Description                 | Status | Last Updated | Codebase Version | Notes                  |
| ---------------------------- | --------------------------------- | ------ | ------------ | ---------------- | ---------------------- |
| `ai-grade-essay`             | AI essay grading using Groq LLM   | Active | 2026-04-02   | ff4edf1          | Teacher/admin only     |
| `ai-tutor`                   | AI learning tutor chat            | Active | 2026-04-02   | ff4edf1          | Uses Groq LLM          |
| `bulk-import-users`          | Bulk user import from CSV         | Active | 2026-04-02   | ff4edf1          | Admin only             |
| `check-plagiarism`           | Internal plagiarism checker       | Active | 2026-04-02   | ff4edf1          | Teacher/admin only     |
| `check-rate-limit`           | Server-side rate limiting         | Active | 2026-04-02   | ff4edf1          | Service role           |
| `generate-ai-content`        | AI content generation from files  | Active | 2026-04-05   | ff4edf1          | Teacher/admin only     |
| `generate-executive-report`  | Executive report generation       | Active | 2026-04-02   | ff4edf1          | Principal/admin only   |
| `generate-parent-report`     | Parent report generation          | Active | 2026-04-02   | ff4edf1          | Parent/admin/principal |
| `generate-pdf`               | PDF certificate generation        | Active | 2026-04-02   | ff4edf1          | User JWT               |
| `grade-quiz-attempt`         | Background quiz grading           | Active | 2026-04-02   | ff4edf1          | Service role           |
| `generate-quiz-from-content` | AI quiz generation from lesson    | Active | 2026-04-05   | ff4edf1          | Teacher/admin only     |
| `health-check`               | Public health monitoring          | Active | 2026-04-02   | ff4edf1          | No auth (public)       |
| `load-quiz-data`             | Load quiz for student attempts    | Active | 2026-04-02   | ff4edf1          | Strips correct answers |
| `lti-grade-passback`         | LTI grade passback                | Active | 2026-04-02   | ff4edf1          | Service role or JWT    |
| `lti-jwks`                   | Public JWKS for LTI               | Active | 2026-04-02   | ff4edf1          | No auth (public)       |
| `lti-launch`                 | LTI launch handler                | Active | 2026-04-02   | ff4edf1          | Platform-initiated     |
| `lti-oidc-login`             | LTI OIDC login initiation         | Active | 2026-04-02   | ff4edf1          | Platform-initiated     |
| `process-progress-events`    | Queue processor for progress      | Active | 2026-04-02   | ff4edf1          | API key                |
| `progress-events`            | Ingestion endpoint for progress   | Active | 2026-04-02   | ff4edf1          | User JWT               |
| `recommend-learning-path`    | AI-powered lesson recommendations | Active | 2026-04-02   | ff4edf1          | User JWT               |
| `scorm-extract`              | SCORM package upload handler      | Active | 2026-04-02   | ff4edf1          | Teacher/admin only     |
| `send-email-digest`          | Email digest sender               | Active | 2026-04-02   | ff4edf1          | Service role           |
| `send-parent-digest`         | Parent digest notification        | Active | 2026-04-02   | ff4edf1          | Service role           |
| `send-parent-otp`            | Parent OTP verification           | Active | 2026-04-02   | ff4edf1          | Phone verification     |
| `send-push`                  | Web Push notification sender      | Active | 2026-04-02   | ff4edf1          | User JWT               |
| `video-webhook`              | Video provider webhook handler    | Active | 2026-04-05   | ff4edf1          | Webhook secret         |

---

## Update Procedure

This document should be kept in sync with the codebase through a combination of automated scripts and manual reviews.

### Automated Scripts

1. **Feature Enumeration Script** (`scripts/score-features.js`)
   - Counts active features and generates statistics
   - Run: `node scripts/score-features.js`
   - Output: Feature counts and module statistics

2. **Component Discovery Script** (future)
   - Planned: Script to auto-generate component tables from codebase

### CI Integration Points

1. **Pre-commit Hook**
   - Run linting and type checking before commits
   - Command: `pnpm typecheck && pnpm lint`

2. **Pull Request Pipeline**
   - Automated builds on PR
   - Command: `pnpm build`

3. **Release Process**
   - Update version tag on release
   - Automatically update this registry's "Codebase Version" column

### Version Control Workflow

1. **After Each Significant Task**
   - Update the relevant registry entry with new "Last Updated" date
   - Add entry to `CHANGELOG.md`

2. **Before Release**
   - Run full audit of all registry sections
   - Update "Codebase Version" to new tag
   - Verify all "Status" fields are accurate

### Recommended Manual Review

1. **Weekly Review**
   - Check for new feature modules in `src/features/`
   - Verify new Edge Functions in `supabase/functions/`

2. **Monthly Review**
   - Full scan of `src/hooks/` for new shared hooks
   - Full scan of `src/components/ui/` for new UI primitives
   - Update deprecated items status

3. **Quarterly Review**
   - Comprehensive registry regeneration
   - Verify all component descriptions are accurate
   - Clean up any orphaned or unused entries

### Manual Update Steps

To manually update this registry:

1. **Add new Feature Module**
   - Add row to Feature Registry table
   - Set Status: "Active"
   - Set Last Updated: Current date (YYYY-MM-DD)
   - Set Codebase Version: Current git hash

2. **Deprecate Component**
   - Change Status to "Deprecated"
   - Add Notes explaining reason and replacement

3. **Under Review**
   - Change Status to "Under Review"
   - Add Notes explaining what needs review

### Quick Update Command

To quickly update the git hash version across this document:

```bash
# Get current hash
git rev-parse --short HEAD

# Find and replace old hash in file
sed -i 's/ff4edf1/<NEW_HASH>/g' COMPONENT_REGISTRY.md
```

---

_This document is maintained as part of the EduSync LMS codebase. See `AGENTS.md` for update guidelines._
