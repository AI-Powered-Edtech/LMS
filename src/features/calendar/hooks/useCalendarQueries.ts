import { create } from 'zustand'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/src/contexts/AuthContext'
import { createQueryKeys } from '@/src/lib/queryKeys'
import { calendarService, CalendarEvent } from '@/src/features/calendar/api/calendarService'
import { STALE } from '@/src/utils/queryConstants'

// Zustand store for calendar events (client-side state since no server persistence)
interface CalendarState {
  events: CalendarEvent[]
  loading: boolean
  setEvents: (events: CalendarEvent[]) => void
  setLoading: (loading: boolean) => void
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  loading: false,
  setEvents: (events) => set({ events }),
  setLoading: (loading) => set({ loading }),
  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, { ...event, id: crypto.randomUUID() }],
    })),
  updateEvent: (id, updatedEvent) =>
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, ...updatedEvent } : e)),
    })),
  deleteEvent: (id) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    })),
}))

const base = createQueryKeys('calendar')
const calendarKeys = {
  ...base,
  events: (tenantId: string) => [...base.all(tenantId), 'events'] as const,
}

/**
 * Hook for fetching calendar events.
 * Uses React Query for fetching from server.
 */
export function useCalendarEvents() {
  const { tenantId } = useAuth()
  const setEvents = useCalendarStore((state) => state.setEvents)

  return useQuery({
    queryKey: calendarKeys.events(tenantId!),
    queryFn: async () => {
      const data = await calendarService.fetchEvents()
      setEvents(data)
      return data
    },
    enabled: !!tenantId,
    staleTime: STALE.DYNAMIC,
  })
}

/**
 * Hook for adding a calendar event.
 * Updates local state only (no server persistence).
 */
export function useAddCalendarEvent() {
  const addEvent = useCalendarStore((state) => state.addEvent)

  return {
    mutate: addEvent,
    addEvent,
  }
}

/**
 * Hook for updating a calendar event.
 * Updates local state only (no server persistence).
 */
export function useUpdateCalendarEvent() {
  const updateEvent = useCalendarStore((state) => state.updateEvent)

  return {
    mutate: updateEvent,
    updateEvent,
  }
}

// Re-export CalendarEvent type for consumers
export type { CalendarEvent }
