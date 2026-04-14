import { db } from '@/services/db'
import { logger } from '@/utils/logger'

// FIXED: Persist user-created calendar events to DB (calendar_events table)

export interface PersistedCalendarEvent {
  id: string
  tenant_id: string
  created_by: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  event_type: 'personal' | 'school' | 'reminder' | 'other'
  color: string | null
  created_at: string
  updated_at: string
}

export interface CreateCalendarEventPayload {
  title: string
  description?: string
  start_date: string
  end_date?: string
  event_type?: 'personal' | 'school' | 'reminder' | 'other'
  color?: string
}

export const calendarEventService = {
  /**
   * Persist a user-created calendar event to the database.
   * Returns the created event with its server-generated ID.
   */
  async createCalendarEvent(
    payload: CreateCalendarEventPayload,
    tenantId: string,
    userId: string
  ): Promise<PersistedCalendarEvent> {
    const { data, error } = await db
      .from('calendar_events')
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        title: payload.title,
        description: payload.description ?? null,
        start_date: payload.start_date,
        end_date: payload.end_date ?? null,
        event_type: payload.event_type ?? 'personal',
        color: payload.color ?? null,
      })
      .select('*')
      .single()

    if (error) throw new Error(`Gagal menyimpan acara kalender: ${error.message}`)
    return data as PersistedCalendarEvent
  },

  /**
   * Fetch user-created calendar events within a date range.
   */
  async fetchUserCalendarEvents(
    tenantId: string,
    dateRange: { from: string; to: string }
  ): Promise<PersistedCalendarEvent[]> {
    const { data, error } = await db
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('start_date', dateRange.from)
      .lte('start_date', dateRange.to)
      .order('start_date', { ascending: true })

    if (error) {
      if (import.meta.env.DEV)
        logger.error('[calendarEventService] fetchUserCalendarEvents:', error)
      return []
    }

    return (data ?? []) as PersistedCalendarEvent[]
  },

  /**
   * Delete a user-created calendar event.
   */
  async deleteCalendarEvent(id: string): Promise<void> {
    const { error } = await db.from('calendar_events').delete().eq('id', id)
    if (error) throw new Error(`Gagal menghapus acara kalender: ${error.message}`)
  },
}
