// Use the full-featured UI OfflineBanner (with syncing state + dismiss)
// instead of the simpler layout/OfflineBanner.tsx
import { OfflineBanner } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'

import { AdminLayout } from './AdminLayout'
import { StudentLayout } from './StudentLayout'
import { TeacherLayout } from './TeacherLayout'

export function Layout() {
  // SECURITY FIX: Use activeRole (per-tenant) not global `role` so the correct
  // layout is shown for the active tenant context. A user who is admin in Tenant A
  // but student in Tenant B should see the Student layout when in Tenant B.
  const { activeRole } = useAuth()

  return (
    <>
      {/* Accessibility: skip link allows keyboard users to bypass nav */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Lewati ke konten utama
      </a>

      <OfflineBanner />

      {activeRole === 'student' && <StudentLayout />}
      {activeRole === 'teacher' && <TeacherLayout />}
      {activeRole === 'admin' && <AdminLayout />}
    </>
  )
}
