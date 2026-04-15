import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/hooks/useSignOut', () => ({
  useSignOut: () => vi.fn(),
}))

vi.mock('@/hooks/useModuleConfig', () => ({
  useModuleConfig: () => ({ isModuleEnabled: () => true }),
}))

vi.mock('@/hooks/useArrowNavigation', () => ({
  useArrowNavigation: () => ({ containerRef: { current: null }, handleKeyDown: vi.fn() }),
}))

vi.mock('@/features/classroom/components/ClassroomSwitcher', () => ({
  ClassroomSwitcher: () => <div data-testid="classroom-switcher" />,
}))

import { useAuth } from '@/contexts/AuthContext'

import { Sidebar } from '../Sidebar'

const mockUseAuth = vi.mocked(useAuth)

describe('Sidebar RBAC (tenant-scoped activeRole)', () => {
  it('menggunakan activeRole untuk filtering menu (tanpa fallback role global)', () => {
    mockUseAuth.mockReturnValue({
      activeRole: 'student',
      role: 'admin',
    } as any)

    render(
      <MemoryRouter initialEntries={['/app/student/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByText('Ruang Belajar')).toBeInTheDocument()
    expect(screen.queryByText('Administrasi')).not.toBeInTheDocument()
  })

  it('tidak menampilkan menu jika activeRole null (tidak ada tenant aktif)', () => {
    mockUseAuth.mockReturnValue({
      activeRole: null,
      role: 'admin',
    } as any)

    render(
      <MemoryRouter initialEntries={['/app/admin/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.queryByText('Administrasi')).not.toBeInTheDocument()
    expect(screen.queryByText('Ruang Belajar')).not.toBeInTheDocument()
  })

  it('hanya menampilkan ClassroomSwitcher saat activeRole teacher', () => {
    mockUseAuth.mockReturnValue({ activeRole: 'teacher' } as any)

    render(
      <MemoryRouter initialEntries={['/app/teacher/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByTestId('classroom-switcher')).toBeInTheDocument()
  })
})
