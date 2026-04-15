import {
  BookOpen,
  CheckCircle,
  GraduationCap,
  MoreVertical,
  RefreshCw,
  Shield,
  Users,
  XCircle,
} from 'lucide-react'
import React from 'react'

import { EmptyState } from '@/components/ui'
import type { TenantUser } from '@/features/administration/api/adminUserService'
import { cn } from '@/utils/cn'

const ROLE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  ADMIN: {
    icon: <Shield className="w-3 h-3" />,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  TEACHER: {
    icon: <BookOpen className="w-3 h-3" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  STUDENT: {
    icon: <GraduationCap className="w-3 h-3" />,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
}

interface UserTableProps {
  users: TenantUser[]
  loading: boolean
  actionMenuId: string | null
  setActionMenuId: (id: string | null) => void
  onChangeRole: (user: TenantUser) => void
  onDeactivate: (user: TenantUser) => void
  formatDate: (dateStr: string | null) => string
  getInitials: (first: string, last: string) => string
}

export function UserTable({
  users,
  loading,
  actionMenuId,
  setActionMenuId,
  onChangeRole,
  onDeactivate,
  formatDate,
  getInitials,
}: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Daftar pengguna">
        <thead className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-6 py-3 text-left">User</th>
            <th className="px-6 py-3 text-left">Role</th>
            <th className="px-6 py-3 text-left">Status</th>
            <th className="px-6 py-3 text-left">Bergabung</th>
            <th className="px-6 py-3 text-left">Login Terakhir</th>
            <th className="px-6 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {loading && users.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Memuat data...
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState
                  icon={<Users className="w-8 h-8" />}
                  title="Tidak ada pengguna ditemukan"
                  description="Coba ubah filter atau tambah pengguna baru"
                />
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr
                key={user.user_id}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-750/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {getInitials(user.first_name, user.last_name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.map((role: string) => {
                      const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.STUDENT
                      return (
                        <span
                          key={role}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border',
                            cfg.color,
                            cfg.bg,
                            cfg.border
                          )}
                        >
                          {cfg.icon} {role}
                        </span>
                      )
                    })}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full',
                      user.is_active
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    )}
                  >
                    {user.is_active ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {user.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {formatDate(user.last_sign_in_at)}
                </td>
                <td className="px-6 py-4 text-right relative">
                  <button
                    onClick={() =>
                      setActionMenuId(actionMenuId === user.user_id ? null : user.user_id)
                    }
                    aria-label="Aksi pengguna"
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-slate-500" />
                  </button>
                  {actionMenuId === user.user_id && (
                    <div className="absolute right-6 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-50 w-48">
                      <button
                        onClick={() => {
                          onChangeRole(user)
                          setActionMenuId(null)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4 text-blue-500" /> Ubah Role
                      </button>
                      <button
                        onClick={() => onDeactivate(user)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        {user.is_active ? (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" /> Nonaktifkan
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" /> Aktifkan
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
