// Wave 4 — Task 29.3 + 29.4 + 29.5 + 29.6: Parent Dashboard, Digest, Messaging, Monthly Report
// Public route /register-parent ada di sharedRoutes.tsx (PublicRoutes).
// Routes di sini hanya untuk authenticated /app/parent/* paths.

import { lazy } from 'react'
import { Outlet, Route } from 'react-router-dom'

import { RoleGuard } from '../../components/guards/RoleGuard'
import { S } from './utils'

// Lazy imports
const ParentDashboard = lazy(() =>
  import('../../features/parent/components/ParentDashboard').then((m) => ({
    default: m.ParentDashboard,
  }))
)

const MessageTeacher = lazy(() =>
  import('../../features/parent/components/MessageTeacher').then((m) => ({
    default: m.MessageTeacher,
  }))
)

const MessageThread = lazy(() =>
  import('../../features/parent/components/MessageThread').then((m) => ({
    default: m.MessageThread,
  }))
)

const DigestSettings = lazy(() =>
  import('../../features/parent/components/DigestSettings').then((m) => ({
    default: m.DigestSettings,
  }))
)

const MonthlyReportPage = lazy(() =>
  import('../../features/parent/components/MonthlyReportPage').then((m) => ({
    default: m.MonthlyReportPage,
  }))
)

const GradesDetailPage = lazy(() =>
  import('../../features/parent/components/GradesDetailPage').then((m) => ({
    default: m.GradesDetailPage,
  }))
)

const AttendanceDetailPage = lazy(() =>
  import('../../features/parent/components/AttendanceDetailPage').then((m) => ({
    default: m.AttendanceDetailPage,
  }))
)

/**
 * All /app/parent/* routes (authenticated, role=parent atau admin).
 *
 * Route publik pendaftaran orang tua (/register-parent) ada di
 * sharedRoutes.tsx → PublicRoutes() agar dapat diakses tanpa login.
 */
export function ParentRoutes() {
  return (
    <Route
      path="parent"
      element={
        <RoleGuard allowedRoles={['parent', 'admin']}>
          <Outlet />
        </RoleGuard>
      }
    >
      {/* Dashboard utama */}
      <Route
        index
        element={
          <S feature="Dashboard Orang Tua">
            <ParentDashboard />
          </S>
        }
      />

      {/* Halaman Detail Nilai */}
      <Route
        path="nilai"
        element={
          <S feature="Nilai Anak">
            <GradesDetailPage />
          </S>
        }
      />

      {/* Halaman Kalender Kehadiran */}
      <Route
        path="kehadiran"
        element={
          <S feature="Kehadiran Anak">
            <AttendanceDetailPage />
          </S>
        }
      />

      {/* Halaman Pesan — list threads */}
      <Route
        path="pesan"
        element={
          <S feature="Pesan Guru">
            <MessageTeacher />
          </S>
        }
      />

      {/* Thread percakapan spesifik */}
      <Route
        path="pesan/:threadId"
        element={
          <S feature="Percakapan dengan Guru">
            <MessageThread />
          </S>
        }
      />

      {/* Pengaturan Notifikasi Harian */}
      <Route
        path="pengaturan"
        element={
          <S feature="Pengaturan Notifikasi">
            <DigestSettings />
          </S>
        }
      />

      {/* Laporan Bulanan — list (default: bulan ini, anak pertama) */}
      <Route
        path="laporan"
        element={
          <S feature="Laporan Perkembangan Bulanan">
            <MonthlyReportPage />
          </S>
        }
      />

      {/* Laporan Bulanan — spesifik siswa + bulan */}
      <Route
        path="laporan/:studentId/:year/:month"
        element={
          <S feature="Laporan Perkembangan Bulanan">
            <MonthlyReportPage />
          </S>
        }
      />
    </Route>
  )
}
