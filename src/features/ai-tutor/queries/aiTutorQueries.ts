import { askTutor } from '../api/aiTutorService'

export const aiTutorKeys = {
  session: (lessonId: string) => ['ai-tutor', 'session', lessonId] as const,
}

// AI Tutor operates as a mutation (one-shot Q&A), not a query.
// Use useAITutorMutation() from hooks/useAITutor.ts for interaction.
export { askTutor }
