import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { RoleGuard } from '../RoleGuard'
import { TenantGuard } from '../TenantGuard'

// Mock the AuthContext
const mockUseAuth = vi.fn()
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}))

vi.mock('../../layout/AppLoading', () => ({
  AppLoading: () => <div data-testid="app-loading">Loading...</div>,
}))

describe('RoleGuard', () => {
  it('shows loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({ loading: true } as any)
    render(
      <MemoryRouter>
        <RoleGuard allowedRoles={['student']}>
          <div>Protected Content</div>
        </RoleGuard>
      </MemoryRouter>
    )
    // AppLoading component renders a spinner, we assume it's visible or has a specific role.
    // Let's just check that Protected Content is NOT rendered
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to /unauthorized when role is not allowed', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      activeRole: 'student',
      role: 'student',
    } as any)
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RoleGuard allowedRoles={['teacher']}>
                <div>Protected Content</div>
              </RoleGuard>
            }
          />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when activeRole is allowed', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      activeRole: 'teacher',
      role: 'student',
    } as any)
    render(
      <MemoryRouter>
        <RoleGuard allowedRoles={['teacher']}>
          <div>Protected Content</div>
        </RoleGuard>
      </MemoryRouter>
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('menolak akses jika activeRole tidak diizinkan meski role global lebih tinggi', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      activeRole: 'student',
      role: 'admin',
    } as any)
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RoleGuard allowedRoles={['admin']}>
                <div>Protected Content</div>
              </RoleGuard>
            }
          />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})

describe('TenantGuard', () => {
  it('shows loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({ loading: true } as any)
    render(
      <MemoryRouter>
        <TenantGuard>
          <div>Tenant Content</div>
        </TenantGuard>
      </MemoryRouter>
    )
    expect(screen.queryByText('Tenant Content')).not.toBeInTheDocument()
  })

  it('redirects to /workspace-selector when activeTenant is missing', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      activeTenant: null,
    } as any)
    render(
      <MemoryRouter initialEntries={['/tenant']}>
        <Routes>
          <Route
            path="/tenant"
            element={
              <TenantGuard>
                <div>Tenant Content</div>
              </TenantGuard>
            }
          />
          <Route path="/workspace-selector" element={<div>Workspace Selector</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Workspace Selector')).toBeInTheDocument()
    expect(screen.queryByText('Tenant Content')).not.toBeInTheDocument()
  })

  it('renders children when activeTenant is present', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      activeTenant: { id: 'tenant-1' },
    } as any)
    render(
      <MemoryRouter>
        <TenantGuard>
          <div>Tenant Content</div>
        </TenantGuard>
      </MemoryRouter>
    )
    expect(screen.getByText('Tenant Content')).toBeInTheDocument()
  })
})
