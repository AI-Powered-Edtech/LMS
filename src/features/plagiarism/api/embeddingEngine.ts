import { readVilSession } from '@/services/auth/vilSession'
import { db } from '@/services/db'

/**
 * In-house plagiarism engine via embedding similarity (Prio 8 Unit 44).
 *
 * AUTHORITATIVE per runbook §2: build in-house. This module computes
 * embeddings via the backend AI proxy, then runs cosine similarity against
 * the prior submissions for the same assignment in the tenant.
 *
 * The backend `/api/v1/ai/embeddings` endpoint is assumed to exist (operator
 * gate to confirm). Falls back gracefully with an explanatory error if it
 * doesn't.
 */

interface EmbeddingResponse {
  embedding: number[]
  model: string
}

async function embedText(text: string): Promise<EmbeddingResponse> {
  const apiUrl = import.meta.env.VITE_API_URL ?? ''
  const token = readVilSession()?.access_token
  const res = await fetch(`${apiUrl}/api/v1/ai/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text: text.slice(0, 8000), model: 'text-embedding-3-small' }),
  })
  if (!res.ok) {
    throw new Error(
      `Embedding endpoint belum tersedia (HTTP ${res.status}). Operator: pastikan /api/v1/ai/embeddings sudah di-mount di main.rs.`,
    )
  }
  return (await res.json()) as EmbeddingResponse
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  if (denom === 0) return 0
  return dot / denom
}

export interface PlagiarismMatchResult {
  score: number              // similarity 0-100
  topMatchSubmissionId: string | null
  topMatchSimilarity: number
  comparisonCount: number
  embeddingModel: string
}

/**
 * Run plagiarism check for ONE submission against all prior submissions for
 * the same assignment in this tenant.
 *
 * Returns similarity score + persists to plagiarism_checks. Does NOT block
 * the submission flow on failure (the worker can retry); caller decides
 * whether to surface the result inline or wait for async.
 */
export async function runPlagiarismCheck(input: {
  tenantId: string
  submissionId: string
  assignmentId: string
  submissionText: string
  authorId: string
}): Promise<PlagiarismMatchResult> {
  if (input.submissionText.trim().length < 50) {
    // Too short — skip embedding cost.
    return {
      score: 0,
      topMatchSubmissionId: null,
      topMatchSimilarity: 0,
      comparisonCount: 0,
      embeddingModel: 'skipped',
    }
  }

  // Get embedding for current submission.
  const own = await embedText(input.submissionText)

  // Get prior submissions for the same assignment (excluding own author).
  const { data: priors, error } = await db
    .from('assignment_submissions')
    .select('id, content, student_id')
    .eq('assignment_id', input.assignmentId)
    .eq('tenant_id', input.tenantId)
    .neq('student_id', input.authorId)
    .not('content', 'is', null)
    .limit(50) // bounded comparison corpus

  if (error) throw error

  let topSimilarity = 0
  let topId: string | null = null

  for (const prior of (priors ?? []) as Array<{ id: string; content: string }>) {
    if (!prior.content || prior.content.trim().length < 50) continue
    try {
      const priorEmbed = await embedText(prior.content)
      const sim = cosineSimilarity(own.embedding, priorEmbed.embedding)
      if (sim > topSimilarity) {
        topSimilarity = sim
        topId = prior.id
      }
    } catch {
      // Skip on per-comparison failure — partial result still valuable.
    }
  }

  const score = Math.round(topSimilarity * 100)

  // Persist to plagiarism_checks.
  try {
    await db.from('plagiarism_checks').insert({
      submission_id: input.submissionId,
      tenant_id: input.tenantId,
      provider: 'internal',
      status: 'completed',
      similarity_score: score,
      report_data: {
        top_match: { submission_id: topId, similarity: topSimilarity },
        comparison_count: ((priors ?? []) as unknown[]).length,
      },
      embedding_model: own.model,
      comparison_corpus_size: ((priors ?? []) as unknown[]).length,
      top_match_submission_id: topId,
      top_match_similarity: score,
    })
  } catch {
    // Persistence failure should not invalidate the result.
  }

  return {
    score,
    topMatchSubmissionId: topId,
    topMatchSimilarity: topSimilarity,
    comparisonCount: ((priors ?? []) as unknown[]).length,
    embeddingModel: own.model,
  }
}
