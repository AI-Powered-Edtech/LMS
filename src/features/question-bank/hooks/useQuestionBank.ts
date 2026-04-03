import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'

import { questionBankService } from '../api/questionBankService'
import { questionBankKeys } from '../queries/questionBankQueries'

/**
 * Hook untuk mengambil daftar Bank Soal.
 * FIXED: Tambahkan tenantId ke queryKey agar cache terisolasi per tenant.
 */
export function useQuestionBankData() {
  const { tenantId } = useAuth()

  return useQuery({
    // FIXED: Include tenantId in query key to prevent cross-tenant cache contamination
    queryKey: questionBankKeys.list(tenantId ?? ''),
    queryFn: () => questionBankService.searchQuestions({}),
    enabled: !!tenantId,
  })
}

/**
 * Hook untuk membuat/mengupdate Bank Soal.
 * FIXED: invalidateQueries menggunakan tenantId agar hanya cache tenant ini yang di-refresh.
 */
export function useQuestionBankMutation() {
  const qc = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: questionBankService.createQuestion.bind(questionBankService),
    onSuccess: () =>
      // FIXED: Invalidate dengan tenantId-scoped key
      qc.invalidateQueries({ queryKey: questionBankKeys.all(tenantId ?? '') }),
  })
}
