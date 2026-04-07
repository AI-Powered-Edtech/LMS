/**
 * Creator Bridge Store
 * Zustand store for passing AI-generated quiz data from Creator page
 * to CourseBuilder/QuizBlockEditor without router state coupling.
 *
 * Uses sessionStorage for persistence across page refreshes within the
 * same browser session (auto-cleared when tab closes).
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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

export const useCreatorBridgeStore = create<CreatorBridgeState>()(
  persist(
    (set) => ({
      pendingQuiz: null,
      setPendingQuiz: (data) => set({ pendingQuiz: data }),
      clearPendingQuiz: () => set({ pendingQuiz: null }),
    }),
    {
      name: 'creator-bridge',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
