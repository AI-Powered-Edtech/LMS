import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSetValue = vi.fn()
const mockFormState = { errors: {}, isSubmitting: false }

vi.mock('@/components/ui/FormField', () => ({
  FormField: ({
    name: _name,
    control: _control,
    label,
    labelClassName,
    children,
  }: {
    name: string
    control: unknown
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

import { LoginForm } from '../LoginForm'

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderLoginForm(overrides?: {
  error?: string
  submitting?: boolean
  formState?: typeof mockFormState
}) {
  const { error = '', submitting = false, formState = mockFormState } = overrides ?? {}

  const mockLoginForm = {
    handleSubmit:
      (onSubmit: Function, onError: Function) => (e: { preventDefault: () => void }) => {
        e.preventDefault()
        if (Object.keys(formState.errors).length > 0) {
          onError()
        } else {
          onSubmit({ email: 'test@email.com', password: 'password123' })
        }
      },
    control: {},
    setValue: mockSetValue,
    formState: formState,
  }

  const setError = vi.fn()
  const onSubmit = vi.fn()

  const utils = render(
    <LoginForm
      loginForm={mockLoginForm as any}
      error={error}
      setError={setError}
      submitting={submitting}
      onSubmit={onSubmit}
    />
  )

  return { ...utils, setError, onSubmit }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('merender form dengan label Bahasa Indonesia', () => {
    renderLoginForm()

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Kata Sandi')).toBeInTheDocument()
    expect(screen.getByText('Lupa Kata Sandi?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument()
  })

  it('menampilkan pesan error saat error prop tidak kosong', () => {
    renderLoginForm({ error: 'Email atau kata sandi salah.' })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Email atau kata sandi salah.')
  })

  it('menampilkan status loading saat submitting', () => {
    renderLoginForm({ submitting: true })

    const button = screen.getByRole('button', { name: 'Masuk...' })
    expect(button).toBeDisabled()
  })

  it('menonaktifkan tombol saat submitting', () => {
    renderLoginForm({ submitting: true })

    const button = screen.getByRole('button', { name: 'Masuk...' })
    expect(button).toBeDisabled()
  })

  it('memanggil onSubmit saat form disubmit dengan data valid', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderLoginForm()

    const submitButton = screen.getByRole('button', { name: 'Masuk' })
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@email.com',
      password: 'password123',
    })
  })

  it('toggle visibilitas kata sandi saat tombol mata diklik', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    const toggleButton = screen.getByRole('button', { name: 'Tampilkan kata sandi' })
    await user.click(toggleButton)

    expect(screen.getByRole('button', { name: 'Sembunyikan kata sandi' })).toBeInTheDocument()
  })

  it('placeholder menggunakan Bahasa Indonesia', () => {
    renderLoginForm()

    const emailInput = screen.getByPlaceholderText('kamu@email.com')
    expect(emailInput).toBeInTheDocument()
  })
})
