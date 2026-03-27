import { useQuery } from '@tanstack/react-query'
import { questionBankService } from '../api/questionBankService'

export const questionBankKeys = {
  all: (tenantId: string) => ['question-bank', tenantId] as const,
  detail: (tenantId: string, id: string) => ['question-bank', tenantId, id] as const,
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['question-bank', 'list', tenantId, filters] as const,
}

/**
 * Query hook untuk daftar Bank Soal.
 */
export function useQuestionBankList() {
  return useQuery({
    queryKey: ['question-bank'],
    queryFn: () => questionBankService.searchQuestions({}),
    enabled: true,
  })
}
