import { render, screen } from '@testing-library/react'
import type { UseFormReturn } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LoginFormData } from '@/shared/schemas/forms'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  }
})

vi.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
}))

vi.mock('@/components/ui/FormField', () => ({
  FormField: ({
    name: _name,
    label,
    labelClassName,
    children,
  }: {
    name: string
    label: string
    labelClassName?: string
    children: React.ReactNode
  }) => (
    <div>
      <label className={labelClassName}>{label}</label>
      {children}
    </div>
  ),
}))

import { LoginForm } from '../LoginForm'

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockLoginForm(overrides?: {
  errors?: Record<string, { message?: string }>
  isSubmitting?: boolean
}): UseFormReturn<LoginFormData> {
  return {
    handleSubmit: vi.fn((onSubmit) => (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.()
      onSubmit({ email: 'test@edusync.dev', password: 'password123' })
    }),
    formState: {
      errors: overrides?.errors ?? {},
      isSubmitting: overrides?.isSubmitting ?? false,
    },
    control: {} as UseFormReturn<LoginFormData>['control'],
    setValue: vi.fn(),
    register: vi.fn(),
    watch: vi.fn(),
    getValues: vi.fn(),
    trigger: vi.fn(),
    reset: vi.fn(),
    setError: vi.fn(),
    clearErrors: vi.fn(),
    unregister: vi.fn(),
  } as unknown as UseFormReturn<LoginFormData>
}

function renderLoginForm(overrides?: {
  error?: string
  submitting?: boolean
  formErrors?: Record<string, { message?: string }>
}) {
  const mockLoginForm = createMockLoginForm({ errors: overrides?.formErrors })
  const mockSetError = vi.fn()
  const mockOnSubmit = vi.fn()

  const utils = render(
    <LoginForm
      loginForm={mockLoginForm}
      error={overrides?.error ?? ''}
      setError={mockSetError}
      submitting={overrides?.submitting ?? false}
      onSubmit={mockOnSubmit}
    />
  )

  return {
    ...utils,
    mockSetError,
    mockOnSubmit,
    mockLoginForm,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('merender form dengan label Bahasa Indonesia', () => {
    renderLoginForm()

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Kata Sandi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument()
    expect(screen.getByText('Lupa Kata Sandi?')).toBeInTheDocument()
  })

  it('menampilkan tombol "Masuk..." saat submitting', () => {
    renderLoginForm({ submitting: true })

    expect(screen.getByRole('button', { name: /masuk\.\.\./i })).toBeDisabled()
  })

  it('menampilkan pesan error ketika ada error prop', () => {
    renderLoginForm({ error: 'Email atau kata sandi salah' })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Email atau kata sandi salah')
  })

  it('tidak menampilkan error ketika error kosong', () => {
    renderLoginForm({ error: '' })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('menampilkan tombol toggle untuk kata sandi', () => {
    renderLoginForm()

    const toggleButton = screen.getByRole('button', { name: /tampilkan kata sandi/i })
    expect(toggleButton).toBeInTheDocument()
  })

  it('merender placeholder dalam Bahasa Indonesia', () => {
    renderLoginForm()

    expect(screen.getByPlaceholderText(/kamu@email\.com/i)).toBeInTheDocument()
  })

  it('menampilkan tombol "Masuk..." saat submitting', () => {
    renderLoginForm({ submitting: true })

    expect(screen.getByRole('button', { name: /masuk\.\.\./i })).toBeDisabled()
  })

  it('menampilkan pesan error ketika ada error prop', () => {
    renderLoginForm({ error: 'Email atau kata sandi salah' })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Email atau kata sandi salah')
  })

  it('tidak menampilkan error ketika error kosong', () => {
    renderLoginForm({ error: '' })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('menampilkan tombol toggle untuk kata sandi', () => {
    renderLoginForm()

    const toggleButton = screen.getByRole('button', { name: /tampilkan kata sandi/i })
    expect(toggleButton).toBeInTheDocument()
  })

  it('merender placeholder dalam Bahasa Indonesia', () => {
    renderLoginForm()

    expect(screen.getByPlaceholderText(/kamu@email\.com/i)).toBeInTheDocument()
  })
})
