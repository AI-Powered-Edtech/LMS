import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { questionBankService } from '../api/questionBankService'

/**
 * Hook untuk mengambil daftar Bank Soal.
 */
export function useQuestionBankData() {
  return useQuery({
    queryKey: ['question-bank'],
    queryFn: () => questionBankService.searchQuestions({}),
    enabled: true,
  })
}

/**
 * Hook untuk membuat/mengupdate Bank Soal.
 */
export function useQuestionBankMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: questionBankService.createQuestion.bind(questionBankService),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['question-bank'] }),
  })
}
