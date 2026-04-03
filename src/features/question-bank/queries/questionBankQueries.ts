import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'

import { questionBankService } from '../api/questionBankService'

export const questionBankKeys = {
  all: (tenantId: string) => ['question-bank', tenantId] as const,
  detail: (tenantId: string, id: string) => ['question-bank', tenantId, id] as const,
  // FIXED: 'list' key already includes tenantId — consistent with all/detail
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['question-bank', tenantId, 'list', filters] as const,
}

/**
 * Query hook untuk daftar Bank Soal.
 * FIXED: Tambahkan tenantId ke queryKey agar cache tidak tercampur antar tenant.
 *        Sebelumnya queryKey ['question-bank'] tidak menyertakan tenantId sehingga
 *        data tenant A bisa tampil saat user beralih ke tenant B.
 */
export function useQuestionBankList() {
  const { tenantId } = useAuth()

  return useQuery({
    // FIXED: Include tenantId in query key for proper cache isolation per tenant
    queryKey: questionBankKeys.list(tenantId ?? ''),
    queryFn: () => questionBankService.searchQuestions({}),
    enabled: !!tenantId,
  })
}
