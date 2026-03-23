import { useAuth } from '@/src/contexts/AuthContext'
import { StudentGroupView } from '@/src/features/assignments/components/groups/StudentGroupView'
import { TeacherGroupView } from '@/src/features/assignments/components/groups/TeacherGroupView'
import { usePageTitle } from '@/src/hooks/usePageTitle'

export function GroupAssignment() {
  usePageTitle('Tugas Kelompok')
  const { role } = useAuth()

  if (role === 'teacher') {
    return <TeacherGroupView />
  }

  return <StudentGroupView />
}
