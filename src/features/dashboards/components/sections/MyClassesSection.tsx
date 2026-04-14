import { Plus, User, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button, Card, EmptyState, SkeletonCard } from '@/components/ui'

interface Classroom {
  id: string
  name: string
  teacher_name?: string
}

interface MyClassesSectionProps {
  classrooms: Classroom[]
  loading?: boolean
  onJoinClass: () => void
}

export function MyClassesSection({ classrooms, loading, onJoinClass }: MyClassesSectionProps) {
  const navigate = useNavigate()

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          Kelas Saya
        </h2>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={onJoinClass}
        >
          Gabung Kelas
        </Button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} lines={1} />
          ))}
        </div>
      ) : classrooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((cls) => (
            <Card key={cls.id} padding="sm" hover onClick={() => navigate(`/classes/${cls.id}`)}>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">{cls.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {cls.teacher_name || 'Guru'}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="Belum bergabung di kelas mana pun"
          description="Masukkan kode kelas dari gurumu untuk mulai belajar."
          action={{ label: 'Masukkan Kode Kelas', onClick: onJoinClass }}
        />
      )}
    </Card>
  )
}
