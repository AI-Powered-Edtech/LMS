// ==========================================================================
// Digest API — digestApi.ts
// Wave 4 — Task 29.4: Daily Digest Notification
//
// API functions untuk parent_digest_settings.
// ==========================================================================

import { supabase } from '@/services/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────

export type DigestChannel = 'inapp' | 'whatsapp' | 'email'

export interface DigestSettings {
  id: string
  parent_id: string
  tenant_id: string
  digest_enabled: boolean
  digest_time: string // HH:MM format
  channel: DigestChannel
  last_sent_at: string | null
  created_at: string
}

export interface DigestSettingsUpdate {
  digest_enabled?: boolean
  digest_time?: string
  channel?: DigestChannel
}

// ── getDigestSettings ──────────────────────────────────────────────────────

/**
 * Mengambil pengaturan digest untuk parent yang sedang login.
 * Mengembalikan null jika belum ada pengaturan (belum pernah disimpan).
 */
export async function getDigestSettings(parentId: string): Promise<DigestSettings | null> {
  const { data, error } = await supabase
    .from('parent_digest_settings')
    .select('*')
    .eq('parent_id', parentId)
    .maybeSingle()

  if (error) {
    if (import.meta.env.DEV) console.error('[DigestApi] getDigestSettings error:', error)
    throw new Error('Gagal memuat pengaturan digest. Silakan coba lagi.')
  }

  return data as DigestSettings | null
}

// ── updateDigestSettings ──────────────────────────────────────────────────

/**
 * Upsert pengaturan digest.
 * Membuat baris baru jika belum ada, update jika sudah ada.
 */
export async function updateDigestSettings(
  parentId: string,
  tenantId: string,
  updates: DigestSettingsUpdate
): Promise<DigestSettings> {
  const { data, error } = await supabase
    .from('parent_digest_settings')
    .upsert(
      {
        parent_id: parentId,
        tenant_id: tenantId,
        ...updates,
      },
      {
        onConflict: 'parent_id,tenant_id',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single()

  if (error) {
    if (import.meta.env.DEV) console.error('[DigestApi] updateDigestSettings error:', error)
    throw new Error('Gagal menyimpan pengaturan digest. Silakan coba lagi.')
  }

  return data as DigestSettings
}

// ── triggerManualDigest ───────────────────────────────────────────────────

/**
 * Trigger manual digest untuk testing.
 * Memanggil Edge Function send-parent-digest dengan parent_id spesifik.
 * Hanya tersedia di development dan untuk admin.
 */
export async function triggerManualDigest(parentId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-parent-digest', {
    body: { parent_id: parentId },
  })

  if (error) {
    if (import.meta.env.DEV) console.error('[DigestApi] triggerManualDigest error:', error)
    throw new Error('Gagal mengirim digest manual. Silakan coba lagi.')
  }
}
