import { useMutation, type UseMutationOptions } from '@tanstack/react-query'

import { useToast } from '@/hooks/useToast'

export interface UseFormSubmitOptions<TData, TResult> {
  mutationFn: (data: TData) => Promise<TResult>
  successMessage?: string
  errorMessage?: string
  onSuccess?: (result: TResult) => void
  onError?: (error: Error) => void
  options?: Omit<UseMutationOptions<TResult, Error, TData>, 'mutationFn'>
}

export function useFormSubmit<TData, TResult>({
  mutationFn,
  successMessage = 'Berhasil disimpan',
  errorMessage,
  onSuccess,
  onError,
  options,
}: UseFormSubmitOptions<TData, TResult>) {
  const { addToast } = useToast()

  const { mutate, isPending, error, reset } = useMutation<TResult, Error, TData>({
    mutationFn,
    onSuccess: (result) => {
      addToast({ type: 'success', message: successMessage })
      onSuccess?.(result)
    },
    onError: (err: Error) => {
      const msg = errorMessage || err.message || 'Gagal menyimpan. Silakan coba lagi.'
      addToast({ type: 'error', message: msg })
      onError?.(err)
    },
    ...options,
  })

  return {
    submit: mutate,
    isSubmitting: isPending,
    error,
    reset,
  }
}
