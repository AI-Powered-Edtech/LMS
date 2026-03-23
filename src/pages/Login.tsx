import { valibotResolver } from '@hookform/resolvers/valibot'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'

import { FormField } from '@/src/components/ui/FormField'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { supabase } from '@/src/services/supabase/client'
import {
  type LoginFormData,
  LoginFormSchema,
  type RegisterFormData,
  RegisterFormSchema,
} from '@/src/shared/schemas/forms'
import { cn } from '@/src/utils/cn'
import { loginRateLimiter } from '@/src/utils/rateLimiter'

import { useAuth } from '../contexts/AuthContext'

interface InviteInfo {
  email: string
  role: string
  tenant_name: string
  tenant_id: string
}

interface ClassInfo {
  class_id: string
  class_name: string
  teacher_name: string
  tenant_id: string
  tenant_name: string
}

export function Login() {
  usePageTitle('Masuk')
  const { user, signIn, signUp, signInWithGoogle, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Shared
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loginForm = useForm<LoginFormData>({
    resolver: valibotResolver(LoginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm<RegisterFormData>({
    resolver: valibotResolver(RegisterFormSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  })

  // Register step 2
  const [joinCode, setJoinCode] = useState('')
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [classLookupLoading, setClassLookupLoading] = useState(false)
  const [classLookupError, setClassLookupError] = useState('')

  // Invite token from URL
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)

  useEffect(() => {
    const hash = window.location.hash
    const queryPart = hash.split('?')[1]
    if (queryPart) {
      const params = new URLSearchParams(queryPart)
      const token = params.get('invite')
      if (token) {
        setInviteToken(token)
        setMode('register')
        supabase.rpc('validate_invitation', { p_token: token }).then(({ data }) => {
          if (data?.valid) {
            setInviteInfo(data as InviteInfo)
            registerForm.setValue('email', data.email)
          } else {
            setError(data?.error || 'Undangan tidak valid atau sudah kedaluwarsa.')
          }
        })
      }
    }
  }, [registerForm])

  // Live class code lookup
  useEffect(() => {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) {
      setClassInfo(null)
      setClassLookupError('')
      return
    }
    const timer = setTimeout(async () => {
      setClassLookupLoading(true)
      const { data } = await supabase.rpc('public_lookup_class', { p_join_code: code })
      setClassLookupLoading(false)
      if (data?.found) {
        setClassInfo(data as ClassInfo)
        setClassLookupError('')
      } else {
        setClassInfo(null)
        if (code.length >= 5) setClassLookupError(data?.error ?? 'Kode tidak ditemukan')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [joinCode])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="w-10 h-10 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  const translateAuthError = (message: string): string => {
    if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
      return 'Email atau kata sandi salah. Silakan coba lagi.'
    }
    if (message.includes('Email not confirmed')) {
      return 'Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.'
    }
    if (message.includes('Too many requests')) {
      return 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit.'
    }
    if (message.includes('User not found')) {
      return 'Akun tidak ditemukan. Pastikan email yang dimasukkan benar.'
    }
    return message
  }

  const handleSignIn = async (data: LoginFormData) => {
    setError('')

    const { allowed, retryAfterMs } = loginRateLimiter.check('login')
    if (!allowed) {
      const seconds = Math.ceil(retryAfterMs / 1000)
      setError(`Terlalu banyak percobaan. Silakan coba lagi dalam ${seconds} detik.`)
      return
    }

    setSubmitting(true)
    try {
      const { error: err } = await signIn(data.email, data.password)
      if (err) setError(translateAuthError(err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegisterStep1 = (_data: RegisterFormData) => {
    setError('')
    if (inviteToken) {
      handleRegisterSubmit()
    } else {
      setStep(2)
    }
  }

  const handleRegisterSubmit = async () => {
    setError('')
    setSubmitting(true)
    try {
      const data = registerForm.getValues()
      const tenantId = classInfo?.tenant_id || inviteInfo?.tenant_id
      const { error: err } = await signUp(
        data.email,
        data.password,
        data.firstName,
        data.lastName,
        tenantId
      )
      if (err) {
        setError(translateAuthError(err.message))
        return
      }

      if (joinCode.trim() && classInfo) {
        localStorage.setItem('pendingJoinCode', joinCode.trim().toUpperCase())
      }
      if (inviteToken) {
        localStorage.setItem('pendingInviteToken', inviteToken)
      }
      setStep(3)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleAuth = () => {
    signInWithGoogle()
  }

  const fillAccount = import.meta.env.DEV
    ? async (role: string) => {
        const devEmail = `${role}@edusync.dev`
        const devPassword = import.meta.env.VITE_DEV_PASSWORD
        if (!devPassword) {
          setError('VITE_DEV_PASSWORD tidak diset di .env')
          return
        }
        loginForm.reset({ email: devEmail, password: devPassword })
        setMode('login')
        setError('')
        setSubmitting(true)
        try {
          const { error: err } = await signIn(devEmail, devPassword)
          if (err) {
            setError(err.message)
          }
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : String(e))
        } finally {
          setSubmitting(false)
        }
      }
    : undefined

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setStep(1)
    setError('')
    setJoinCode('')
    setClassInfo(null)
    loginForm.reset()
    registerForm.reset()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📚</div>
          <h1 className="text-3xl font-bold text-white">EduSync</h1>
          <p className="text-blue-300/70 text-sm mt-1">Sistem Manajemen Pembelajaran</p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Invite Banner */}
          {inviteInfo && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
              <p className="text-green-300 font-semibold text-sm">
                🎉 Anda diundang ke {inviteInfo.tenant_name}
              </p>
              <p className="text-white/50 text-xs mt-1">
                Peran: <span className="text-blue-300 font-medium">{inviteInfo.role}</span>
              </p>
            </div>
          )}

          {/* Success State */}
          {step === 3 ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-white font-bold text-xl mb-2">Akun berhasil dibuat!</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Silakan periksa email Anda untuk verifikasi.{' '}
                {classInfo
                  ? `Anda akan otomatis tergabung ke kelas "${classInfo.class_name}" setelah login.`
                  : 'Administrator akan mengaktifkan akses Anda.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setMode('login')
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-colors"
              >
                Ke Halaman Login
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  aria-pressed={mode === 'login'}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                    mode === 'login'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-white/50 hover:text-white'
                  )}
                >
                  Masuk
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  aria-pressed={mode === 'register'}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                    mode === 'register'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-white/50 hover:text-white'
                  )}
                >
                  Daftar
                </button>
              </div>

              {/* Step indicator for register */}
              {mode === 'register' && !inviteToken && (
                <div className="flex items-center gap-2 mb-6">
                  {[1, 2].map((s) => (
                    <React.Fragment key={s}>
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all',
                          step >= s ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/30'
                        )}
                      >
                        {s}
                      </div>
                      {s < 2 && (
                        <div
                          className={cn(
                            'flex-1 h-0.5 rounded transition-all',
                            step > s ? 'bg-blue-600' : 'bg-white/10'
                          )}
                        />
                      )}
                    </React.Fragment>
                  ))}
                  <span className="text-white/40 text-xs ml-1">
                    {step === 1 ? 'Informasi Akun' : 'Kode Kelas (Opsional)'}
                  </span>
                </div>
              )}

              {/* Google OAuth Button (shown on step 1 for both modes) */}
              {(mode === 'login' || (mode === 'register' && step === 1)) && (
                <>
                  <button
                    onClick={handleGoogleAuth}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl py-3 font-semibold transition-colors mb-4 border border-white/10"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Lanjutkan dengan Google
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/30 text-xs">atau dengan email</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                </>
              )}

              {/* Login Form */}
              {mode === 'login' && (
                <form
                  onSubmit={loginForm.handleSubmit(handleSignIn, () => {
                    // Show error when form validation fails (e.g., empty fields from autofill issues)
                    const errors = loginForm.formState.errors
                    if (errors.email) {
                      setError(errors.email.message || 'Email tidak valid.')
                    } else if (errors.password) {
                      setError(errors.password.message || 'Kata sandi wajib diisi.')
                    } else {
                      setError('Silakan isi email dan kata sandi.')
                    }
                  })}
                  className="space-y-4"
                >
                  <FormField
                    name="email"
                    control={loginForm.control}
                    label="Email"
                    labelClassName="text-white/60 text-xs font-medium mb-1.5"
                  >
                    <input
                      type="email"
                      placeholder="kamu@email.com"
                      autoComplete="email"
                      onInput={(e: React.FormEvent<HTMLInputElement>) => {
                        loginForm.setValue('email', e.currentTarget.value, { shouldValidate: true })
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
                    />
                  </FormField>
                  <FormField
                    name="password"
                    control={loginForm.control}
                    label="Kata Sandi"
                    labelClassName="text-white/60 text-xs font-medium mb-1.5"
                  >
                    <input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      onInput={(e: React.FormEvent<HTMLInputElement>) => {
                        loginForm.setValue('password', e.currentTarget.value, {
                          shouldValidate: true,
                        })
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
                    />
                  </FormField>
                  {error && (
                    <p
                      id="login-error"
                      role="alert"
                      className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                    >
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors mt-2"
                  >
                    {submitting ? 'Masuk...' : 'Masuk'}
                  </button>
                </form>
              )}

              {/* Register Step 1 */}
              {mode === 'register' && step === 1 && (
                <form
                  onSubmit={registerForm.handleSubmit(handleRegisterStep1)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      name="firstName"
                      control={registerForm.control}
                      label="Nama Depan"
                      labelClassName="text-white/60 text-xs font-medium mb-1.5"
                    >
                      <input
                        placeholder="Budi"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
                      />
                    </FormField>
                    <FormField
                      name="lastName"
                      control={registerForm.control}
                      label="Nama Belakang"
                      labelClassName="text-white/60 text-xs font-medium mb-1.5"
                    >
                      <input
                        placeholder="Santoso"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
                      />
                    </FormField>
                  </div>
                  <FormField
                    name="email"
                    control={registerForm.control}
                    label="Email"
                    labelClassName="text-white/60 text-xs font-medium mb-1.5"
                  >
                    <input
                      type="email"
                      placeholder="kamu@email.com"
                      readOnly={!!inviteInfo}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm disabled:opacity-60"
                    />
                  </FormField>
                  <FormField
                    name="password"
                    control={registerForm.control}
                    label="Kata Sandi"
                    labelClassName="text-white/60 text-xs font-medium mb-1.5"
                  >
                    <input
                      type="password"
                      placeholder="Minimal 6 karakter"
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
                    />
                  </FormField>
                  {error && (
                    <p
                      role="alert"
                      className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                    >
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors mt-2"
                  >
                    {inviteToken
                      ? submitting
                        ? 'Membuat Akun...'
                        : 'Buat Akun & Bergabung'
                      : 'Lanjut →'}
                  </button>
                </form>
              )}

              {/* Register Step 2 - Class Code */}
              {mode === 'register' && step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="reg-join-code"
                      className="block text-white/60 text-xs font-medium mb-1.5"
                    >
                      Kode Kelas dari Guru / Tutor
                    </label>
                    <input
                      id="reg-join-code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: ABC123"
                      maxLength={10}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm tracking-widest font-mono uppercase"
                    />
                    {classLookupLoading && (
                      <p className="text-white/40 text-xs mt-2 flex items-center gap-1">
                        <span className="inline-block w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                        Mencari kelas...
                      </p>
                    )}
                    {classInfo && (
                      <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <p className="text-green-300 text-xs font-semibold">Kelas ditemukan</p>
                        <p className="text-white/80 text-sm font-medium mt-0.5">
                          {classInfo.class_name}
                        </p>
                        <p className="text-white/40 text-xs">
                          {classInfo.teacher_name} · {classInfo.tenant_name}
                        </p>
                      </div>
                    )}
                    {classLookupError && joinCode.length >= 5 && (
                      <p className="text-red-400 text-xs mt-2">{classLookupError}</p>
                    )}
                  </div>

                  <p className="text-white/30 text-xs text-center">
                    Minta kode kelas dari guru atau tutor kamu. Jika belum punya, lewati langkah
                    ini.
                  </p>

                  {error && (
                    <p
                      role="alert"
                      className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl py-3 font-semibold transition-colors text-sm"
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      onClick={handleRegisterSubmit}
                      disabled={submitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors text-sm"
                    >
                      {submitting
                        ? 'Membuat...'
                        : classInfo
                          ? 'Daftar & Bergabung'
                          : 'Lewati & Daftar'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Dev quick login */}
        {import.meta.env.DEV && step !== 3 && (
          <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-center">
            <p className="text-yellow-400/60 text-xs mb-2 uppercase tracking-wider font-medium">
              Dev Quick Login
            </p>
            <div className="flex gap-2 justify-center">
              {['student', 'teacher', 'admin'].map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    if (fillAccount) fillAccount(r)
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-xs font-medium transition-colors border border-white/5 disabled:opacity-50"
                >
                  {r === 'student' ? '🎓' : r === 'teacher' ? '👩‍🏫' : '🛡️'} {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
