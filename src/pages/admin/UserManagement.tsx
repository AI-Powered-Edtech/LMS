import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Shield,
  GraduationCap,
  BookOpen,
  MoreVertical,
  RefreshCw,
  Mail,
  XCircle,
  CheckCircle,
  Clock,
  Copy,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/src/utils/cn'
import {
  getTenantUsers,
  getInvitations,
  updateUserRole,
  deactivateUser,
  revokeInvitation,
  TenantUser,
  TenantInvitation,
} from '@/src/services/adminUserService'
import { ChangeRoleModal } from '@/src/components/admin/ChangeRoleModal'
import { InviteUserModal } from '@/src/components/admin/InviteUserModal'

type Tab = 'users' | 'invitations'

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

export function UserManagement() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<TenantUser[]>([])
  const [invitations, setInvitations] = useState<TenantInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Modals
  const [roleModal, setRoleModal] = useState<{ user: TenantUser } | null>(null)
  const [inviteModal, setInviteModal] = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  const PAGE_SIZE = 20

  const fetchUsers = useCallback(
    async (newCursor?: string) => {
      setLoading(true)
      try {
        const data = await getTenantUsers({
          search: search || undefined,
          role: roleFilter || undefined,
          cursor: newCursor || undefined,
          limit: PAGE_SIZE,
        })
        if (newCursor) {
          setUsers((prev) => [...prev, ...data])
        } else {
          setUsers(data)
        }
        if (data.length > 0) {
          setTotalCount(data[0].total_count)
          setCursor(data[data.length - 1].created_at)
          setHasMore(data.length === PAGE_SIZE)
        } else {
          if (!newCursor) setTotalCount(0)
          setHasMore(false)
        }
      } catch (err) {
        console.error('Failed to fetch users:', err)
      } finally {
        setLoading(false)
      }
    },
    [search, roleFilter]
  )

  const fetchInvitations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInvitations()
      setInvitations(data)
    } catch (err) {
      console.error('Failed to fetch invitations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'users') {
      setCursor(null)
      fetchUsers()
    } else {
      fetchInvitations()
    }
  }, [tab, search, roleFilter])

  const handleRoleChange = async (newRole: string) => {
    if (!roleModal) return
    await updateUserRole(roleModal.user.user_id, newRole)
    setCursor(null)
    await fetchUsers()
  }

  const handleDeactivate = async (user: TenantUser) => {
    try {
      await deactivateUser(user.user_id, !user.is_active)
      setCursor(null)
      await fetchUsers()
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status user.')
    }
    setActionMenuId(null)
  }

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvitation(id)
      await fetchInvitations()
    } catch (err: any) {
      alert(err.message || 'Gagal merevoke undangan.')
    }
  }

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/#/login?invite=${token}`
    navigator.clipboard.writeText(link)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getInitials = (first: string, last: string) => {
    return `${(first || '?')[0]}${(last || '')[0] || ''}`.toUpperCase()
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Manajemen Pengguna
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Kelola pengguna dan undangan dalam sekolah Anda.
          </p>
        </div>
        <button
          onClick={() => setInviteModal(true)}
          className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Undang Pengguna
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Total Users</p>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Pending Invites</p>
          <p className="text-2xl font-bold text-amber-600">
            {invitations.filter((i) => i.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Active Users</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.is_active).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Admins</p>
          <p className="text-2xl font-bold text-purple-600">
            {users.filter((u) => u.roles.includes('ADMIN')).length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setTab('users')}
            className={cn(
              'flex-1 px-6 py-3.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2',
              tab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Users className="w-4 h-4" /> Pengguna ({totalCount})
          </button>
          <button
            onClick={() => setTab('invitations')}
            className={cn(
              'flex-1 px-6 py-3.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2',
              tab === 'invitations'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Mail className="w-4 h-4" /> Undangan ({invitations.length})
          </button>
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <>
            {/* Search & Filter */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none"
                >
                  <option value="">Semua Role</option>
                  <option value="ADMIN">Admin</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STUDENT">Student</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button
                onClick={() => {
                  setCursor(null)
                  fetchUsers()
                }}
                className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* User Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">User</th>
                    <th className="px-6 py-3 text-left">Role</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Bergabung</th>
                    <th className="px-6 py-3 text-left">Login Terakhir</th>
                    <th className="px-6 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Memuat data...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Tidak ada pengguna ditemukan.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.user_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {getInitials(user.first_name, user.last_name)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {user.roles.map((role) => {
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
                        <td className="px-6 py-4 text-slate-600">{formatDate(user.created_at)}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(user.last_sign_in_at)}
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <button
                            onClick={() =>
                              setActionMenuId(actionMenuId === user.user_id ? null : user.user_id)
                            }
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </button>
                          {actionMenuId === user.user_id && (
                            <div className="absolute right-6 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 w-48">
                              <button
                                onClick={() => {
                                  setRoleModal({ user })
                                  setActionMenuId(null)
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Shield className="w-4 h-4 text-blue-500" /> Ubah Role
                              </button>
                              <button
                                onClick={() => handleDeactivate(user)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
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

            {/* Load More */}
            {hasMore && (
              <div className="p-4 border-t border-slate-100 text-center">
                <button
                  onClick={() => fetchUsers(cursor || undefined)}
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Invitations Tab */}
        {tab === 'invitations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Kedaluwarsa</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && invitations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Memuat data...
                    </td>
                  </tr>
                ) : invitations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
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
                      <tr key={invite.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{invite.email}</p>
                          <p className="text-xs text-slate-500">
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
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(invite.expires_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {invite.status === 'pending' && !isExpired && (
                              <>
                                <button
                                  onClick={() => copyInviteLink(invite.token)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Copy link"
                                >
                                  <Copy className="w-4 h-4 text-slate-500" />
                                </button>
                                <button
                                  onClick={() => handleRevoke(invite.id)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Revoke"
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
        )}
      </div>

      {/* Modals */}
      {roleModal && (
        <ChangeRoleModal
          isOpen={true}
          onClose={() => setRoleModal(null)}
          onConfirm={handleRoleChange}
          userName={`${roleModal.user.first_name} ${roleModal.user.last_name}`}
          currentRoles={roleModal.user.roles}
        />
      )}
      <InviteUserModal
        isOpen={inviteModal}
        onClose={() => setInviteModal(false)}
        onSuccess={() => fetchInvitations()}
      />
    </div>
  )
}
