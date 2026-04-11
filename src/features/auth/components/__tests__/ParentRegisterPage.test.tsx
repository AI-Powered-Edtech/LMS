import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRpc = vi.fn()
const mockAuthSignUp = vi.fn()
const mockAuthSignIn = vi.fn()
const mockFromUpsert = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      signUp: (...args: unknown[]) => mockAuthSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockAuthSignIn(...args),
    },
    from: () => ({
      upsert: (...args: unknown[]) => mockFromUpsert(...args),
    }),
  },
}))

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  }
})

vi.mock('lucide-react', () => ({
  CheckCircle: () => <span data-testid="check-icon" />,
  ChevronLeft: () => <span data-testid="chevron-left" />,
  Phone: () => <span data-testid="phone-icon" />,
  User: () => <span data-testid="user-icon" />,
}))

import { ParentRegisterPage } from '../ParentRegisterPage'

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderParentRegister() {
  return render(<ParentRegisterPage />)
}

/** Navigate through step 1 → step 2 (OTP input) */
async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
  mockRpc.mockResolvedValue({
    data: { success: true, dev_otp: '123456' },
    error: null,
  })

  renderParentRegister()

  const phoneInput = screen.getByPlaceholderText(/8xx/i)
  await user.type(phoneInput, '81234567890')

  const submitButton = screen.getByRole('button', { name: /kirim kode verifikasi/i })
  await user.click(submitButton)

  await waitFor(() => {
    expect(screen.getByText('Masukkan Kode Verifikasi')).toBeInTheDocument()
  })
}

