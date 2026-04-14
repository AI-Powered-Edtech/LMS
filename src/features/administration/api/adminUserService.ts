import { apiFetch } from '@/src/lib/api'
import { validateArray } from '@/src/shared/lib/validate'
import { TenantInvitationRowSchema } from '@/src/shared/schemas'

export interface TenantUser {
  user_id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  roles: string[]
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
  total_count: number
}

export interface TenantInvitation {
  id: string
  email: string
  role: string
  status: string
  token: string
  expires_at: string
  created_at: string
  accepted_at: string | null
}

export interface GetUsersParams {
  search?: string
  role?: string
  cursor?: string
  limit?: number
}

export async function getTenantUsers(params: GetUsersParams = {}): Promise<TenantUser[]> {
  const { data, error } = await apiFetch('/rpc/get_tenant_users', { method: 'POST', body: JSON.stringify({
      p_search: params.search || null,
      p_role: params.role || null,
      p_cursor: params.cursor || null,
      p_limit: params.limit || 20,
    }) })

  if (error) throw error
  return (data ?? []) as TenantUser[]
}

export async function updateUserRole(
  userId: string,
  newRole: string
): Promise<{ old_role: string; new_role: string }> {
  const { data, error } = await apiFetch('/rpc/update_user_role', { method: 'POST', body: JSON.stringify({
      p_user_id: userId,
      p_new_role: newRole,
    }) })

  if (error) throw error
  return data as { old_role: string; new_role: string }
}

export async function deactivateUser(userId: string, active: boolean = false): Promise<void> {
  const { error } = await apiFetch('/rpc/deactivate_user', { method: 'POST', body: JSON.stringify({
      p_user_id: userId,
      p_active: active,
    }) })

  if (error) throw error
}

export async function getInvitations(): Promise<TenantInvitation[]> {
  const { data, error } = await apiFetch('/tenant_invitations')

  if (error) throw error
  validateArray(TenantInvitationRowSchema, data ?? [], 'adminUserService.getInvitations')
  return (data ?? []) as TenantInvitation[]
}

export async function revokeInvitation(id: string): Promise<void> {
  const { error } = await apiFetch('/tenant_invitations')

  if (error) throw error
}
