import {
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  GraduationCap,
  Layers,
  Rocket,
  School,
  Sparkles,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { classroomService } from '@/features/classroom/api/classroomService'
import { courseService } from '@/features/courses/api/courseService'
import { cn } from '@/utils/cn'

import { useTeacherOnboarding } from '../hooks/useTeacherOnboarding'

/* ─── Types ──────────────────────────────────────────────────── */

interface StepProps {
  onNext: () => void
  onSkip?: () => void
  onPrev?: () => void
}

/* ─── Step 1 — Selamat Datang ────────────────────────────────── */

function StepWelcome({ onNext }: StepProps): React.JSX.Element {
  const { profile } = useAuth()
  const firstName = profile?.first_name || 'Guru'

  return (
    <div className="flex flex-col items-center text-center py-4">
      <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg mb-6">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
        Selamat Datang di EduSync! 🎉
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm mb-2">
        Halo, <span className="font-semibold text-slate-700 dark:text-slate-200">{firstName}</span>!
        Kami akan membantu Anda memulai perjalanan mengajar digital dalam beberapa langkah mudah.
      </p>
      <p className="text-slate-400 dark:text-slate-500 text-xs mb-8">
        Proses ini hanya memakan waktu sekitar 2 menit.
      </p>
      <div className="grid grid-cols-3 gap-4 w-full mb-8">
        {[
          {
            icon: <School className="w-5 h-5" />,
            label: 'Buat Kelas',
            color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30',
          },
          {
            icon: <GraduationCap className="w-5 h-5" />,
            label: 'Undang Siswa',
            color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
          },
          {
            icon: <BookOpen className="w-5 h-5" />,
            label: 'Buat Materi',
            color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
          },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2">
            <div
              className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', item.color)}
            >
              {item.icon}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <Button
        size="lg"
        fullWidth
        onClick={onNext}
        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0"
      >
        Mulai Pengaturan
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  )
}

/* ─── Step 2 — Buat Kelas Pertama ────────────────────────────── */

interface Step2Props extends StepProps {
  onClassCreated: (classId: string, joinCode: string) => void
  existingClassId?: string | null
  existingJoinCode?: string | null
}

function StepCreateClass({
  onNext,
  onSkip,
  onClassCreated,
  existingClassId,
  existingJoinCode,
}: Step2Props): React.JSX.Element {
  const { user, tenantId } = useAuth()
  const [className, setClassName] = useState('')
  const [mapel, setMapel] = useState('')
  const [tahunAjaran, setTahunAjaran] = useState('2025/2026')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If class was already created in a previous session
  if (existingClassId && existingJoinCode) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Kelas sudah dibuat!
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Kelas Anda telah berhasil dibuat sebelumnya.
        </p>
        <Button fullWidth onClick={onNext}>
          Lanjut ke Undang Siswa <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  async function handleCreateClass(): Promise<void> {
    if (!className.trim()) {
      setError('Nama kelas wajib diisi.')
      return
    }
    if (!user || !tenantId) return

    setIsCreating(true)
    setError(null)

    try {
      // Generate join code (same logic as classroomService)
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let joinCode = ''
      const randomBytes = new Uint8Array(16)
      while (joinCode.length < 6) {
        globalThis.crypto.getRandomValues(randomBytes)
        for (let i = 0; i < randomBytes.length; i++) {
          if (randomBytes[i] < 252 && joinCode.length < 6) {
            joinCode += charset[randomBytes[i] % 36]
          }
        }
      }

      // Build display name with mapel & tahun ajaran
      const fullName = [className.trim(), mapel.trim(), tahunAjaran.trim()]
        .filter(Boolean)
        .join(' — ')

      await classroomService.createClassroom(user.id, fullName, tenantId)

      // Fetch the newly created class to get its ID and join_code
      const { data, error: fetchErr } = await (await import('@/services/db')).db
        .from('classes')
        .select('id, join_code')
        .eq('teacher_id', user.id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchErr || !data) {
        throw new Error('Gagal mengambil data kelas yang baru dibuat.')
      }

      onClassCreated(data.id, data.join_code)
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat kelas. Coba lagi.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
          <School className="w-6 h-6 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Buat Kelas Pertama</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Isi detail kelas Anda</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Nama Kelas <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Contoh: Kelas 9A, XII IPA 1"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Mata Pelajaran
          </label>
          <input
            type="text"
            value={mapel}
            onChange={(e) => setMapel(e.target.value)}
            placeholder="Contoh: Matematika, Bahasa Indonesia"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Tahun Ajaran
          </label>
          <input
            type="text"
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            placeholder="Contoh: 2025/2026"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="ghost" size="sm" onClick={onSkip} className="flex-1">
          Lewati
        </Button>
        <Button
          size="md"
          className="flex-[2] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0"
          loading={isCreating}
          onClick={handleCreateClass}
          disabled={!className.trim()}
        >
          Buat Kelas
        </Button>
      </div>
    </div>
  )
}

/* ─── Step 3 — Undang Siswa ──────────────────────────────────── */

interface Step3Props extends StepProps {
  joinCode: string | null
}

function StepInviteStudents({ onNext, joinCode }: Step3Props): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const displayCode = joinCode || '------'
  const joinUrl = `${window.location.origin}/join?code=${displayCode}`
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=150x150&chl=${encodeURIComponent(joinUrl)}&choe=UTF-8`

  function copyCode(): void {
    void navigator.clipboard.writeText(displayCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyLink(): void {
    void navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Undang Siswa ke Kelas
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bagikan kode ini ke siswa Anda
          </p>
        </div>
      </div>

      {/* Join Code Display */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-2xl p-5 mb-4 text-center">
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
          Kode Bergabung
        </p>
        <p className="text-4xl font-black tracking-[0.3em] text-indigo-700 dark:text-indigo-300 mb-1">
          {displayCode}
        </p>
        {joinCode && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Berlaku hingga kelas dihapus
          </p>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={copyCode}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          Salin Kode
        </button>
        <button
          onClick={copyLink}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Copy className="w-4 h-4" />
          Salin Link
        </button>
      </div>

      {/* QR Code */}
      {joinCode && (
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-4">
          <img
            src={qrUrl}
            alt="QR Code bergabung kelas"
            className="w-16 h-16 rounded-lg"
            loading="lazy"
            decoding="async"
          />
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">QR Code</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tampilkan di papan tulis agar siswa bisa scan langsung
            </p>
          </div>
        </div>
      )}

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-xl p-3 mb-6">
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          💡 <span className="font-semibold">Tips:</span> Bagikan kode ini ke siswa via WhatsApp
          atau tulis di papan tulis. Siswa cukup buka EduSync dan masukkan kode ini.
        </p>
      </div>

      <Button
        size="md"
        fullWidth
        onClick={onNext}
        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0"
      >
        Selesai, Lanjut <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

/* ─── Step 4 — Buat Materi Pertama ──────────────────────────── */

interface Step4Props extends StepProps {
  onCourseCreated: (courseId: string) => void
  existingCourseId?: string | null
}

function StepCreateCourse({
  onNext,
  onSkip,
  onCourseCreated,
  existingCourseId,
}: Step4Props): React.JSX.Element {
  const { user, tenantId } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (existingCourseId) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Kursus sudah dibuat!
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Kursus Anda telah berhasil dibuat sebelumnya.
        </p>
        <Button fullWidth onClick={onNext}>
          Lanjut <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  async function handleCreateCourse(): Promise<void> {
    if (!title.trim()) {
      setError('Judul kursus wajib diisi.')
      return
    }
    if (!user || !tenantId) return

    setIsCreating(true)
    setError(null)

    try {
      const course = await courseService.createCourse({
        title: title.trim(),
        description: null,
        status: 'draft',
        subject: subject.trim() || null,
        tenant_id: tenantId,
        created_by: user.id,
      })
      if (!course?.id) {
        throw new Error('Gagal membuat kursus.')
      }

      onCourseCreated(course.id)
      // Navigate to course builder with the new course
      onNext()
      // Small delay so the wizard can close cleanly
      setTimeout(() => {
        void navigate(`/app/teacher/course-builder?courseId=${course.id}`)
      }, 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat kursus. Coba lagi.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Buat Materi Pertama</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mulai buat kursus pembelajaran
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Judul Kursus <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Aljabar Dasar, Teks Narasi"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Mata Pelajaran
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Contoh: Matematika, Bahasa Indonesia"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl p-3">
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            📝 Setelah membuat kursus, Anda akan langsung diarahkan ke{' '}
            <strong>Course Builder</strong> untuk menambahkan modul dan materi pelajaran.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="ghost" size="sm" onClick={onSkip} className="flex-1">
          Nanti saja
        </Button>
        <Button
          size="md"
          className="flex-[2] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
          loading={isCreating}
          onClick={handleCreateCourse}
          disabled={!title.trim()}
        >
          <Layers className="w-4 h-4" />
          Buat Kursus
        </Button>
      </div>
    </div>
  )
}

/* ─── Step 5 — Siap Mengajar ─────────────────────────────────── */

interface Step5Props {
  completedSteps: number[]
  createdClassId: string | null
  createdCourseId: string | null
  onFinish: () => void
}

function StepReady({
  completedSteps,
  createdClassId,
  createdCourseId,
  onFinish,
}: Step5Props): React.JSX.Element {
  const navigate = useNavigate()

  const checklistItems = [
    {
      label: 'Kelas dibuat',
      done: completedSteps.includes(2) || !!createdClassId,
    },
    {
      label: 'Siswa diundang',
      done: completedSteps.includes(3),
    },
    {
      label: 'Materi ditambahkan',
      done: completedSteps.includes(4) || !!createdCourseId,
    },
  ]

  const nextSteps = [
    {
      icon: <ClipboardCheck className="w-5 h-5 text-violet-500" />,
      label: 'Buat Kuis',
      path: '/app/teacher/quiz-manager',
      bg: 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800/40',
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-blue-500" />,
      label: 'Lihat Analitik',
      path: '/analytics',
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/40',
    },
    {
      icon: <BookOpen className="w-5 h-5 text-amber-500" />,
      label: 'Koreksi Tugas',
      path: '/grader',
      bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/40',
    },
    {
      icon: <Rocket className="w-5 h-5 text-emerald-500" />,
      label: 'Eksplorasi Fitur',
      path: '/app/teacher/teaching-hub',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40',
    },
  ]

  return (
    <div className="py-2">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
          <Rocket className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
          Anda Siap Mengajar! 🚀
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          EduSync sudah dikonfigurasi untuk Anda.
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-2 mb-6">
        {checklistItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border',
              item.done
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
            )}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                item.done
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
              )}
            >
              {item.done ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
              )}
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                item.done
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Next Steps */}
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        Langkah Selanjutnya
      </p>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {nextSteps.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              onFinish()
              setTimeout(() => navigate(item.path), 300)
            }}
            className={cn(
              'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]',
              item.bg
            )}
          >
            {item.icon}
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <Button
        size="lg"
        fullWidth
        onClick={onFinish}
        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
      >
        Mulai Mengajar!
      </Button>
    </div>
  )
}

/* ─── Main Wizard Component ──────────────────────────────────── */

export function TeacherOnboardingWizard(): React.JSX.Element | null {
  const [showDismissConfirm, setShowDismissConfirm] = useState(false)

  const {
    isVisible,
    currentStep,
    totalSteps,
    completedSteps,
    createdClassId,
    createdClassJoinCode,
    createdCourseId,
    isLoading,
    nextStep,
    prevStep,
    completeStep,
    completeOnboarding,
    dismissForever,
    saveClassResult,
    saveCourseResult,
  } = useTeacherOnboarding()

  if (isLoading || !isVisible) return null

  async function handleNext(): Promise<void> {
    await completeStep(currentStep)
    await nextStep()
  }

  async function handleSkip(): Promise<void> {
    await nextStep()
  }

  async function handleClassCreated(classId: string, joinCode: string): Promise<void> {
    await saveClassResult(classId, joinCode)
    await completeStep(2)
  }

  async function handleCourseCreated(courseId: string): Promise<void> {
    await saveCourseResult(courseId)
    await completeStep(4)
  }

  async function handleFinish(): Promise<void> {
    await completeOnboarding()
  }

  async function handleDismissConfirmed(): Promise<void> {
    await dismissForever()
    setShowDismissConfirm(false)
  }

  const progressPercent = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowDismissConfirm(true)}
      >
        {/* Modal panel */}
        <motion.div
          key="panel"
          initial={{ scale: 0.92, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 24, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 overflow-hidden"
        >
          {/* Top bar: progress + close */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Langkah {currentStep} dari {totalSteps}
              </span>
              <button
                onClick={() => setShowDismissConfirm(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Tutup panduan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {Array.from({ length: totalSteps }, (_, i) => {
                const stepNum = i + 1
                const isDone = completedSteps.includes(stepNum)
                const isCurrent = stepNum === currentStep
                return (
                  <div
                    key={stepNum}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      isCurrent
                        ? 'w-6 h-2 bg-indigo-500'
                        : isDone
                          ? 'w-2 h-2 bg-emerald-400'
                          : 'w-2 h-2 bg-slate-200 dark:bg-slate-700'
                    )}
                  />
                )
              })}
            </div>
          </div>

          {/* Step content */}
          <div className="px-6 pb-6 max-h-[65vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                {currentStep === 1 && <StepWelcome onNext={handleNext} />}
                {currentStep === 2 && (
                  <StepCreateClass
                    onNext={() => {
                      void completeStep(2)
                      void nextStep()
                    }}
                    onSkip={handleSkip}
                    onClassCreated={handleClassCreated}
                    existingClassId={createdClassId}
                    existingJoinCode={createdClassJoinCode}
                  />
                )}
                {currentStep === 3 && (
                  <StepInviteStudents onNext={handleNext} joinCode={createdClassJoinCode} />
                )}
                {currentStep === 4 && (
                  <StepCreateCourse
                    onNext={() => {
                      void completeStep(4)
                      void nextStep()
                    }}
                    onSkip={handleSkip}
                    onCourseCreated={handleCourseCreated}
                    existingCourseId={createdCourseId}
                  />
                )}
                {currentStep === 5 && (
                  <StepReady
                    completedSteps={completedSteps}
                    createdClassId={createdClassId}
                    createdCourseId={createdCourseId}
                    onFinish={handleFinish}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Back button (steps 2-4) */}
          {currentStep > 1 && currentStep < 5 && (
            <div className="px-6 pb-4 -mt-2">
              <button
                onClick={prevStep}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                ← Kembali
              </button>
            </div>
          )}
        </motion.div>

        {/* Dismiss confirmation overlay */}
        <AnimatePresence>
          {showDismissConfirm && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm w-full text-center">
                <p className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  Yakin ingin melewati panduan ini?
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Panduan ini tidak akan muncul lagi. Anda tetap bisa mengatur kelas dan materi
                  secara manual.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowDismissConfirm(false)}
                  >
                    Lanjutkan
                  </Button>
                  <Button variant="danger" className="flex-1" onClick={handleDismissConfirmed}>
                    Ya, Lewati
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
