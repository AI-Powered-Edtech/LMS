import { Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { FeatureErrorBoundary } from '../components/FeatureErrorBoundary'
import { AuthGuard } from '../components/guards/AuthGuard'
import { CourseEnrollmentGuard } from '../components/guards/CourseEnrollmentGuard'
import { RoleGuard } from '../components/guards/RoleGuard'
import { RoleResolver } from '../components/guards/RoleResolver'
import { TenantGuard } from '../components/guards/TenantGuard'
import { AppLoading } from '../components/layout/AppLoading'
import { Layout } from '../components/layout/Layout'
import {
  AdminAnalyticsDashboard,
  AdministrationDashboard,
  Analytics,
  Announcements,
  AssignmentGradebook,
  Assignments,
  AuditDashboard,
  // Admin
  BillingDashboard,
  Calendar,
  Certificates,
  ClassManagement,
  CourseAnalytics,
  CourseBuilder,
  Courses,
  Creator,
  // Student
  Dashboard,
  Dashboards,
  Directory,
  DocumentManager,
  FeatureFlagsPage,
  FinanceDashboard,
  ForgotPassword,
  // Shared
  Forum,
  GamificationHub,
  Gradebook,
  Grades,
  GroupAssignment,
  Leaderboard,
  LessonViewer,
  // Auth / Public
  Login,
  ModerationDashboard,
  NotFound,
  NotificationsPage,
  PPDBDashboard,
  Profile,
  PublicProfile,
  QuestionBankPage,
  QuizGradebook,
  QuizManager,
  QuizModule,
  ResetPassword,
  ScanAttendance,
  Settings,
  SocialHub,
  SpeedGrader,
  StudentAttendance,
  StudentClassPage,
  StudentProgress,
  SystemHealth,
  // Teacher
  TeacherDashboard,
  // Hubs
  TeachingHub,
  Unauthorized,
  UserManagement,
  VerifyEmail,
  WorkspaceSelector,
} from './lazyPages'
import { LegacyRedirects } from './legacyRedirects'

// ============================================================
// Helper: wraps a component in Suspense + optional FeatureErrorBoundary
// ============================================================

function S({ children, feature }: { children: React.ReactNode; feature?: string }) {
  const inner = feature ? (
    <FeatureErrorBoundary featureName={feature}>{children}</FeatureErrorBoundary>
  ) : (
    children
  )
  return <Suspense fallback={<AppLoading />}>{inner}</Suspense>
}

// ============================================================
// Helper: Shared routes accessible by all authenticated roles
// ============================================================

function SharedRoutes() {
  const allRoles = ['teacher', 'student', 'admin'] as const
  const sharedPages = [
    { path: 'forum', element: <Forum /> },
    { path: 'profile', element: <Profile /> },
    { path: 'p/:username', element: <PublicProfile /> },
    { path: 'settings', element: <Settings /> },
    { path: 'calendar', element: <Calendar /> },
    { path: 'announcements', element: <Announcements /> },
    { path: 'assignments', element: <Assignments /> },
    { path: 'group-assignment', element: <GroupAssignment /> },
    { path: 'directory', element: <Directory /> },
    { path: 'social-hub', element: <SocialHub /> },
    { path: 'notifications', element: <NotificationsPage /> },
  ] as const

  return (
    <>
      {sharedPages.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={
            <RoleGuard allowedRoles={[...allRoles]}>
              <S>{element}</S>
            </RoleGuard>
          }
        />
      ))}
    </>
  )
}

// ============================================================
// AppRoutes
// ============================================================

