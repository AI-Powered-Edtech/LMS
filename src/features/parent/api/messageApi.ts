// ==========================================================================
// Message API — messageApi.ts
// Wave 4 — Task 29.5: Message Teacher Feature
//
// Supabase queries untuk Parent-Teacher messaging.
// RLS di DB memastikan hanya participant yang bisa mengakses.
// ==========================================================================

import { supabase } from '@/services/supabase/client'
import { messageRateLimiter } from '@/utils/rateLimiter'

// ── Types ─────────────────────────────────────────────────────────────────

export interface MessageThread {
  id: string
  tenant_id: string
  parent_id: string
  teacher_id: string
  student_id: string
  subject: string | null
  last_message_at: string
  parent_unread_count: number
  teacher_unread_count: number
  created_at: string
  // Joined fields
  teacher_name?: string
  teacher_avatar?: string | null
  student_name?: string
  last_message_preview?: string
}

export interface ThreadMessage {
  id: string
  thread_id: string
  tenant_id: string
  sender_id: string
  content: string
  created_at: string
  // Joined
  sender_name?: string
  sender_avatar?: string | null
}

export interface CreateThreadParams {
  parent_id: string
  teacher_id: string
  student_id: string
  subject?: string
}

type ProfileLookup = Record<string, { full_name?: string; avatar_url?: string | null }>

async function fetchProfiles(userIds: string[]): Promise<ProfileLookup> {
  if (userIds.length === 0) return {}

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds)

  if (error) throw error

  return Object.fromEntries(
    ((data ?? []) as Record<string, unknown>[]).map((profile) => [
      profile.id as string,
      {
        full_name: profile.full_name as string | undefined,
        avatar_url: (profile.avatar_url as string | null | undefined) ?? null,
      },
    ])
  )
}

function mapThreadRow(row: Record<string, unknown>, profiles: ProfileLookup): MessageThread {
  const teacher = profiles[row.teacher_id as string]
  const student = profiles[row.student_id as string]

  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    parent_id: row.parent_id as string,
    teacher_id: row.teacher_id as string,
    student_id: row.student_id as string,
    subject: (row.subject as string | null) ?? null,
    last_message_at: row.last_message_at as string,
    parent_unread_count: (row.parent_unread_count as number) ?? 0,
    teacher_unread_count: (row.teacher_unread_count as number) ?? 0,
    created_at: row.created_at as string,
    teacher_name: teacher?.full_name ?? 'Guru',
    teacher_avatar: teacher?.avatar_url ?? null,
    student_name: student?.full_name ?? 'Siswa',
  }
}

function mapMessageRow(row: Record<string, unknown>, profiles: ProfileLookup): ThreadMessage {
  const sender = profiles[row.sender_id as string]

  return {
    id: row.id as string,
    thread_id: row.thread_id as string,
    tenant_id: row.tenant_id as string,
    sender_id: row.sender_id as string,
    content: row.content as string,
    created_at: row.created_at as string,
    sender_name: sender?.full_name ?? 'Pengguna',
    sender_avatar: sender?.avatar_url ?? null,
  }
}

// ── getThreads ────────────────────────────────────────────────────────────

/**
 * Mengambil semua thread percakapan untuk parent yang sedang login.
 * Diurutkan berdasarkan last_message_at terbaru.
 */
export async function getThreads(parentId: string): Promise<MessageThread[]> {
  const { data, error } = await supabase
    .from('parent_teacher_threads')
    .select(
      'id, tenant_id, parent_id, teacher_id, student_id, subject, last_message_at, parent_unread_count, teacher_unread_count, created_at'
    )
    .eq('parent_id', parentId)
    .order('last_message_at', { ascending: false })

  if (error) {
    if (import.meta.env.DEV) console.error('[MessageApi] getThreads error:', error)
    throw new Error('Gagal memuat daftar pesan. Silakan coba lagi.')
  }

  if (!data || data.length === 0) return []

  const rows = data as Record<string, unknown>[]
  const profiles = await fetchProfiles(
    Array.from(new Set(rows.flatMap((row) => [row.teacher_id as string, row.student_id as string])))
  )

  return rows.map((row) => mapThreadRow(row, profiles))
}

// ── getMessages ────────────────────────────────────────────────────────────

/**
 * Mengambil semua pesan dalam sebuah thread, diurutkan dari terlama ke terbaru.
 */
