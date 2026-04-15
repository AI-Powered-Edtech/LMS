import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { Permissions } from '@/contexts/auth'
import type { AuthContextType } from '@/contexts/AuthContext'

import { TenantGuard } from '../TenantGuard'

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
    setActiveTenant: vi.fn().mockResolvedValue(undefined),
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
        <Route path="/workspace-selector" element={<div data-testid="workspace-selector" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TenantGuard', () => {
  it('renders loading while auth is loading', () => {
    mockUseAuth.mockReturnValue(createAuthValue({ loading: true }))

    renderGuard(
      <TenantGuard>
        <div>Tenant Content</div>
      </TenantGuard>
    )

    expect(screen.getByTestId('app-loading')).toBeInTheDocument()
  })

  it('redirects to workspace selector when no active tenant exists', () => {
    mockUseAuth.mockReturnValue(createAuthValue({}))

    renderGuard(
      <TenantGuard>
        <div>Tenant Content</div>
      </TenantGuard>
    )

    expect(screen.getByTestId('workspace-selector')).toBeInTheDocument()
  })

  it('renders children when an active tenant exists', () => {
    mockUseAuth.mockReturnValue(
      createAuthValue({
        activeTenant: { id: 'tenant-1', name: 'Tenant 1', slug: 'tenant-1', is_active: true },
        tenantId: 'tenant-1',
      })
    )

    renderGuard(
      <TenantGuard>
        <div>Tenant Content</div>
      </TenantGuard>
    )

    expect(screen.getByText('Tenant Content')).toBeInTheDocument()
  })
})
