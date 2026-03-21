import { useAuth } from '@/src/contexts/AuthContext'
import { StudentLayout } from './StudentLayout'
import { TeacherLayout } from './TeacherLayout'
import { AdminLayout } from './AdminLayout'
import { OfflineBanner } from './OfflineBanner'

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
