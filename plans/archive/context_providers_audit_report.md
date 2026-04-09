# Context Providers Audit Report

## Executive Summary

This report identifies all consumers of the 10 Context providers in the EduSync LMS codebase, analyzes the data they provide, classifies data types, and recommends migration targets.

---

## 1. ClassroomContext — useClassroom()

**Consumers:** 8 files  
**Data Type:** Server State (Mixed with Client State)  
**Migration Target:** React Query

### Data Provided:

- `classrooms: Classroom[]` — Server state (fetched from Supabase)
- `activeClassroomId: string | null` — Client state (UI selection)
- `loading: boolean` — Client state
- `error: string | null` — Client state
- `setActiveClassroomId: (id: string) => void` — Action
- `addClassroom: (name: string) => Promise<void>` — Action
- `updateClassroom: (id: string, name: string) => Promise<void>` — Action
- `joinClassroom: (joinCode: string) => Promise<void>` — Action
- `refreshClassrooms: () => Promise<void>` — Action

### Files:

| File                                                                        | Line | Uses                                                                           |
| --------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------ |
| [`src/pages/ClassManagement.tsx`](src/pages/ClassManagement.tsx:24)         | 24   | `{ classrooms, addClassroom, updateClassroom, setActiveClassroomId, loading }` |
| [`src/pages/QuizManager.tsx`](src/pages/QuizManager.tsx:100)                | 100  | `{ activeClassroomId, classrooms }`                                            |
| [`src/pages/StudentClassPage.tsx`](src/pages/StudentClassPage.tsx:12)       | 12   | `{ classrooms }`                                                               |
| [`src/pages/TeacherDashboard.tsx`](src/pages/TeacherDashboard.tsx:16)       | 16   | `{ classrooms, activeClassroomId, setActiveClassroomId }`                      |
| [`src/pages/Dashboard.tsx`](src/pages/Dashboard.tsx:46)                     | 46   | `{ classrooms, joinClassroom }`                                                |
| [`src/pages/Leaderboard.tsx`](src/pages/Leaderboard.tsx:9)                  | 9    | `{ activeClassroomId }`                                                        |
| [`src/components/layout/Sidebar.tsx`](src/components/layout/Sidebar.tsx:14) | 14   | `{ classrooms, activeClassroomId, setActiveClassroomId, addClassroom }`        |

---

## 2. CalendarContext — useCalendar()

**Consumers:** 4 files  
**Data Type:** Mixed (Server events, Client mutations)  
**Migration Target:** React Query

### Data Provided:

- `events: CalendarEvent[]` — Server state (fetched from Supabase)
- `loading: boolean` — Client state
- `addEvent: (event) => void` — Client state (local only)
- `updateEvent: (id, event) => void` — Client state (local only)
- `deleteEvent: (id) => void` — Client state (local only)
- `refreshEvents: () => Promise<void>` — Action

### Files:

| File                                                        | Line | Uses                                |
| ----------------------------------------------------------- | ---- | ----------------------------------- |
| [`src/pages/Creator.tsx`](src/pages/Creator.tsx:23)         | 23   | `{ addEvent }`                      |
| [`src/pages/Assignments.tsx`](src/pages/Assignments.tsx:25) | 25   | `{ addEvent }`                      |
| [`src/pages/Calendar.tsx`](src/pages/Calendar.tsx:17)       | 17   | `{ events, addEvent, updateEvent }` |

---

## 3. GradebookContext — useGradebook()

**Consumers:** 4 files  
**Data Type:** Server State  
**Migration Target:** React Query

### Data Provided:

- `students: Student[]` — Server state
- `assignments: Assignment[]` — Server state
- `grades: GradeData` — Server state
- `loading: boolean` — Client state
- `updateGrade: (...) => void` — Action with optimistic update
- `getStudentGrade: (...) => GradeEntry | null` — Derived
- `addAssignment: (assignment) => void` — Action
- `refreshGradebook: () => Promise<void>` — Action

### Files:

