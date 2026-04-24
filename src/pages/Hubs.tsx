import { HubView } from '@/components/HubView'
import { useAuth } from '@/contexts/AuthContext'
import { useStudentXPProfile } from '@/features/gamification/queries/gamificationQueries'
import { ModuleId, useModuleConfig } from '@/hooks/useModuleConfig'
import { usePageTitle } from '@/hooks/usePageTitle'
import { navigationItems } from '@/shared/config/navigation'

/**
 * Pakai `activeRole` (per-tenant role yang dipakai RoleGuard & Sidebar),
 * bukan `role` (global primary role). `role` bisa balik ke 'student' saat
 * array roles kosong karena `getPrimaryRole` default ke 'student' -> hub
 * jadi kosong untuk guru. activeRole selalu mengikuti membership aktif.
 */
function useHubItems(location: 'teaching-hub' | 'social-hub' | 'gamification-hub' | 'admin-hub') {
  const { activeRole } = useAuth()
  const { isModuleEnabled } = useModuleConfig()

  return navigationItems.filter((item) => {
    if (item.location !== location) return false
    if (!activeRole) return false
    if (!item.roles.includes(activeRole)) return false
    if (item.moduleId && !isModuleEnabled(item.moduleId as ModuleId)) return false
    return true
  })
}

export function TeachingHub() {
  usePageTitle('Pusat Mengajar')
  const items = useHubItems('teaching-hub')

  return (
    <HubView
      title="Ruang Mengajar"
      description="Kelola kelas, nilai, dan absensi siswa."
      items={items}
      emptyTitle="Belum ada alat mengajar yang aktif"
      emptyDescription="Menu mengajar (Manajemen Materi, Buku Nilai, Kuis, dll.) akan muncul di sini setelah admin mengaktifkan modulnya dan Anda terdaftar sebagai guru di kelas aktif. Pilih kelas di sidebar atau hubungi admin sekolah jika menu seharusnya tersedia."
    />
  )
}

export function SocialHub() {
  usePageTitle('Sosial & Informasi')
  const items = useHubItems('social-hub')

  return (
    <HubView
      title="Sosial & Informasi"
      description="Forum diskusi, jadwal, dan pengumuman sekolah."
      items={items}
      emptyTitle="Belum ada kanal sosial yang aktif"
      emptyDescription="Forum, Jadwal, dan Pengumuman akan muncul di sini setelah admin mengaktifkan modul Forum/Calendar/Announcements. Belum ada data yang di-seed — aktifkan modulnya dari pengaturan tenant terlebih dahulu."
    />
  )
}

export function GamificationHub() {
  usePageTitle('Prestasi & Permainan')
  const { activeRole } = useAuth()
  const items = useHubItems('gamification-hub')

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 px-4 md:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Prestasi & Permainan
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
          Lihat pencapaian, sertifikat, dan mainkan kuis.
        </p>
      </div>

      {/* XP Summary Card - only for students */}
      {activeRole === 'student' && <GamificationSummary />}

      {/* Navigation items */}
      <HubView
        title=""
        description=""
        items={items}
        emptyTitle="Belum ada fitur gamifikasi yang aktif"
        emptyDescription={
          activeRole === 'teacher'
            ? 'Papan peringkat kelas akan muncul di sini setelah ada siswa yang aktif di kelas Anda. Tidak ada data yang di-seed — data muncul organik dari aktivitas siswa.'
            : 'Papan peringkat dan sertifikat muncul di sini setelah Anda mulai mengerjakan materi dan kuis. Belum ada XP atau pencapaian yang di-seed.'
        }
      />
    </div>
  )
}

// Gamification summary using top-level ESM import
function GamificationSummary() {
  const { data: xpProfile } = useStudentXPProfile()

  if (!xpProfile) return null

  const level = xpProfile.level ?? 1
  const totalXp = xpProfile.total_xp ?? 0
  const streak = xpProfile.streak_current ?? 0
  const xpNext = xpProfile.xp_next_level ?? 100
  const xpCurrent = xpProfile.xp_current_level ?? 0
  const progress =
    xpNext > xpCurrent ? Math.min(((totalXp - xpCurrent) / (xpNext - xpCurrent)) * 100, 100) : 100

  const LEVEL_TITLES: Record<number, string> = {
    1: 'Pemula',
    2: 'Penjelajah',
    3: 'Petualang',
    4: 'Pejuang',
    5: 'Pahlawan',
    6: 'Cendekia',
    7: 'Ahli',
    8: 'Master',
    9: 'Legenda',
    10: 'Dewa Ilmu',
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* XP & Level Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-blue-200 text-sm font-medium">Level {level}</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
            {LEVEL_TITLES[level] || 'Pemula'}
          </span>
        </div>
        <p className="text-3xl font-extrabold">{totalXp.toLocaleString('id-ID')} XP</p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-blue-200 mb-1">
            <span>Progres ke Level {Math.min(level + 1, 10)}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🔥</span>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Streak Harian
          </span>
        </div>
        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {streak} <span className="text-lg font-bold text-slate-400">hari</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Rekor terlama: {xpProfile.streak_longest ?? 0} hari
        </p>
      </div>

      {/* Recent Activity Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">⚡</span>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Aktivitas Terbaru
          </span>
        </div>
        {xpProfile.recent_xp && xpProfile.recent_xp.length > 0 ? (
          <div className="space-y-2">
            {xpProfile.recent_xp
              .slice(0, 3)
              .map(
                (tx: { xp_amount: number; source_type: string; created_at: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {tx.source_type === 'lesson_complete'
                        ? 'Materi selesai'
                        : tx.source_type === 'quiz_score'
                          ? 'Skor kuis'
                          : tx.source_type === 'streak_bonus'
                            ? 'Bonus streak'
                            : tx.source_type === 'badge_earned'
                              ? 'Badge diraih'
                              : tx.source_type === 'assignment_submit'
                                ? 'Tugas dikumpul'
                                : tx.source_type}
                    </span>
                    <span className="text-green-600 dark:text-green-400 font-bold shrink-0">
                      +{tx.xp_amount} XP
                    </span>
                  </div>
                )
              )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
            Belum ada aktivitas. Mulai belajar untuk mendapatkan XP!
          </p>
        )}
      </div>
    </div>
  )
}

export function AdminHub() {
  usePageTitle('Administrasi Sekolah')
  const items = useHubItems('admin-hub')

  return (
    <HubView
      title="Administrasi Sekolah"
      description="Kelola keuangan, PPDB, dan dokumen administrasi."
      items={items}
      emptyTitle="Belum ada modul administrasi yang aktif"
      emptyDescription="Menu administrasi sekolah (Keuangan, PPDB, Dokumen, dll.) akan muncul setelah admin mengaktifkan modul terkait."
    />
  )
}