/** Navigate through step 1 → step 2 → step 3 (profile form) */
async function goToStep3(user: ReturnType<typeof userEvent.setup>) {
  mockRpc
    .mockResolvedValueOnce({
      data: { success: true, dev_otp: '123456' },
      error: null,
    })
    .mockResolvedValueOnce({
      data: { success: true },
      error: null,
    })

  renderParentRegister()

  const phoneInput = screen.getByPlaceholderText(/8xx/i)
  await user.type(phoneInput, '81234567890')

  const submitButton = screen.getByRole('button', { name: /kirim kode verifikasi/i })
  await user.click(submitButton)

  await waitFor(() => {
    expect(screen.getByText('Masukkan Kode Verifikasi')).toBeInTheDocument()
  })

  const otpInputs = screen.getAllByRole('textbox')
  for (let i = 0; i < 6; i++) {
    await user.type(otpInputs[i], '1')
  }

  const verifyButton = screen.getByRole('button', { name: /verifikasi/i })
  await user.click(verifyButton)

  await waitFor(() => {
    expect(screen.getByText('Lengkapi Profil Anda')).toBeInTheDocument()
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ParentRegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('menampilkan halaman dengan judul dan step indicator', () => {
    renderParentRegister()

    expect(screen.getByText('EduSync')).toBeInTheDocument()
    expect(screen.getByText('Portal Orang Tua Siswa')).toBeInTheDocument()
    expect(screen.getByText('Daftar sebagai Orang Tua')).toBeInTheDocument()
  })

  it('step 1: menampilkan input nomor HP dan tombol kirim kode', () => {
    renderParentRegister()

    expect(screen.getByPlaceholderText(/8xx/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /kirim kode verifikasi/i })).toBeInTheDocument()
    expect(screen.getByText('Masuk di sini')).toBeInTheDocument()
  })

  it('step 1: menampilkan error jika nomor HP tidak valid', async () => {
    const user = userEvent.setup()
    renderParentRegister()

    const phoneInput = screen.getByPlaceholderText(/8xx/i)
    await user.type(phoneInput, '123')

    const submitButton = screen.getByRole('button', { name: /kirim kode verifikasi/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('nomor HP yang valid')
    })
  })

  it('step 1: memanggil RPC request_parent_otp saat submit valid', async () => {
    const user = userEvent.setup()
    mockRpc.mockResolvedValue({
      data: { success: true, dev_otp: '123456' },
      error: null,
    })

    renderParentRegister()

    const phoneInput = screen.getByPlaceholderText(/8xx/i)
    await user.type(phoneInput, '81234567890')

    const submitButton = screen.getByRole('button', { name: /kirim kode verifikasi/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('request_parent_otp', expect.any(Object))
    })
  })

  it('step 2: menampilkan countdown setelah request berhasil', async () => {
    const user = userEvent.setup()
    await goToStep2(user)

    expect(screen.getByText('Masukkan Kode Verifikasi')).toBeInTheDocument()
    expect(screen.getByText(/kirim ulang dalam/i)).toBeInTheDocument()
  })

  it('step 2: tombol verifikasi dinonaktifkan saat OTP belum 6 digit', async () => {
    const user = userEvent.setup()
    await goToStep2(user)

    const verifyButton = screen.getByRole('button', { name: /verifikasi/i })
    expect(verifyButton).toBeDisabled()
  })

  it('step 2: memanggil RPC verify_parent_otp saat OTP valid', async () => {
    const user = userEvent.setup()
    mockRpc.mockResolvedValueOnce({
      data: { success: true, dev_otp: '123456' },
      error: null,
    })
    mockRpc.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    })

    renderParentRegister()

    const phoneInput = screen.getByPlaceholderText(/8xx/i)
    await user.type(phoneInput, '81234567890')

    const submitButton = screen.getByRole('button', { name: /kirim kode verifikasi/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Masukkan Kode Verifikasi')).toBeInTheDocument()
    })

    const otpInputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], String(i + 1))
    }

    const verifyButton = screen.getByRole('button', { name: /verifikasi/i })
    await user.click(verifyButton)

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('verify_parent_otp', expect.any(Object))
    })
  })

  it('step 3: menampilkan form profil setelah OTP terverifikasi', async () => {
    const user = userEvent.setup()
    await goToStep3(user)

    expect(screen.getByPlaceholderText(/nama lengkap/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email@contoh/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /selesaikan pendaftaran/i })).toBeInTheDocument()
  })

  it('step 3: tombol dinonaktifkan saat nama kosong', async () => {
    const user = userEvent.setup()
    await goToStep3(user)

    const completeButton = screen.getByRole('button', { name: /selesaikan pendaftaran/i })
    expect(completeButton).toBeDisabled()
  })

  it('step 3: memanggil signUp saat profil valid', async () => {
    const user = userEvent.setup()
    mockRpc.mockResolvedValueOnce({
      data: { success: true, dev_otp: '123456' },
      error: null,
    })
    mockRpc.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    })
    mockAuthSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockAuthSignIn.mockResolvedValue({ error: null })
    mockFromUpsert.mockResolvedValue({ error: null })

    renderParentRegister()

    const phoneInput = screen.getByPlaceholderText(/8xx/i)
    await user.type(phoneInput, '81234567890')

    const submitButton = screen.getByRole('button', { name: /kirim kode verifikasi/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Masukkan Kode Verifikasi')).toBeInTheDocument()
    })

    const otpInputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], '1')
    }

    const verifyButton = screen.getByRole('button', { name: /verifikasi/i })
    await user.click(verifyButton)

    await waitFor(() => {
      expect(screen.getByText('Lengkapi Profil Anda')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText(/nama lengkap/i)
    await user.type(nameInput, 'Budi Santoso')

    const completeButton = screen.getByRole('button', { name: /selesaikan pendaftaran/i })
    await user.click(completeButton)

    await waitFor(() => {
      expect(mockAuthSignUp).toHaveBeenCalled()
    })
  })

  it('step 4: menampilkan pesan sukses setelah pendaftaran berhasil', async () => {
    const user = userEvent.setup()
    mockRpc.mockResolvedValueOnce({
      data: { success: true, dev_otp: '123456' },
      error: null,
    })
    mockRpc.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    })
    mockAuthSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockAuthSignIn.mockResolvedValue({ error: null })
    mockFromUpsert.mockResolvedValue({ error: null })

    renderParentRegister()

    const phoneInput = screen.getByPlaceholderText(/8xx/i)
    await user.type(phoneInput, '81234567890')

    const submitButton = screen.getByRole('button', { name: /kirim kode verifikasi/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Masukkan Kode Verifikasi')).toBeInTheDocument()
    })

    const otpInputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], '1')
    }

    const verifyButton = screen.getByRole('button', { name: /verifikasi/i })
    await user.click(verifyButton)

    await waitFor(() => {
      expect(screen.getByText('Lengkapi Profil Anda')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText(/nama lengkap/i)
    await user.type(nameInput, 'Budi Santoso')

    const completeButton = screen.getByRole('button', { name: /selesaikan pendaftaran/i })
    await user.click(completeButton)

    await waitFor(() => {
      expect(screen.getByText('Pendaftaran Berhasil!')).toBeInTheDocument()
    })

    expect(screen.getByText('Ke Dashboard Orang Tua')).toBeInTheDocument()
    expect(screen.getByText('Kembali ke Login')).toBeInTheDocument()
  })

  it('menampilkan loading state saat request OTP', async () => {
    const user = userEvent.setup()
    mockRpc.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: { success: true, dev_otp: '123456' }, error: null }),
            500
          )
        )
    )

    renderParentRegister()

    const phoneInput = screen.getByPlaceholderText(/8xx/i)
    await user.type(phoneInput, '81234567890')

    const submitButton = screen.getByRole('button', { name: /kirim kode verifikasi/i })
    await user.click(submitButton)

    // Button text changes to "Mengirim..." during loading
    expect(screen.getByRole('button', { name: /mengirim\.\.\./i })).toBeInTheDocument()
  })

  it('menampilkan countdown resend OTP', async () => {
    mockRpc.mockResolvedValue({
      data: { success: true, dev_otp: '123456' },
      error: null,
    })

    vi.useFakeTimers({ shouldAdvanceTime: true })

    render(<ParentRegisterPage />)

    // Use fireEvent instead of userEvent for fake timer compatibility
    const phoneInput = screen.getByPlaceholderText(/8xx/i)
    fireEvent.change(phoneInput, { target: { value: '81234567890' } })

    const submitButton = screen.getByRole('button', { name: /kirim kode verifikasi/i })
    fireEvent.click(submitButton)

    // Run all timers including the 500ms setTimeout in the mock and the 1s countdown
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByText('Masukkan Kode Verifikasi')).toBeInTheDocument()
    expect(screen.getByText(/kirim ulang dalam/i)).toBeInTheDocument()
  })
})
