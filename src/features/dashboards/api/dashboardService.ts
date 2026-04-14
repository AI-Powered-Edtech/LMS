import { apiFetch } from '@/src/lib/api'

import type { DashboardConfig, LayoutItem, WidgetConfig } from '../types'

export const dashboardService = {
  async saveDashboard(params: {
    name: string
    layout: LayoutItem[]
    widgets: WidgetConfig[]
    isShared?: boolean
    description?: string
    dashboardId?: string
  }): Promise<DashboardConfig> {
    const { data, error } = await apiFetch('/rpc/save_dashboard', { method: 'POST', body: JSON.stringify({
          p_name: params.name,
          p_layout: params.layout as unknown as Record<string, unknown>[],
          p_widgets: params.widgets as unknown as Record<string, unknown>[],
          p_is_shared: params.isShared ?? false,
          p_description: params.description ?? null,
          p_dashboard_id: params.dashboardId ?? null,
        }) })
    if (error) throw error
    return data as DashboardConfig
  },

  async getDashboards(includeShared = true): Promise<DashboardConfig[]> {
    const { data, error } = await apiFetch('/rpc/get_dashboards', { method: 'POST', body: JSON.stringify({
          p_include_shared: includeShared,
        }) })
    if (error) throw error
    return (data as DashboardConfig[]) ?? []
  },

  async getDashboard(dashboardId: string): Promise<DashboardConfig | null> {
    const { data, error } = await apiFetch('/rpc/get_dashboard', { method: 'POST', body: JSON.stringify({ p_dashboard_id: dashboardId }) })
    if (error) throw error
    return (data as DashboardConfig) ?? null
  },

  async deleteDashboard(dashboardId: string): Promise<void> {
    const { error } = await apiFetch('/rpc/delete_dashboard', { method: 'POST', body: JSON.stringify({ p_dashboard_id: dashboardId }) })
    if (error) throw error
  },
}
