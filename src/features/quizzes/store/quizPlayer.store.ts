// Quiz Player Store - Zustand state management
// Part of the Quiz Engine Refactor

import { create } from 'zustand'

import type { SubmitAnswer } from '../types/quizzes.types'

// ============================================
// Store State
// ============================================

/**
 * Zustand store untuk state quiz player yang perlu di-share lintas komponen.
 *
 * Catatan penting tentang state yang dikelola secara lokal:
 * - Timer (countdown) dikelola oleh `useQuizTimer` hook secara lokal di `QuizPlayer.tsx`
 *   dan TIDAK di-sync ke store ini.
 * - Flagged questions di `QuizPlayer.tsx` menggunakan local `useState<Set<string>>`
 *   dan TIDAK membaca dari store ini.
 *
 * Store ini tetap menjadi sumber kebenaran untuk `answers` dan `currentQuestion`
 * yang diakses oleh komponen navigasi dan autosave.
 */
interface QuizPlayerState {
  // Answer state
  answers: Record<string, SubmitAnswer>

  // Navigation state
  currentQuestion: number

  /**
   * @deprecated Timer dikelola oleh `useQuizTimer` hook secara lokal di `QuizPlayer.tsx`.
   * State ini TIDAK di-sync dengan timer aktual yang berjalan di UI.
   * Jangan gunakan nilai ini untuk menampilkan countdown kepada pengguna.
   * Gunakan `useQuizTimer` hook di dalam `QuizPlayer.tsx` sebagai gantinya.
   */
  timeRemaining: number | null

  /**
   * @note `QuizPlayer.tsx` menggunakan local `useState<Set<string>>` untuk flagged state,
   * bukan dari store ini. Store `flagged` tersedia untuk komponen lain di luar
   * `QuizPlayer.tsx` yang mungkin perlu membaca/mengubah status flag soal.
   */
  flagged: Set<string>

  // Actions
  setAnswer: (questionId: string, answer: SubmitAnswer) => void
  setAnswers: (answers: Record<string, SubmitAnswer>) => void
  goTo: (questionIndex: number) => void
  nextQuestion: () => void
  previousQuestion: () => void
  toggleFlag: (questionId: string) => void
  resetStore: () => void
}

// ============================================
// Store Factory
// ============================================

export const useQuizPlayerStore = create<QuizPlayerState>((set, get) => ({
  // Initial state
  answers: {},
  currentQuestion: 0,
  timeRemaining: null,
  flagged: new Set<string>(),

  // Actions
  setAnswer: (questionId: string, answer: SubmitAnswer) => {
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: answer,
      },
    }))
  },

  setAnswers: (answers: Record<string, SubmitAnswer>) => {
    set({ answers })
  },

  goTo: (questionIndex: number) => {
    if (questionIndex >= 0) {
      set({ currentQuestion: questionIndex })
    }
  },

  nextQuestion: () => {
    const { currentQuestion } = get()
    set({ currentQuestion: currentQuestion + 1 })
  },

  previousQuestion: () => {
    const { currentQuestion } = get()
    if (currentQuestion > 0) {
      set({ currentQuestion: currentQuestion - 1 })
    }
  },

  toggleFlag: (questionId: string) => {
    set((state) => {
      const newFlagged = new Set(state.flagged)
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId)
      } else {
        newFlagged.add(questionId)
      }
      return { flagged: newFlagged }
    })
  },

  resetStore: () => {
    set({
      answers: {},
      currentQuestion: 0,
      timeRemaining: null,
      flagged: new Set<string>(),
    })
  },
}))

// ============================================
// Default store (for type exports)
// ============================================

// QuizPlayerState type is internal to the store
