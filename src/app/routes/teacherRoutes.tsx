import { Outlet, Route } from 'react-router-dom'

import { CourseEnrollmentGuard } from '../../components/guards/CourseEnrollmentGuard'
import { RoleGuard } from '../../components/guards/RoleGuard'
import {
  Analytics,
  AssignmentGradebook,
  ClassManagement,
  CourseAnalytics,
  CourseBuilder,
  Courses,
  Creator,
  Dashboards,
  DocumentManager,
  Gradebook,
  Leaderboard,
  LessonViewer,
  ModerationDashboard,
  NotFound,
  QuestionBankPage,
  QuizGradebook,
  QuizManager,
  ScanAttendance,
  SpeedGrader,
  StruggleDashboard,
  StudentProgress,
  SurveyRespondPage,
  TeacherDashboard,
  TeachingHub,
} from '../lazyPages'
import { S } from './utils'

/**
 * All /app/teacher/* routes.
 */
export function TeacherRoutes() {
  return (
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
        path="struggle"
        element={
          <S feature="Deteksi Kesulitan">
            <StruggleDashboard />
          </S>
        }
      />
      <Route
        path="preview/:courseId"
        element={
          <CourseEnrollmentGuard>
            <S feature="Pratinjau Kursus">
              <LessonViewer />
            </S>
          </CourseEnrollmentGuard>
        }
      />
      <Route
        path="survey/:surveyId"
        element={
          <S feature="Isi Survei">
            <SurveyRespondPage />
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
