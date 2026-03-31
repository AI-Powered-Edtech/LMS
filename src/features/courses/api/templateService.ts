import { supabase } from '@/services/supabase/client'
import { logDevError } from '@/utils/logDevError'

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
  async fetchTemplates(type: 'course' | 'module' | 'lesson', tenantId: string) {
    const { data, error } = await supabase
      .from('content_templates')
      .select('id, type, title, description, content, created_at, created_by, tenant_id')
      .eq('type', type)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50)

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
    const { data, error } = await supabase.rpc('save_content_template', {
      p_type: type,
      p_title: title,
      p_description: description,
      p_source_id: sourceId,
    })

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
    const { data, error } = await supabase.rpc('import_content_template', {
      p_template_id: templateId,
      p_target_id: targetId,
      p_order: order,
    })

    if (error) {
      logDevError('templateService', 'Error importing template:', error)
      throw error
    }

    return data
  },
}
