import { ArrowRight, BookOpen, ShieldCheck, Users } from 'lucide-react'

interface RolePickerStepProps {
  onSelectRole: (role: 'student-form' | 'teacher-form' | 'admin-form') => void
}

const ROLES = [
  {
    key: 'student-form' as const,
    title: 'Murid',
    description: 'Saya punya kode kelas dari guru saya',
    icon: BookOpen,
    bg: 'bg-emerald-600',
    hoverBg: 'hover:bg-emerald-700',
    iconBg: 'bg-emerald-500/30',
    textMuted: 'text-emerald-200',
    shadow: 'hover:shadow-emerald-500/20',
  },
  {
    key: 'teacher-form' as const,
    title: 'Guru',
    description: 'Saya ingin membuat kelas dan materi',
    icon: Users,
    bg: 'bg-blue-600',
    hoverBg: 'hover:bg-blue-700',
    iconBg: 'bg-blue-500/30',
    textMuted: 'text-blue-200',
    shadow: 'hover:shadow-blue-500/20',
  },
  {
    key: 'admin-form' as const,
    title: 'Admin Sekolah',
    description: 'Saya mengelola sekolah dan pengguna',
    icon: ShieldCheck,
    bg: 'bg-slate-700',
    hoverBg: 'hover:bg-slate-600',
    iconBg: 'bg-slate-600/50',
    textMuted: 'text-slate-300',
    shadow: 'hover:shadow-slate-500/10',
  },
]

export function RolePickerStep({ onSelectRole }: RolePickerStepProps) {
  return (
    <div className="space-y-3">
      <p className="text-center text-slate-300 font-medium mb-6 text-lg">Saya adalah...</p>
      {ROLES.map((role) => (
        <button
          key={role.key}
          onClick={() => onSelectRole(role.key)}
          className={`w-full ${role.bg} ${role.hoverBg} text-white rounded-2xl p-5 transition-all flex items-center justify-between group hover:shadow-lg ${role.shadow}`}
        >
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 ${role.iconBg} rounded-xl flex items-center justify-center`}>
              <role.icon size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">{role.title}</h3>
              <p className={`${role.textMuted} text-sm`}>{role.description}</p>
            </div>
          </div>
          <ArrowRight className="group-hover:translate-x-1 transition-transform shrink-0" />
        </button>
      ))}
    </div>
  )
}
