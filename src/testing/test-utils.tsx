import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import React, { ReactElement } from 'react'
import { HashRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AuthContext, AuthContextType } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

/**
 * Factory function untuk QueryClient per test.
 *
 * Sebelumnya module-level shared instance digunakan, yang berarti state query
 * bisa bocor antar test. Menggunakan factory ensures setiap render mendapat
 * QueryClient yang bersih.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Disable garbage collection delay during tests
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * Mock AuthContext value yang sudah disinkronkan dengan AuthContextType aktual.
 *
 * Field yang dihapus (tidak ada di real type):
 * - updatePassword, resetPasswordForEmail, initialized, tenantData, tenants, switchTenant
 *
 * Field yang ditambahkan (sesuai real AuthContextType):
 * - session, memberships, activeTenant, setActiveTenant, activeRole, roles,
 *   permissions, emailVerified, sessionExpired
 */
export const mockAuthValue: AuthContextType = {
  // Identity
  user: {
    id: 'test-user-id',
    email: 'student@edusync.dev',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as AuthContextType['user'],
  session: null,
  profile: { first_name: 'Test', last_name: 'Student' } as AuthContextType['profile'],

  // Tenancy
  tenantId: 'tenant-123',
  memberships: [],
  activeTenant: {
    id: 'tenant-123',
    name: 'Test Tenant',
  } as AuthContextType['activeTenant'],
  setActiveTenant: vi.fn(),

  // Roles & permissions
  activeRole: 'student',
  roles: ['student'],
  role: 'student',
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

  // Status flags
  loading: false,
  authStatus: 'authenticated',
  authError: null,
  workspaceStatus: 'resolved',
  bootstrapReady: true,
  emailVerified: true,
  sessionExpired: false,

  // Auth actions
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue(undefined),
  signInWithGoogle: vi.fn().mockResolvedValue(undefined),
  clearAuthError: vi.fn(),
  refreshAuthBootstrap: vi.fn().mockResolvedValue(undefined),
  hasRole: vi.fn((r: string) => r === 'student'),
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { authValue?: Partial<AuthContextType> }
) {
  const { authValue = mockAuthValue, ...renderOptions } = options || {}
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AuthContext.Provider value={authValue as AuthContextType}>
            {children}
          </AuthContext.Provider>
        </HashRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export function renderWithAllProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { authValue?: Partial<AuthContextType> }
) {
  const { authValue = mockAuthValue, ...renderOptions } = options || {}
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AuthContext.Provider value={authValue as AuthContextType}>
            <ThemeProvider>{children}</ThemeProvider>
          </AuthContext.Provider>
        </HashRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock window.matchMedia — required by components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
