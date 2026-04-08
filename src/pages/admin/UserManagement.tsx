import { ChevronDown, Filter, Mail, RefreshCw, Search, Upload, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'

import { ChangeRoleModal } from '@/components/admin/ChangeRoleModal'
import { InviteUserModal } from '@/components/admin/InviteUserModal'
import { AdministrationSkeleton } from '@/features/administration/components/AdministrationSkeleton'
import { BulkImportWizard } from '@/features/administration/components/BulkImportWizard'
import { InvitationsTable } from '@/features/administration/components/InvitationsTable'
import { UserTable } from '@/features/administration/components/UserTable'
import { useUserManagementState } from '@/features/administration/hooks/useUserManagementState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/utils/cn'

export function UserManagement() {
  usePageTitle('Manajemen Pengguna')
  const [showBulkImportWizard, setShowBulkImportWizard] = useState(false)
  const {
    tab,
    setTab,
    users,
    invitations,
    loading,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    totalCount,
    cursor,
    setCursor,
    hasMore,
    roleModal,
    setRoleModal,
    inviteModal,
    setInviteModal,
    actionMenuId,
    setActionMenuId,
    fetchUsers,
    fetchInvitations,
    handleRoleChange,
    handleDeactivate,
    handleRevoke,
    copyInviteLink,
    formatDate,
    getInitials,
  } = useUserManagementState()

  if (loading && users.length === 0 && invitations.length === 0) {
    return <AdministrationSkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Manajemen Pengguna
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Kelola pengguna dan undangan dalam sekolah Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkImportWizard(true)}
            className="px-4 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all text-sm"
          >
            <Upload className="w-4 h-4" />
            Impor Massal
          </button>
          <button
            onClick={() => setInviteModal(true)}
            className="px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 dark:hover:bg-blue-600 transition-all text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Undang Pengguna
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Users</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Undangan Pending</p>
          <p className="text-2xl font-bold text-amber-600">
            {invitations.filter((i) => i.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Aktif (halaman ini)
          </p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.is_active).length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Admin (halaman ini)
          </p>
          <p className="text-2xl font-bold text-purple-600">
            {users.filter((u) => u.roles.includes('ADMIN')).length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setTab('users')}
            className={cn(
              'flex-1 px-6 py-3.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2',
              tab === 'users'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-900/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            )}
          >
            <Users className="w-4 h-4" /> Pengguna ({totalCount})
          </button>
          <button
            onClick={() => setTab('invitations')}
            className={cn(
              'flex-1 px-6 py-3.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2',
              tab === 'invitations'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-900/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            )}
          >
            <Mail className="w-4 h-4" /> Undangan ({invitations.length})
          </button>
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <>
            {/* Search & Filter */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Cari nama atau email"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 appearance-none"
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
                  void fetchUsers()
                }}
                className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
                title="Refresh"
                aria-label="Muat ulang daftar pengguna"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <UserTable
              users={users}
              loading={loading}
              actionMenuId={actionMenuId}
              setActionMenuId={setActionMenuId}
              onChangeRole={(user) => setRoleModal({ user })}
              onDeactivate={handleDeactivate}
              formatDate={formatDate}
              getInitials={getInitials}
            />

            {/* Load More */}
            {hasMore && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-center">
                <button
                  onClick={() => fetchUsers(cursor || undefined)}
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Invitations Tab */}
        {tab === 'invitations' && (
          <InvitationsTable
            invitations={invitations}
            loading={loading}
            onRevoke={handleRevoke}
            onCopyLink={copyInviteLink}
            formatDate={formatDate}
          />
        )}
      </div>

      {/* Bulk Import Wizard */}
      {showBulkImportWizard && (
        <BulkImportWizard
          onClose={() => setShowBulkImportWizard(false)}
          onSuccess={() => {
            setShowBulkImportWizard(false)
            void fetchUsers()
            void fetchInvitations()
          }}
        />
      )}

      {/* Modals */}
      {roleModal && (
        <ChangeRoleModal
          isOpen={true}
          onClose={() => setRoleModal(null)}
          onConfirm={handleRoleChange}
          userName={`${roleModal.user.first_name} ${roleModal.user.last_name}`}
          currentRoles={roleModal.user.roles as ('STUDENT' | 'TEACHER' | 'ADMIN')[]}
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
