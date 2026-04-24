import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear } from '../api/academicYearService'
import type { AcademicYearFormData } from '../types'

export function useAcademicYears() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['academic_years', tenantId],
    queryFn: () => {
      if (!tenantId) throw new Error('No tenant ID')
      return fetchAcademicYears(tenantId)
    },
    enabled: !!tenantId,
  })

  const createMutation = useMutation({
    mutationFn: (data: AcademicYearFormData) => {
      if (!tenantId) throw new Error('No tenant ID')
      return createAcademicYear(data, tenantId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic_years', tenantId] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AcademicYearFormData> }) => {
      if (!tenantId) throw new Error('No tenant ID')
      return updateAcademicYear(id, updates, tenantId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic_years', tenantId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!tenantId) throw new Error('No tenant ID')
      return deleteAcademicYear(id, tenantId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic_years', tenantId] }),
  })

  return { query, createMutation, updateMutation, deleteMutation }
}