| File                                                        | Line | Uses                                                            |
| ----------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| [`src/pages/Gradebook.tsx`](src/pages/Gradebook.tsx:22)     | 22   | `{ students, assignments, grades, updateGrade, addAssignment }` |
| [`src/pages/SpeedGrader.tsx`](src/pages/SpeedGrader.tsx:62) | 62   | `{ students, grades, updateGrade }`                             |
| [`src/pages/Assignments.tsx`](src/pages/Assignments.tsx:27) | 27   | `{ addAssignment, getStudentGrade }`                            |

---

## 4. StudentProgressContext — useStudentProgress()

**Consumers:** 3 files  
**Data Type:** Server State  
**Migration Target:** React Query

### Data Provided:

- `modules: ModuleData[]` — Server state
- `lessonProgress: Record<string, LessonProgress>` — Server state
- `quizAttempts: Record<string, QuizAttempt[]>` — Server state
- `xp: number` — Server state
- `dailyGoal: number` — Client state (hardcoded)
- `achievements: Achievement[]` — Server state
- `assignments: Assignment[]` — Server state
- `loading: boolean` — Client state
- `updateLessonProgress: (...) => void` — Action
- `getModuleStatus: (moduleId) => ModuleStatus` — Derived
- `unlockModule: (moduleId) => void` — Action
- `getRemedialContent: (quizId) => RemedialContent | null` — Derived
- `addXP: (amount) => void` — Action

### Files:

| File                                                                      | Line | Uses                                     |
| ------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| [`src/components/layout/Header.tsx`](src/components/layout/Header.tsx:14) | 14   | `{ xp }`                                 |
| [`src/pages/Dashboard.tsx`](src/pages/Dashboard.tsx:44)                   | 44   | `{ xp, dailyGoal, achievements, addXP }` |

---

## 5. CommentContext — useComments()

**Consumers:** 3 files  
**Data Type:** Server State  
**Migration Target:** React Query

### Data Provided:

- `comments: Record<string, Comment[]>` — Server state (cached)
- `loading: boolean` — Client state
- `addComment: (threadId, text) => Promise<void>` — Action
- `getComments: (threadId) => Comment[]` — Derived
- `setInitialComments: (...) => void` — Action (client-side)
- `refreshComments: (threadId) => Promise<void>` — Action

### Files:

| File                                                        | Line | Uses                                              |
| ----------------------------------------------------------- | ---- | ------------------------------------------------- |
| [`src/pages/Assignments.tsx`](src/pages/Assignments.tsx:28) | 28   | `{ addComment, getComments, setInitialComments }` |
| [`src/pages/SpeedGrader.tsx`](src/pages/SpeedGrader.tsx:63) | 63   | `{ addComment }`                                  |

---

## 6. BuilderContext — useBuilder()

**Consumers:** 9 files  
**Data Type:** Mixed (Server + Client)  
**Migration Target:** Zustand

### Data Provided:

**State (Client State):**

- `courseId: string | null`
- `courseTitle: string`
- `courseDescription: string | null`
- `courseStatus: 'draft' | 'published' | 'archived'`
- `modules: DomainModule[]` — Loaded from server
- `activeLesson: { id, blocks } | null`
- `activeBlockId: string | null`
- `savingStatus: 'idle' | 'saving' | 'saved' | 'error'`
- `loadingCourse: boolean`
- `loadingBlocks: boolean`
- `error: string | null`

**Actions:**

- `loadCourse: (courseId) => Promise<void>` — Server
- `publishCourse: () => Promise<void>` — Server
- `draftCourse: () => Promise<void>` — Server
- `addModule: (title) => Promise<void>` — Server
- `updateModule: (...) => Promise<void>` — Server
- `deleteModule: (moduleId) => Promise<void>` — Server
- `reorderModules: (moduleIds) => Promise<void>` — Server
- `addLesson: (...) => Promise<void>` — Server
- `updateLesson: (...) => Promise<void>` — Server
- `deleteLesson: (lessonId) => Promise<void>` — Server
- `reorderLessons: (lessonIds) => Promise<void>` — Server
- `selectLesson: (lessonId) => Promise<void>` — Server
- `closeLesson: () => void` — Client
- `addBlock: (type) => Promise<void>` — Server
- `updateBlock: (blockId, data) => void` — Server (debounced)
- `deleteBlock: (blockId) => Promise<void>` — Server
- `reorderBlocks: (blockIds) => Promise<void>` — Server
- `selectBlock: (blockId) => void` — Client
- `saveBlock: (blockId) => Promise<void>` — Server

