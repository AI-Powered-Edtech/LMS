// Quiz Player Store - Zustand state management
// Part of the Quiz Engine Refactor

import { create } from 'zustand';
import type { SubmitAnswer } from '../types/quizzes.types';

// ============================================
// Store State
// ============================================

interface QuizPlayerState {
  // Answer state
  answers: Record<string, SubmitAnswer>;
  
  // Navigation state
  currentQuestion: number;
  
  // Flagged questions
  flagged: Set<string>;
  
  // Actions
  setAnswer: (questionId: string, answer: SubmitAnswer) => void;
  setAnswers: (answers: Record<string, SubmitAnswer>) => void;
  goTo: (questionIndex: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  toggleFlag: (questionId: string) => void;
  resetStore: () => void;
}

// ============================================
// Store Factory
// ============================================

interface QuizPlayerStoreConfig {
  totalQuestions: number;
}

export const createQuizPlayerStore = ({ totalQuestions }: QuizPlayerStoreConfig) =>
  create<QuizPlayerState>((set, get) => ({
    // Initial state
    answers: {},
    currentQuestion: 0,
    flagged: new Set<string>(),

    // Actions
    setAnswer: (questionId: string, answer: SubmitAnswer) => {
      set((state) => ({
        answers: {
          ...state.answers,
          [questionId]: answer,
        },
      }));
    },

    setAnswers: (answers: Record<string, SubmitAnswer>) => {
      set({ answers });
    },

    goTo: (questionIndex: number) => {
      const { currentQuestion } = get();
      if (questionIndex >= 0 && questionIndex < totalQuestions) {
        set({ currentQuestion: questionIndex });
      }
    },

    nextQuestion: () => {
      const { currentQuestion } = get();
      if (currentQuestion < totalQuestions - 1) {
        set({ currentQuestion: currentQuestion + 1 });
      }
    },

    previousQuestion: () => {
      const { currentQuestion } = get();
      if (currentQuestion > 0) {
        set({ currentQuestion: currentQuestion - 1 });
      }
    },

    toggleFlag: (questionId: string) => {
      set((state) => {
        const newFlagged = new Set(state.flagged);
        if (newFlagged.has(questionId)) {
          newFlagged.delete(questionId);
        } else {
          newFlagged.add(questionId);
        }
        return { flagged: newFlagged };
      });
    },

    resetStore: () => {
      set({
        answers: {},
        currentQuestion: 0,
        flagged: new Set<string>(),
      });
    },
  }));

// ============================================
// Default store (for type exports)
// ============================================

// This is a placeholder - the actual store is created with createQuizPlayerStore
// with the totalQuestions parameter. This export is for type reference only.
export type { QuizPlayerState };