export function AppRoutes() {
  return (
    <Routes>
      {/* === Public Routes === */}
      <Route
        path="/login"
        element={
          <S>
            <Login />
          </S>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <S>
            <ForgotPassword />
          </S>
        }
      />
      <Route
        path="/reset-password"
        element={
          <S>
            <ResetPassword />
          </S>
        }
      />
      <Route
        path="/verify-email"
        element={
          <AuthGuard requireEmailVerification={false}>
            <S>
              <VerifyEmail />
            </S>
          </AuthGuard>
        }
      />
      <Route
        path="/workspace-selector"
        element={
          <AuthGuard>
            <S>
              <WorkspaceSelector />
            </S>
          </AuthGuard>
        }
      />
      <Route
        path="/unauthorized"
        element={
          <S>
            <Unauthorized />
          </S>
        }
      />
      <Route
        path="/404"
        element={
          <S>
            <NotFound />
          </S>
        }
      />

      {/* === Auth-Protected Layout === */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <TenantGuard>
              <Layout />
            </TenantGuard>
          </AuthGuard>
        }
      >
        <Route path="app">
          <Route index element={<RoleResolver />} />

          {/* === /app/student Routes === */}
          <Route
            path="student"
            element={
              <RoleGuard allowedRoles={['student']}>
                <Outlet />
              </RoleGuard>
            }
          >
            <Route
              index
              element={
                <S feature="Dashboard">
                  <Dashboard />
                </S>
              }
            />
            <Route
              path="dashboard"
              element={
                <S feature="Dashboard">
                  <Dashboard />
                </S>
              }
            />
            <Route
              path="courses"
              element={
                <S feature="Lesson Viewer">
                  <LessonViewer />
                </S>
              }
            />
            <Route
              path="courses/:courseId"
              element={
                <CourseEnrollmentGuard>
                  <S feature="Lesson Viewer">
                    <LessonViewer />
                  </S>
                </CourseEnrollmentGuard>
              }
            />
            <Route
              path="quizzes"
              element={
                <S feature="Quiz">
                  <QuizModule />
                </S>
              }
            />
            <Route
              path="assignments"
              element={
                <S>
                  <Assignments />
                </S>
              }
            />
            <Route
              path="classes/:classId"
              element={
                <S>
                  <StudentClassPage />
                </S>
              }
            />
            <Route
              path="certificates"
              element={
                <S>
                  <Certificates />
                </S>
              }
            />
            <Route
              path="grades"
              element={
                <S>
                  <Grades />
                </S>
              }
            />
            <Route
              path="attendance"
              element={
                <S>
                  <StudentAttendance />
                </S>
              }
            />
            <Route
              path="gamification"
              element={
                <S>
                  <GamificationHub />
                </S>
              }
            />
            <Route
              path="leaderboard"
              element={
                <S feature="Leaderboard">
                  <Leaderboard />
                </S>
              }
            />
            <Route
              path="*"
              element={
                <S>
                  <NotFound />
                </S>
              }
            />
          </Route>

          {/* === /app/teacher Routes === */}
          <Route
            path="teacher"
            element={
              <RoleGuard allowedRoles={['teacher']}>
                <Outlet />
              </RoleGuard>
            }
          >
            <Route
              index
              element={
                <S>
                  <TeacherDashboard />
                </S>
              }
            />
            <Route
              path="dashboard"
              element={
                <S>
                  <TeacherDashboard />
                </S>
              }
            />
            <Route
              path="teaching-hub"
              element={
                <S>
                  <TeachingHub />
                </S>
              }
            />
            <Route
              path="courses"
              element={
                <S>
                  <Courses />
                </S>
              }
            />
            <Route
              path="course-builder"
              element={
                <S>
                  <CourseBuilder />
                </S>
              }
            />
            <Route
              path="quiz-manager"
              element={
                <S>
                  <QuizManager />
                </S>
              }
            />
            <Route
              path="question-bank"
              element={
                <S>
                  <QuestionBankPage />
                </S>
              }
            />
            <Route
              path="quiz-gradebook"
              element={
                <S>
                  <QuizGradebook />
                </S>
              }
            />
            <Route
              path="assignment-gradebook"
              element={
                <S>
                  <AssignmentGradebook />
                </S>
              }
            />
            <Route
              path="gradebook"
              element={
                <S>
                  <Gradebook />
                </S>
              }
            />
            <Route
              path="grader"
              element={
                <S>
                  <SpeedGrader />
                </S>
              }
            />
            <Route
              path="course-analytics"
              element={
                <S feature="Course Analytics">
                  <CourseAnalytics />
                </S>
              }
            />
            <Route
              path="dashboards"
              element={
                <S>
                  <Dashboards />
                </S>
              }
            />
            <Route
              path="classes"
              element={
                <S>
                  <ClassManagement />
                </S>
              }
            />
            <Route
              path="analytics"
              element={
                <S feature="Analytics">
                  <Analytics />
                </S>
              }
            />
            <Route
              path="scan-attendance"
              element={
                <S>
                  <ScanAttendance />
                </S>
              }
            />
            <Route
              path="documents"
              element={
                <S>
                  <DocumentManager />
                </S>
              }
            />
            <Route
              path="creator"
              element={
                <S>
                  <Creator />
                </S>
              }
            />
            <Route
              path="student-progress/:studentId"
              element={
                <S>
                  <StudentProgress />
                </S>
              }
            />
            <Route
              path="leaderboard"
              element={
                <S feature="Leaderboard">
                  <Leaderboard />
                </S>
              }
            />
            <Route
              path="moderation"
              element={
                <S>
                  <ModerationDashboard />
                </S>
              }
            />
            <Route
              path="*"
              element={
                <S>
                  <NotFound />
                </S>
              }
            />
          </Route>

          {/* === /app/admin Routes === */}
          <Route
            path="admin"
            element={
              <RoleGuard allowedRoles={['admin']}>
                <Outlet />
              </RoleGuard>
            }
          >
            <Route
              index
              element={
                <S>
                  <AdministrationDashboard />
                </S>
              }
            />
            <Route
              path="dashboard"
              element={
                <S>
                  <AdministrationDashboard />
                </S>
              }
            />
            <Route
              path="users"
              element={
                <S>
                  <UserManagement />
                </S>
              }
            />
            <Route
              path="billing"
              element={
                <S>
                  <BillingDashboard />
                </S>
              }
            />
            <Route
              path="moderation"
              element={
                <S>
                  <ModerationDashboard />
                </S>
              }
            />
            <Route
              path="finance"
              element={
                <S>
                  <FinanceDashboard />
                </S>
              }
            />
            <Route
              path="ppdb"
              element={
                <S>
                  <PPDBDashboard />
                </S>
              }
            />
            <Route
              path="administration"
              element={
                <S>
                  <AdministrationDashboard />
                </S>
              }
            />
            <Route
              path="audit"
              element={
                <S>
                  <AuditDashboard />
                </S>
              }
            />
            <Route
              path="analytics"
              element={
                <S>
                  <AdminAnalyticsDashboard />
                </S>
              }
            />
            <Route
              path="documents"
              element={
                <S>
                  <DocumentManager />
                </S>
              }
            />
            <Route
              path="creator"
              element={
                <S>
                  <Creator />
                </S>
              }
            />
            <Route
              path="courses"
              element={
                <S>
                  <Courses />
                </S>
              }
            />
            <Route
              path="course-builder"
              element={
                <S>
                  <CourseBuilder />
                </S>
              }
            />
            <Route
              path="quiz-manager"
              element={
                <S>
                  <QuizManager />
                </S>
              }
            />
            <Route
              path="question-bank"
              element={
                <S>
                  <QuestionBankPage />
                </S>
              }
            />
            <Route
              path="gradebook"
              element={
                <S>
                  <Gradebook />
                </S>
              }
            />
            <Route
              path="quiz-gradebook"
              element={
                <S>
                  <QuizGradebook />
                </S>
              }
            />
            <Route
              path="assignment-gradebook"
              element={
                <S>
                  <AssignmentGradebook />
                </S>
              }
            />
            <Route
              path="grader"
              element={
                <S>
                  <SpeedGrader />
                </S>
              }
            />
            <Route
              path="classes"
              element={
                <S>
                  <ClassManagement />
                </S>
              }
            />
            <Route
              path="scan-attendance"
              element={
                <S>
                  <ScanAttendance />
                </S>
              }
            />
            <Route
              path="student-progress/:studentId"
              element={
                <S>
                  <StudentProgress />
                </S>
              }
            />
            <Route
              path="system-health"
              element={
                <S>
                  <SystemHealth />
                </S>
              }
            />
            <Route
              path="feature-flags"
              element={
                <S>
                  <FeatureFlagsPage />
                </S>
              }
            />
            <Route
              path="*"
              element={
                <S>
                  <NotFound />
                </S>
              }
            />
          </Route>
        </Route>

        {/* === Shared Routes (all authenticated roles) === */}
        {SharedRoutes()}

        {/* === Legacy Redirects === */}
        {LegacyRedirects()}

        {/* === 404 === */}
        <Route
          path="*"
          element={
            <S>
              <NotFound />
            </S>
          }
        />
      </Route>

      {/* 404 catch-all for unauthenticated top-level paths */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
