import { supabase } from '@/services/supabase/client'
import { captureError } from '@/utils/sentry'

export interface UserDataExport {
  profile: Record<string, unknown>
  enrollments: unknown[]
  progress: unknown[]
  grades: unknown[]
  messages: unknown[]
  certificates: unknown[]
  exportedAt: string
}

export async function exportUserData(
  userId: string,
  tenantId: string
): Promise<UserDataExport | null> {
  try {
    // Optimization: Run all independent queries concurrently
    const [
      { data: profile },
      { data: enrollments },
      { data: progress },
      { data: grades },
      { data: messages },
      { data: certificates },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('enrollments').select('*').eq('user_id', userId).eq('tenant_id', tenantId),
      supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .limit(1000),
      supabase
        .from('grades')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .limit(1000),
      supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId)
        .eq('tenant_id', tenantId)
        .limit(1000),
      supabase.from('certificates').select('*').eq('user_id', userId).eq('tenant_id', tenantId),
    ])

    return {
      profile: profile ?? {},
      enrollments: enrollments ?? [],
      progress: progress ?? [],
      grades: grades ?? [],
      messages: messages ?? [],
      certificates: certificates ?? [],
      exportedAt: new Date().toISOString(),
    }
  } catch (err) {
    captureError(err, { tags: { feature: 'data-export' } })
    return null
  }
}

export function downloadExport(data: UserDataExport): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `edusync-data-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function requestAccountDeletion(userId: string, reason: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('account_deletion_requests').insert({
      user_id: userId,
      reason,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })

    if (error) throw error
    return true
  } catch (err) {
    captureError(err, { tags: { feature: 'account-deletion-request' } })
    return false
  }
}
