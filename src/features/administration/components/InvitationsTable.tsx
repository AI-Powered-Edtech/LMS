import {
  BookOpen,
  CheckCircle,
  Clock,
  Copy,
  GraduationCap,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react'
import React from 'react'

import type { TenantInvitation } from '@/src/features/administration/api/adminUserService'
import { cn } from '@/src/utils/cn'

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

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  pending: { color: 'text-amber-700', bg: 'bg-amber-50', icon: <Clock className="w-3 h-3" /> },
  accepted: {
    color: 'text-green-700',
    bg: 'bg-green-50',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  expired: { color: 'text-slate-500', bg: 'bg-slate-50', icon: <XCircle className="w-3 h-3" /> },
  revoked: { color: 'text-red-700', bg: 'bg-red-50', icon: <XCircle className="w-3 h-3" /> },
}

interface InvitationsTableProps {
  invitations: TenantInvitation[]
  loading: boolean
  onRevoke: (id: string) => void
  onCopyLink: (token: string) => void
  formatDate: (dateStr: string | null) => string
}

export function InvitationsTable({
  invitations,
  loading,
  onRevoke,
  onCopyLink,
  formatDate,
}: InvitationsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Daftar undangan">
        <thead className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-6 py-3 text-left">Email</th>
            <th className="px-6 py-3 text-left">Role</th>
            <th className="px-6 py-3 text-left">Status</th>
            <th className="px-6 py-3 text-left">Kedaluwarsa</th>
            <th className="px-6 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {loading && invitations.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Memuat data...
              </td>
            </tr>
          ) : invitations.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                Belum ada undangan. Klik "Undang Pengguna" untuk mulai.
              </td>
            </tr>
          ) : (
            invitations.map((invite) => {
              const statusCfg = STATUS_CONFIG[invite.status] || STATUS_CONFIG.pending
              const roleCfg = ROLE_CONFIG[invite.role] || ROLE_CONFIG.STUDENT
              const isExpired =
                new Date(invite.expires_at) < new Date() && invite.status === 'pending'
              return (
                <tr
                  key={invite.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-750/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{invite.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Dibuat {formatDate(invite.created_at)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border',
                        roleCfg.color,
                        roleCfg.bg,
                        roleCfg.border
                      )}
                    >
                      {roleCfg.icon} {invite.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full',
                        isExpired ? 'bg-slate-50 text-slate-500' : statusCfg.color,
                        !isExpired && statusCfg.bg
                      )}
                    >
                      {isExpired ? <XCircle className="w-3 h-3" /> : statusCfg.icon}
                      {isExpired
                        ? 'Expired'
                        : invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {formatDate(invite.expires_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {invite.status === 'pending' && !isExpired && (
                        <>
                          <button
                            onClick={() => onCopyLink(invite.token)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Copy link"
                            aria-label="Salin tautan undangan"
                          >
                            <Copy className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => onRevoke(invite.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Revoke"
                            aria-label="Cabut undangan"
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
