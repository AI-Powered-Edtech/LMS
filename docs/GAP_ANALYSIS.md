# EduSync LMS - E2E Test Gap Analysis

## Overview

We executed a comprehensive suite of E2E tests using Playwright covering all 24 core flows and 4 cross-cutting concerns. The test suite comprises over 200 unique test scenarios running against three distinct roles (Student, Teacher, Admin), totaling ~600 test executions.

## Current State & Successes

- **Coverage**: All 24 flows (F1 to F24) are fully covered by E2E tests, verifying page loads, state transitions, empty states, and core UI interactions.
- **Cross-Cutting**: Tests successfully verify Dark Mode rendering, Mobile Responsiveness (375px), Console Errors, and Empty/Loading state graceful resolutions.
- **Resilience**: We addressed initial flakiness by adding appropriate timeouts, fixing React controlled input handlers (`page.fill`), and removing blocking `networkidle` waits which conflict with Supabase's realtime subscriptions.

## Identified Gaps in Real User Scenarios

1. **State Persistence Delays (Supabase)**
   - **Gap**: Many "element not found" timeouts stem from the app taking longer than 15s to load content from Supabase. With 2 workers, the development database struggles under concurrent load.
   - **Impact**: Real users on slow connections or during peak traffic might experience long loading states or temporary blank screens before Supabase subscriptions resolve.
2. **Hidden Navigation Elements Overlap**
   - **Gap**: The DOM structure includes hidden span elements in bottom navigation (e.g., `<span class="text-[10px]">Kuis</span>`) that preemptively match broad text selectors like `text=/Kuis/i`. Tests failed because these hidden elements resolve before the actual `<h1>` headings.
   - **Impact**: Screen readers or accessibility tools might pick up hidden navigation elements inappropriately, causing confusion for impaired users.

3. **Missing Unique Identifiers (data-testid)**
   - **Gap**: Only two `data-testid` attributes (`dashboard-main`, `course-grid`) exist across the entire application. The tests rely heavily on heuristic text matching (`text=/Pilih Materi/i`) which is brittle to copy changes.
   - **Impact**: QA automation is fragile. Future copy updates to Bahasa Indonesia text will break E2E tests unnecessarily.

4. **React Controlled Inputs Limitations**
   - **Gap**: The login and registration forms use controlled React inputs that fail to register `keyboard.type()` events correctly in Playwright unless triggered via `page.fill()`.
   - **Impact**: While mitigated in tests, this suggests the form event listeners might not be standard, which could affect autofill password managers or accessibility keyboards.

5. **Lack of Deep Data-Creation Flows**
   - **Gap**: While we test the UI interactions (e.g., clicking "Buat Kelas Baru"), the tests do not consistently verify the end-to-end database effect (verifying the newly created class appears in the student's view).
   - **Impact**: We are highly confident in the UI layer but have slightly less confidence in the complex multi-user database transaction boundaries (e.g., Teacher grades an assignment -> Student receives notification).

## Improvement Recommendations

### 1. Implement a Global `data-testid` Strategy

**Recommendation**: Add standard `data-testid` attributes to all core interactive elements.

- Page Containers: `data-testid="page-forum"`, `data-testid="page-assignments"`
- Action Buttons: `data-testid="btn-create-class"`, `data-testid="btn-submit-quiz"`
- Empty States: `data-testid="empty-state-card"`
  This will drastically improve test stability and reduce reliance on Bahasa Indonesia text matching.

### 2. Improve Load State UX

**Recommendation**: Add skeleton loaders instead of generic spinners or blank screens for all major data-fetching operations (courses, quizzes, analytics). The frequent timeout failures in E2E tests indicate that the user experience during network latency needs visual feedback buffering.

### 3. Database Performance & Connection Pooling

**Recommendation**: The test suite overwhelmed the local Supabase instance when running >2 workers. Investigate Supabase connection pooling (PgBouncer) and ensure all RPCs and heavy queries (especially in `useLeaderboard` and `useStudentProgressData`) are properly indexed.

### 4. Accessibility Audit on Navigation

**Recommendation**: Review the bottom navigation and sidebar components. Ensure hidden spans (like the ones causing selector overlap) use `aria-hidden="true"` or are structurally hidden in a way that screen readers ignore them when not visible.

### 5. Expand Seeder Capabilities

**Recommendation**: The current tests rely on a static pre-seeded database. Enhance `seeder.spec.ts` to dynamically generate teardown/setup data for isolated test runs, allowing for true mutation testing (e.g., actually submitting a quiz and checking the gradebook, rather than just asserting the UI elements exist).
