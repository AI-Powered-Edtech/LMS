import { apiFetch } from '@/src/lib/api'
import { logDevError } from '@/src/utils/logDevError'

export interface ContentTemplate {
  id: string
  type: 'course' | 'module' | 'lesson'
  title: string
  description: string | null
  content: any
  created_at: string
  created_by: string
  tenant_id: string
}

export const templateService = {
  /**
   * Fetches the templates for a specific type
   */
  async fetchTemplates(type: 'course' | 'module' | 'lesson') {
    const { data, error } = await apiFetch('/content_templates')

    if (error) {
      logDevError('templateService', 'Error fetching templates:', error)
      throw error
    }

    return data as ContentTemplate[]
  },

  /**
   * Saves a new template from an existing source
   */
  async saveTemplate(
    type: 'course' | 'module' | 'lesson',
    title: string,
    description: string,
    sourceId: string
  ) {
    const { data, error } = await apiFetch('/rpc/save_content_template', { method: 'POST', body: JSON.stringify({
          p_type: type,
          p_title: title,
          p_description: description,
          p_source_id: sourceId,
        }) })

    if (error) {
      logDevError('templateService', 'Error saving template:', error)
      throw error
    }

    return data
  },

  /**
   * Imports a template to a specific target
   */
  async importTemplate(templateId: string, targetId: string, order?: number) {
    const { data, error } = await apiFetch('/rpc/import_content_template', { method: 'POST', body: JSON.stringify({
          p_template_id: templateId,
          p_target_id: targetId,
          p_order: order,
        }) })

    if (error) {
      logDevError('templateService', 'Error importing template:', error)
      throw error
    }

    return data
  },
}
