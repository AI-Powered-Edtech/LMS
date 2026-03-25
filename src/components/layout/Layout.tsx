import { useAuth } from '@/src/contexts/AuthContext'

import { AdminLayout } from './AdminLayout'
import { OfflineBanner } from './OfflineBanner'
import { StudentLayout } from './StudentLayout'
import { TeacherLayout } from './TeacherLayout'

export function Layout() {
  const { role } = useAuth()

  return (
    <>
      <OfflineBanner />
      {role === 'student' && <StudentLayout />}
      {role === 'teacher' && <TeacherLayout />}
      {role === 'admin' && <AdminLayout />}
    </>
  )
}
