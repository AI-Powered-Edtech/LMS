import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import React, { ReactElement } from 'react'
import { HashRouter } from 'react-router-dom'
import { vi } from 'vitest'

import { AuthContext } from '@/src/contexts/AuthContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

export const mockAuthValue = {
  user: { id: 'test-user-id', email: 'student@edusync.dev' },
  profile: { full_name: 'Test Student' },
  role: 'student',
  tenantId: 'tenant-123',
  signOut: vi.fn(),
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUp: vi.fn(),
  updatePassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  loading: false,
  initialized: true,
  tenantData: { name: 'Test Tenant' },
  tenants: [],
  switchTenant: vi.fn(),
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { authValue?: unknown }
) {
  const { authValue = mockAuthValue, ...renderOptions } = options || {}

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
        </HashRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock window.matchMedia
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

// Need to export a custom ThemeProvider wrapper or include it
import { ThemeProvider } from '@/src/contexts/ThemeContext'
export function renderWithAllProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { authValue?: unknown }
) {
  const { authValue = mockAuthValue, ...renderOptions } = options || {}

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AuthContext.Provider value={{ ...authValue, memberships: [] }}>
            <ThemeProvider>{children}</ThemeProvider>
          </AuthContext.Provider>
        </HashRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
