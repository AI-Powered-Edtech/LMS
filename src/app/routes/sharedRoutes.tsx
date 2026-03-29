import { Route } from 'react-router-dom'

import { AuthGuard } from '../../components/guards/AuthGuard'
import { RoleGuard } from '../../components/guards/RoleGuard'
import {
  Announcements,
  Assignments,
  Calendar,
  Directory,
  ForgotPassword,
  Forum,
  GroupAssignment,
  Login,
  LtiCallback,
  NotFound,
  NotificationsPage,
  Profile,
  PublicProfile,
  ResetPassword,
  Settings,
  SocialHub,
  Unauthorized,
  VerifyEmail,
  WorkspaceSelector,
} from '../lazyPages'
import { S } from './utils'

/**
 * Public routes (login, forgot-password, etc.) rendered at the top level of <Routes>.
 */
export function PublicRoutes() {
  return (
    <>
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
      <Route
        path="/lti/callback"
        element={
          <S>
            <LtiCallback />
          </S>
        }
      />
    </>
  )
}

/**
 * Shared authenticated routes accessible by all roles (forum, profile, settings, etc.).
 * Rendered inside the auth-protected layout.
 */
export function SharedAuthRoutes() {
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
    { path: 'group-assignment/:assignmentId', element: <GroupAssignment /> },
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
