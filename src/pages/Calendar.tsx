import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin, Video, Calendar as CalendarIcon, Plus, List, Grid, CheckCircle2, Circle, AlertCircle, Paperclip, X, Bell } from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useNotifications } from "@/src/contexts/NotificationContext";
import { useCalendar, CalendarEvent } from "@/src/contexts/CalendarContext";

type EventType = "exam" | "assignment" | "event" | "quiz";
type Priority = "low" | "medium" | "high";

const daysOfWeek = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function Calendar() {
  const { role, permissions } = useAuth();
  const { addNotification } = useNotifications();
  const { events, addEvent, updateEvent } = useCalendar();

  // Default to March 2026 based on current time context
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2026, 2, 4));
  const [view, setView] = useState<"month" | "agenda">("month");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: "",
    type: "event",
    priority: "medium",
    time: "09:00",
    endTime: "10:00",
    duration: 60,
    location: "",
    description: ""
  });

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getEventsForDate = (date: number, month: number, year: number) => {
    return events.filter(
      (e) => e.date.getDate() === date && e.date.getMonth() === month && e.date.getFullYear() === year
    );
  };

  const selectedEvents = selectedDate
    ? getEventsForDate(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear())
    : [];

  const getEventColor = (type: string) => {
    switch (type) {
      case "exam": return "bg-red-500 text-red-700 border-red-200";
      case "assignment": return "bg-orange-500 text-orange-700 border-orange-200";
      case "quiz": return "bg-blue-500 text-blue-700 border-blue-200";
      case "event": return "bg-purple-500 text-purple-700 border-purple-200";
      default: return "bg-slate-500 text-slate-700 border-slate-200";
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "medium": return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "low": return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const toggleCompletion = (id: string) => {
    const event = events.find(e => e.id === id);
    if (event) {
      updateEvent(id, { completed: !event.completed });
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !selectedDate) return;

    const eventToAdd: Omit<CalendarEvent, 'id'> = {
      title: newEvent.title,
      date: selectedDate,
      time: newEvent.time || "00:00",
      endDate: newEvent.endDate || selectedDate,
      endTime: newEvent.endTime,
      duration: newEvent.duration,
      type: (newEvent.type as EventType) || "event",
      location: newEvent.location || "",
      description: newEvent.description || "",
      priority: (newEvent.priority as Priority) || "medium",
      completed: false
    };

    addEvent(eventToAdd);

    if (eventToAdd.type === 'exam') {
      addNotification({
        type: 'exam',
        title: 'Ujian Baru Dijadwalkan',
        message: `${eventToAdd.title} dijadwalkan pada ${eventToAdd.date.toLocaleDateString('id-ID')} pukul ${eventToAdd.time}`
      });
    }

    setIsAddModalOpen(false);
    setNewEvent({ title: "", type: "event", priority: "medium", time: "09:00", endTime: "10:00", duration: 60, location: "", description: "" });
  };

  // Calculate countdown for upcoming events
  const getCountdown = (eventDate: Date) => {
    const today = new Date(2026, 2, 4); // Mock today
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hari ini";
    if (diffDays === 1) return "Besok";
    if (diffDays > 1 && diffDays <= 7) return `H-${diffDays}`;
    return null;
  };

  // Sort events for agenda view
  const allUpcomingEvents = [...events]
    .filter(e => e.date.getTime() >= new Date(2026, 2, 4).getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Jadwal & Kalender
          </h1>
          <p className="text-slate-500 mt-2">
            Kelola tugas, ujian, dan acara penting Anda dalam satu tempat.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setView("month")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                view === "month" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Grid className="w-4 h-4" />
              Bulan
            </button>
            <button
              onClick={() => setView("agenda")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                view === "agenda" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
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
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">

          {view === "month" ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  {currentDate.toLocaleString("id-ID", { month: "long", year: "numeric" })}
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setCurrentDate(new Date(2026, 2, 1))} className="px-4 py-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 font-bold text-sm">
                    Hari Ini
                  </button>
                  <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="text-center font-bold text-slate-400 text-sm py-2 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {blanks.map((blank) => (
                  <div key={`blank-${blank}`} className="aspect-square p-2 border border-transparent rounded-2xl bg-slate-50/50" />
                ))}
                {days.map((day) => {
                  const dateEvents = getEventsForDate(day, currentDate.getMonth(), currentDate.getFullYear());
                  const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentDate.getMonth() && selectedDate?.getFullYear() === currentDate.getFullYear();
                  const isToday = day === 4 && currentDate.getMonth() === 2 && currentDate.getFullYear() === 2026; // Mock today

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                      className={cn(
                        "aspect-square p-2 border rounded-2xl flex flex-col items-center justify-start gap-1 transition-all relative group",
                        isSelected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-100 hover:border-blue-200 hover:bg-slate-50",
                        isToday && !isSelected && "border-blue-200 bg-blue-50/30"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mt-1",
                          isSelected ? "bg-blue-600 text-white" : "text-slate-700",
                          isToday && !isSelected && "text-blue-600 bg-blue-100"
                        )}
                      >
                        {day}
                      </span>
                      <div className="flex flex-col gap-1 mt-1 w-full px-1">
                        {dateEvents.slice(0, 2).map((e, i) => (
                          <div
                            key={i}
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded truncate w-full text-left",
                              e.completed ? "bg-slate-100 text-slate-400 line-through" : getEventColor(e.type).replace('border-', 'bg-opacity-20 ')
                            )}
                          >
                            {e.title}
                          </div>
                        ))}
                        {dateEvents.length > 2 && (
                          <div className="text-[10px] font-bold text-slate-400 text-center">
                            +{dateEvents.length - 2} lagi
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Agenda Mendatang</h2>
              <div className="space-y-4">
                {allUpcomingEvents.map((event, index) => {
                  const countdown = getCountdown(event.date);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex gap-4 p-4 rounded-2xl border transition-all",
                        event.completed ? "bg-slate-50 border-slate-100 opacity-75" : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center min-w-[60px] px-2 border-r border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase">{daysOfWeek[event.date.getDay()]}</span>
                        <span className="text-2xl font-black text-slate-800">{event.date.getDate()}</span>
                        <span className="text-xs font-bold text-slate-500">{event.date.toLocaleString('id-ID', { month: 'short' })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", getEventColor(event.type).split(' ')[0], "text-white")}>
                                {event.type}
                              </span>
                              {countdown && !event.completed && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                                  <Bell className="w-3 h-3" />
                                  {countdown}
                                </span>
                              )}
                              {getPriorityIcon(event.priority)}
                            </div>
                            <h4 className={cn("font-bold text-lg truncate", event.completed ? "text-slate-500 line-through" : "text-slate-900")}>
                              {event.title}
                            </h4>
                          </div>
                          {(event.type === 'assignment' || event.type === 'exam') && (
                            <button
                              onClick={() => toggleCompletion(event.id)}
                              className="shrink-0 p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                              {event.completed ? (
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                              ) : (
                                <Circle className="w-6 h-6 text-slate-300 hover:text-emerald-500 transition-colors" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {event.time} {event.endTime ? `- ${event.endTime}` : ''}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {event.location.includes("Zoom") ? <Video className="w-4 h-4 text-slate-400" /> : <MapPin className="w-4 h-4 text-slate-400" />}
                            <span className="truncate max-w-[150px]">{event.location}</span>
                          </div>
                          {event.hasAttachment && (
                            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              <Paperclip className="w-3 h-3" />
                              <span className="text-xs font-bold">Lampiran</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Selected Date Details */}
        <div className="lg:col-span-4 space-y-6">
          {/* Mini Calendar / Date Picker could go here, but we use this space for details */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 flex flex-col h-[600px] sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
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
                  onClick={() => setIsAddModalOpen(true)}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
                  title="Tambah acara di tanggal ini"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {selectedEvents.length > 0 ? (
                selectedEvents.map((event, index) => {
                  const countdown = getCountdown(event.date);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "bg-white p-5 rounded-2xl border shadow-sm transition-all",
                        event.completed ? "border-slate-100 opacity-75" : "border-slate-200 hover:border-blue-300 hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", getEventColor(event.type).split(' ')[0], "text-white")}>
                            {event.type}
                          </span>
                          {countdown && !event.completed && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                              <Bell className="w-3 h-3" />
                              {countdown}
                            </span>
                          )}
                        </div>
                        {(event.type === 'assignment' || event.type === 'exam') && (
                          <button onClick={() => toggleCompletion(event.id)} className="shrink-0">
                            {event.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
                          </button>
                        )}
                      </div>

                      <h4 className={cn("font-bold text-slate-900 leading-tight mb-3", event.completed && "line-through text-slate-500")}>
                        {event.title}
                      </h4>

                      <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{event.time} {event.endTime ? `- ${event.endTime}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.location.includes("Zoom") ? <Video className="w-4 h-4 text-slate-400" /> : <MapPin className="w-4 h-4 text-slate-400" />}
                          <span className="font-medium">{event.location}</span>
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-sm text-slate-500 mt-4 leading-relaxed">
                          {event.description}
                        </p>
                      )}

                      {event.hasAttachment && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <button className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors w-full justify-center">
                            <Paperclip className="w-4 h-4" />
                            Lihat Lampiran
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <CalendarIcon className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">Kosong</p>
                    <p className="text-sm mt-1">Tidak ada jadwal pada tanggal ini.</p>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-4 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-colors"
                  >
                    Tambah Acara
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Tambah Acara Baru</h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Judul Acara</label>
                  <input
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Contoh: Rapat Proyek Akhir"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Tanggal Mulai</label>
                    <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium">
                      {selectedDate?.toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Waktu Mulai</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {newEvent.type === 'exam' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Tanggal Berakhir</label>
                      <input
                        type="date"
                        value={newEvent.endDate ? newEvent.endDate.toISOString().split('T')[0] : selectedDate?.toISOString().split('T')[0]}
                        onChange={(e) => setNewEvent({ ...newEvent, endDate: new Date(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Waktu Berakhir</label>
                      <input
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-sm font-bold text-slate-700">Durasi Pengerjaan (menit)</label>
                      <input
                        type="number"
                        min="1"
                        value={newEvent.duration}
                        onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Kategori</label>
                    <select
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    >
                      <option value="event">Acara Umum</option>
                      <option value="assignment">Tugas</option>
                      <option value="exam">Ujian</option>
                      <option value="quiz">Kuis</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Prioritas</label>
                    <select
                      value={newEvent.priority}
                      onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value as Priority })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    >
                      <option value="low">Rendah</option>
                      <option value="medium">Sedang</option>
                      <option value="high">Tinggi</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Lokasi / Link</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Ruang kelas atau link Zoom"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Deskripsi (Opsional)</label>
                  <textarea
                    rows={3}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Tambahkan catatan atau instruksi..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200"
                  >
                    Simpan Acara
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
