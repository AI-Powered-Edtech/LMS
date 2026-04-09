import { beforeEach, describe, expect, it } from 'vitest'

import type { PendingArtifactData, PendingQuizData } from '../store/creatorBridge.store'
import { useCreatorBridgeStore } from '../store/creatorBridge.store'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockPendingQuiz: PendingQuizData = {
  title: 'Matematika Dasar',
  type: 'quiz',
  questions: [
    {
      id: 'q1',
      question_type: 'MCQ',
      text: 'Berapa hasil dari 2 + 2?',
      options: [
        { text: '1', is_correct: false },
        { text: '2', is_correct: false },
        { text: '4', is_correct: true },
        { text: '8', is_correct: false },
      ],
      explanation: 'Penjumlahan sederhana: 2 + 2 = 4',
      bloomLevel: 'C1',
    },
  ],
  summary: 'Soal matematika dasar untuk kelas 1',
  bloomLevel: 'C1',
  questionCount: 1,
}

const mockPendingQuizMultiQuestion: PendingQuizData = {
  title: 'Fisika Dasar',
  type: 'quiz',
  questions: [
    {
      id: 'q1',
      question_type: 'MCQ',
      text: 'Satuan besaran panjang dalam SI adalah?',
      options: [
        { text: 'Kilogram', is_correct: false },
        { text: 'Meter', is_correct: true },
        { text: 'Sekon', is_correct: false },
        { text: 'Ampere', is_correct: false },
      ],
      bloomLevel: 'C1',
    },
    {
      id: 'q2',
      question_type: 'OPEN',
      text: 'Jelaskan Hukum Newton pertama.',
      answer: 'Benda yang diam akan tetap diam kecuali ada gaya yang bekerja.',
      bloomLevel: 'C2',
    },
  ],
  summary: 'Soal fisika dasar',
  bloomLevel: 'C2',
  questionCount: 2,
}

const mockSecondQuiz: PendingQuizData = {
  title: 'Biologi Sel',
  type: 'reading',
  questions: [
    {
      id: 'q3',
      question_type: 'OPEN',
      text: 'Jelaskan fungsi mitokondria.',
      answer: 'Mitokondria berfungsi sebagai pembangkit energi sel.',
      bloomLevel: 'C3',
    },
  ],
  summary: 'Materi tentang sel biologi',
  bloomLevel: 'C3',
  questionCount: 1,
}

