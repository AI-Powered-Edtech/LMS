import { useCallback, useEffect, useState } from 'react'

import {
  deactivateUser,
  getInvitations,
  getTenantUsers,
  revokeInvitation,
  TenantInvitation,
  TenantUser,
  updateUserRole,
} from '@/src/features/administration/api/adminUserService'
import { useDebounce } from '@/src/hooks/useDebounce'
import { useToast } from '@/src/hooks/useToast'

type Tab = 'users' | 'invitations'

const PAGE_SIZE = 20

export function useUserManagementState() {
  const addToast = useToast((s) => s.addToast)
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<TenantUser[]>([])
  const [invitations, setInvitations] = useState<TenantInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)
  const [roleFilter, setRoleFilter] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Modals
  const [roleModal, setRoleModal] = useState<{ user: TenantUser } | null>(null)
  const [inviteModal, setInviteModal] = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  const fetchUsers = useCallback(
    async (newCursor?: string) => {
      setLoading(true)
      try {
        const data = await getTenantUsers({
          search: debouncedSearch || undefined,
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
        if (import.meta.env.DEV) console.error('Failed to fetch users:', err)
      } finally {
        setLoading(false)
      }
    },
    [debouncedSearch, roleFilter]
  )

  const fetchInvitations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInvitations()
      setInvitations(data)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to fetch invitations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (tab === 'users') {
      setCursor(null)
      fetchUsers()
    } else {
      fetchInvitations()
    }
  }, [tab, debouncedSearch, roleFilter])
  /* eslint-enable react-hooks/exhaustive-deps */

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
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mengubah status user.',
      })
    }
    setActionMenuId(null)
  }

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvitation(id)
      await fetchInvitations()
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal merevoke undangan.',
      })
    }
  }

  const copyInviteLink = (token: string) => {
    // Gunakan path parameter, bukan query param — mencegah token bocor via browser history & Referer header
    const link = `${window.location.origin}/#/invite/${token}`
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

  return {
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
  }
}
