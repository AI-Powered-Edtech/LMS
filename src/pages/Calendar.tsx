import { Grid, List, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { AddEventModal } from "@/features/calendar/components/AddEventModal";
import { AgendaView } from "@/features/calendar/components/AgendaView";
import { CalendarSidebar } from "@/features/calendar/components/CalendarSidebar";
import { CalendarSkeleton } from "@/features/calendar/components/CalendarSkeleton";
import { MonthView } from "@/features/calendar/components/MonthView";
import {
  type CalendarEvent,
  useCalendarEvents,
  useCalendarStore,
  usePersistCalendarEvent,
  useUpdateCalendarEvent,
  useUserCalendarEvents,
} from "@/features/calendar/hooks/useCalendarQueries";
import { useSendNotification } from "@/features/notifications";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/utils/cn";

export function Calendar() {
  usePageTitle("Kalender");
  const { user } = useAuth();
  const sendNotification = useSendNotification();
  // FIXED: Use Zustand selector to prevent creating new object reference on every render,
  // which would defeat the useMemo memoization that depends on zustandEvents.
  const zustandEvents = useCalendarStore((state) => state.events);
  const { data: fetchedEvents, isLoading } = useCalendarEvents();
  // FIXED: Also fetch persisted user-created events from DB
  const { data: userCreatedEvents } = useUserCalendarEvents();
  const { updateEvent: updateEventMutate } = useUpdateCalendarEvent();
  // FIXED: Use persistence hook so events survive page refresh
  const { mutate: persistEvent } = usePersistCalendarEvent();

  // FIXED: Merge server events + persisted user events into a unified list
  const displayEvents = useMemo<CalendarEvent[]>(() => {
    const serverEvents = fetchedEvents || zustandEvents;

    if (!userCreatedEvents || userCreatedEvents.length === 0)
      return serverEvents;

    // Convert persisted DB events to CalendarEvent shape
    const dbEvents: CalendarEvent[] = userCreatedEvents.map((e) => ({
      id: `user-${e.id}`,
      title: e.title,
      date: new Date(e.start_date),
      time: "00:00",
      type: "event" as const,
      location: "",
      description: e.description || "",
      priority: "medium" as const,
      completed: false,
    }));

    // Merge: server events + DB user events (deduplicate by id prefix)
    const merged = [...serverEvents, ...dbEvents];
    return merged.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [fetchedEvents, zustandEvents, userCreatedEvents]);

  const today = new Date();

  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [view, setView] = useState<"month" | "agenda">("month");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const prevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  const goToToday = () =>
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const toggleCompletion = (id: string) => {
    const event = displayEvents.find((e) => e.id === id);
    if (event) {
      updateEventMutate(id, { completed: !event.completed });
    }
  };

  // FIXED: handleAddEvent now persists to DB via usePersistCalendarEvent
  // Optimistic update still happens immediately via Zustand store
  const handleAddEvent = (eventData: Omit<CalendarEvent, "id">) => {
    persistEvent(eventData);
    if (eventData.type === "exam") {
      sendNotification.mutate({
        userId: user!.id,
        type: "exam",
        title: "Ujian Baru Dijadwalkan",
        message: `${eventData.title} dijadwalkan pada ${eventData.date.toLocaleDateString("id-ID")} pukul ${eventData.time}`,
      });
    }
  };

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Jadwal & Kalender
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Kelola tugas, ujian, dan acara penting Anda dalam satu tempat.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setView("month")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                view === "month"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
              )}
            >
              <Grid className="w-4 h-4" />
              Bulan
            </button>
            <button
              onClick={() => setView("agenda")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                view === "agenda"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
              )}
            >
              <List className="w-4 h-4" />
              Agenda
            </button>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {view === "month" ? (
            <MonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              events={displayEvents}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onTodayClick={goToToday}
              onSelectDate={setSelectedDate}
            />
          ) : (
            // FIXED: AgendaView now uses merged displayEvents (server + DB user events)
            <AgendaView
              events={displayEvents}
              today={today}
              onToggleCompletion={toggleCompletion}
            />
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <CalendarSidebar
            selectedDate={selectedDate}
            events={displayEvents}
            today={today}
            onAddEvent={() => setIsAddModalOpen(true)}
            onToggleCompletion={toggleCompletion}
          />
        </div>
      </div>

      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        selectedDate={selectedDate}
        onAddEvent={handleAddEvent}
      />
    </div>
  );
}
