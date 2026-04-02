import React from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

import { LoginForm } from '@/features/auth/components/LoginForm'
import { RegisterStep1, RegisterStep2 } from '@/features/auth/components/RegisterForm'
import { useLoginState } from '@/features/auth/hooks/useLoginState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/utils/cn'

export function Login() {
  usePageTitle('Masuk')
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'
  const {
    user,
    loading,
    mode,
    step,
    setStep,
    error,
    setError,
    submitting,
    loginForm,
    registerForm,
    joinCode,
    setJoinCode,
    classInfo,
    classLookupLoading,
    classLookupError,
    inviteToken,
    inviteInfo,
    handleSignIn,
    handleRegisterStep1,
    handleRegisterSubmit,
    handleGoogleAuth,
    fillAccount,
    switchMode,
    setMode,
  } = useLoginState()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="w-10 h-10 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (user) return <Navigate to={from} replace />

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

              {/* Google OAuth Button */}
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

              {mode === 'login' && (
                <LoginForm
                  loginForm={loginForm}
                  error={error}
                  setError={setError}
                  submitting={submitting}
                  onSubmit={handleSignIn}
                />
              )}

              {mode === 'register' && step === 1 && (
                <RegisterStep1
                  registerForm={registerForm}
                  error={error}
                  submitting={submitting}
                  inviteToken={inviteToken}
                  inviteInfo={inviteInfo}
                  onSubmit={handleRegisterStep1}
                />
              )}

              {mode === 'register' && step === 2 && (
                <RegisterStep2
                  joinCode={joinCode}
                  setJoinCode={setJoinCode}
                  classInfo={classInfo}
                  classLookupLoading={classLookupLoading}
                  classLookupError={classLookupError}
                  error={error}
                  submitting={submitting}
                  onBack={() => setStep(1)}
                  onSubmit={handleRegisterSubmit}
                />
              )}
            </>
          )}
        </div>

        {/* Parent Registration Link */}
        {step !== 3 && (
          <div className="mt-4 text-center">
            <Link
              to="/register-parent"
              className="inline-flex items-center gap-2 text-sm text-blue-400/80 hover:text-blue-300 transition-colors group"
            >
              <span className="text-base">👨‍👩‍👧</span>
              <span>
                Daftar sebagai Orang Tua Siswa
                <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </span>
            </Link>
          </div>
        )}

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
