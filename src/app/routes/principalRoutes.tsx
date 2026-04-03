// Principal routes — Wave 5 (30.2 + 30.3) + Wave 6 (30.4 + 30.5)
import { lazy } from 'react'
import { Outlet, Route } from 'react-router-dom'

import { RoleGuard } from '../../components/guards/RoleGuard'
import { S } from './utils'

const ExecutiveDashboard = lazy(() =>
  import('../../features/principal/components/ExecutiveDashboard').then((m) => ({
    default: m.ExecutiveDashboard,
  }))
)

const ReportPreview = lazy(() =>
  import('../../features/principal/components/ReportPreview').then((m) => ({
    default: m.ReportPreview,
  }))
)

const BeforeAfterAnalytics = lazy(() =>
  import('../../features/principal/components/BeforeAfterAnalytics').then((m) => ({
    default: m.BeforeAfterAnalytics,
  }))
)

const SurveyPage = lazy(() =>
  import('../../features/principal/components/SurveyPage').then((m) => ({
    default: m.SurveyPage,
  }))
)

// Settings placeholder — akan diimplementasi di Wave berikutnya
function PrincipalSettingsPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-4xl">⚙️</span>
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pengaturan Dashboard</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm">
        Konfigurasi pengaturan kepala sekolah akan tersedia segera.
      </p>
    </div>
  )
}

/**
 * All /app/principal/* routes.
 * RoleGuard: 'principal' AND 'admin' dapat mengakses.
 * Layout disediakan oleh PrincipalLayout via Layout.tsx (activeRole-based).
 */
export function PrincipalRoutes() {
  return (
    <Route
      path="principal"
      element={
        <RoleGuard allowedRoles={['principal', 'admin']}>
          <Outlet />
        </RoleGuard>
      }
    >
      <Route
        index
        element={
          <S feature="Dashboard Eksekutif">
            <ExecutiveDashboard />
          </S>
        }
      />
      <Route
        path="settings"
        element={
          <S feature="Pengaturan Principal">
            <PrincipalSettingsPlaceholder />
          </S>
        }
      />
      {/* Wave 30.3: Laporan eksekutif — halaman print-friendly */}
      <Route
        path="report"
        element={
          <S feature="Laporan Eksekutif">
            <ReportPreview />
          </S>
        }
      />
      {/* Wave 30.4: Before-After Analytics */}
      <Route
        path="analytics"
        element={
          <S feature="Analitik Sebelum & Sesudah">
            <BeforeAfterAnalytics />
          </S>
        }
      />
      {/* Wave 30.5: Satisfaction Survey */}
      <Route
        path="survey"
        element={
          <S feature="Survey Kepuasan">
            <SurveyPage />
          </S>
        }
      />
    </Route>
  )
}
