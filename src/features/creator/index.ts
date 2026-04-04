/**
 * Creator Feature — Public Barrel Export
 * AI Course & Quiz Generator
 */

// Types
export type {
  AssignmentType,
  BloomLevel,
  CreatorHistoryItem,
  GeneratedContent,
  GeneratedQuestion,
} from './types'

// Constants
export const BLOOM_LABELS: Record<string, string> = {
  C1: 'C1 – Mengingat',
  C2: 'C2 – Memahami',
  C3: 'C3 – Mengaplikasikan',
  C4: 'C4 – Menganalisis',
  C5: 'C5 – Mengevaluasi',
  C6: 'C6 – Mencipta',
}

export const BLOOM_DESCRIPTIONS: Record<string, string> = {
  C1: 'Soal menguji kemampuan mengingat fakta, istilah, atau konsep dasar.',
  C2: 'Soal menguji pemahaman makna, parafrase, dan klasifikasi.',
  C3: 'Soal menerapkan konsep ke situasi baru atau masalah nyata.',
  C4: 'Soal memecah informasi, mencari pola, dan menarik kesimpulan.',
  C5: 'Soal menilai kualitas, validitas, atau efektivitas sesuatu.',
  C6: 'Soal mengombinasikan ide untuk menghasilkan sesuatu yang baru.',
}

// Queries / Mutations
export {
  useCreatorHistory,
  useGenerateAIContent,
  useMarkContentUsed,
} from './queries/creatorQueries'

// Service (for direct use if needed)
export { creatorService } from './api/creatorService'
