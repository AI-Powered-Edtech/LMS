import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { calendarService, CalendarEvent } from '../services/calendarService';

export type { CalendarEvent } from '../services/calendarService';

interface CalendarContextType {
  events: CalendarEvent[];
  loading: boolean;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  refreshEvents: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user) { setEvents([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await calendarService.fetchEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    setEvents(prev => [...prev, { ...event, id: crypto.randomUUID() }]);
  }, []);

  const updateEvent = useCallback((id: string, updatedEvent: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updatedEvent } : e));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <CalendarContext.Provider value={{ events, loading, addEvent, updateEvent, deleteEvent, refreshEvents: fetchEvents }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) throw new Error('useCalendar must be used within a CalendarProvider');
  return context;
}
