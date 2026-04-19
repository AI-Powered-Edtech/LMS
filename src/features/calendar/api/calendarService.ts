import { db } from "@/services/db";

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

export const calendarService = {
  /**
   * Fetch and aggregate calendar events from multiple sources:
   * assignments, class schedules, and quizzes.
   */
  async fetchEvents(tenantId: string): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // Fetch all 3 sources in parallel (was sequential — caused ~5s LCP)
    const [{ data: assignments }, { data: schedules }, { data: quizzes }] =
      await Promise.all([
        db
          .from<Array<{ id: string; title: string; due_date: string; description: string | null }>>("assignments")
          .select("id, title, due_date, description")
          .eq("tenant_id", tenantId)
          .not("due_date", "is", null)
          .order("due_date"),
        db
          .from<Array<{ id: string; day: string; start_time: string; end_time: string; tenant_id: string; classes: { name: string } }>>("class_schedules")
          .select("id, day, start_time, end_time, tenant_id, classes(name)")
          .eq("tenant_id", tenantId),
        db
          .from<Array<{ id: string; title: string; created_at: string }>>("quizzes")
          .select("id, title, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    if (assignments) {
      (
        assignments as Array<{
          id: string;
          title: string;
          due_date: string;
          description: string;
        }>
      ).forEach((a) => {
        const dueDate = new Date(a.due_date!);
        events.push({
          id: `assignment-${a.id}`,
          title: a.title,
          date: dueDate,
          time: dueDate.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "assignment",
          location: "Online (EduSync)",
          description: a.description || "",
          priority:
            dueDate.getTime() - Date.now() < 86400000 ? "high" : "medium",
        });
      });
    }

    if (schedules) {
      const dayMap: Record<string, number> = {
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
        Sunday: 0,
        Senin: 1,
        Selasa: 2,
        Rabu: 3,
        Kamis: 4,
        Jumat: 5,
        Sábado: 6,
        Minggu: 0,
      };
      (
        schedules as Array<{
          id: string;
          day: string;
          start_time: string;
          end_time: string;
        }>
      ).forEach((s) => {
        const targetDay = dayMap[s.day as keyof typeof dayMap] ?? 1;
        const now = new Date();
        const diff = (targetDay - now.getDay() + 7) % 7;
        const nextDate = new Date(now.getTime() + diff * 86400000);

        events.push({
          id: `schedule-${s.id}`,
          title:
            (s as unknown as { classes?: { name: string } }).classes?.name ??
            "Class",
          date: nextDate,
          time: s.start_time,
          endTime: s.end_time,
          type: "event",
          location: "EduSync",
          description: `${s.day} ${s.start_time} - ${s.end_time}`,
          priority: "low",
        });
      });
    }

    if (quizzes) {
      (
        quizzes as Array<{ id: string; title: string; created_at: string }>
      ).forEach((q) => {
        events.push({
          id: `quiz-${q.id}`,
          title: q.title,
          date: new Date(q.created_at),
          time: new Date(q.created_at).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "quiz",
          location: "Online (EduSync)",
          description: "",
          priority: "medium",
        });
      });
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  },
};