### Files:

| File                                                                                                                               | Line | Uses                 |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------- |
| [`src/components/CourseBuilder/LessonBlockEditor.tsx`](src/components/CourseBuilder/LessonBlockEditor.tsx:30)                      | 30   | `{ state, actions }` |
| [`src/components/CourseBuilder/blocks/VideoBlockEditor.tsx`](src/components/CourseBuilder/blocks/VideoBlockEditor.tsx:10)          | 10   | `{ state, actions }` |
| [`src/components/CourseBuilder/blocks/AssignmentBlockEditor.tsx`](src/components/CourseBuilder/blocks/AssignmentBlockEditor.tsx:8) | 8    | `{ state }`          |
| [`src/components/CourseBuilder/blocks/QuizBlockEditor.tsx`](src/components/CourseBuilder/blocks/QuizBlockEditor.tsx:12)            | 12   | `{ state }`          |
| [`src/components/CourseBuilder/blocks/TextBlockEditor.tsx`](src/components/CourseBuilder/blocks/TextBlockEditor.tsx:9)             | 9    | `{ state, actions }` |
| [`src/components/CourseBuilder/BuilderTopBar.tsx`](src/components/CourseBuilder/BuilderTopBar.tsx:8)                               | 8    | `{ state, actions }` |
| [`src/components/CourseBuilder/BuilderSidebar.tsx`](src/components/CourseBuilder/BuilderSidebar.tsx:25)                            | 25   | `{ state, actions }` |
| [`src/pages/CourseBuilder.tsx`](src/pages/CourseBuilder.tsx:14)                                                                    | 14   | `{ state, actions }` |

---

## 7. ModerationContext — useModeration()

**Consumers:** 4 files  
**Data Type:** Server State  
**Migration Target:** React Query

### Data Provided:

- `reports: Report[]` — Server state
- `submitReport: (report) => void` — Action
- `resolveReport: (reportId, status) => void` — Action
- `getPendingReports: () => Report[]` — Derived

### Files:

| File                                                                                        | Line | Uses                         |
| ------------------------------------------------------------------------------------------- | ---- | ---------------------------- |
| [`src/components/moderation/ReportModal.tsx`](src/components/moderation/ReportModal.tsx:16) | 16   | `{ submitReport }`           |
| [`src/pages/Forum.tsx`](src/pages/Forum.tsx:471)                                            | 471  | `{ submitReport }`           |
| [`src/pages/admin/ModerationDashboard.tsx`](src/pages/admin/ModerationDashboard.tsx:10)     | 10   | `{ reports, resolveReport }` |

---

## 8. ModuleConfigContext — useModuleConfig()

**Consumers:** 2 files  
**Data Type:** Client State (Static)  
**Migration Target:** Delete / Static Config

### Data Provided:

- `modules: ModuleConfig[]` — Client state (hardcoded defaults)
- `toggleModule: (id) => void` — Action (local only)
- `isModuleEnabled: (id) => boolean` — Derived

### Files:

| File                                                                        | Line | Uses                  |
| --------------------------------------------------------------------------- | ---- | --------------------- |
| [`src/components/layout/Sidebar.tsx`](src/components/layout/Sidebar.tsx:15) | 15   | `{ isModuleEnabled }` |

### Recommendation:

This context provides static configuration data with no server persistence. The `modules` array is hardcoded in [`src/contexts/ModuleConfigContext.tsx`](src/contexts/ModuleConfigContext.tsx:19). This should be replaced with a static constant or a simple utility function.

---

## 9. NotificationContext — useNotifications()

**Consumers:** 5 files  
**Data Type:** Server State (with Realtime)  
**Migration Target:** React Query

### Data Provided:

- `notifications: Notification[]` — Server state (realtime updates)
- `unreadCount: number` — Derived
- `loading: boolean` — Client state
- `addNotification: (...) => Promise<void>` — Action
- `markAsRead: (id) => Promise<void>` — Action
- `markAllAsRead: () => Promise<void>` — Action
- `sendNotification: (userId, message, type) => Promise<void>` — Action
- `refreshNotifications: () => Promise<void>` — Action

