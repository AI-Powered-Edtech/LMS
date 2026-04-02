import { Loader2, LogOut } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useToast } from '@/components/ui'
import { authService } from '@/features/auth/api/authService'
import { usePageTitle } from '@/hooks/usePageTitle'

import { useAuth } from '../contexts/AuthContext'
import { MembershipList } from '../features/onboarding/components/MembershipList'
import { OnboardingLayout } from '../features/onboarding/components/OnboardingLayout'
import { RolePickerStep } from '../features/onboarding/components/RolePickerStep'
import { SchoolCreateForm } from '../features/onboarding/components/SchoolCreateForm'
import { StudentJoinForm } from '../features/onboarding/components/StudentJoinForm'

type OnboardingStep = 'pick-role' | 'student-form' | 'teacher-form' | 'admin-form'

export function WorkspaceSelector() {
  usePageTitle('Pilih Ruang Kerja')
  const { memberships, activeTenant, setActiveTenant, loading, signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Preserve the deep link that TenantGuard captured before redirecting here.
  // Cast is safe: react-router state is typed as unknown.
  const returnPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
  const addToast = useToast((s) => s.addToast)

  const [step, setStep] = useState<OnboardingStep>('pick-role')
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (activeTenant && memberships.length > 0) {
      // Navigate to original deep link if preserved, otherwise fallback to /app
      navigate(returnPath ?? '/app', { replace: true })
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

      window.location.href = '/'
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
      await authService.createSchoolTenant({
        schoolName: schoolName.trim(),
        fullName: fullName.trim(),
        role: 'teacher',
      })

      addToast({
        type: 'success',
        message: `Sekolah "${schoolName.trim()}" berhasil dibuat! Anda terdaftar sebagai Guru.`,
      })

      window.location.href = '/'
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
      await authService.createSchoolTenant({
        schoolName: schoolName.trim(),
        fullName: fullName.trim(),
        role: 'admin',
      })

      addToast({
        type: 'success',
        message: `Sekolah "${schoolName.trim()}" berhasil dibuat! Anda terdaftar sebagai Admin.`,
      })

      window.location.href = '/'
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
    signOut()
  }

  // ── Loading ──

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
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
    <MembershipList
      memberships={memberships}
      onSelectTenant={setActiveTenant}
      onSignOut={handleSignOut}
    />
  )
}
