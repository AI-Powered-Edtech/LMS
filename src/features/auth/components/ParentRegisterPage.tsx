// =============================================================================
// EduSync LMS — Parent Register Page (Task 29.2)
// =============================================================================
// Halaman pendaftaran orang tua via nomor HP + OTP (3 langkah):
//   Step 1 — Input nomor HP
//   Step 2 — Verifikasi OTP (6 digit)
//   Step 3 — Lengkapi profil (nama, email opsional, hubungan)
//
// DEV MODE: OTP ditampilkan langsung di UI (banner kuning).
// PRODUCTION: Integrasikan send-parent-otp Edge Function dengan WhatsApp API.
// =============================================================================

import { CheckCircle, ChevronLeft, Phone, User } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { usePageTitle } from '@/hooks/usePageTitle'
import { db } from '@/services/db'
import { cn } from '@/utils/cn'
import { logger } from '@/utils/logger'

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 // 4 = success

type Relationship = 'ayah' | 'ibu' | 'wali' | 'kakak'

interface ParentProfile {
  fullName: string
  email: string
  relationship: Relationship
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalisasi nomor HP ke format +62 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.startsWith('62')) return '+' + digits
  if (digits.startsWith('0')) return '+62' + digits.slice(1)
  return '+62' + digits
}

/** Format nomor HP untuk display: +62 8xx-xxxx-xxxx */
function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone)
  const digits = normalized.replace('+62', '')
  // Format: 8xx-xxxx-xxxx (groups of 3-4-4)
  const d = digits.replace(/[^0-9]/g, '')
  if (d.length <= 3) return '+62 ' + d
  if (d.length <= 7) return `+62 ${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length <= 11) return `+62 ${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  return `+62 ${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`
}

/** Generate email sementara dari nomor HP (untuk auth provider) */
function generateTempEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  return `parent_${digits}@otp.edusync.internal`
}

/** Generate password acak yang kuat */
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let pwd = ''
  for (let i = 0; i < 32; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  return pwd
}

// ── OTP Input Component ───────────────────────────────────────────────────────

interface OtpInputProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}

