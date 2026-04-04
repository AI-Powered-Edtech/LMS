// Wave 4 — Task 29.3 + 29.4 + 29.5: Parent Dashboard, Digest, Messaging
// Public route /register-parent ada di sharedRoutes.tsx (PublicRoutes).
// Routes di sini hanya untuk authenticated /app/parent/* paths.

import { lazy } from 'react'
import { Outlet, Route } from 'react-router-dom'

import { RoleGuard } from '../../components/guards/RoleGuard'
import { SurveyRespondPage } from '../lazyPages'
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

// Placeholder untuk halaman yang belum diimplementasi
function ComingSoonPage({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
      <span className="text-5xl" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Fitur ini sedang disiapkan dan akan segera tersedia.
        </p>
      </div>
    </div>
  )
}

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

      {/* Halaman Nilai — placeholder, akan diimplementasi wave berikutnya */}
      <Route
        path="nilai"
        element={
          <S feature="Nilai Anak">
            <ComingSoonPage title="Nilai Lengkap" icon="📊" />
          </S>
        }
      />

      {/* Halaman Kehadiran — placeholder */}
      <Route
        path="kehadiran"
        element={
          <S feature="Kehadiran Anak">
            <ComingSoonPage title="Riwayat Kehadiran" icon="📅" />
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

      {/* Halaman isi survei */}
      <Route
        path="survey/:surveyId"
        element={
          <S feature="Isi Survei">
            <SurveyRespondPage />
          </S>
        }
      />
    </Route>
  )
}
