import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";

import { useAuth } from "@/contexts/AuthContext";
import { calendarEventService } from "@/features/calendar/api/calendarEventService";
import {
  CalendarEvent,
  calendarService,
} from "@/features/calendar/api/calendarService";
import { createQueryKeys } from "@/shared/lib/queryKeys";
import { logger } from "@/utils/logger";
import { STALE } from "@/utils/queryConstants";

// Zustand store for calendar events (optimistic client-side state)
interface CalendarState {
  events: CalendarEvent[];
  loading: boolean;
  setEvents: (events: CalendarEvent[]) => void;
  setLoading: (loading: boolean) => void;
  addEvent: (event: Omit<CalendarEvent, "id">) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  loading: false,
  setEvents: (events) => set({ events }),
  setLoading: (loading) => set({ loading }),
  // FIXED: addEvent still updates Zustand for optimistic UI; DB persistence happens separately
  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, { ...event, id: crypto.randomUUID() }],
    })),
  updateEvent: (id, updatedEvent) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, ...updatedEvent } : e,
      ),
    })),
  deleteEvent: (id) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    })),
}));

const base = createQueryKeys("calendar");
const calendarKeys = {
  ...base,
  events: (tenantId: string) => [...base.all(tenantId), "events"] as const,
  userEvents: (tenantId: string) =>
    [...base.all(tenantId), "userEvents"] as const,
};

/**
 * Hook for fetching aggregated calendar events (assignments, schedules, quizzes).
 * Uses React Query for fetching from server.
 */
export function useCalendarEvents() {
  const { tenantId } = useAuth();
  const setEvents = useCalendarStore((state) => state.setEvents);

  return useQuery({
    queryKey: calendarKeys.events(tenantId!),
    queryFn: async () => {
      const data = await calendarService.fetchEvents(tenantId!);
      setEvents(data);
      return data;
    },
    enabled: !!tenantId,
    staleTime: STALE.DYNAMIC,
  });
}

/**
 * Hook for fetching user-created calendar events from the DB.
 * FIXED: Returns persisted events that survive page refresh.
 */
export function useUserCalendarEvents() {
  const { tenantId } = useAuth();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];
  const to = new Date(now.getFullYear(), now.getMonth() + 3, 0)
    .toISOString()
    .split("T")[0];

  return useQuery({
    queryKey: calendarKeys.userEvents(tenantId!),
    queryFn: () =>
      calendarEventService.fetchUserCalendarEvents(tenantId!, { from, to }),
    enabled: !!tenantId,
    staleTime: STALE.DYNAMIC,
  });
}

/**
 * Hook for persisting a new calendar event to the DB.
 * Also updates Zustand store optimistically.
 * FIXED: Events now persist to DB so they survive page refresh.
 */
export function usePersistCalendarEvent() {
  const { tenantId, user } = useAuth();
  const addEvent = useCalendarStore((state) => state.addEvent);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: Omit<CalendarEvent, "id">) => {
      // Optimistic update to Zustand store immediately
      addEvent(eventData);

      if (!tenantId || !user?.id) return;

      // FIXED: Persist to DB — event survives page refresh
      await calendarEventService.createCalendarEvent(
        {
          title: eventData.title,
          description: eventData.description || undefined,
          start_date: eventData.date.toISOString().split("T")[0],
          end_date: eventData.endDate?.toISOString().split("T")[0],
          event_type:
            eventData.type === "exam" || eventData.type === "assignment"
              ? "personal"
              : "personal",
          color: undefined,
        },
        tenantId,
        user.id,
      );
    },
    onSuccess: () => {
      if (tenantId) {
        void qc.invalidateQueries({
          queryKey: calendarKeys.userEvents(tenantId),
        });
      }
    },
    onError: (err) => {
      if (import.meta.env.DEV) logger.error("[usePersistCalendarEvent]", err);
    },
  });
}

/**
 * Hook for adding a calendar event.
 * Updates local state only (no server persistence).
 * @deprecated Use usePersistCalendarEvent for DB persistence.
 */
export function useAddCalendarEvent() {
  const addEvent = useCalendarStore((state) => state.addEvent);

  return {
    mutate: addEvent,
    addEvent,
  };
}

/**
 * Hook for updating a calendar event.
 * Updates local state only (no server persistence).
 */
export function useUpdateCalendarEvent() {
  const updateEvent = useCalendarStore((state) => state.updateEvent);

  return {
    mutate: updateEvent,
    updateEvent,
  };
}

// Re-export CalendarEvent type for consumers
export type { CalendarEvent };
