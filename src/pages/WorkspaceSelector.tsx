import { ArrowRight, Building, Loader2, LogOut } from 'lucide-react'
import { motion } from 'motion/react'
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useToast } from '@/components/ui'
import { authService } from '@/features/auth/api/authService'
import { consumePostAuthRedirect, peekPostAuthRedirect } from '@/features/auth/utils/authFlow'
import { usePageTitle } from '@/hooks/usePageTitle'

import { useAuth } from '../contexts/AuthContext'
import { OnboardingLayout } from '../features/onboarding/components/OnboardingLayout'
import { RolePickerStep } from '../features/onboarding/components/RolePickerStep'
import { SchoolCreateForm } from '../features/onboarding/components/SchoolCreateForm'
import { StudentJoinForm } from '../features/onboarding/components/StudentJoinForm'

type OnboardingStep = 'pick-role' | 'student-form' | 'teacher-form' | 'admin-form'

export function WorkspaceSelector() {
  usePageTitle('Pilih Ruang Kerja')
  const {
    memberships,
    activeTenant,
    setActiveTenant,
    loading,
    signOut,
    user,
    refreshAuthBootstrap,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Preserve the deep link that TenantGuard captured before redirecting here.
  // Cast is safe: react-router state is typed as unknown.
  const fromState = (
    location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null
  )?.from
  const returnPath = fromState
    ? `${fromState.pathname ?? ''}${fromState.search ?? ''}${fromState.hash ?? ''}`
    : null
  const addToast = useToast((s) => s.addToast)

  const [step, setStep] = useState<OnboardingStep>('pick-role')
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (activeTenant && memberships.length > 0) {
      // Navigate to original deep link if preserved, otherwise fallback to /app
      void navigate(returnPath ?? consumePostAuthRedirect() ?? '/app', { replace: true })
    }
  }, [activeTenant, memberships, navigate, returnPath])

  // ── Handlers ──

  const handleStudentJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) {
      addToast({ type: 'error', message: 'Masukkan kode kelas dari guru Anda.' })
      return
    }
    if (!fullName.trim()) {
      addToast({ type: 'error', message: 'Masukkan nama lengkap Anda.' })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await authService.onboardStudentJoinClass({
        joinCode: joinCode.trim(),
        fullName: fullName.trim(),
      })

      addToast({
        type: 'success',
        message: `Berhasil bergabung di kelas ${result?.class_name || ''} — ${result?.school_name || 'sekolah Anda'}!`,
      })

      await refreshAuthBootstrap()
      if (result?.tenant_id) {
        await setActiveTenant(result.tenant_id)
      }
      void navigate(returnPath ?? peekPostAuthRedirect() ?? '/app', { replace: true })
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Kode kelas tidak ditemukan. Minta kode yang benar dari guru Anda.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTeacherCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolName.trim() || !fullName.trim()) {
      addToast({ type: 'error', message: 'Harap isi nama lengkap dan nama sekolah.' })
      return
    }

    setIsSubmitting(true)
    try {
      const tenantId = await authService.createSchoolTenant({
        schoolName: schoolName.trim(),
        fullName: fullName.trim(),
        role: 'teacher',
      })

      addToast({
        type: 'success',
        message: `Sekolah "${schoolName.trim()}" berhasil dibuat! Anda terdaftar sebagai Guru.`,
      })

      await refreshAuthBootstrap()
      await setActiveTenant(tenantId)
      void navigate(returnPath ?? peekPostAuthRedirect() ?? '/app', { replace: true })
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuat sekolah.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAdminCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolName.trim() || !fullName.trim()) {
      addToast({ type: 'error', message: 'Harap isi nama lengkap dan nama sekolah.' })
      return
    }

    setIsSubmitting(true)
    try {
      const tenantId = await authService.createSchoolTenant({
        schoolName: schoolName.trim(),
        fullName: fullName.trim(),
        role: 'admin',
      })

      addToast({
        type: 'success',
        message: `Sekolah "${schoolName.trim()}" berhasil dibuat! Anda terdaftar sebagai Admin.`,
      })

      await refreshAuthBootstrap()
      await setActiveTenant(tenantId)
      void navigate(returnPath ?? peekPostAuthRedirect() ?? '/app', { replace: true })
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuat sekolah.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = () => {
    void signOut()
  }

  // ── Loading ──

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ONBOARDING: New user (no memberships)
  // ════════════════════════════════════════════════════════════════════════════
  if (memberships.length === 0) {
    return (
      <OnboardingLayout email={user?.email}>
        {/* ── Step: Pick Role ── */}
        {step === 'pick-role' && <RolePickerStep onSelectRole={setStep} />}

        {/* ── Step: Student Form ── */}
        {step === 'student-form' && (
          <StudentJoinForm
            fullName={fullName}
            joinCode={joinCode}
            isSubmitting={isSubmitting}
            onFullNameChange={setFullName}
            onJoinCodeChange={setJoinCode}
            onBack={() => setStep('pick-role')}
            onSubmit={handleStudentJoin}
          />
        )}

        {/* ── Step: Teacher Form ── */}
        {step === 'teacher-form' && (
          <SchoolCreateForm
            userRole="teacher"
            fullName={fullName}
            schoolName={schoolName}
            isSubmitting={isSubmitting}
            onFullNameChange={setFullName}
            onSchoolNameChange={setSchoolName}
            onBack={() => setStep('pick-role')}
            onSubmit={handleTeacherCreate}
          />
        )}

        {/* ── Step: Admin Form ── */}
        {step === 'admin-form' && (
          <SchoolCreateForm
            userRole="admin"
            fullName={fullName}
            schoolName={schoolName}
            isSubmitting={isSubmitting}
            onFullNameChange={setFullName}
            onSchoolNameChange={setSchoolName}
            onBack={() => setStep('pick-role')}
            onSubmit={handleAdminCreate}
          />
        )}

        {/* Sign Out */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSignOut}
            className="text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <LogOut size={16} />
            <span>Gunakan Akun Lain</span>
          </button>
        </div>
      </OnboardingLayout>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EXISTING USER: Has memberships → pick workspace
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 font-sans dark:bg-slate-950">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-8"
        >
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Pilih Ruang Kerja
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pilih organisasi sekolah untuk melanjutkan
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col gap-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
        >
          {memberships.map((membership) => (
            <motion.button
              key={membership.tenant_id}
              onClick={() => void setActiveTenant(membership.tenant_id)}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-500 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/50"
            >
              <div className="z-10 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-blue-500/10 dark:group-hover:text-blue-400">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                    {membership.tenant_name}
                  </h3>
                  <p className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-500">
                    Peran: {membership.role}
                  </p>
                </div>
              </div>
              <div className="z-10 text-slate-400 transition-colors group-hover:text-blue-500 dark:text-slate-600 dark:group-hover:text-blue-400">
                <ArrowRight className="h-4 w-4" />
              </div>
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 flex justify-center border-t border-slate-200 pt-6 dark:border-slate-800"
        >
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar dari akun
          </button>
        </motion.div>
      </div>
    </div>
  )
}
