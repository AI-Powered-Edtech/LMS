import { useQuery } from '@tanstack/react-query'
import { calendarService } from '../api/calendarService'

export const calendarKeys = {
  all: (tenantId: string) => ['calendar', tenantId] as const,
  detail: (tenantId: string, id: string) => ['calendar', tenantId, id] as const,
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['calendar', 'list', tenantId, filters] as const,
}

/**
 * Query hook untuk daftar Kalender.
 */
export function useCalendarList() {
  return useQuery({
    queryKey: ['calendar'],
    queryFn: () => calendarService.fetchEvents(),
    enabled: true,
  })
}
