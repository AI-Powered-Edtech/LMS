import { useAuth } from '@/contexts/AuthContext'
import { SemesterManager } from '@/features/semester/components/SemesterManager'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function SemesterPage() {
  usePageTitle('Manajemen Semester')
  const { role } = useAuth()

  if (role !== 'admin') {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <p className="text-red-600 dark:text-red-400 font-bold">
          Akses ditolak. Hanya admin yang dapat mengakses halaman ini.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <SemesterManager />
    </div>
  )
}