const mockPendingArtifact: PendingArtifactData = {
  artifactId: 'artifact-1',
  artifactKind: 'assessment',
  courseId: 'course-1',
  targetId: 'lesson-1',
  output: {
    quiz_payload: {
      title: 'Kuis AI',
    },
  },
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useCreatorBridgeStore.setState({ pendingQuiz: null, pendingArtifact: null })
  sessionStorage.clear()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCreatorBridgeStore', () => {
  describe('initial state', () => {
    it('pendingQuiz is null by default', () => {
      const state = useCreatorBridgeStore.getState()
      expect(state.pendingQuiz).toBeNull()
    })

    it('pendingArtifact is null by default', () => {
      const state = useCreatorBridgeStore.getState()
      expect(state.pendingArtifact).toBeNull()
    })

    it('has setPendingQuiz action', () => {
      expect(typeof useCreatorBridgeStore.getState().setPendingQuiz).toBe('function')
    })

    it('has clearPendingQuiz action', () => {
      expect(typeof useCreatorBridgeStore.getState().clearPendingQuiz).toBe('function')
    })

    it('has artifact bridge actions', () => {
      expect(typeof useCreatorBridgeStore.getState().setPendingArtifact).toBe('function')
      expect(typeof useCreatorBridgeStore.getState().clearPendingArtifact).toBe('function')
    })
  })

  describe('setPendingQuiz', () => {
    it('sets the pending quiz with the provided data', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz).toEqual(mockPendingQuiz)
    })

    it('stores the correct title', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.title).toBe('Matematika Dasar')
    })

    it('stores the correct type', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.type).toBe('quiz')
    })

    it('stores the correct summary', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.summary).toBe(
        'Soal matematika dasar untuk kelas 1'
      )
    })

    it('stores the correct bloomLevel', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.bloomLevel).toBe('C1')
    })

    it('stores the correct questionCount', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.questionCount).toBe(1)
    })

    it('stores questions array with correct length', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuizMultiQuestion)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.questions).toHaveLength(2)
    })

    it('stores full question data intact (options as {text, is_correct} array)', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      const q = useCreatorBridgeStore.getState().pendingQuiz?.questions[0]
      expect(q?.id).toBe('q1')
      expect(q?.text).toBe('Berapa hasil dari 2 + 2?')
      expect(q?.question_type).toBe('MCQ')
      // Quiz question: options carry their own correctness flag
      if (q?.question_type !== 'OPEN') {
        expect(q?.options).toEqual([
          { text: '1', is_correct: false },
          { text: '2', is_correct: false },
          { text: '4', is_correct: true },
          { text: '8', is_correct: false },
        ])
        expect(q?.options.find((o) => o.is_correct)?.text).toBe('4')
      }
    })

    it('preserves question bloomLevel', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      const q = useCreatorBridgeStore.getState().pendingQuiz?.questions[0]
      expect(q?.bloomLevel).toBe('C1')
    })
  })

  describe('clearPendingQuiz', () => {
    it('resets pendingQuiz to null', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      useCreatorBridgeStore.getState().clearPendingQuiz()
      expect(useCreatorBridgeStore.getState().pendingQuiz).toBeNull()
    })

    it('is safe to call when pendingQuiz is already null', () => {
      expect(() => {
        useCreatorBridgeStore.getState().clearPendingQuiz()
      }).not.toThrow()
      expect(useCreatorBridgeStore.getState().pendingQuiz).toBeNull()
    })
  })

  describe('multiple calls and overwrite', () => {
    it('second setPendingQuiz overwrites the first value', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      useCreatorBridgeStore.getState().setPendingQuiz(mockSecondQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.title).toBe('Biologi Sel')
    })

    it('overwriting removes stale data from previous set', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      useCreatorBridgeStore.getState().setPendingQuiz(mockSecondQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.bloomLevel).toBe('C3')
      expect(useCreatorBridgeStore.getState().pendingQuiz?.questionCount).toBe(1)
    })

    it('set → clear → set cycle works correctly', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuiz)
      useCreatorBridgeStore.getState().clearPendingQuiz()
      useCreatorBridgeStore.getState().setPendingQuiz(mockSecondQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.title).toBe('Biologi Sel')
    })

    it('full questions array is replaced on overwrite', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuizMultiQuestion)
      useCreatorBridgeStore.getState().setPendingQuiz(mockSecondQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.questions).toHaveLength(1)
    })
  })

  describe('questions array integrity', () => {
    it('stores multiple questions with unique ids', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuizMultiQuestion)
      const questions = useCreatorBridgeStore.getState().pendingQuiz?.questions ?? []
      const ids = questions.map((q) => q.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('preserves bloomLevel on each question', () => {
      useCreatorBridgeStore.getState().setPendingQuiz(mockPendingQuizMultiQuestion)
      const questions = useCreatorBridgeStore.getState().pendingQuiz?.questions ?? []
      expect(questions[0].bloomLevel).toBe('C1')
      expect(questions[1].bloomLevel).toBe('C2')
    })

    it('accepts empty questions array', () => {
      const emptyQuiz: PendingQuizData = { ...mockPendingQuiz, questions: [], questionCount: 0 }
      useCreatorBridgeStore.getState().setPendingQuiz(emptyQuiz)
      expect(useCreatorBridgeStore.getState().pendingQuiz?.questions).toHaveLength(0)
    })
  })

  describe('pendingArtifact', () => {
    it('stores builder artifact bridge payload', () => {
      useCreatorBridgeStore.getState().setPendingArtifact(mockPendingArtifact)

      expect(useCreatorBridgeStore.getState().pendingArtifact).toEqual(mockPendingArtifact)
    })

    it('clears pendingArtifact safely', () => {
      useCreatorBridgeStore.getState().setPendingArtifact(mockPendingArtifact)
      useCreatorBridgeStore.getState().clearPendingArtifact()

      expect(useCreatorBridgeStore.getState().pendingArtifact).toBeNull()
    })
  })
})