function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = useCallback(
    (idx: number, char: string) => {
      if (!/^[0-9]$/.test(char) && char !== '') return
      const digits = value.split('')
      digits[idx] = char
      const next = digits.join('')
      onChange(next)

      // Pindah fokus ke input berikutnya
      if (char && idx < 5) {
        inputsRef.current[idx + 1]?.focus()
      }
    },
    [value, onChange]
  )

  const handleKeyDown = useCallback(
    (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (value[idx]) {
          // Hapus digit saat ini
          const digits = value.split('')
          digits[idx] = ''
          onChange(digits.join(''))
        } else if (idx > 0) {
          // Pindah ke kiri dan hapus
          const digits = value.split('')
          digits[idx - 1] = ''
          onChange(digits.join(''))
          inputsRef.current[idx - 1]?.focus()
        }
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        inputsRef.current[idx - 1]?.focus()
      } else if (e.key === 'ArrowRight' && idx < 5) {
        inputsRef.current[idx + 1]?.focus()
      }
    },
    [value, onChange]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pasted = e.clipboardData
        .getData('text')
        .replace(/[^0-9]/g, '')
        .slice(0, 6)
      onChange(pasted.padEnd(6, '').slice(0, 6))
      // Fokus ke input terakhir yang terisi
      const nextIdx = Math.min(pasted.length, 5)
      inputsRef.current[nextIdx]?.focus()
    },
    [onChange]
  )

  return (
    <div className="flex items-center gap-2 justify-center" role="group" aria-label="Kode OTP">
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={value[idx] ?? ''}
          disabled={disabled}
          aria-label={`Digit ${idx + 1}`}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className={cn(
            'w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all duration-200',
            'bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-white',
            value[idx]
              ? 'border-blue-500 dark:border-blue-400'
              : 'border-slate-300 dark:border-slate-600',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  )
}

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1
        const done = current > step
        const active = current === step
        return (
          <React.Fragment key={step}>
            <div
              className={cn(
                'w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-300',
                done && 'bg-green-500 text-white',
                active && 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700',
                !done && !active && 'bg-white/10 text-white/30'
              )}
            >
              {done ? <CheckCircle className="w-4 h-4" /> : step}
            </div>
            {step < total && (
              <div
                className={cn(
                  'flex-1 h-0.5 rounded transition-all duration-300',
                  current > step ? 'bg-green-500' : 'bg-white/10'
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ParentRegisterPage() {
  usePageTitle('Daftar sebagai Orang Tua')
  const navigate = useNavigate()

  // State
  const [step, setStep] = useState<Step>(1)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [profile, setProfile] = useState<ParentProfile>({
    fullName: '',
    email: '',
    relationship: 'ayah',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)

  // Countdown timer untuk resend OTP
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  // ── Step 1: Request OTP ──────────────────────────────────────────────────────

  const handleRequestOtp = async () => {
    setError('')
    if (!phone || phone.replace(/[^0-9]/g, '').length < 9) {
      setError('Masukkan nomor HP yang valid (minimal 9 digit).')
      return
    }

    setLoading(true)
    try {
      const normalized = normalizePhone(phone)

      // Panggil RPC untuk membuat OTP
      const { data, error: rpcError } = await db.rpc('request_parent_otp', {
        p_phone: normalized,
        p_tenant_id: null,
      })

      if (rpcError) throw new Error(rpcError.message)

      const result = data as {
        success: boolean
        error?: string
        dev_otp?: string
        expires_at?: string
      }

      if (!result.success) {
        setError(result.error ?? 'Gagal mengirim OTP. Coba lagi.')
        return
      }

      // Dev mode: simpan OTP untuk ditampilkan di UI
      if (import.meta.env.DEV && result.dev_otp) {
        setDevOtp(result.dev_otp)
        if (import.meta.env.DEV) {
          logger.warn('[ParentRegister] DEV OTP:', result.dev_otp)
        }
      }

      setStep(2)
      setResendCountdown(60)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim OTP'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ───────────────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    setError('')
    if (otp.length !== 6) {
      setError('Masukkan 6 digit kode OTP.')
      return
    }

    setLoading(true)
    try {
      const normalized = normalizePhone(phone)

      const { data, error: rpcError } = await db.rpc('verify_parent_otp', {
        p_phone: normalized,
        p_otp_code: otp,
      })

      if (rpcError) throw new Error(rpcError.message)

      const result = data as { success: boolean; error?: string }

      if (!result.success) {
        setError(result.error ?? 'Kode OTP tidak valid atau sudah kadaluarsa.')
        return
      }

      // OTP valid — lanjut ke step 3 (lengkapi profil)
      setStep(3)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memverifikasi OTP'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Complete Registration ────────────────────────────────────────────

  const handleCompleteRegistration = async () => {
    setError('')
    if (!profile.fullName.trim()) {
      setError('Nama lengkap wajib diisi.')
      return
    }
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      setError('Format email tidak valid.')
      return
    }

    setLoading(true)
    try {
      const normalized = normalizePhone(phone)
      const tempEmail = generateTempEmail(normalized)
      const tempPassword = generateSecurePassword()

      // Buat akun auth dengan email sementara
      const { data: signUpData, error: signUpError } = await db.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            first_name: profile.fullName.split(' ')[0] ?? profile.fullName,
            last_name: profile.fullName.split(' ').slice(1).join(' ') || '',
            phone: normalized,
            role: 'parent',
          },
          // Skip email confirmation untuk OTP-based registration
          emailRedirectTo: undefined,
        },
      })

      if (signUpError) throw signUpError
      if (!signUpData.user) throw new Error('Gagal membuat akun.')

      const userId = signUpData.user.id

      // Update profil di tabel profiles
      const { error: profileError } = await db.from('profiles').upsert({
        id: userId,
        email: profile.email || tempEmail,
        first_name: profile.fullName.split(' ')[0] ?? profile.fullName,
        last_name: profile.fullName.split(' ').slice(1).join(' ') || '',
        phone: normalized,
      })

      if (profileError) {
        logger.error('[ParentRegister] Profile upsert error:', profileError)
        // Non-fatal: akun sudah dibuat, profil bisa diupdate nanti
      }

      // Langsung sign in agar sesi aktif
      const { error: signInError } = await db.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword,
      })

      if (signInError) {
        // Jika email belum dikonfirmasi, redirect ke halaman sukses
        logger.warn('[ParentRegister] Auto sign-in skipped:', signInError.message)
      }

      setStep(4)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyelesaikan pendaftaran'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ───────────────────────────────────────────────────────────────

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return
    setOtp('')
    setDevOtp(null)
    setError('')
    await handleRequestOtp()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏫</div>
          <h1 className="text-3xl font-bold text-white">EduSync</h1>
          <p className="text-blue-300/70 text-sm mt-1">Portal Orang Tua Siswa</p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Dev Mode Banner */}
          {import.meta.env.DEV && step !== 4 && (
            <div className="mb-5 p-3 bg-yellow-500/15 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-300 text-xs font-semibold uppercase tracking-wide mb-1">
                Mode Pengembangan
              </p>
              <p className="text-yellow-200/70 text-xs leading-relaxed">
                OTP dikirim ke konsol browser, bukan WhatsApp nyata.
                {devOtp && (
                  <>
                    {' '}
                    Kode OTP Anda:{' '}
                    <span className="font-mono font-bold text-yellow-300 text-sm">{devOtp}</span>
                  </>
                )}
              </p>
            </div>
          )}

          {/* ── Step 4: Success ─────────────────────────────────────────────── */}
          {step === 4 ? (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-white font-bold text-xl mb-2">Pendaftaran Berhasil!</h2>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Akun orang tua Anda telah berhasil dibuat. Silakan masuk untuk mengakses dashboard
                dan memantau perkembangan anak Anda.
              </p>
              <button
                type="button"
                onClick={() => navigate('/app/parent')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-colors mb-3"
              >
                Ke Dashboard Orang Tua
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full bg-white/5 hover:bg-white/10 text-white/70 rounded-xl py-2.5 text-sm transition-colors"
              >
                Kembali ke Login
              </button>
            </div>
          ) : (
            <>
              {/* Step Indicator */}
              <StepIndicator current={step} total={3} />

              {/* ── Step 1: Input Nomor HP ─────────────────────────────────── */}
              {step === 1 && (
                <div>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-4 h-4 text-blue-400" />
                      <h2 className="text-white font-bold text-lg">Daftar sebagai Orang Tua</h2>
                    </div>
                    <p className="text-white/50 text-sm">
                      Masukkan nomor HP Anda. Kami akan mengirim kode verifikasi.
                    </p>
                  </div>

                  {/* Phone Input */}
                  <div className="mb-4">
                    <label htmlFor="phone" className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      Nomor HP
                    </label>
                    <div className="flex gap-2">
                      {/* Country code */}
                      <div className="flex items-center justify-center bg-white/5 border border-white/10 rounded-xl px-3 text-white font-medium text-sm shrink-0">
                        +62
                      </div>
                      <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="8xx-xxxx-xxxx"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value)
                          if (error) setError('')
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                        className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
                        autoFocus
                      />
                    </div>
                    <p className="text-white/30 text-xs mt-2">
                      Contoh: 0812-3456-7890 atau 812-3456-7890
                    </p>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="mb-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      'Kirim Kode Verifikasi'
                    )}
                  </button>

                  <div className="mt-6 text-center">
                    <span className="text-white/40 text-sm">Sudah punya akun? </span>
                    <Link
                      to="/login"
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                      Masuk di sini
                    </Link>
                  </div>
                </div>
              )}

              {/* ── Step 2: Input OTP ──────────────────────────────────────── */}
              {step === 2 && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1)
                      setOtp('')
                      setError('')
                    }}
                    className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Ganti nomor HP
                  </button>

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">✉️</span>
                      <h2 className="text-white font-bold text-lg">Masukkan Kode Verifikasi</h2>
                    </div>
                    <p className="text-white/50 text-sm">
                      Kode dikirim ke{' '}
                      <span className="text-white font-medium">{formatPhoneDisplay(phone)}</span>
                    </p>
                  </div>

                  {/* OTP Input */}
                  <div className="mb-4">
                    <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                  </div>

                  {/* Info OTP */}
                  <p className="text-center text-white/40 text-xs mb-4">Berlaku 10 menit</p>

                  {/* Resend */}
                  <div className="text-center mb-4">
                    {resendCountdown > 0 ? (
                      <p className="text-white/30 text-sm">
                        Kirim ulang dalam{' '}
                        <span className="text-blue-400 font-medium">{resendCountdown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Kirim ulang kode
                      </button>
                    )}
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="mb-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Memverifikasi...
                      </>
                    ) : (
                      'Verifikasi'
                    )}
                  </button>
                </div>
              )}

              {/* ── Step 3: Lengkapi Profil ────────────────────────────────── */}
              {step === 3 && (
                <div>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-blue-400" />
                      <h2 className="text-white font-bold text-lg">Lengkapi Profil Anda</h2>
                    </div>
                    <p className="text-white/50 text-sm">
                      Nomor HP terverifikasi. Lengkapi data diri untuk melanjutkan.
                    </p>
                  </div>

                  {/* Nama Lengkap */}
                  <div className="mb-4">
                    <label htmlFor="fullName" className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      Nama Lengkap <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      placeholder="Masukkan nama lengkap Anda"
                      value={profile.fullName}
                      onChange={(e) => {
                        setProfile((p) => ({ ...p, fullName: e.target.value }))
                        if (error) setError('')
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
                      autoFocus
                    />
                  </div>

                  {/* Email (opsional) */}
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wide">
                      Email{' '}
                      <span className="text-white/30 normal-case font-normal">(opsional)</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      placeholder="email@contoh.com"
                      value={profile.email}
                      onChange={(e) => {
                        setProfile((p) => ({ ...p, email: e.target.value }))
                        if (error) setError('')
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
                    />
                  </div>

                  {/* Hubungan dengan Siswa */}
                  <div className="mb-6">
                    <label className="block text-white/60 text-xs font-medium mb-2 uppercase tracking-wide">
                      Hubungan dengan Siswa <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { value: 'ayah', label: '👨 Ayah' },
                          { value: 'ibu', label: '👩 Ibu' },
                          { value: 'wali', label: '🧑‍⚖️ Wali' },
                          { value: 'kakak', label: '🧑 Kakak' },
                        ] as const
                      ).map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setProfile((p) => ({ ...p, relationship: value }))}
                          className={cn(
                            'py-2.5 px-3 rounded-xl text-sm font-medium transition-all border',
                            profile.relationship === value
                              ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="mb-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleCompleteRegistration}
                    disabled={loading || !profile.fullName.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Mendaftarkan...
                      </>
                    ) : (
                      'Selesaikan Pendaftaran'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Help text */}
        {step !== 4 && (
          <p className="text-center text-white/30 text-xs mt-4">
            Butuh bantuan?{' '}
            <a
              href="mailto:support@edusync.app"
              className="text-blue-400/70 hover:text-blue-400 transition-colors"
            >
              Hubungi dukungan
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