### Files:

| File                                                                      | Line | Uses                                                        |
| ------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| [`src/pages/Creator.tsx`](src/pages/Creator.tsx:24)                       | 24   | `{ addNotification }`                                       |
| [`src/pages/Assignments.tsx`](src/pages/Assignments.tsx:26)               | 26   | `{ addNotification }`                                       |
| [`src/pages/Calendar.tsx`](src/pages/Calendar.tsx:16)                     | 16   | `{ addNotification }`                                       |
| [`src/components/layout/Header.tsx`](src/components/layout/Header.tsx:19) | 19   | `{ notifications, unreadCount, markAsRead, markAllAsRead }` |

---

## 10. TenantContext — useTenant()

**Consumers:** 5 files  
**Data Type:** Client State (derived from AuthContext)  
**Migration Target:** Delete (use AuthContext directly)

### Data Provided:

- `tenantId: string | null` — From AuthContext
- `tenant: activeTenant` — From AuthContext
- `loading: boolean` — From AuthContext
- `error: null` — Hardcoded

### Files:

| File                                                                                             | Line | Uses                   |
| ------------------------------------------------------------------------------------------------ | ---- | ---------------------- |
| [`src/components/admin/InviteUserModal.tsx`](src/components/admin/InviteUserModal.tsx:16)        | 16   | `{ tenantId, tenant }` |
| [`src/pages/SpeedGrader.tsx`](src/pages/SpeedGrader.tsx:64)                                      | 64   | `{ tenantId }`         |
| [`src/pages/admin/AdminAnalyticsDashboard.tsx`](src/pages/admin/AdminAnalyticsDashboard.tsx:332) | 332  | `{ tenant }`           |
| [`src/pages/QuizGradebook.tsx`](src/pages/QuizGradebook.tsx:57)                                  | 57   | `{ tenant }`           |
| [`src/utils/useTenantQuery.ts`](src/utils/useTenantQuery.ts:22)                                  | 22   | `{ tenantId }`         |

### Recommendation:

This context is a thin wrapper around AuthContext. It should be deleted and consumers should use `useAuth()` directly. The tenant data is already available from `AuthContext`.

---

## Summary Table

| Context                | Consumers | Data Type | Migration Target |
| ---------------------- | --------- | --------- | ---------------- |
| ClassroomContext       | 8         | Mixed     | React Query      |
| CalendarContext        | 4         | Mixed     | React Query      |
| GradebookContext       | 4         | Server    | React Query      |
| StudentProgressContext | 3         | Server    | React Query      |
| CommentContext         | 3         | Server    | React Query      |
| BuilderContext         | 9         | Mixed     | Zustand          |
| ModerationContext      | 4         | Server    | React Query      |
| ModuleConfigContext    | 2         | Client    | Delete           |
| NotificationContext    | 5         | Server    | React Query      |
| TenantContext          | 5         | Client    | Delete           |

---

## Migration Recommendations

### React Query (7 contexts)

These contexts fetch data from Supabase and should be migrated to React Query:

1. **ClassroomContext** — classrooms, mutations
2. **CalendarContext** — events
3. **GradebookContext** — students, assignments, grades
4. **StudentProgressContext** — modules, progress, XP, achievements
5. **CommentContext** — comments
6. **ModerationContext** — reports
7. **NotificationContext** — notifications (with realtime)

### Zustand (1 context)

- **BuilderContext** — Complex UI state with optimistic updates, debounced saves, and complex reducer logic

### Delete (2 contexts)

- **ModuleConfigContext** — Static config, replace with utility function
- **TenantContext** — Thin wrapper, use AuthContext directly

---

## Architecture Notes

- The project already has React Query set up in [`src/app/queryClient.ts`](src/app/queryClient.ts)
- Tenant isolation should be maintained via RLS policies during migration
- BuilderContext's complex reducer pattern is well-suited for Zustand
- Realtime subscriptions (used by ClassroomContext, NotificationContext) can be handled via React Query's `useQuery` with realtime invalidation
