/**
 * Save AI-generated questions to the question_bank table.
 * Uses questionBankService.createQuestion() via the existing RPC.
 * Processes in chunks of 3 for bounded concurrency.
 */
import { questionBankService } from '@/features/question-bank/api/questionBankService'

import type { AssignmentType, GeneratedQuestion } from '../types'
import { isQuizQuestion } from '../types'

const BLOOM_TO_DIFFICULTY: Record<string, number> = {
  C1: 1,
  C2: 2,
  C3: 3,
  C4: 4,
  C5: 5,
  C6: 5,
}

interface SaveToBankResult {
  saved: number
  failed: number
  errors: string[]
}

/**
 * Save a batch of AI-generated questions to the question_bank.
 * Processes in bounded chunks of 3 concurrent requests.
 * Returns a result object with counts of saved/failed items.
 */
export async function saveQuestionsToBank(
  questions: GeneratedQuestion[],
  assignmentType: AssignmentType,
  bloomLevel: string
): Promise<SaveToBankResult> {
  const result: SaveToBankResult = { saved: 0, failed: 0, errors: [] }
  const difficultyLevel = BLOOM_TO_DIFFICULTY[bloomLevel] ?? 3
  const CHUNK_SIZE = 3

  // Build all request payloads up-front
  const requests = questions.map((q) => {
    const questionType =
      assignmentType === 'quiz' ? 'MCQ' : assignmentType === 'writing' ? 'ESSAY' : 'SHORT_ANSWER'

    // AIQuizQuestion: options is Array<{text, is_correct}> — each option carries its own correctness
    const narrowedQ = isQuizQuestion(q) ? q : null
    const options =
      questionType === 'MCQ' && narrowedQ
        ? narrowedQ.options.map((opt, i) => ({
            option_text: opt.text,
            is_correct: opt.is_correct,
            order_index: i,
          }))
        : []

    const explanation = narrowedQ ? narrowedQ.explanation : undefined

    return {
      type: questionType as 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY',
      text: q.text,
      explanation,
      difficulty_level: difficultyLevel,
      options,
      tags: [bloomLevel, assignmentType, 'ai-generated'],
    }
  })

  // Process in chunks of CHUNK_SIZE for bounded concurrency
  for (let i = 0; i < requests.length; i += CHUNK_SIZE) {
    const chunk = requests.slice(i, i + CHUNK_SIZE)
    const settled = await Promise.allSettled(
      chunk.map((req) => questionBankService.createQuestion(req))
    )
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        result.saved++
      } else {
        result.failed++
        result.errors.push(s.reason instanceof Error ? s.reason.message : String(s.reason))
      }
    }
  }

  return result
}
