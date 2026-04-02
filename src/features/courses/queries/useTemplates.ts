import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/src/contexts/AuthContext'

import { ContentTemplate, templateService } from '../api/templateService'

export function useTemplates(type: 'course' | 'module' | 'lesson') {
  const { tenantId } = useAuth()
  return useQuery<ContentTemplate[]>({
    queryKey: ['content-templates', type],
    queryFn: () => templateService.fetchTemplates(type, tenantId!),
    enabled: !!type && !!tenantId,
  })
}

export function useSaveTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      type,
      title,
      description,
      sourceId,
    }: {
      type: 'course' | 'module' | 'lesson'
      title: string
      description: string
      sourceId: string
    }) => templateService.saveTemplate(type, title, description, sourceId),
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['content-templates', type] })
    },
  })
}

export function useImportTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      targetId,
      order,
    }: {
      templateId: string
      targetId: string
      order?: number
    }) => templateService.importTemplate(templateId, targetId, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['course-modules'] })
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
    },
  })
}
