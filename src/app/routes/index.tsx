import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthGuard } from '../../components/guards/AuthGuard'
import { RoleResolver } from '../../components/guards/RoleResolver'
import { TenantGuard } from '../../components/guards/TenantGuard'
import { Layout } from '../../components/layout/Layout'
import { NotFound } from '../lazyPages'
import { AdminRoutes } from './adminRoutes'
import { LegacyRedirects } from './legacyRedirects'
import { PublicRoutes, SharedAuthRoutes } from './sharedRoutes'
import { StudentRoutes } from './studentRoutes'
import { TeacherRoutes } from './teacherRoutes'
import { S } from './utils'

// ============================================================
// AppRoutes — assembles all domain route files into the complete router
// ============================================================

export function AppRoutes() {
  return (
    <Routes>
      {/* === Public Routes === */}
      {PublicRoutes()}

      {/* === Auth-Protected Layout === */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <TenantGuard>
              <Layout />
            </TenantGuard>
          </AuthGuard>
        }
      >
        <Route path="app">
          <Route index element={<RoleResolver />} />

          {/* === Domain Routes === */}
          {StudentRoutes()}
          {TeacherRoutes()}
          {AdminRoutes()}
        </Route>

        {/* === Shared Routes (all authenticated roles) === */}
        {SharedAuthRoutes()}

        {/* === Legacy Redirects === */}
        {LegacyRedirects()}

        {/* === 404 === */}
        <Route
          path="*"
          element={
            <S>
              <NotFound />
            </S>
          }
        />
      </Route>

      {/* 404 catch-all for unauthenticated top-level paths */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
