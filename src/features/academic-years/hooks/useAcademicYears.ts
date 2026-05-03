import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { type AcademicYear,academicYearService } from '@/features/academic-years/api/academicYearService'
import { createQueryKeys } from '@/lib/queryKeys'

const academicYearKeys = createQueryKeys('academic_years')

export function useAcademicYears() {
  const { tenantId } = useAuth()
  return useQuery<AcademicYear[]>({
    queryKey: [...academicYearKeys.all(tenantId!), 'list'],
    queryFn: () => academicYearService.list(tenantId!),
    enabled: !!tenantId,
  })
}

export function useActiveAcademicYear() {
  const { tenantId } = useAuth()
  return useQuery<AcademicYear | null>({
    queryKey: [...academicYearKeys.all(tenantId!), 'active'],
    queryFn: () => academicYearService.getActive(tenantId!),
    enabled: !!tenantId,
  })
}

export function useCreateAcademicYear() {
  const { tenantId, user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { label: string; startsOn: string; endsOn: string }) =>
      academicYearService.create({
        tenantId: tenantId!,
        label: input.label,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        createdBy: user?.id ?? null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: academicYearKeys.all(tenantId!) })
    },
  })
}

export function useSetActiveAcademicYear() {
  const { tenantId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (yearId: string) => academicYearService.setActive(tenantId!, yearId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: academicYearKeys.all(tenantId!) })
    },
  })
}

export function useArchiveAcademicYear() {
  const { tenantId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (yearId: string) => academicYearService.archive(yearId, tenantId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: academicYearKeys.all(tenantId!) })
    },
  })
}
