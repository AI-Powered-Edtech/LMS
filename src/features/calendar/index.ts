// API/Service
export { calendarEventService } from './api/calendarEventService'
export { calendarService } from './api/calendarService'

// Hooks
export {
  useAddCalendarEvent,
  useCalendarEvents,
  useCalendarStore,
  usePersistCalendarEvent,
  useUpdateCalendarEvent,
  useUserCalendarEvents,
} from './hooks/useCalendarQueries'

// Types
export type { CreateCalendarEventPayload, PersistedCalendarEvent } from './api/calendarEventService'
export type { CalendarEvent } from './api/calendarService'
