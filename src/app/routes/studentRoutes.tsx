import { Outlet, Route } from 'react-router-dom'

import { CourseEnrollmentGuard } from '../../components/guards/CourseEnrollmentGuard'
import { RoleGuard } from '../../components/guards/RoleGuard'
import {
  Assignments,
  Certificates,
  Dashboard,
  GamificationHub,
  Grades,
  Leaderboard,
  LessonViewer,
  NotFound,
  QuizModule,
  StudentAttendance,
  StudentClassPage,
} from '../lazyPages'
import { S } from './utils'

/**
 * All /app/student/* routes.
 */
export function StudentRoutes() {
  return (
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
  )
}
