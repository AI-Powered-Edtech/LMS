import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/features/auth/components/LoginForm";
import {
  RegisterStep1,
  RegisterStep2,
} from "@/features/auth/components/RegisterForm";
import { useLoginState } from "@/features/auth/hooks/useLoginState";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/utils/cn";

export function Login() {
  usePageTitle("Masuk");
  const location = useLocation();
  const { authError, authStatus, clearAuthError } = useAuth();
  const fromState = location.state?.from;
  const from = fromState
    ? `${fromState.pathname || ""}${fromState.search || ""}${fromState.hash || ""}`
    : "/";

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
    accountType,
    setAccountType,
    teacherMode,
    setTeacherMode,
    tenantInviteCode,
    setTenantInviteCode,
    inviteToken,
    inviteInfo,
    handleSignIn,
    handleRegisterStep1,
    handleRegisterSubmit,
    handleGoogleAuth,
    demoMode,
    demoAccounts,
    fillAccount,
    switchMode,
    setMode,
  } = useLoginState(from);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-full bg-blue-500/20" />
          <div className="h-8 w-8 animate-spin rounded-full border-y-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (user) return <Navigate to={from} replace />;

  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-slate-50 selection:bg-blue-500/30">
      {/* Left Panel: Form */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-12 xl:px-24">
        {/* Decorative background blur for mobile */}
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px] lg:hidden" />

        <div className="mx-auto w-full max-w-md">
          {/* Header */}
          <div className="mb-10">
            <Link to="/" className="group mb-8 inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/20 ring-1 ring-white/10 transition-transform group-hover:scale-105 group-active:scale-95">
                <span className="text-xl leading-none">📚</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                EduSync
              </h1>
            </Link>

            <h2 className="text-3xl font-bold tracking-tight text-white">
              {mode === "login" ? "Selamat Datang" : "Mulai Perjalanan Anda"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {mode === "login"
                ? "Masuk ke akun Anda untuk melanjutkan pembelajaran."
                : "Daftar sekarang dan bergabung dengan komunitas EduSync."}
            </p>
          </div>

          <div className="relative z-10">
            {/* Demo Accounts */}
            {demoMode && step !== 3 && (
              <div className="mb-8 overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
                <div className="flex items-center gap-2 border-b border-emerald-500/10 bg-emerald-500/10 px-4 py-2.5">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    Akses Cepat Demo
                  </span>
                </div>
                <div className="p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {demoAccounts.map((account) => (
                      <button
                        key={account.key}
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          if (fillAccount) void fillAccount(account.key);
                        }}
                        className="group relative flex flex-col items-start rounded-xl border border-white/5 bg-white/5 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/10 hover:shadow-lg disabled:opacity-50"
                      >
                        <div className="mb-1 flex items-center text-sm font-semibold text-slate-200 transition-colors group-hover:text-white">
                          <span className="text-base leading-none mr-2">
                            {account.icon}
                          </span>{" "}
                          {account.label}
                        </div>
                        <div className="w-full truncate text-[10px] text-slate-400 transition-colors group-hover:text-slate-300">
                          {account.email}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Invite Banner */}
            {inviteInfo && (
              <div className="mb-8 flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 backdrop-blur-sm">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-100">
                    Anda diundang ke{" "}
                    <span className="font-semibold text-white">
                      {inviteInfo.tenant_name}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-blue-300/70">
                    Peran:{" "}
                    <span className="font-medium text-blue-200">
                      {inviteInfo.role}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Success State */}
            {step === 3 ? (
              <div className="flex animate-in flex-col items-center justify-center fade-in zoom-in duration-500 py-8 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </div>
                <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">
                  Akun berhasil dibuat!
                </h2>
                <p className="mb-8 max-w-sm text-sm leading-relaxed text-slate-400">
                  Silakan periksa email Anda untuk verifikasi.{" "}
                  {classInfo
                    ? `Anda akan otomatis tergabung ke kelas "${classInfo.class_name}" setelah login.`
                    : "Administrator akan mengaktifkan akses Anda."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setMode("login");
                  }}
                  className="group inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.98]"
                >
                  Ke Halaman Login
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="relative mb-8 flex w-full rounded-xl bg-slate-900/50 p-1 ring-1 ring-white/10 backdrop-blur-sm">
                  {/* Highlight pill */}
                  <div
                    className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg bg-slate-800 shadow-sm transition-all duration-300 ease-in-out"
                    style={{
                      transform:
                        mode === "login" ? "translateX(0)" : "translateX(100%)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    aria-pressed={mode === "login"}
                    className={cn(
                      "relative z-10 w-1/2 py-2.5 text-sm font-medium transition-colors",
                      mode === "login"
                        ? "text-white"
                        : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    aria-pressed={mode === "register"}
                    className={cn(
                      "relative z-10 w-1/2 py-2.5 text-sm font-medium transition-colors",
                      mode === "register"
                        ? "text-white"
                        : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    Daftar
                  </button>
                </div>

                {/* Step indicator for register */}
                {mode === "register" && !inviteToken && (
                  <div className="mb-8 flex items-center gap-3">
                    {[1, 2].map((s) => (
                      <React.Fragment key={s}>
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                            step >= s
                              ? "bg-blue-600 text-white ring-4 ring-blue-600/20"
                              : "bg-slate-800 text-slate-500 ring-1 ring-slate-700",
                          )}
                        >
                          {s}
                        </div>
                        {s < 2 && (
                          <div className="flex-1 px-2">
                            <div className="h-px w-full bg-slate-800">
                              <div
                                className="h-full bg-blue-600 transition-all duration-500 ease-in-out"
                                style={{ width: step > s ? "100%" : "0%" }}
                              />
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                    <span className="ml-2 text-xs font-medium text-slate-400">
                      {step === 1 ? "Informasi Akun" : "Kode Kelas (Opsional)"}
                    </span>
                  </div>
                )}

                {/* Google OAuth Button */}
                {(mode === "login" || (mode === "register" && step === 1)) && (
                  <>
                    <button
                      onClick={handleGoogleAuth}
                      className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
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
                    <div className="my-6 flex items-center gap-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <span className="text-xs font-medium text-slate-500">
                        atau dengan email
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                  </>
                )}

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {mode === "login" && (
                    <LoginForm
                      loginForm={loginForm}
                      error={error || authError || ""}
                      setError={(value) => {
                        clearAuthError();
                        setError(value);
                      }}
                      submitting={submitting}
                      onSubmit={handleSignIn}
                    />
                  )}

                  {mode === "register" && step === 1 && (
                    <RegisterStep1
                      registerForm={registerForm}
                      error={error || authError || ""}
                      submitting={submitting}
                      inviteToken={inviteToken}
                      inviteInfo={inviteInfo}
                      accountType={accountType}
                      onAccountTypeChange={setAccountType}
                      onSubmit={handleRegisterStep1}
                    />
                  )}

                  {mode === "register" && step === 2 && (
                    <RegisterStep2
                      accountType={accountType}
                      joinCode={joinCode}
                      setJoinCode={setJoinCode}
                      classInfo={classInfo}
                      classLookupLoading={classLookupLoading}
                      classLookupError={classLookupError}
                      teacherMode={teacherMode}
                      setTeacherMode={setTeacherMode}
                      tenantInviteCode={tenantInviteCode}
                      setTenantInviteCode={setTenantInviteCode}
                      firstName={registerForm.getValues("firstName") || ""}
                      error={error}
                      submitting={submitting}
                      onBack={() => setStep(1)}
                      onSubmit={handleRegisterSubmit}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Parent Registration Link */}
          {step !== 3 && (
            <div className="mt-8 text-center sm:text-left">
              <Link
                to="/register-parent"
                className="group inline-flex items-center gap-2 rounded-lg py-2 pr-4 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 transition-colors group-hover:bg-slate-700">
                  <Users className="h-4 w-4" />
                </div>
                <span>Daftar sebagai Orang Tua Siswa</span>
                <ArrowRight className="h-4 w-4 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            </div>
          )}

          {authStatus === "callback_processing" && (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-blue-500/10 py-3 text-xs text-blue-300">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
              <span>Memproses sesi login, mohon tunggu...</span>
            </div>
          )}

          {/* Legal links */}
          <div className="mt-12">
            <p className="text-center text-xs text-slate-500 sm:text-left">
              Dengan masuk atau daftar, Anda menyetujui{" "}
              <Link
                to="/privacy"
                className="text-slate-400 underline decoration-slate-700 underline-offset-2 transition-colors hover:text-slate-200 hover:decoration-slate-400"
              >
                Kebijakan Privasi
              </Link>{" "}
              dan{" "}
              <Link
                to="/terms"
                className="text-slate-400 underline decoration-slate-700 underline-offset-2 transition-colors hover:text-slate-200 hover:decoration-slate-400"
              >
                Ketentuan Layanan
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Premium Visual */}
      <div className="relative hidden w-1/2 overflow-hidden bg-slate-900 lg:block">
        {/* Abstract gradient meshes */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950" />
        <div className="absolute -top-1/4 left-1/4 h-[800px] w-[800px] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-emerald-600/20 blur-[100px] mix-blend-screen" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[80px] mix-blend-screen" />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff10 1px, transparent 1px), linear-gradient(to bottom, #ffffff10 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "linear-gradient(to bottom, white 20%, transparent 90%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, white 20%, transparent 90%)",
          }}
        />

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-8 flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
            <Sparkles className="mr-2 h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium tracking-wide text-blue-200">
              Platform Manajemen Pembelajaran
            </span>
          </div>
          <h2 className="max-w-xl text-balance text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Masa Depan Pembelajaran Digital
          </h2>
          <p className="mt-6 max-w-md text-lg text-slate-300">
            Platform yang dirancang untuk memberdayakan guru, menginspirasi
            siswa, dan menghubungkan orang tua dalam satu ekosistem yang utuh.
          </p>

          {/* Feature floating cards */}
          <div className="mt-16 grid grid-cols-2 gap-4">
            <div className="flex animate-in items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                <BookOpen className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">
                  Materi Interaktif
                </p>
                <p className="text-xs text-slate-400">Belajar lebih efektif</p>
              </div>
            </div>
            <div className="flex animate-in items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 fade-in slide-in-from-bottom-4 duration-700 delay-150 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Kolaborasi</p>
                <p className="text-xs text-slate-400">Komunitas aktif</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
