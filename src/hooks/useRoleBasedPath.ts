import { useAuth } from '@/contexts/AuthContext'

export function useRoleBasedPath() {
  const { role } = useAuth()

  return (teacherPath: string, adminPath: string, studentPath?: string) => {
    if (role === 'admin') return adminPath
    if (role === 'student' && studentPath) return studentPath
    return teacherPath
  }
}
