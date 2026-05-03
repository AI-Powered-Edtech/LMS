import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { type Rombel,rombelService } from '@/features/rombel/api/rombelService'
import { createQueryKeys } from '@/lib/queryKeys'

const rombelKeys = createQueryKeys('rombel')

export function useRombelList(academicYearId?: string | null) {
  const { tenantId } = useAuth()
  return useQuery<Rombel[]>({
    queryKey: [...rombelKeys.all(tenantId!), 'list', academicYearId ?? null],
    queryFn: () => rombelService.list(tenantId!, academicYearId),
    enabled: !!tenantId,
  })
}

export function useRombelMembers(rombelId: string | null) {
  return useQuery({
    queryKey: ['rombel_members', rombelId],
    queryFn: () => (rombelId ? rombelService.listMembers(rombelId) : Promise.resolve([])),
    enabled: !!rombelId,
  })
}

export function useCreateRombel() {
  const { tenantId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      academicYearId: string | null
      gradeLevelId: string | null
      code: string
      name: string
      waliKelasId: string | null
      capacity: number
    }) => rombelService.create({ tenantId: tenantId!, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: rombelKeys.all(tenantId!) }),
  })
}

export function useUpdateRombel() {
  const { tenantId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof rombelService.update>[2] }) =>
      rombelService.update(id, tenantId!, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: rombelKeys.all(tenantId!) }),
  })
}

export function useEnrollRombelMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rombelId, studentId }: { rombelId: string; studentId: string }) =>
      rombelService.enrollMember(rombelId, studentId),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['rombel_members', vars.rombelId] }),
  })
}

export function useRemoveRombelMember() {
  const { tenantId } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId }: { memberId: string; rombelId: string }) =>
      rombelService.removeMember(memberId, tenantId!),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['rombel_members', vars.rombelId] }),
  })
}
