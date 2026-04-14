// ==========================================================================
// ParentDashboard — Dashboard utama orang tua
// Wave 4 — Task 29.3 (Mobile-first, 360-414px)
// ==========================================================================

import { useState } from 'react'
import { Link } from 'react-router-dom'

import { SkeletonCard } from '@/components/ui/Skeleton'

import { useParentDashboard } from '../hooks/useChildData'
import { AchievementFeed } from './AchievementFeed'
import { AttendanceWeekGrid } from './AttendanceWeekGrid'
import { ChildSwitcher } from './ChildSwitcher'
import { GradeCard } from './GradeCard'
import { PendingAssignmentList } from './PendingAssignmentList'
import { TrafficLightCard } from './TrafficLightCard'

// ── Skeleton Loading State ──────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonCard className="h-20" lines={1} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────

function NoChildrenState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
      <span className="text-6xl" aria-hidden="true">
        👨‍👩‍👧‍👦
      </span>
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Belum ada siswa yang terhubung
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          Hubungi sekolah untuk mendaftarkan akun orang tua dan menghubungkan dengan data siswa.
        </p>
      </div>
      <div className="mt-2 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 w-full max-w-xs">
        <p className="text-sm text-blue-700 dark:text-blue-300 text-left leading-relaxed">
          <span className="font-semibold">Cara mendaftar:</span>
          <br />
          Minta admin sekolah untuk menambahkan akun Anda ke sistem EduSync sebagai orang tua siswa.
        </p>
      </div>
    </div>
  )
}

// ── Error State ──────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 text-center">
      <span className="text-5xl" aria-hidden="true">
        😔
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Gagal memuat data. Silakan periksa koneksi internet Anda.
      </p>
      <button
        onClick={onRetry}
        className="min-h-[44px] px-6 rounded-xl bg-blue-600 text-white text-sm font-medium
                   active:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2
                   focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Coba Lagi
      </button>
    </div>
  )
}

// ── Main Dashboard ───────────────────────────────────────────

export function ParentDashboard() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const { children, childrenLoading, selectedChild, dashboardData, isLoading, error, refetchAll } =
    useParentDashboard(selectedStudentId)

  // Auto-select anak pertama jika belum ada yang dipilih
  if (!selectedStudentId && children.length > 0 && !childrenLoading) {
    setSelectedStudentId(children[0].student_id)
  }

  // Error state
  if (error && !isLoading) {
    return <ErrorState onRetry={refetchAll} />
  }

  // Loading awal (belum ada children data)
  if (childrenLoading) {
    return <DashboardSkeleton />
  }

  // No children state
  if (!childrenLoading && children.length === 0) {
    return <NoChildrenState />
  }

  return (
    <div className="space-y-3">
      {/* Child switcher — hanya tampil jika > 1 anak */}
      {children.length > 1 && (
        <ChildSwitcher
          children={children}
          selectedId={selectedStudentId}
          onSelect={setSelectedStudentId}
        />
      )}

      {/* Traffic light — status utama */}
      {isLoading || !dashboardData ? (
        <SkeletonCard className="h-20" lines={1} />
      ) : (
        <TrafficLightCard
          status={dashboardData.traffic_light}
          reason={dashboardData.traffic_light_reason}
          childName={selectedChild?.student_name.split(' ')[0] ?? 'Anak'}
        />
      )}

      {/* Nilai terbaru */}
      <GradeCard grades={dashboardData?.grades ?? []} isLoading={isLoading} />

      {/* Kehadiran minggu ini */}
      <AttendanceWeekGrid
        attendance={dashboardData?.attendance_this_week ?? []}
        isLoading={isLoading}
      />

      {/* Tugas belum selesai */}
      <PendingAssignmentList
        assignments={dashboardData?.pending_assignments ?? []}
        isLoading={isLoading}
      />

      {/* Pencapaian terbaru */}
      <AchievementFeed
        achievements={dashboardData?.recent_achievements ?? []}
        isLoading={isLoading}
      />

      {/* Tombol Aksi Cepat */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/app/parent/pesan"
            className="flex items-center justify-center gap-2
                       min-h-[48px] rounded-2xl
                       bg-blue-50 dark:bg-blue-950/30
                       border border-blue-200 dark:border-blue-800/40
                       text-blue-700 dark:text-blue-300
                       text-sm font-semibold
                       active:bg-blue-100 dark:active:bg-blue-900/40
                       transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span aria-hidden="true">💬</span>
            Hubungi Guru
          </Link>

          <Link
            to="/app/parent/pengaturan"
            className="flex items-center justify-center gap-2
                       min-h-[48px] rounded-2xl
                       bg-slate-50 dark:bg-slate-800/50
                       border border-slate-200 dark:border-slate-700
                       text-slate-600 dark:text-slate-400
                       text-sm font-semibold
                       active:bg-slate-100 dark:active:bg-slate-700/50
                       transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span aria-hidden="true">🔔</span>
            Notifikasi
          </Link>
        </div>
      )}

      {/* Info anak yang dipilih (kelas) */}
      {!isLoading && selectedChild && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-600 pb-2">
          {selectedChild.student_name} · {selectedChild.class_name}
        </p>
      )}
    </div>
  )
}
