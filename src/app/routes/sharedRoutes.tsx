import { Route } from 'react-router-dom'

import { AuthGuard } from '../../components/guards/AuthGuard'
import { RoleGuard } from '../../components/guards/RoleGuard'
import {
  AccountDeletionPage,
  Announcements,
  Assignments,
  AuthCallback,
  AuthError,
  Calendar,
  DataExportPage,
  Directory,
  EnrollPage,
  ForgotPassword,
  Forum,
  GroupAssignment,
  InviteRedeem,
  Login,
  LtiCallback,
  MFASetupPage,
  MFAVerifyPage,
  NotFound,
  NotificationsPage,
  Offline,
  ParentRegisterPage,
  PrivacyPolicy,
  Profile,
  PublicProfile,
  ResetPassword,
  Settings,
  SocialHub,
  TermsOfService,
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
        path="/auth/callback"
        element={
          <S>
            <AuthCallback />
          </S>
        }
      />
      <Route
        path="/auth/error"
        element={
          <S>
            <AuthError />
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
      <Route
        path="/invite/:token"
        element={
          <S>
            <InviteRedeem />
          </S>
        }
      />
      <Route
        path="/offline"
        element={
          <S>
            <Offline />
          </S>
        }
      />
      {/*
       * Pendaftaran orang tua via OTP nomor HP.
       * Dapat diakses tanpa login — orang tua belum punya akun saat mendaftar.
       */}
      <Route
        path="/register-parent"
        element={
          <S feature="Daftar Orang Tua">
            <ParentRegisterPage />
          </S>
        }
      />
      {/*
       * Deep link enrollment: /join?code=XXXXXX
       * Accessible without authentication — EnrollPage handles the auth redirect
       * internally (saves code to sessionStorage, redirects to /login).
       */}
      <Route
        path="/join"
        element={
          <S feature="Bergabung ke Kelas">
            <EnrollPage />
          </S>
        }
      />
      <Route
        path="/verify-2fa"
        element={
          <S feature="Verifikasi 2FA">
            <MFAVerifyPage />
          </S>
        }
      />
      <Route
        path="/privacy"
        element={
          <S>
            <PrivacyPolicy />
          </S>
        }
      />
      <Route
        path="/terms"
        element={
          <S>
            <TermsOfService />
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
  const allRoles = ['teacher', 'student', 'admin', 'parent', 'principal'] as const
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
    { path: 'privacy/export-data', element: <DataExportPage /> },
    { path: 'privacy/delete-account', element: <AccountDeletionPage /> },
    { path: 'setup-2fa', element: <MFASetupPage /> },
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
