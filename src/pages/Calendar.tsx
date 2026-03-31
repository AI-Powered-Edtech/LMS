import { Grid, List, Plus } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { AddEventModal } from '@/features/calendar/components/AddEventModal'
import { AgendaView } from '@/features/calendar/components/AgendaView'
import { CalendarSidebar } from '@/features/calendar/components/CalendarSidebar'
import { CalendarSkeleton } from '@/features/calendar/components/CalendarSkeleton'
import { MonthView } from '@/features/calendar/components/MonthView'
import {
  type CalendarEvent,
  useCalendarEvents,
  useUpdateCalendarEvent,
} from '@/features/calendar/hooks/useCalendarQueries'
import { useCalendarStore } from '@/features/calendar/hooks/useCalendarQueries'
import { useSendNotification } from '@/features/notifications'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/utils/cn'

export function Calendar() {
  usePageTitle('Kalender')
  const { user } = useAuth()
  const sendNotification = useSendNotification()
  const { events, addEvent } = useCalendarStore()
  const { data: fetchedEvents, isLoading } = useCalendarEvents()
  const { updateEvent: updateEventMutate } = useUpdateCalendarEvent()

  const displayEvents = fetchedEvents || events
  const today = new Date()

  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)
  const [view, setView] = useState<'month' | 'agenda'>('month')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const prevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const goToToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))

  const toggleCompletion = (id: string) => {
    const event = displayEvents.find((e) => e.id === id)
    if (event) {
      updateEventMutate(id, { completed: !event.completed })
    }
  }

  const handleAddEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    addEvent(eventData)
    if (eventData.type === 'exam') {
      sendNotification.mutate({
        userId: user!.id,
        type: 'exam',
        title: 'Ujian Baru Dijadwalkan',
        message: `${eventData.title} dijadwalkan pada ${eventData.date.toLocaleDateString('id-ID')} pukul ${eventData.time}`,
      })
    }
  }

  if (isLoading) {
    return <CalendarSkeleton />
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
              onClick={() => setView('month')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all',
                view === 'month'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <Grid className="w-4 h-4" />
              Bulan
            </button>
            <button
              onClick={() => setView('agenda')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all',
                view === 'agenda'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
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
          {view === 'month' ? (
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
            <AgendaView events={events} today={today} onToggleCompletion={toggleCompletion} />
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
  )
}
