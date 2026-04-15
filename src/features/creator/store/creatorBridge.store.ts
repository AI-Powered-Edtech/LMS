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

import type { ArtifactKind } from '@/features/ai-builder-copilot/types'

import type { AssignmentType, GeneratedQuestion } from '../types'

export interface PendingQuizData {
  title: string
  type: AssignmentType
  questions: GeneratedQuestion[]
  summary: string
  bloomLevel: string
  questionCount: number
}

export interface PendingArtifactData {
  artifactId: string
  artifactKind: ArtifactKind
  courseId: string
  targetId?: string
  output: Record<string, unknown>
}

interface CreatorBridgeState {
  pendingQuiz: PendingQuizData | null
  pendingArtifact: PendingArtifactData | null
  setPendingQuiz: (data: PendingQuizData) => void
  clearPendingQuiz: () => void
  setPendingArtifact: (data: PendingArtifactData) => void
  clearPendingArtifact: () => void
}

export const useCreatorBridgeStore = create<CreatorBridgeState>()(
  persist(
    (set) => ({
      pendingQuiz: null,
      pendingArtifact: null,
      setPendingQuiz: (data) => set({ pendingQuiz: data }),
      clearPendingQuiz: () => set({ pendingQuiz: null }),
      setPendingArtifact: (data) => set({ pendingArtifact: data }),
      clearPendingArtifact: () => set({ pendingArtifact: null }),
    }),
    {
      name: 'creator-bridge',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
