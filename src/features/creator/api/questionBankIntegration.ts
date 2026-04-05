/**
 * Save AI-generated questions to the question_bank table.
 * Uses questionBankService.createQuestion() via the existing RPC.
 */
import { questionBankService } from '@/features/question-bank/api/questionBankService'

import type { AssignmentType, GeneratedQuestion, GeneratedQuizQuestion } from '../types'

const BLOOM_TO_DIFFICULTY: Record<string, number> = {
  C1: 1,
  C2: 2,
  C3: 3,
  C4: 4,
  C5: 5,
  C6: 5,
}

function isQuizQuestion(q: GeneratedQuestion): q is GeneratedQuizQuestion {
  return 'options' in q && Array.isArray((q as GeneratedQuizQuestion).options)
}

export interface SaveToBankResult {
  saved: number
  failed: number
  errors: string[]
}

/**
 * Save a batch of AI-generated questions to the question_bank.
 * Returns a result object with counts of saved/failed items.
 */
export async function saveQuestionsToBank(
  questions: GeneratedQuestion[],
  assignmentType: AssignmentType,
  bloomLevel: string
): Promise<SaveToBankResult> {
  const result: SaveToBankResult = { saved: 0, failed: 0, errors: [] }
  const difficultyLevel = BLOOM_TO_DIFFICULTY[bloomLevel] ?? 3

  for (const q of questions) {
    try {
      const questionType =
        assignmentType === 'quiz' ? 'MCQ' : assignmentType === 'writing' ? 'ESSAY' : 'SHORT_ANSWER'

      const options =
        questionType === 'MCQ' && isQuizQuestion(q)
          ? q.options.map((optText, i) => ({
              option_text: optText,
              is_correct: i === q.answer,
              order_index: i,
            }))
          : []

      const explanation = isQuizQuestion(q) ? q.explanation : undefined

      await questionBankService.createQuestion({
        type: questionType as 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY',
        text: q.text,
        explanation,
        difficulty_level: difficultyLevel,
        options,
        tags: [bloomLevel, assignmentType, 'ai-generated'],
      })

      result.saved++
    } catch (e) {
      result.failed++
      result.errors.push(e instanceof Error ? e.message : String(e))
    }
  }

  return result
}
