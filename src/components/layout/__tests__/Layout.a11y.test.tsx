import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { checkA11y } from '@/testing/a11y-utils'

import { Layout } from '../Layout'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@edusync.dev' },
    profile: { full_name: 'Test Student' },
    role: 'student',
    activeRole: 'student',
    tenantId: 'tenant-1',
    memberships: [],
    activeTenant: { id: 'tenant-1', name: 'Test School', slug: 'test', is_active: true },
    setActiveTenant: vi.fn(),
    roles: ['student'],
    permissions: {
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
    },
    loading: false,
    emailVerified: true,
    sessionExpired: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
    hasRole: vi.fn(),
  }),
}))

vi.mock('@/components/ui', () => ({
  OfflineBanner: () => null,
}))

vi.mock('../StudentLayout', () => ({
  StudentLayout: () => <div data-testid="student-layout">Student Layout</div>,
}))

vi.mock('../TeacherLayout', () => ({
  TeacherLayout: () => <div data-testid="teacher-layout">Teacher Layout</div>,
}))

vi.mock('../AdminLayout', () => ({
  AdminLayout: () => <div data-testid="admin-layout">Admin Layout</div>,
}))

vi.mock('../ParentLayout', () => ({
  ParentLayout: () => <div data-testid="parent-layout">Parent Layout</div>,
}))

vi.mock('../PrincipalLayout', () => ({
  PrincipalLayout: () => <div data-testid="principal-layout">Principal Layout</div>,
}))

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('Layout a11y', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithQueryClient(<Layout />)

    const skipLink = screen.getByRole('link', { name: /lewati ke konten utama/i })
    expect(skipLink).toHaveAttribute('href', '#main-content')
    expect(skipLink).toHaveTextContent('Lewati ke konten utama')

    expect(screen.getByTestId('student-layout')).toBeInTheDocument()

    await checkA11y(container)
  })
})
