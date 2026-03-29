import { Outlet, Route } from 'react-router-dom'

import { RoleGuard } from '../../components/guards/RoleGuard'
import {
  AdminAnalyticsDashboard,
  AdministrationDashboard,
  AssignmentGradebook,
  AuditDashboard,
  BillingDashboard,
  ClassManagement,
  CourseBuilder,
  Courses,
  Creator,
  DocumentManager,
  FeatureFlagsPage,
  FinanceDashboard,
  Gradebook,
  ModerationDashboard,
  NotFound,
  PPDBDashboard,
  QuestionBankPage,
  QuizGradebook,
  QuizManager,
  ScanAttendance,
  SpeedGrader,
  StruggleDashboard,
  StudentProgress,
  SystemHealth,
  UserManagement,
} from '../lazyPages'
import { S } from './utils'

/**
 * All /app/admin/* routes.
 */
export function AdminRoutes() {
  return (
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
        path="struggle"
        element={
          <S feature="Deteksi Kesulitan">
            <StruggleDashboard />
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
  )
}
