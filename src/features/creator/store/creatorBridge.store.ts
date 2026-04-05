/**
 * Creator Bridge Store
 * Zustand store for passing AI-generated quiz data from Creator page
 * to CourseBuilder/QuizBlockEditor without router state coupling.
 */
import { create } from 'zustand'

import type { AssignmentType, GeneratedQuestion } from '../types'

export interface PendingQuizData {
  title: string
  type: AssignmentType
  questions: GeneratedQuestion[]
  summary: string
  bloomLevel: string
  questionCount: number
}

interface CreatorBridgeState {
  pendingQuiz: PendingQuizData | null
  setPendingQuiz: (data: PendingQuizData) => void
  clearPendingQuiz: () => void
}

export const useCreatorBridgeStore = create<CreatorBridgeState>((set) => ({
  pendingQuiz: null,
  setPendingQuiz: (data) => set({ pendingQuiz: data }),
  clearPendingQuiz: () => set({ pendingQuiz: null }),
}))
