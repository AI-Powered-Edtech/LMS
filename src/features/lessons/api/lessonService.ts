import { supabase } from '@/src/services/supabase/client'

import { Lesson, LessonProgress, ProgressQueueItem, SignedProgressQueue } from '../types'

// ============================================================
// Security Helpers
// ============================================================

// SECURITY: Using sessionStorage (not localStorage) so the signed queue:
// 1. Is cleared when the browser tab closes (no accumulation across sessions)
// 2. Has a smaller XSS exploitation window than localStorage
const QUEUE_KEY = 'edusync_progress_queue'

async function generateHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function signData(data: string, secret: string): Promise<string> {
  const key = await generateHmacKey(secret)
  const enc = new TextEncoder()
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data))
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function verifySignature(
  data: string,
  signatureHex: string,
  secret: string
): Promise<boolean> {
  try {
    const key = await generateHmacKey(secret)
    const enc = new TextEncoder()
    const sigArray = new Uint8Array(
      signatureHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    )
    return await globalThis.crypto.subtle.verify('HMAC', key, sigArray, enc.encode(data))
  } catch {
    return false
  }
}

async function getSessionKey(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session || !session.user) return null
  return session.user.id + (session.expires_at || 0).toString()
}

async function loadSecureQueue(): Promise<ProgressQueueItem[]> {
  const rawQueue = sessionStorage.getItem(QUEUE_KEY)
  if (!rawQueue) return []

  try {
    const signedQueue: SignedProgressQueue = JSON.parse(rawQueue)
    if (!signedQueue.payload || !signedQueue.signature) {
      throw new Error('Invalid queue structure')
    }

    const sessionKey = await getSessionKey()
    if (!sessionKey) {
      throw new Error('No active session')
    }

    const isValid = await verifySignature(signedQueue.payload, signedQueue.signature, sessionKey)
    if (!isValid) {
      throw new Error('Signature verification failed')
    }

    return JSON.parse(signedQueue.payload)
  } catch (e) {
    if (import.meta.env.DEV)
      if (import.meta.env.DEV)
        console.warn('[Offline Queue] Invalid or unauthorized queue detected, clearing.', e)
    sessionStorage.removeItem(QUEUE_KEY)
    return []
  }
}

async function saveSecureQueue(queue: ProgressQueueItem[]): Promise<void> {
  const sessionKey = await getSessionKey()
  if (!sessionKey) {
    if (import.meta.env.DEV)
      if (import.meta.env.DEV)
        console.warn('[Offline Queue] Cannot save queue without active session')
    return
  }

  const payload = JSON.stringify(queue)
  const signature = await signData(payload, sessionKey)
  const signedQueue: SignedProgressQueue = {
    payload,
    signature,
    createdAt: Date.now(),
  }

  // Size cap: if queue JSON is >50KB, drop the oldest items to prevent storage bloat
  const queueJson = JSON.stringify(signedQueue)
  if (queueJson.length > 50 * 1024) {
    try {
      const parsed = JSON.parse(queueJson)
      if (Array.isArray(parsed?.payload)) {
        const trimmed = { ...parsed, payload: parsed.payload.slice(-20) }
        sessionStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed))
      } else {
        sessionStorage.setItem(QUEUE_KEY, queueJson)
      }
    } catch {
      sessionStorage.setItem(QUEUE_KEY, queueJson)
    }
  } else {
    sessionStorage.setItem(QUEUE_KEY, queueJson)
  }
}

// ============================================================
// Service
// ============================================================

export interface UpsertScormRuntimeParams {
  userId: string
  scormPackageId: string
  tenantId: string
  cmiData: Record<string, string>
  scoreRaw?: number | null
  scoreMax?: number | null
  lessonStatus?: string | null
  totalTimeSeconds?: number | null
  suspendData?: string | null
}

