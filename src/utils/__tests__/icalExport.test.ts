import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CalendarEvent } from '@/features/calendar/api/calendarService'

import { downloadICal, generateICal } from '../icalExport'

describe('icalExport', () => {
  const baseDate = new Date('2024-05-15T10:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(baseDate)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('generateICal', () => {
    it('menghasilkan iCalendar string valid untuk event lengkap', () => {
      const events: CalendarEvent[] = [
        {
          id: '1',
          title: 'Ujian Matematika',
          description: 'Ujian akhir semester ganjil',
          location: 'Ruang 101',
          type: 'exam',
          date: baseDate,
          time: '10:00',
          endDate: new Date('2024-05-15T12:00:00Z'),
          endTime: '12:00',
        },
      ]

      const result = generateICal(events)

      expect(result).toContain('BEGIN:VCALENDAR')
      expect(result).toContain('VERSION:2.0')
      expect(result).toContain('PRODID:-//EduSync LMS//ID')
      expect(result).toContain('X-WR-CALNAME:EduSync')
      expect(result).toContain('CALSCALE:GREGORIAN')
      expect(result).toContain('METHOD:PUBLISH')

      expect(result).toContain('BEGIN:VEVENT')
      expect(result).toContain('UID:edusync-1@edusync.dev')
      expect(result).toContain('DTSTAMP:20240515T100000Z')
      expect(result).toContain('DTSTART:20240515T100000Z')
      expect(result).toContain('DTEND:20240515T120000Z')
      expect(result).toContain('SUMMARY:Ujian Matematika')
      expect(result).toContain('DESCRIPTION:Ujian akhir semester ganjil')
      expect(result).toContain('LOCATION:Ruang 101')
      expect(result).toContain('CATEGORIES:EXAM')
      expect(result).toContain('END:VEVENT')

      expect(result).toContain('END:VCALENDAR')
    })

    it('menangani event dengan custom calendarName', () => {
      const events: CalendarEvent[] = []
      const result = generateICal(events, 'Kalender Sekolah')
      expect(result).toContain('X-WR-CALNAME:Kalender Sekolah')
    })

    it('menggunakan fallback duration saat endDate tidak ada', () => {
      const events: CalendarEvent[] = [
        {
          id: '2',
          title: 'Rapat Guru',
          description: '',
          location: '',
          type: 'event',
          date: baseDate,
          time: '08:00',
          duration: 90, // 90 minutes
        },
      ]

      const result = generateICal(events)
      expect(result).toContain('DTSTART:20240515T080000Z')
      // 08:00 + 90 mins = 09:30
      expect(result).toContain('DTEND:20240515T093000Z')
    })

    it('menggunakan default 60 menit saat endDate dan duration tidak ada', () => {
      const events: CalendarEvent[] = [
        {
          id: '3',
          title: 'Tugas Harian',
          description: '',
          location: '',
          type: 'assignment',
          date: baseDate,
          time: '14:00',
        },
      ]

      const result = generateICal(events)
      expect(result).toContain('DTSTART:20240515T140000Z')
      // 14:00 + 60 mins = 15:00
      expect(result).toContain('DTEND:20240515T150000Z')
    })

    it('menangani event tanpa time (menggunakan 00:00)', () => {
      const events: CalendarEvent[] = [
        {
          id: '4',
          title: 'Libur Nasional',
          description: '',
          location: '',
          type: 'event',
          date: baseDate,
          time: '',
        },
      ]

      const result = generateICal(events)
      expect(result).toContain('DTSTART:20240515T100000Z')
      // 10:00 (baseDate time) + 60 mins = 11:00
      expect(result).toContain('DTEND:20240515T110000Z')
    })

    it('menggunakan fallback empty string saat description dan location tidak ada', () => {
      const events: CalendarEvent[] = [
        {
          id: '5',
          title: 'Kuis Singkat',
          description: '',
          location: '',
          type: 'quiz',
          date: baseDate,
          time: '00:00',
        },
      ]

      const result = generateICal(events)
      expect(result).toContain('DESCRIPTION:')
      expect(result).toContain('LOCATION:')
      expect(result).not.toContain('DESCRIPTION:undefined')
      expect(result).not.toContain('LOCATION:undefined')
    })

    it('melakukan escape pada karakter khusus', () => {
      const events: CalendarEvent[] = [
        {
          id: '6',
          title: 'Event: \\ "Test, 1; 2\n3\r4"',
          description: 'A \\ B, C; D\nE\r\nF',
          location: '',
          type: 'event',
          date: baseDate,
          time: '00:00',
        },
      ]

      const result = generateICal(events)
      expect(result).toContain('SUMMARY:Event: \\\\ "Test\\, 1\\; 2\\n3\\n4"')
      expect(result).toContain('DESCRIPTION:A \\\\ B\\, C\\; D\\nE\\nF')
    })
  })

  describe('downloadICal', () => {
    it('membuat file dan memicu download', () => {
      const events: CalendarEvent[] = [
        {
          id: '7',
          title: 'Download Test',
          description: '',
          location: '',
          type: 'event',
          date: baseDate,
          time: '00:00',
        },
      ]

      const createObjectURLMock = vi.fn().mockReturnValue('blob:test-url')
      const revokeObjectURLMock = vi.fn()
      global.URL.createObjectURL = createObjectURLMock
      global.URL.revokeObjectURL = revokeObjectURLMock

      const clickMock = vi.fn()
      const createElementMock = vi.spyOn(document, 'createElement').mockReturnValue({
        click: clickMock,
        href: '',
        download: '',
      } as any)

      const appendChildMock = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => null as any)
      const removeChildMock = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => null as any)

      downloadICal(events, 'test.ics')

      expect(createObjectURLMock).toHaveBeenCalled()
      expect(createElementMock).toHaveBeenCalledWith('a')
      expect(appendChildMock).toHaveBeenCalled()
      expect(clickMock).toHaveBeenCalled()
      expect(removeChildMock).toHaveBeenCalled()

      // Revoke dipanggil setelah 5 detik
      expect(revokeObjectURLMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(5000)
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test-url')
    })
  })
})
