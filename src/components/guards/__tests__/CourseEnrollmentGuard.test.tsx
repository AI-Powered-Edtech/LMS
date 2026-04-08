import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Permissions } from '@/contexts/auth'
import type { AuthContextType } from '@/contexts/AuthContext'

import { CourseEnrollmentGuard } from '../CourseEnrollmentGuard'

const mockCheckEnrollment = vi.fn()

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/features/courses', () => ({
  courseService: {
    checkEnrollment: (...args: unknown[]) => mockCheckEnrollment(...args),
  },
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
    user: { id: 'student-1' } as AuthContextType['user'],
    session: { access_token: 'token' } as AuthContextType['session'],
    profile: null,
    tenantId: 'tenant-1',
    memberships: [],
    activeTenant: { id: 'tenant-1', name: 'Tenant 1', slug: 'tenant-1', is_active: true },
    setActiveTenant: vi.fn(),
    activeRole: 'student',
    roles: ['student'],
    role: 'student',
    permissions: defaultPermissions,
    loading: false,
    emailVerified: true,
    sessionExpired: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
    hasRole: vi.fn(),
    ...overrides,
  }
}

function renderGuard(
  authValue: AuthContextType,
  options: {
    initialEntries?: string[]
    initialIndex?: number
    routePath?: string
  } = {}
) {
  mockUseAuth.mockReturnValue(authValue)
  return render(
    <MemoryRouter
      initialEntries={options.initialEntries ?? ['/courses/course-1']}
      initialIndex={options.initialIndex}
    >
      <Routes>
        <Route
          path={options.routePath ?? '/courses/:courseId'}
          element={
            <CourseEnrollmentGuard>
              <div>Course Content</div>
            </CourseEnrollmentGuard>
          }
        />
        <Route path="/app/student/courses" element={<div data-testid="course-list-page" />} />
        <Route path="/dashboard" element={<div data-testid="dashboard-page" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CourseEnrollmentGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children for enrolled students', async () => {
    mockCheckEnrollment.mockResolvedValue({ enrolled: true })

    renderGuard(createAuthValue({}))

    await waitFor(() => {
      expect(screen.getByText('Course Content')).toBeInTheDocument()
    })
  })

  it('bypasses enrollment checks for teachers', async () => {
    renderGuard(createAuthValue({ activeRole: 'teacher', role: 'teacher', roles: ['teacher'] }))

    await waitFor(() => {
      expect(screen.getByText('Course Content')).toBeInTheDocument()
    })

    expect(mockCheckEnrollment).not.toHaveBeenCalled()
  })

  it('bypasses enrollment checks for admins', async () => {
    renderGuard(createAuthValue({ activeRole: 'admin', role: 'admin', roles: ['admin'] }))

    await waitFor(() => {
      expect(screen.getByText('Course Content')).toBeInTheDocument()
    })

    expect(mockCheckEnrollment).not.toHaveBeenCalled()
  })

  it('allows access when the route is not course-specific', async () => {
    renderGuard(createAuthValue({}), {
      initialEntries: ['/courses'],
      routePath: '/courses',
    })

    await waitFor(() => {
      expect(screen.getByText('Course Content')).toBeInTheDocument()
    })

    expect(mockCheckEnrollment).not.toHaveBeenCalled()
  })

  it('redirects unenrolled students back to the course list', async () => {
    mockCheckEnrollment.mockResolvedValue({ enrolled: false })

    renderGuard(createAuthValue({}))

    await waitFor(() => {
      expect(screen.getByTestId('course-list-page')).toBeInTheDocument()
    })
  })

  it('surfaces access errors without hanging the page', async () => {
    mockCheckEnrollment.mockResolvedValue({
      enrolled: false,
      errorType: 'access_error',
    })

    renderGuard(createAuthValue({}))

    await waitFor(() => {
      expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument()
    })
  })

  it('surfaces thrown errors from enrollment checks', async () => {
    mockCheckEnrollment.mockRejectedValue(new Error('Network timeout'))

    renderGuard(createAuthValue({}))

    await waitFor(() => {
      expect(screen.getByText('Network timeout')).toBeInTheDocument()
    })
  })

  it('retries enrollment verification from the error state', async () => {
    mockCheckEnrollment
      .mockResolvedValueOnce({
        enrolled: false,
        errorType: 'access_error',
      })
      .mockResolvedValueOnce({ enrolled: true })

    renderGuard(createAuthValue({}))

    await waitFor(() => {
      expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))

    await waitFor(() => {
      expect(screen.getByText('Course Content')).toBeInTheDocument()
    })

    expect(mockCheckEnrollment).toHaveBeenCalledTimes(2)
  })

  it('navigates back from the error state', async () => {
    mockCheckEnrollment.mockResolvedValue({
      enrolled: false,
      errorType: 'access_error',
    })

    renderGuard(createAuthValue({}), {
      initialEntries: ['/dashboard', '/courses/course-1'],
      initialIndex: 1,
    })

    await waitFor(() => {
      expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Kembali' }))

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })
  })
})