export const lessonService = {
  /**
   * Fetch a single lesson with its resources and quiz questions.
   * Uses the get_lesson_snapshot RPC for efficient data retrieval.
   */
  async fetchLesson(lessonId: string, tenantId: string): Promise<Lesson | null> {
    // Try RPC first (migration 803+), fallback to direct query
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_lesson_snapshot', {
      p_lesson_id: lessonId,
      p_tenant_id: tenantId,
    })

    if (!rpcError && rpcData?.lesson) {
      interface RpcSnapshot {
        lesson: Record<string, unknown>
        course_id: string
        resources: unknown[]
        quizzes: Array<
          Record<string, unknown> & { questions?: unknown[]; quiz_questions?: unknown[] }
        >
        assignments: unknown[]
      }
      const snap = rpcData as RpcSnapshot
      return {
        ...snap.lesson,
        course_id: snap.course_id,
        lesson_resources: snap.resources ?? [],
        // RPC returns questions/options keys; remap to quiz_questions/quiz_options
        quizzes: (snap.quizzes ?? []).map((q) => ({
          ...q,
          quiz_questions: (
            (q.questions ?? q.quiz_questions ?? []) as Array<
              Record<string, unknown> & { options?: unknown[]; quiz_options?: unknown[] }
            >
          ).map((qq) => ({
            ...qq,
            quiz_options: qq.options ?? qq.quiz_options ?? [],
          })),
        })),
        assignments: snap.assignments ?? [],
      } as Lesson
    }

    if (rpcError && rpcError.code !== 'PGRST202') {
      if (import.meta.env.DEV) console.error('Error fetching lesson snapshot:', rpcError)
    }

    // Fallback: direct query (works without migration 803)
    const { data, error } = await supabase
      .from('lessons')
      .select(
        `
                id, module_id, title, content, type, order,
                passing_score, is_published, duration_minutes, tenant_id,
                lesson_resources (id, lesson_id, type, url, title, content, metadata),
                quizzes (
                    id, lesson_id, title, instructions, time_limit_minutes, max_attempts,
                    quiz_questions (id, text, order, quiz_options (id, text))
                ),
                assignments (
                    id, tenant_id, course_id, lesson_id, title, instructions,
                    max_points, max_attempts, is_published, due_date, created_at
                )
            `
      )
      .eq('id', lessonId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      if (import.meta.env.DEV) console.error('Error fetching lesson:', error)
      return null
    }

    return data as unknown as Lesson | null
  },

  /**
   * Fetch all lessons in a module with the current user's progress.
   */
  async fetchModuleLessons(
    moduleId: string,
    userId: string,
    tenantId: string
  ): Promise<{
    lessons: Lesson[]
    progress: Record<string, LessonProgress>
  }> {
    // Fetch lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select(
        `
        id, module_id, title, content, type, order,
        passing_score, is_published, duration_minutes, tenant_id,
        lesson_resources (id, lesson_id, type, url, title, content, metadata),
        quizzes (
          id, lesson_id, title, instructions, time_limit_minutes, max_attempts,
          quiz_questions (id, text, order, quiz_options (id, text))
        ),
        assignments (
          id, tenant_id, course_id, lesson_id, title, instructions,
          max_points, max_attempts, is_published, due_date, created_at
        )
      `
      )
      .eq('module_id', moduleId)
      .eq('tenant_id', tenantId)
      .order('order')

    if (lessonsError) {
      if (import.meta.env.DEV) console.error('Error fetching module lessons:', lessonsError)
      return { lessons: [], progress: {} }
    }

    // Fetch progress for all lessons in this module
    const lessonIds = (lessons || []).map((l) => l.id)
    const { data: progressData, error: progressError } = await supabase
      .from('lesson_progress')
      .select(
        'id, user_id, lesson_id, status, progress_percentage, last_position, completed, completed_at'
      )
      .eq('user_id', userId)
      .in('lesson_id', lessonIds)

    if (progressError) {
      if (import.meta.env.DEV) console.error('Error fetching lesson progress:', progressError)
    }

    // Index progress by lesson_id
    const progress: Record<string, LessonProgress> = {}
    for (const p of progressData || []) {
      progress[p.lesson_id] = p as LessonProgress
    }

    return {
      lessons: (lessons || []) as unknown as Lesson[],
      progress,
    }
  },

  /**
   * Update lesson progress (monotonic — progress can only go UP).
   * Uses the server-side RPC function for safety.
   * Throws an error if network fails.
   */
  async updateProgress(
    lessonId: string,
    tenantId: string,
    status: 'started' | 'in_progress' | 'completed',
    progressPercentage: number,
    lastPosition?: number,
    resumeAnchor?: {
      lastBlockId?: string
      lastBlockIndex?: number
      lastBlockOffset?: number
      lastVideoPosition?: number
    }
  ): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase.rpc('update_lesson_progress_monotonic', {
      p_user_id: user.id,
      p_lesson_id: lessonId,
      p_tenant_id: tenantId,
      p_status: status,
      p_progress_percentage: progressPercentage,
      p_last_position: lastPosition ?? null,
      p_last_block_id: resumeAnchor?.lastBlockId ?? null,
      p_last_block_index: resumeAnchor?.lastBlockIndex ?? null,
      p_last_block_offset: resumeAnchor?.lastBlockOffset ?? null,
      p_last_video_position: resumeAnchor?.lastVideoPosition ?? null,
    })

    if (error) {
      if (import.meta.env.DEV) console.error('Error updating progress:', error)
      throw error
    }
  },

  /**
   * Queue a progress update. Uses updateProgress first, and if it fails
   * (e.g. offline), it adds the update to a deduplicated local queue.
   */
  async queueProgressUpdate(
    lessonId: string,
    tenantId: string,
    status: 'started' | 'in_progress' | 'completed',
    progressPercentage: number,
    lastPosition?: number,
    resumeAnchor?: {
      lastBlockId?: string
      lastBlockIndex?: number
      lastBlockOffset?: number
      lastVideoPosition?: number
    }
  ): Promise<void> {
    try {
      await this.updateProgress(
        lessonId,
        tenantId,
        status,
        progressPercentage,
        lastPosition,
        resumeAnchor
      )
    } catch {
      if (import.meta.env.DEV)
        if (import.meta.env.DEV)
          console.warn('[Offline Queue] Network error, queuing progress for lesson', lessonId)

      let queue: ProgressQueueItem[] = await loadSecureQueue()

      const existingIndex = queue.findIndex((item) => item.lessonId === lessonId)
      const position = lastPosition ?? null

      if (existingIndex >= 0) {
        // Deduplicate: Keep the maximum progress/position
        const existing = queue[existingIndex]
        queue[existingIndex] = {
          ...existing,
          status: existing.status === 'completed' || status === 'completed' ? 'completed' : status,
          progressPercentage: Math.max(existing.progressPercentage, progressPercentage),
          lastPosition: Math.max(existing.lastPosition || 0, position || 0),
          resumeAnchor: resumeAnchor ?? existing.resumeAnchor,
          timestamp: Date.now(),
        }
      } else {
        queue.push({
          lessonId,
          status,
          progressPercentage,
          lastPosition: position,
          resumeAnchor,
          timestamp: Date.now(),
        })
      }

      // Limit queue size to prevent unbounded growth
      if (queue.length > 20) {
        queue.sort((a, b) => b.timestamp - a.timestamp)
        queue = queue.slice(0, 20)
      }

      await saveSecureQueue(queue)
    }
  },

  /**
   * Attempts to flush the offline progress queue synchronously.
   * Prevents race conditions by using a sequential loop and a memory-level lock.
   */
  async processOfflineQueue(tenantId: string): Promise<void> {
    if ((this as unknown as { _isProcessingOfflineQueue?: boolean })._isProcessingOfflineQueue)
      return
    ;(this as unknown as { _isProcessingOfflineQueue?: boolean })._isProcessingOfflineQueue = true

    try {
      let queue: ProgressQueueItem[] = await loadSecureQueue()

      if (queue.length === 0) return

      const remainingQueue: ProgressQueueItem[] = []
      for (const item of queue) {
        try {
          await this.updateProgress(
            item.lessonId,
            tenantId,
            item.status,
            item.progressPercentage,
            item.lastPosition || undefined,
            item.resumeAnchor
          )
        } catch {
          if (import.meta.env.DEV)
            if (import.meta.env.DEV)
              console.warn('[Offline Queue] Failed to sync item, re-queuing', item.lessonId)
          remainingQueue.push(item)
        }
      }

      if (remainingQueue.length > 0) {
        await saveSecureQueue(remainingQueue)
      } else {
        sessionStorage.removeItem(QUEUE_KEY)
      }
    } finally {
      ;(this as unknown as { _isProcessingOfflineQueue?: boolean })._isProcessingOfflineQueue =
        false
    }
  },

  /**
   * Mark a lesson as completed.
   * Convenience wrapper around updateProgress.
   */
  async completeLesson(lessonId: string, tenantId: string): Promise<void> {
    await this.updateProgress(lessonId, tenantId, 'completed', 100)
  },

  /**
   * Fetch the user's progress for a specific lesson.
   */
  async fetchProgress(
    lessonId: string,
    userId: string,
    tenantId: string
  ): Promise<LessonProgress | null> {
    const { data, error } = await supabase
      .from('lesson_progress')
      .select(
        'id, user_id, lesson_id, status, progress_percentage, last_position, completed, completed_at'
      )
      .eq('lesson_id', lessonId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      if (import.meta.env.DEV) console.error('Error fetching progress:', error)
      return null
    }

    return data as LessonProgress | null
  },

  /**
   * Fetch SCORM package info by ID and tenant.
   */
  async getScormPackage(
    packageId: string,
    tenantId: string
  ): Promise<{
    id: string
    tenant_id: string
    lesson_id: string | null
    title: string
    scorm_version: '1.2' | '2004'
    storage_path: string
    entry_point: string
  } | null> {
    const { data, error } = await supabase
      .from('scorm_packages')
      .select('id, tenant_id, lesson_id, title, scorm_version, storage_path, entry_point')
      .eq('id', packageId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) return null

    return data as {
      id: string
      tenant_id: string
      lesson_id: string | null
      title: string
      scorm_version: '1.2' | '2004'
      storage_path: string
      entry_point: string
    }
  },

  /**
   * Fetch existing SCORM runtime data for resume (user + package).
   */
  async getScormRuntimeData(
    userId: string,
    scormPackageId: string
  ): Promise<{
    cmi_data: Record<string, string> | null
    score_raw: number | null
    lesson_status: string | null
    total_time: number | null
    suspend_data: string | null
  } | null> {
    const { data } = await supabase
      .from('scorm_runtime_data')
      .select('cmi_data, score_raw, lesson_status, total_time, suspend_data')
      .eq('user_id', userId)
      .eq('scorm_package_id', scormPackageId)
      .single()

    return data ?? null
  },

  /**
   * Fetch completed lesson IDs for a user (bulk lookup for CourseBrowser).
   */
  async getCompletedLessonIds(userId: string, lessonIds: string[]): Promise<Set<string>> {
    if (lessonIds.length === 0) return new Set()

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds)
      .eq('completed', true)

    if (error) {
      if (import.meta.env.DEV) console.error('Error fetching completed lessons:', error)
      return new Set()
    }

    return new Set((data || []).map((p) => p.lesson_id))
  },

  /**
   * Persist SCORM runtime state via upsert_scorm_runtime RPC.
   * Used by ScormPlayer to save CMI data on commit and terminate.
   */
  async upsertScormRuntime(params: UpsertScormRuntimeParams): Promise<void> {
    const { error } = await supabase.rpc('upsert_scorm_runtime', {
      p_user_id: params.userId,
      p_scorm_package_id: params.scormPackageId,
      p_tenant_id: params.tenantId,
      p_cmi_data: params.cmiData,
      p_score_raw: params.scoreRaw ?? null,
      p_score_max: params.scoreMax ?? null,
      p_lesson_status: params.lessonStatus ?? null,
      p_total_time: params.totalTimeSeconds ?? null,
      p_suspend_data: params.suspendData ?? null,
    })
    if (error) {
      console.error('[lessonService] upsert_scorm_runtime error:', error)
      throw error
    }
  },
}
