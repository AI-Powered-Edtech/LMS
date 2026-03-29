import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { captureError } from '@/src/utils/sentry'

import { ContentTemplate, templateService } from '../api/templateService'

export function useTemplates(type: 'course' | 'module' | 'lesson') {
  return useQuery<ContentTemplate[]>({
    queryKey: ['content-templates', type],
    queryFn: () => templateService.fetchTemplates(type),
    enabled: !!type,
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
    onError: (err) => {
      captureError(err, { context: 'useSaveTemplate' })
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
    onError: (err) => {
      captureError(err, { context: 'useImportTemplate' })
    },
  })
}
