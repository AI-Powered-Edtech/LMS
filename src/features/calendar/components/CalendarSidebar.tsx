import {
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Paperclip,
  Plus,
  Video,
} from "lucide-react";
import { motion } from "motion/react";

import type { CalendarEvent } from "@/features/calendar/hooks/useCalendarQueries";
import {
  getCountdown,
  getEventColor,
} from "@/features/calendar/utils/calendarUtils";
import { cn } from "@/utils/cn";
import { translateEventType } from "@/utils/statusTranslations";

interface CalendarSidebarProps {
  selectedDate: Date | null;
  events: CalendarEvent[];
  today: Date;
  onAddEvent: () => void;
  onToggleCompletion: (id: string) => void;
}

export function CalendarSidebar({
  selectedDate,
  events,
  today,
  onAddEvent,
  onToggleCompletion,
}: CalendarSidebarProps) {
  const selectedEvents = selectedDate
    ? events.filter(
        (e) =>
          e.date.getDate() === selectedDate.getDate() &&
          e.date.getMonth() === selectedDate.getMonth() &&
          e.date.getFullYear() === selectedDate.getFullYear(),
      )
    : [];

  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-[600px] sticky top-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-500" />
          {selectedDate
            ? selectedDate.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
            : "Pilih Tanggal"}
        </h3>
        {selectedDate && (
          <button
            onClick={onAddEvent}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-600 dark:text-slate-400"
            title="Tambah acara di tanggal ini"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {selectedEvents.length > 0 ? (
          selectedEvents.map((event, index) => {
            const countdown = getCountdown(event.date, today);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm transition-all",
                  event.completed
                    ? "border-slate-100 dark:border-slate-700 opacity-75"
                    : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md",
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        getEventColor(event.type).split(" ")[0],
                        "text-white",
                      )}
                    >
                      {translateEventType(event.type)}
                    </span>
                    {countdown && !event.completed && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        {countdown}
                      </span>
                    )}
                  </div>
                  {(event.type === "assignment" || event.type === "exam") && (
                    <button
                      onClick={() => onToggleCompletion(event.id)}
                      className="shrink-0"
                      aria-label={
                        event.completed
                          ? "Tandai sebagai belum selesai"
                          : "Tandai sebagai selesai"
                      }
                    >
                      {event.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  )}
                </div>

                <h4
                  className={cn(
                    "font-bold text-slate-900 dark:text-slate-100 leading-tight mb-3",
                    event.completed &&
                      "line-through text-slate-500 dark:text-slate-400",
                  )}
                >
                  {event.title}
                </h4>

                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span className="font-medium">
                      {event.time} {event.endTime ? `- ${event.endTime}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.location.includes("Zoom") ? (
                      <Video className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                    <span className="font-medium">{event.location}</span>
                  </div>
                </div>

                {event.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                    {event.description}
                  </p>
                )}

                {event.hasAttachment && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-3 py-2 rounded-lg transition-colors w-full justify-center">
                      <Paperclip className="w-4 h-4" />
                      Lihat Lampiran
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300">
                Kosong
              </p>
              <p className="text-sm mt-1">Tidak ada jadwal pada tanggal ini.</p>
            </div>
            <button
              onClick={onAddEvent}
              className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition-colors"
            >
              Tambah Acara
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
