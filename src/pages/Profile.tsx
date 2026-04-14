import { api } from "@/src/lib/api"
import {
  Award,
  BookOpen,
  CheckCircle,
  Edit3,
  Flame,
  GraduationCap,
  Mail,
  ShieldCheck,
  Star,
  Trophy,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'

import { OptimizedImage } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { BadgeShowcase } from '@/src/features/gamification/components/BadgeShowcase'
import { CertificateViewer } from '@/src/features/gamification/components/CertificateViewer'
import { StreakCounter } from '@/src/features/gamification/components/StreakCounter'
import { XPProgressBar } from '@/src/features/gamification/components/XPProgressBar'
import {
  useStudentCertificates,
  useStudentXPProfile,
} from '@/src/features/gamification/queries/gamificationQueries'
import { useStudentProgressData } from '@/src/features/progress/hooks/useStudentProgressQueries'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { cn } from '@/src/utils/cn'

export function Profile() {
  usePageTitle('Profil')
  const { user, role, profile } = useAuth()

  useEffect(() => {
    document.title = 'Profil — EduSync'
    return () => {
      document.title = 'EduSync'
    }
  }, [])
  const isTeacher = role === 'teacher'

  // Real data hooks (safe to call unconditionally)
  const { data: xpProfile } = useStudentXPProfile()
  const { data: certificates = [] } = useStudentCertificates()
  const { assignments } = useStudentProgressData()

  // Derived identity
  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : (user?.user_metadata?.full_name ?? 'Pengguna')
  const displayEmail = user?.email ?? ''
  const avatarUrl =
    profile?.avatar_url ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id ?? 'default'}`

  // Role label
  const roleLabel = role === 'teacher' ? 'Guru' : role === 'admin' ? 'Admin' : 'Siswa'

  // Student stats from real data
  const totalXP = xpProfile?.total_xp ?? 0
  const currentStreak = xpProfile?.streak_current ?? 0
  const assignmentCount = assignments?.length ?? 0
  const certificateCount = certificates?.length ?? 0

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">
      {/* Page title */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Profil Pengguna
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Identity Card */}
        <div className="w-full lg:w-1/3 space-y-6 shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Hero gradient banner */}
            <div
              className={cn(
                'absolute top-0 left-0 w-full h-28',
                isTeacher
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                  : 'bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-600'
              )}
            />

            {/* Avatar */}
            <div className="relative mt-12 mb-4 z-10">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-700 p-1.5 shadow-xl ring-4 ring-white dark:ring-slate-800">
                <OptimizedImage
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-600 object-cover"
                />
              </div>
              <button
                aria-label="Ubah foto profil"
                className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-slate-700 rounded-full shadow-md border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Identity */}
            <div className="px-6 pb-6 w-full">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{displayName}</h2>

              <div className="flex items-center justify-center gap-2 mt-2 mb-3 flex-wrap">
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                    isTeacher
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700'
                      : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700'
                  )}
                >
                  {roleLabel}
                </span>
                {isTeacher && (
                  <span title="Guru Terverifikasi">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </span>
                )}
                {!isTeacher && currentStreak > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    {currentStreak} Hari
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{displayEmail}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Overview Content */}
        <div className="w-full lg:w-2/3">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isTeacher ? (
              <TeacherOverview displayName={displayName} />
            ) : (
              <StudentOverview
                assignmentCount={assignmentCount}
                certificateCount={certificateCount}
                totalXP={totalXP}
                currentStreak={currentStreak}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Student Overview ────────────────────────────────────────────────────────

function StudentOverview({
  assignmentCount,
  certificateCount,
  totalXP,
  currentStreak,
}: {
  assignmentCount: number
  certificateCount: number
  totalXP: number
  currentStreak: number
}) {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
          value={assignmentCount}
          label="Tugas"
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          iconBg="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
          value={certificateCount}
          label="Sertifikat"
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          iconBg="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
          value={totalXP}
          label="Total XP"
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          iconBg="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
          value={currentStreak}
          label="Streak"
          unit="Hari"
        />
      </div>

      {/* XP Progress & Streak */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Kemajuan XP
        </h3>
        <XPProgressBar />
        <div className="border-t border-slate-100 dark:border-slate-700/60 pt-4">
          <StreakCounter />
        </div>
      </div>

      {/* Badge Showcase */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Lencana &amp; Pencapaian
          </h2>
        </div>
        <BadgeShowcase />
      </div>

      {/* Certificates */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-amber-500" />
          Sertifikat
        </h2>
        <CertificateViewer />
      </div>
    </>
  )
}

// ─── Teacher Overview ────────────────────────────────────────────────────────

function TeacherOverview({ displayName }: { displayName: string }) {
  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          Selamat Datang, {displayName}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Gunakan menu navigasi untuk mengelola kelas, melihat analitik, dan memberi nilai tugas
          siswa.
        </p>
      </div>

      {/* Teacher quick info card */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-3xl p-6 border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Tips Mengajar</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Unggah materi pembelajaran yang kaya konten untuk meningkatkan keterlibatan siswa dan
              mendorong hasil belajar yang lebih baik.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  iconBg,
  value,
  label,
  unit,
}: {
  icon: React.ReactNode
  iconBg: string
  value: number
  label: string
  unit?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-shadow hover:shadow-md dark:hover:shadow-slate-900/40"
    >
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBg)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
          {value.toLocaleString('id-ID')}
        </p>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
          {label}
          {unit ? ` ${unit}` : ''}
        </p>
      </div>
    </motion.div>
  )
}
