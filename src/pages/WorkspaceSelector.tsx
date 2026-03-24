import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Loader2,
  LogOut,
  ShieldCheck,
  Users,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@/src/components/ui'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { supabase } from '@/src/services/supabase/client'

import { useAuth } from '../contexts/AuthContext'

type OnboardingStep = 'pick-role' | 'student-form' | 'teacher-form' | 'admin-form'

export function WorkspaceSelector() {
  usePageTitle('Pilih Ruang Kerja')
  const { memberships, activeTenant, setActiveTenant, loading, signOut, user } = useAuth()
  const navigate = useNavigate()
  const addToast = useToast((s) => s.addToast)

  const [step, setStep] = useState<OnboardingStep>('pick-role')
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (activeTenant && memberships.length > 0) {
      navigate('/app')
    }
  }, [activeTenant, memberships, navigate])

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
      const { data, error } = await supabase.rpc('onboard_student_join_class', {
        p_join_code: joinCode.trim(),
        p_full_name: fullName.trim(),
      })

      if (error) throw error

      const result = data as { class_name?: string; school_name?: string } | null
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
      const { error } = await supabase.rpc('create_school_tenant', {
        p_school_name: schoolName.trim(),
        p_full_name: fullName.trim(),
        p_role: 'teacher',
      })

      if (error) throw error

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
      const { error } = await supabase.rpc('create_school_tenant', {
        p_school_name: schoolName.trim(),
        p_full_name: fullName.trim(),
        p_role: 'admin',
      })

      if (error) throw error

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 p-4">
        <div className="max-w-lg w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap size={32} />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
              Selamat Datang di EduSync!
            </h1>
            <p className="text-slate-400 text-sm">
              Masuk sebagai <span className="text-white font-medium">{user?.email}</span>
            </p>
          </div>

          {/* ── Step: Pick Role ── */}
          {step === 'pick-role' && (
            <div className="space-y-3">
              <p className="text-center text-slate-300 font-medium mb-6 text-lg">Saya adalah...</p>

              {/* MURID */}
              <button
                onClick={() => setStep('student-form')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-5 transition-all flex items-center justify-between group hover:shadow-lg hover:shadow-emerald-500/20"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Murid</h3>
                    <p className="text-emerald-200 text-sm">Saya punya kode kelas dari guru saya</p>
                  </div>
                </div>
                <ArrowRight className="group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* GURU */}
              <button
                onClick={() => setStep('teacher-form')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-5 transition-all flex items-center justify-between group hover:shadow-lg hover:shadow-blue-500/20"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Guru</h3>
                    <p className="text-blue-200 text-sm">Saya ingin membuat kelas dan materi</p>
                  </div>
                </div>
                <ArrowRight className="group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* ADMIN */}
              <button
                onClick={() => setStep('admin-form')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-2xl p-5 transition-all flex items-center justify-between group hover:shadow-lg hover:shadow-slate-500/10"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-slate-600/50 rounded-xl flex items-center justify-center">
                    <ShieldCheck size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Admin Sekolah</h3>
                    <p className="text-slate-300 text-sm">Saya mengelola sekolah dan pengguna</p>
                  </div>
                </div>
                <ArrowRight className="group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>
          )}

          {/* ── Step: Student Form ── */}
          {step === 'student-form' && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Gabung sebagai Murid</h2>
                  <p className="text-slate-400 text-xs">
                    Masukkan kode kelas yang diberikan guru Anda
                  </p>
                </div>
              </div>
              <form onSubmit={handleStudentJoin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Misal: Andi Pratama"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Kode Kelas
                  </label>
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-lg tracking-widest text-center uppercase"
                    placeholder="ABC123"
                    maxLength={10}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Minta kode ini dari guru atau wali kelas Anda.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('pick-role')}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 transition-colors font-bold flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Gabung Kelas'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Step: Teacher Form ── */}
          {step === 'teacher-form' && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Daftar sebagai Guru</h2>
                  <p className="text-slate-400 text-xs">Buat sekolah baru dan mulai mengajar</p>
                </div>
              </div>
              <form onSubmit={handleTeacherCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Misal: Budi Santoso, S.Pd."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Nama Sekolah
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Misal: SMA Negeri 1 Jakarta"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Anda dapat mengundang guru lain setelah sekolah dibuat.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('pick-role')}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 transition-colors font-bold flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      'Buat Sekolah & Mulai'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Step: Admin Form ── */}
          {step === 'admin-form' && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Daftar sebagai Admin</h2>
                  <p className="text-slate-400 text-xs">Kelola sekolah, guru, dan siswa</p>
                </div>
              </div>
              <form onSubmit={handleAdminCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Misal: Dr. Siti Rahayu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Nama Sekolah
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Misal: SMA Negeri 1 Jakarta"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Sebagai admin, Anda akan memiliki kendali penuh atas pengaturan sekolah.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('pick-role')}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-2.5 transition-colors font-bold flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      'Buat Sekolah & Mulai'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sign Out */}
          <div className="mt-8 text-center">
            <button
              onClick={() => signOut()}
              className="text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center space-x-2 mx-auto"
            >
              <LogOut size={16} />
              <span>Gunakan Akun Lain</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EXISTING USER: Has memberships → pick workspace
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Pilih Ruang Kerja</h1>
          <p className="text-slate-400">Pilih organisasi sekolah untuk melanjutkan</p>
        </div>

        <div className="space-y-4">
          {memberships.map((membership) => (
            <button
              key={membership.tenant_id}
              onClick={() => setActiveTenant(membership.tenant_id)}
              className="w-full text-left bg-slate-800 hover:bg-slate-700 hover:border-blue-500 border border-slate-700 rounded-xl p-6 transition-all duration-200 group flex items-center justify-between"
            >
              <div>
                <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {membership.tenant_name}
                </h3>
                <p className="text-slate-400 mt-1 capitalize">Peran: {membership.role}</p>
              </div>
              <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 text-slate-400 transition-colors">
                <ArrowRight size={20} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => signOut()}
            className="text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <LogOut size={16} />
            <span>Keluar dari akun</span>
          </button>
        </div>
      </div>
    </div>
  )
}
