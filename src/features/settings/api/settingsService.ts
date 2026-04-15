import { db } from '@/services/db'

/**
 * Settings Service
 * Wraps profile update and auth password change operations.
 */
export const settingsService = {
  /**
   * Update the user's display name (first_name + last_name) in profiles table.
   */
  async updateProfile(
    userId: string,
    data: { firstName: string; lastName: string }
  ): Promise<void> {
    const { error } = await db
      .from('profiles')
      .update({
        first_name: data.firstName,
        last_name: data.lastName || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
    if (error) throw error
  },

  /**
   * Change the authenticated user's password via auth provider.
   */
  async changePassword(newPassword: string): Promise<void> {
    const { error } = await db.auth.updateUser({ password: newPassword })
    if (error) throw error
  },
}
