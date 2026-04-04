import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'

import { ContentTemplate, templateService } from '../api/templateService'
import { courseKeys } from './courseKeys'

export function useTemplates(type: 'course' | 'module' | 'lesson') {
  const { tenantId } = useAuth()
  return useQuery<ContentTemplate[]>({
    queryKey: ['content-templates', type, tenantId],
    queryFn: () => templateService.fetchTemplates(type, tenantId!),
    enabled: !!type && !!tenantId,
  })
}

export function useSaveTemplate() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

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
      queryClient.invalidateQueries({ queryKey: ['content-templates', type, tenantId] })
    },
  })
}

export function useImportTemplate() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: ({
      templateId,
      targetId,
      order,
      courseId: _courseId,
    }: {
      templateId: string
      targetId: string
      order?: number
      /** Optional courseId to narrow cache invalidation to the specific course */
      courseId?: string
    }) => templateService.importTemplate(templateId, targetId, order),
    onSuccess: (_, { courseId }) => {
      if (tenantId && courseId) {
        // Narrow invalidation: only the specific course's builder cache
        queryClient.invalidateQueries({ queryKey: courseKeys.builder(tenantId, courseId) })
        queryClient.invalidateQueries({ queryKey: courseKeys.detail(tenantId, courseId) })
      } else if (tenantId) {
        // Broader fallback if courseId not provided
        queryClient.invalidateQueries({ queryKey: courseKeys.lists(tenantId) })
      } else {
        // Ultimate fallback
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        queryClient.invalidateQueries({ queryKey: ['course-modules'] })
        queryClient.invalidateQueries({ queryKey: ['lessons'] })
      }
    },
  })
}
