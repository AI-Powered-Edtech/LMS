import { supabase } from '@/src/lib/supabase';

export interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    time: string;
    type: 'exam' | 'assignment' | 'event' | 'quiz';
    location: string;
    description: string;
    completed?: boolean;
    priority?: 'low' | 'medium' | 'high';
    hasAttachment?: boolean;
    endDate?: Date;
    endTime?: string;
    duration?: number;
}

export const calendarService = {
    /**
     * Fetch and aggregate calendar events from multiple sources:
     * assignments, class schedules, and quizzes.
     */
    async fetchEvents(): Promise<CalendarEvent[]> {
        const events: CalendarEvent[] = [];

        // 1. Assignment due dates
        const { data: assignments } = await supabase
            .from('assignments')
            .select('id, title, due_date, description')
            .not('due_date', 'is', null)
            .order('due_date');

        if (assignments) {
            assignments.forEach(a => {
                const dueDate = new Date(a.due_date!);
                events.push({
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

        // 2. Class schedules (recurring)
        const { data: schedules } = await supabase
            .from('class_schedules')
            .select('id, day, start_time, end_time, classes(name)');

        if (schedules) {
            const dayMap: Record<string, number> = {
                'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0,
                'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 0,
            };

            schedules.forEach(s => {
                const targetDay = dayMap[s.day] ?? 1;
                const now = new Date();
                const diff = (targetDay - now.getDay() + 7) % 7;
                const nextDate = new Date(now.getTime() + diff * 86400000);

                events.push({
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

        // 3. Quizzes
        const { data: quizzes } = await supabase
            .from('quizzes')
            .select('id, title, created_at');

        if (quizzes) {
            quizzes.forEach(q => {
                events.push({
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

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    },
};
