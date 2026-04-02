import { ArrowLeft, Loader2, ShieldCheck, Users } from 'lucide-react'
import type { FormEvent } from 'react'

interface SchoolCreateFormProps {
  role: 'teacher' | 'admin'
  fullName: string
  schoolName: string
  isSubmitting: boolean
  onFullNameChange: (value: string) => void
  onSchoolNameChange: (value: string) => void
  onBack: () => void
  onSubmit: (e: FormEvent) => void
}

const ROLE_CONFIG = {
  teacher: {
    title: 'Daftar sebagai Guru',
    description: 'Buat sekolah baru dan mulai mengajar',
    icon: Users,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    ring: 'focus:ring-blue-500',
    placeholder: 'Misal: Budi Santoso, S.Pd.',
    schoolPlaceholder: 'Misal: SMA Negeri 1 Jakarta',
    schoolHint: 'Anda dapat mengundang guru lain setelah sekolah dibuat.',
    btnBg: 'bg-blue-600 hover:bg-blue-700',
    submitLabel: 'Buat Sekolah & Mulai',
  },
  admin: {
    title: 'Daftar sebagai Admin',
    description: 'Kelola sekolah, guru, dan siswa',
    icon: ShieldCheck,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    ring: 'focus:ring-amber-500',
    placeholder: 'Misal: Dr. Siti Rahayu',
    schoolPlaceholder: 'Misal: SMA Negeri 1 Jakarta',
    schoolHint: 'Sebagai admin, Anda akan memiliki kendali penuh atas pengaturan sekolah.',
    btnBg: 'bg-amber-600 hover:bg-amber-700',
    submitLabel: 'Buat Sekolah & Mulai',
  },
}

export function SchoolCreateForm({
  role,
  fullName,
  schoolName,
  isSubmitting,
  onFullNameChange,
  onSchoolNameChange,
  onBack,
  onSubmit,
}: SchoolCreateFormProps) {
  const cfg = ROLE_CONFIG[role]
  const Icon = cfg.icon

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`h-10 w-10 ${cfg.iconBg} ${cfg.iconColor} rounded-xl flex items-center justify-center`}
        >
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{cfg.title}</h2>
          <p className="text-slate-400 text-xs">{cfg.description}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nama Lengkap</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 ${cfg.ring} outline-none`}
            placeholder={cfg.placeholder}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nama Sekolah</label>
          <input
            type="text"
            required
            value={schoolName}
            onChange={(e) => onSchoolNameChange(e.target.value)}
            className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 ${cfg.ring} outline-none`}
            placeholder={cfg.schoolPlaceholder}
          />
          <p className="text-xs text-slate-500 mt-2">{cfg.schoolHint}</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 ${cfg.btnBg} text-white rounded-lg py-2.5 transition-colors font-bold flex items-center justify-center gap-2`}
          >
            {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : cfg.submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
