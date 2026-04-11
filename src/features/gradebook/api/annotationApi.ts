import { db } from '@/services/db'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubmissionAnnotation {
  id: string
  tenant_id: string
  submission_id: string
  annotator_id: string
  x_percent: number
  y_percent: number
  content: string
  color: string
  created_at: string
  updated_at: string
}

export type AnnotationColor = '#FFD700' | '#FF4444' | '#44BB44'

interface AddAnnotationInput {
  submission_id: string
  x_percent: number
  y_percent: number
  content: string
  color?: AnnotationColor
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Mengambil semua anotasi untuk satu submission.
 * RLS memastikan hanya teacher/admin tenant yang bisa mengakses.
 */
export async function fetchAnnotations(submissionId: string): Promise<SubmissionAnnotation[]> {
  const { data, error } = await db
    .from('submission_annotations')
    .select(
      'id, tenant_id, submission_id, annotator_id, x_percent, y_percent, content, color, created_at, updated_at'
    )
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []) as SubmissionAnnotation[]
}

// ── Add ───────────────────────────────────────────────────────────────────────

/**
 * Menambah anotasi baru pada submission.
 * tenant_id diisi otomatis oleh trigger auto_set_tenant_id.
 * annotator_id diisi otomatis dari auth.uid().
 */
export async function addAnnotation(input: AddAnnotationInput): Promise<SubmissionAnnotation> {
  const { data: userData, error: userError } = await db.auth.getUser()
  if (userError || !userData.user) throw new Error('Pengguna tidak terautentikasi')

  const { data, error } = await db
    .from('submission_annotations')
    .insert({
      submission_id: input.submission_id,
      annotator_id: userData.user.id,
      x_percent: input.x_percent,
      y_percent: input.y_percent,
      content: input.content,
      color: input.color ?? '#FFD700',
    })
    .select(
      'id, tenant_id, submission_id, annotator_id, x_percent, y_percent, content, color, created_at, updated_at'
    )
    .single()

  if (error) throw error

  return data as SubmissionAnnotation
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Memperbarui teks konten anotasi yang sudah ada.
 */
export async function updateAnnotation(id: string, content: string): Promise<SubmissionAnnotation> {
  const { data, error } = await db
    .from('submission_annotations')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(
      'id, tenant_id, submission_id, annotator_id, x_percent, y_percent, content, color, created_at, updated_at'
    )
    .single()

  if (error) throw error

  return data as SubmissionAnnotation
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Menghapus anotasi berdasarkan ID.
 */
export async function deleteAnnotation(id: string): Promise<void> {
  const { error } = await db.from('submission_annotations').delete().eq('id', id)

  if (error) throw error
}
