import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { Permissions } from '@/contexts/auth'
import type { AuthContextType } from '@/contexts/AuthContext'

import { AuthGuard } from '../AuthGuard'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/components/layout/AppLoading', () => ({
  AppLoading: () => <div data-testid="app-loading">Loading...</div>,
}))

import { useAuth } from '@/contexts/AuthContext'

const mockUseAuth = vi.mocked(useAuth)
const defaultPermissions: Permissions = {
  canCreateCourse: false,
  canManageUsers: false,
  canViewAnalytics: false,
  canTakeExams: true,
  canScheduleExams: false,
  canViewOwnChildProgress: false,
  canMessageTeacher: false,
  canViewChildGrades: false,
  canViewChildAttendance: false,
  canViewExecutiveDashboard: false,
  canGenerateReports: false,
  canConfigurePrincipalSettings: false,
}

function createAuthValue(overrides: Partial<AuthContextType>): AuthContextType {
  return {
    user: null,
    session: null,
    profile: null,
    tenantId: null,
    memberships: [],
    activeTenant: null,
    setActiveTenant: vi.fn(),
    activeRole: null,
    roles: [],
    role: 'student',
    permissions: defaultPermissions,
    loading: false,
    authStatus: 'unauthenticated',
    authError: null,
    workspaceStatus: 'idle',
    bootstrapReady: false,
    emailVerified: false,
    sessionExpired: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
    clearAuthError: vi.fn(),
    refreshAuthBootstrap: vi.fn(),
    hasRole: vi.fn(),
    ...overrides,
  }
}

function renderGuard(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/protected" element={ui} />
        <Route path="/login" element={<div data-testid="login-page" />} />
        <Route path="/verify-email" element={<div data-testid="verify-email-page" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AuthGuard', () => {
  it('renders loading screen during initial auth resolution', () => {
    mockUseAuth.mockReturnValue(createAuthValue({ loading: true }))

    renderGuard(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.getByTestId('app-loading')).toBeInTheDocument()
  })

  it('renders children during token refresh when user already exists', () => {
    mockUseAuth.mockReturnValue(
      createAuthValue({
        loading: true,
        user: { id: 'user-1' } as AuthContextType['user'],
        session: { access_token: 'token' } as AuthContextType['session'],
        emailVerified: true,
      })
    )

    renderGuard(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', () => {
    mockUseAuth.mockReturnValue(createAuthValue({}))

    renderGuard(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('redirects unverified users to verify-email when verification is required', () => {
    mockUseAuth.mockReturnValue(
      createAuthValue({
        user: { id: 'user-1' } as AuthContextType['user'],
        session: { access_token: 'token' } as AuthContextType['session'],
      })
    )

    renderGuard(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.getByTestId('verify-email-page')).toBeInTheDocument()
  })

  it('allows unverified users through when verification is disabled', () => {
    mockUseAuth.mockReturnValue(
      createAuthValue({
        user: { id: 'user-1' } as AuthContextType['user'],
        session: { access_token: 'token' } as AuthContextType['session'],
      })
    )

    renderGuard(
      <AuthGuard requireEmailVerification={false}>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('allows verified authenticated users through', () => {
    mockUseAuth.mockReturnValue(
      createAuthValue({
        user: { id: 'user-1' } as AuthContextType['user'],
        session: { access_token: 'token' } as AuthContextType['session'],
        emailVerified: true,
      })
    )

    renderGuard(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
