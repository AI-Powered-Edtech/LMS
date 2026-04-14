import { ArrowRight, LogOut } from 'lucide-react'

interface MembershipItem {
  tenant_id: string
  tenant_name: string
  tenant_logo: string | null
  role: string
}

interface MembershipListProps {
  memberships: MembershipItem[]
  onSelectTenant: (tenantId: string) => void
  onSignOut: () => void
}

export function MembershipList({ memberships, onSelectTenant, onSignOut }: MembershipListProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Pilih Ruang Kerja</h1>
          <p className="text-slate-400">Pilih organisasi sekolah untuk melanjutkan</p>
        </div>

        <div className="space-y-4">
          {memberships.map((membership) => (
            <button
              key={membership.tenant_id}
              onClick={() => onSelectTenant(membership.tenant_id)}
              className="w-full text-left bg-slate-800 hover:bg-slate-700 hover:border-blue-500 border border-slate-700 rounded-xl p-6 transition-all duration-200 group flex items-center justify-between"
            >
              <div>
                <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {membership.tenant_name}
                </h3>
                <p className="text-slate-400 mt-1 capitalize">Peran: {membership.role}</p>
              </div>
              <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 text-slate-400 transition-colors">
                <ArrowRight size={20} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={onSignOut}
            className="text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <LogOut size={16} />
            <span>Keluar dari akun</span>
          </button>
        </div>
      </div>
    </div>
  )
}
