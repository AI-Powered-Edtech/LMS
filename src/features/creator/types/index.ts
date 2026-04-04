// ─── Generated Question Shapes ────────────────────────────────────────────────

export interface GeneratedQuizQuestion {
  id: string
  text: string
  options: string[]
  answer: number // index of correct option (0-3)
  explanation?: string
  bloomLevel?: string
}

export interface GeneratedOpenQuestion {
  id: string
  text: string
  answer: string // key answer / rubric criteria
  bloomLevel?: string
}

export type GeneratedQuestion = GeneratedQuizQuestion | GeneratedOpenQuestion

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface GenerateAIContentRequest {
  file: File
  assignmentType: 'quiz' | 'reading' | 'writing'
  questionCount: number
  difficulty: string // C1–C6
}

export interface GenerateAIContentResponse {
  id: string | null // null if DB save failed (non-fatal)
  type: 'quiz' | 'reading' | 'writing'
  tenant_id: string
  summary: string
  questions: GeneratedQuestion[]
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export interface AIGeneratedContent {
  id: string
  tenant_id: string
  created_by: string
  file_name: string
  file_type: string
  assignment_type: 'quiz' | 'reading' | 'writing'
  bloom_level: string
  question_count: number
  summary: string | null
  questions: GeneratedQuestion[]
  used_at: string | null
  created_at: string
  updated_at: string
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface CreatorResultState {
  id: string | null
  type: 'quiz' | 'reading' | 'writing'
  summary: string
  questions: GeneratedQuestion[]
  selectedIds: Set<string>
}

export type BloomLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'
export type AssignmentType = 'quiz' | 'reading' | 'writing'

export const BLOOM_LABELS: Record<BloomLevel, string> = {
  C1: 'C1-Mengingat',
  C2: 'C2-Memahami',
  C3: 'C3-Mengaplikasikan',
  C4: 'C4-Menganalisis',
  C5: 'C5-Mengevaluasi',
  C6: 'C6-Mencipta',
}

export const BLOOM_DESCRIPTIONS: Record<BloomLevel, string> = {
  C1: 'Soal menguji daya ingat fakta dan definisi',
  C2: 'Soal menguji pemahaman dan kemampuan menjelaskan',
  C3: 'Soal menguji kemampuan menerapkan konsep',
  C4: 'Soal menguji kemampuan menganalisis dan membandingkan',
  C5: 'Soal menguji kemampuan mengevaluasi dan menilai',
  C6: 'Soal menguji kemampuan mencipta dan bersintesis',
}
