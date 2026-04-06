/**
 * AI Content Quality Validator
 *
 * Validates AI-generated content for appropriateness, completeness,
 * and quality before storing or displaying to users.
 */

export interface ValidationResult {
  /** Whether the content passed validation */
  isValid: boolean
  /** List of validation errors */
  errors: string[]
  /** List of warnings (non-blocking) */
  warnings: string[]
  /** Content quality score (0-100) */
  qualityScore: number
}

/**
 * Check for potentially inappropriate content
 */
function checkInappropriateContent(text: string): string[] {
  const errors: string[] = []
  const warnings: string[] = []

  // Profanity filter (Indonesian + English)
  const profanityPatterns = [
    /\b(anjing|anjg|ajg|babi|bangsat|bgst|kontol|kntl|tolol|goblok|gblok|memek|mmk|ngentot|ngnt|sange|sgt|taek|tai|kentot)\b/gi,
    /\b(fuck|shit|damn|bitch|ass|dick|pussy|cock|cunt|bastard|stupid|idiot|crap)\b/gi,
  ]

  for (const pattern of profanityPatterns) {
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      errors.push('Konten mengandung kata-kata tidak pantas')
      break
    }
  }

  // Check for excessive capitalization (possible spam)
  const uppercaseCount = (text.match(/[A-Z]/g) || []).length
  const totalLetters = (text.match(/[a-zA-Z]/g) || []).length
  if (totalLetters > 0 && uppercaseCount / totalLetters > 0.7 && text.length > 50) {
    warnings.push('Konten memiliki terlalu banyak huruf kapital')
  }

  // Check for excessive repetition (possible spam)
  const words = text.split(/\s+/)
  const wordFrequency: Record<string, number> = {}
  for (const word of words) {
    const lower = word.toLowerCase()
    wordFrequency[lower] = (wordFrequency[lower] || 0) + 1
  }

  const maxFrequency = Math.max(...Object.values(wordFrequency), 0)
  if (maxFrequency > 10 && words.length > 20) {
    warnings.push('Konten memiliki pengulangan kata yang berlebihan')
  }

  return [...errors, ...warnings]
}

/**
 * Validate quiz questions structure
 */
function validateQuizQuestions(questions: unknown[]): string[] {
  const errors: string[] = []

  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push('Soal tidak boleh kosong')
    return errors
  }

  if (questions.length > 50) {
    errors.push('Jumlah soal maksimal 50')
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Record<string, unknown>
    const prefix = `Soal #${i + 1}: `

    // Check required fields
    if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
      errors.push(`${prefix}Teks soal wajib diisi`)
    } else if (q.text.length > 2000) {
      errors.push(`${prefix}Teks soal terlalu panjang (maksimal 2000 karakter)`)
    }

    // Check options for MCQ questions
    if (q.question_type === 'MCQ' || q.question_type === 'MULTIPLE_SELECT') {
      const options = q.options as Array<Record<string, unknown>> | undefined
      if (!options || !Array.isArray(options)) {
        errors.push(`${prefix}Pilihan jawaban wajib diisi`)
      } else if (options.length < 2) {
        errors.push(`${prefix}Minimal 2 pilihan jawaban`)
      } else if (options.length > 10) {
        errors.push(`${prefix}Maksimal 10 pilihan jawaban`)
      } else {
        // Check each option
        for (let j = 0; j < options.length; j++) {
          const opt = options[j]
          if (!opt.text || typeof opt.text !== 'string' || opt.text.trim().length === 0) {
            errors.push(`${prefix}Pilihan #${j + 1} tidak boleh kosong`)
          }
          if (typeof opt.is_correct !== 'boolean') {
            errors.push(`${prefix}Pilihan #${j + 1} harus memiliki status benar/salah`)
          }
        }

        // Check at least one correct answer
        const hasCorrect = options.some((opt) => opt.is_correct === true)
        if (!hasCorrect) {
          errors.push(`${prefix}Harus ada minimal 1 jawaban benar`)
        }
      }
    }

    // Check TRUE_FALSE questions
    if (q.question_type === 'TRUE_FALSE') {
      if (typeof q.correct_answer !== 'boolean') {
        errors.push(`${prefix}Jawaban benar/salah wajib diisi`)
      }
    }

    // Check explanation length
    if (q.explanation && typeof q.explanation === 'string' && q.explanation.length > 1000) {
      errors.push(`${prefix}Penjelasan terlalu panjang (maksimal 1000 karakter)`)
    }
  }

  return errors
}

