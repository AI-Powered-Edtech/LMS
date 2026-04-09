import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { Permissions } from '@/contexts/auth'
import type { AuthContextType } from '@/contexts/AuthContext'

import { RoleResolver } from '../RoleResolver'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
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

function renderResolver() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/app" element={<RoleResolver />} />
        <Route path="/app/admin" element={<div data-testid="admin-page" />} />
        <Route path="/app/principal" element={<div data-testid="principal-page" />} />
        <Route path="/app/teacher" element={<div data-testid="teacher-page" />} />
        <Route path="/app/parent" element={<div data-testid="parent-page" />} />
        <Route path="/app/student" element={<div data-testid="student-page" />} />
        <Route path="/workspace-selector" element={<div data-testid="workspace-selector" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RoleResolver', () => {
  it('redirects admins to the admin dashboard', async () => {
    mockUseAuth.mockReturnValue(createAuthValue({ activeRole: 'admin' }))

    renderResolver()

    await waitFor(() => {
      expect(screen.getByTestId('admin-page')).toBeInTheDocument()
    })
  })

  it('redirects principals to the principal dashboard', async () => {
    mockUseAuth.mockReturnValue(createAuthValue({ activeRole: 'principal' }))

    renderResolver()

    await waitFor(() => {
      expect(screen.getByTestId('principal-page')).toBeInTheDocument()
    })
  })

  it('redirects teachers to the teacher dashboard', async () => {
    mockUseAuth.mockReturnValue(createAuthValue({ activeRole: 'teacher' }))

    renderResolver()

    await waitFor(() => {
      expect(screen.getByTestId('teacher-page')).toBeInTheDocument()
    })
  })

  it('redirects parents to the parent dashboard', async () => {
    mockUseAuth.mockReturnValue(createAuthValue({ activeRole: 'parent' }))

    renderResolver()

    await waitFor(() => {
      expect(screen.getByTestId('parent-page')).toBeInTheDocument()
    })
  })

  it('redirects students to the student dashboard', async () => {
    mockUseAuth.mockReturnValue(createAuthValue({ activeRole: 'student' }))

    renderResolver()

    await waitFor(() => {
      expect(screen.getByTestId('student-page')).toBeInTheDocument()
    })
  })

  it('redirects users without an active role to workspace selector', async () => {
    mockUseAuth.mockReturnValue(createAuthValue({ activeRole: null }))

    renderResolver()

    await waitFor(() => {
      expect(screen.getByTestId('workspace-selector')).toBeInTheDocument()
    })
  })

  it('shows the loading spinner while auth is still resolving', () => {
    mockUseAuth.mockReturnValue(createAuthValue({ loading: true }))

    renderResolver()

    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument()
  })

  it('re-exports the guard entry points from the index barrel', async () => {
    const guards = await import('..')

    expect(guards.AuthGuard).toBeDefined()
    expect(guards.CourseEnrollmentGuard).toBeDefined()
    expect(guards.RoleGuard).toBeDefined()
    expect(guards.RoleResolver).toBeDefined()
    expect(guards.TenantGuard).toBeDefined()
  })
})