export async function getMessages(threadId: string): Promise<ThreadMessage[]> {
  const { data, error } = await supabase
    .from('parent_teacher_messages')
    .select('id, thread_id, tenant_id, sender_id, content, created_at')
    .eq('thread_id', threadId)
    .limit(100)
    .order('created_at', { ascending: true })

  if (error) {
    if (import.meta.env.DEV) console.error('[MessageApi] getMessages error:', error)
    throw new Error('Gagal memuat pesan. Silakan coba lagi.')
  }

  if (!data || data.length === 0) return []

  const rows = data as Record<string, unknown>[]
  const profiles = await fetchProfiles(Array.from(new Set(rows.map((row) => row.sender_id as string))))

  return rows.map((row) => mapMessageRow(row, profiles))
}

// ── sendMessage ────────────────────────────────────────────────────────────

/**
 * Mengirim pesan baru dalam thread.
 * Trigger DB otomatis update last_message_at dan unread_count.
 */
export async function sendMessage(threadId: string, content: string): Promise<ThreadMessage> {
  const rateLimitResult = messageRateLimiter.check(threadId)
  if (!rateLimitResult.allowed) {
    const waitSeconds = Math.ceil((rateLimitResult.retryAfterMs ?? 60000) / 1000)
    throw new Error(`Terlalu banyak pesan. Coba lagi dalam ${waitSeconds} detik.`)
  }

  const { data, error } = await supabase
    .from('parent_teacher_messages')
    .insert({
      thread_id: threadId,
      content: content.trim(),
    })
    .select('id, thread_id, tenant_id, sender_id, content, created_at')
    .single()

  if (error) {
    if (import.meta.env.DEV) console.error('[MessageApi] sendMessage error:', error)
    throw new Error('Gagal mengirim pesan. Silakan coba lagi.')
  }

  const row = data as Record<string, unknown>
  const profiles = await fetchProfiles([row.sender_id as string])

  return mapMessageRow(row, profiles)
}

// ── createThread ──────────────────────────────────────────────────────────

/**
 * Membuat thread percakapan baru antara parent dan teacher untuk siswa tertentu.
 * Jika thread sudah ada (UNIQUE constraint), akan return thread yang sudah ada.
 */
export async function createThread(params: CreateThreadParams): Promise<MessageThread> {
  // Coba upsert — jika sudah ada, kembalikan existing
  const { data, error } = await supabase
    .from('parent_teacher_threads')
    .upsert(
      {
        parent_id: params.parent_id,
        teacher_id: params.teacher_id,
        student_id: params.student_id,
        subject: params.subject ?? null,
      },
      {
        onConflict: 'parent_id,teacher_id,student_id,tenant_id',
        ignoreDuplicates: true,
      }
    )
    .select(
      'id, tenant_id, parent_id, teacher_id, student_id, subject, last_message_at, parent_unread_count, teacher_unread_count, created_at'
    )
    .single()

  if (error) {
    if (import.meta.env.DEV) console.error('[MessageApi] createThread error:', error)
    // Coba fetch thread yang sudah ada
    const { data: existing, error: fetchError } = await supabase
      .from('parent_teacher_threads')
      .select(
        'id, tenant_id, parent_id, teacher_id, student_id, subject, last_message_at, parent_unread_count, teacher_unread_count, created_at'
      )
      .eq('parent_id', params.parent_id)
      .eq('teacher_id', params.teacher_id)
      .eq('student_id', params.student_id)
      .single()

    if (fetchError || !existing) {
      throw new Error('Gagal membuat percakapan baru. Silakan coba lagi.')
    }

    const row = existing as Record<string, unknown>
    const profiles = await fetchProfiles([row.teacher_id as string, row.student_id as string])

    return mapThreadRow(row, profiles)
  }

  const row = data as Record<string, unknown>
  const profiles = await fetchProfiles([row.teacher_id as string, row.student_id as string])

  return mapThreadRow(row, profiles)
}

// ── markThreadRead ─────────────────────────────────────────────────────────

/**
 * Reset unread count untuk role tertentu (parent atau teacher).
 * Dipanggil saat user membuka thread.
 */
export async function markThreadRead(threadId: string, role: 'parent' | 'teacher'): Promise<void> {
  const field = role === 'parent' ? 'parent_unread_count' : 'teacher_unread_count'

  const { error } = await supabase
    .from('parent_teacher_threads')
    .update({ [field]: 0 })
    .eq('id', threadId)

  if (error) {
    if (import.meta.env.DEV) console.error('[MessageApi] markThreadRead error:', error)
    // Non-fatal: jangan throw, cukup log
  }
}