/**
 * Validate reading/writing assignment content
 */
function validateReadingWritingContent(
  content: string,
  assignmentType: 'reading' | 'writing'
): string[] {
  const errors: string[] = []

  if (!content || content.trim().length === 0) {
    errors.push('Konten tidak boleh kosong')
    return errors
  }

  if (assignmentType === 'reading') {
    if (content.length < 100) {
      errors.push('Konten bacaan terlalu pendek (minimal 100 karakter)')
    }
    if (content.length > 10000) {
      errors.push('Konten bacaan terlalu panjang (maksimal 10000 karakter)')
    }
  }

  if (assignmentType === 'writing') {
    if (content.length < 50) {
      errors.push('Instruksi tulisan terlalu pendek (minimal 50 karakter)')
    }
    if (content.length > 5000) {
      errors.push('Instruksi tulisan terlalu panjang (maksimal 5000 karakter)')
    }
  }

  return errors
}

/**
 * Calculate content quality score
 */
function calculateQualityScore(content: string, questions?: unknown[]): number {
  let score = 100

  // Deduct for short content
  if (content.length < 200) {
    score -= 20
  } else if (content.length < 500) {
    score -= 10
  }

  // Deduct for lack of structure (no paragraphs)
  const paragraphCount = content.split(/\n\s*\n/).length
  if (paragraphCount < 2 && content.length > 300) {
    score -= 10
  }

  // Deduct for questions if provided
  if (questions && questions.length > 0) {
    // Deduct for too few questions
    if (questions.length < 3) {
      score -= 15
    }

    // Deduct if questions are too short
    const avgQuestionLength = questions.reduce((sum: number, q: unknown) => {
      const text = (q as Record<string, unknown>).text as string
      return sum + (text?.length || 0)
    }, 0) / questions.length

    if (avgQuestionLength < 30) {
      score -= 15
    }

    // Bonus for having explanations
    const withExplanation = questions.filter((q) => {
      const explanation = (q as Record<string, unknown>).explanation as string
      return explanation && explanation.length > 0
    }).length

    if (withExplanation / questions.length > 0.5) {
      score += 10
    }
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Validate AI-generated content
 */
export function validateAIContent(
  content: string,
  options?: {
    questions?: unknown[]
    assignmentType?: 'quiz' | 'reading' | 'writing'
  }
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for inappropriate content
  const contentChecks = checkInappropriateContent(content)
  for (const check of contentChecks) {
    if (check.includes('tidak pantas')) {
      errors.push(check)
    } else {
      warnings.push(check)
    }
  }

  // Validate questions if provided
  if (options?.questions && options.questions.length > 0) {
    const questionErrors = validateQuizQuestions(options.questions)
    errors.push(...questionErrors)
  }

  // Validate reading/writing content
  if (options?.assignmentType && options.assignmentType !== 'quiz') {
    const contentErrors = validateReadingWritingContent(content, options.assignmentType)
    errors.push(...contentErrors)
  }

  // Calculate quality score
  const qualityScore = calculateQualityScore(content, options?.questions)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    qualityScore,
  }
}

/**
 * Check if content should be flagged for moderation review
 */
export function shouldFlagForModeration(validation: ValidationResult): boolean {
  // Flag if there are any errors
  if (!validation.isValid) return true

  // Flag if quality score is too low
  if (validation.qualityScore < 50) return true

  // Flag if there are warnings about inappropriate content
  if (validation.warnings.some((w) => w.includes('tidak pantas'))) return true

  return false
}
