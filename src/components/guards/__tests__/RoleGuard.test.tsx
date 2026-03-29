import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { RoleGuard } from '../RoleGuard'

// Mock useAuth
vi.mock('@/src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))
// Mock AppLoading
vi.mock('@/src/components/layout/AppLoading', () => ({
  AppLoading: () => <div data-testid="app-loading">Loading...</div>,
}))

import { useAuth } from '@/src/contexts/AuthContext'
const mockUseAuth = vi.mocked(useAuth)

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('RoleGuard', () => {
  it('renders AppLoading when auth is loading', () => {
    mockUseAuth.mockReturnValue({ activeRole: null, loading: true } as any)
    renderWithRouter(
      <RoleGuard allowedRoles={['admin']}>
        <div>Admin Content</div>
      </RoleGuard>
    )
    expect(screen.getByTestId('app-loading')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('renders children when activeRole matches allowedRoles', () => {
    mockUseAuth.mockReturnValue({ activeRole: 'admin', loading: false } as any)
    renderWithRouter(
      <RoleGuard allowedRoles={['admin']}>
        <div>Admin Content</div>
      </RoleGuard>
    )
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('redirects to /unauthorized when activeRole does not match', () => {
    mockUseAuth.mockReturnValue({ activeRole: 'student', loading: false } as any)
    renderWithRouter(
      <RoleGuard allowedRoles={['admin']}>
        <div>Admin Content</div>
      </RoleGuard>
    )
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('redirects when activeRole is null (no active tenant)', () => {
    mockUseAuth.mockReturnValue({ activeRole: null, loading: false } as any)
    renderWithRouter(
      <RoleGuard allowedRoles={['admin']}>
        <div>Admin Content</div>
      </RoleGuard>
    )
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('SECURITY: does NOT grant access based on global role when activeRole differs', () => {
    // User is global admin but activeRole in this tenant is student
    // The old code had: allowedRoles.includes(role) fallback — this must NOT work
    mockUseAuth.mockReturnValue({
      activeRole: 'student',
      role: 'admin', // global role — should NOT be used
      loading: false,
    } as any)
    renderWithRouter(
      <RoleGuard allowedRoles={['admin']}>
        <div>Admin Content</div>
      </RoleGuard>
    )
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('allows multiple roles', () => {
    mockUseAuth.mockReturnValue({ activeRole: 'teacher', loading: false } as any)
    renderWithRouter(
      <RoleGuard allowedRoles={['teacher', 'admin']}>
        <div>Teacher Content</div>
      </RoleGuard>
    )
    expect(screen.getByText('Teacher Content')).toBeInTheDocument()
  })
})
