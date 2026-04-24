// Use the full-featured UI OfflineBanner (with syncing state + dismiss)
// instead of the simpler layout/OfflineBanner.tsx
import { OfflineBanner } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

import { AdminLayout } from './AdminLayout'
import { ParentLayout } from './ParentLayout'
import { PrincipalLayout } from './PrincipalLayout'
import { StudentLayout } from './StudentLayout'
import { TeacherLayout } from './TeacherLayout'

export function Layout() {
  // SECURITY FIX: Use activeRole (per-tenant) not global `role` so the correct
  // layout is shown for the active tenant context. A user who is admin in Tenant A
  // but student in Tenant B should see the Student layout when in Tenant B.
  const { activeRole } = useAuth()

  if (!activeRole) return null

  // NOTE: The skip-to-main-content link is rendered by each role layout
  // (AppShell / AdminLayout / ParentLayout / PrincipalLayout) to avoid a
  // duplicate skip link at the top of every page.
  return (
    <>
      <OfflineBanner />

      {activeRole === 'student' && <StudentLayout />}
      {activeRole === 'teacher' && <TeacherLayout />}
      {activeRole === 'admin' && <AdminLayout />}
      {activeRole === 'parent' && <ParentLayout />}
      {activeRole === 'principal' && <PrincipalLayout />}
    </>
  )
}
