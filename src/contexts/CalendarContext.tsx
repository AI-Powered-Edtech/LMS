import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  type: "exam" | "assignment" | "event" | "quiz";
  location: string;
  description: string;
  completed?: boolean;
  priority?: "low" | "medium" | "high";
  hasAttachment?: boolean;
  endDate?: Date;
  endTime?: string;
  duration?: number;
}

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
      const calendarEvents: CalendarEvent[] = [];

      // Fetch assignment due dates
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, due_date, description')
        .not('due_date', 'is', null)
        .order('due_date');

      if (assignments) {
        assignments.forEach(a => {
          const dueDate = new Date(a.due_date!);
          calendarEvents.push({
            id: `assignment-${a.id}`,
            title: a.title,
            date: dueDate,
            time: dueDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            type: 'assignment',
            location: 'Online (EduSync)',
            description: a.description || '',
            priority: dueDate.getTime() - Date.now() < 86400000 ? 'high' : 'medium',
          });
        });
      }

      // Fetch class schedules
      const { data: schedules } = await supabase
        .from('class_schedules')
        .select('id, day, start_time, end_time, classes(name)');

      if (schedules) {
        schedules.forEach(s => {
          // Convert day name to next occurrence date
          const dayMap: Record<string, number> = {
            'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0,
            'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 0
          };
          const targetDay = dayMap[s.day] ?? 1;
          const now = new Date();
          const diff = (targetDay - now.getDay() + 7) % 7;
          const nextDate = new Date(now.getTime() + diff * 86400000);

          calendarEvents.push({
            id: `schedule-${s.id}`,
            title: (s as any).classes?.name ?? 'Class',
            date: nextDate,
            time: s.start_time,
            endTime: s.end_time,
            type: 'event',
            location: 'EduSync',
            description: `${s.day} ${s.start_time} - ${s.end_time}`,
            priority: 'low',
          });
        });
      }

      // Fetch quizzes (as calendar events)
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, created_at');

      if (quizzes) {
        quizzes.forEach(q => {
          calendarEvents.push({
            id: `quiz-${q.id}`,
            title: q.title,
            date: new Date(q.created_at),
            time: new Date(q.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            type: 'quiz',
            location: 'Online (EduSync)',
            description: '',
            priority: 'medium',
          });
        });
      }

      setEvents(calendarEvents.sort((a, b) => a.date.getTime() - b.date.getTime()));
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
