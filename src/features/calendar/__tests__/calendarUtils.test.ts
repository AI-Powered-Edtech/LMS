import { describe, expect, it } from 'vitest'

import { getCountdown, getEventColor, getPriorityIcon } from '../utils/calendarUtils'

describe('calendarUtils', () => {
  describe('getEventColor', () => {
    it('harus mengembalikan warna merah untuk ujian', () => {
      expect(getEventColor('exam')).toBe(
        'bg-red-500 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
      )
    })

    it('harus mengembalikan warna oranye untuk tugas', () => {
      expect(getEventColor('assignment')).toBe(
        'bg-orange-500 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
      )
    })

    it('harus mengembalikan warna biru untuk kuis', () => {
      expect(getEventColor('quiz')).toBe(
        'bg-blue-500 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      )
    })

    it('harus mengembalikan warna ungu untuk acara', () => {
      expect(getEventColor('event')).toBe(
        'bg-purple-500 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      )
    })

    it('harus mengembalikan warna abu-abu sebagai default', () => {
      expect(getEventColor('unknown')).toBe(
        'bg-slate-500 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
      )
    })
  })

  describe('getPriorityIcon', () => {
    it('harus mengembalikan icon alert circle merah untuk prioritas tinggi', () => {
      const icon = getPriorityIcon('high')
      expect(icon).not.toBeNull()
      // @ts-ignore
      expect(icon?.props.className).toContain('text-red-500')
    })

    it('harus mengembalikan icon alert circle oranye untuk prioritas sedang', () => {
      const icon = getPriorityIcon('medium')
      expect(icon).not.toBeNull()
      // @ts-ignore
      expect(icon?.props.className).toContain('text-orange-500')
    })

    it('harus mengembalikan icon alert circle biru untuk prioritas rendah', () => {
      const icon = getPriorityIcon('low')
      expect(icon).not.toBeNull()
      // @ts-ignore
      expect(icon?.props.className).toContain('text-blue-500')
    })

    it('harus mengembalikan null untuk prioritas yang tidak diketahui', () => {
      expect(getPriorityIcon('unknown')).toBeNull()
      expect(getPriorityIcon()).toBeNull()
    })
  })

  describe('getCountdown', () => {
    it('harus mengembalikan Hari ini untuk event yang jatuh pada hari ini pada waktu yang sama atau sebelumnya', () => {
      const today = new Date('2024-03-29T12:00:00Z')
      const eventDate = new Date('2024-03-29T12:00:00Z')
      expect(getCountdown(eventDate, today)).toBe('Hari ini')
    })

    it('harus mengembalikan Besok untuk event yang jatuh besok', () => {
      const today = new Date('2024-03-29T12:00:00Z')
      const eventDate = new Date('2024-03-30T10:00:00Z')
      expect(getCountdown(eventDate, today)).toBe('Besok')
    })

    it('harus mengembalikan H-x untuk event dalam 2-7 hari ke depan', () => {
      const today = new Date('2024-03-29T12:00:00Z')
      const eventDate2 = new Date('2024-03-31T10:00:00Z')
      const eventDate7 = new Date('2024-04-05T10:00:00Z')

      expect(getCountdown(eventDate2, today)).toBe('H-2')
      expect(getCountdown(eventDate7, today)).toBe('H-7')
    })

    it('harus mengembalikan null untuk event yang lebih dari 7 hari', () => {
      const today = new Date('2024-03-29T12:00:00Z')
      const eventDate8 = new Date('2024-04-06T10:00:00Z')
      expect(getCountdown(eventDate8, today)).toBeNull()
    })

    it('harus menangani kasus di mana perbedaan waktu tidak pas 24 jam', () => {
      const today = new Date('2024-03-29T23:00:00Z')
      const eventDate = new Date('2024-03-30T01:00:00Z') // Hanya beda 2 jam tapi beda hari (jika kita bulatkan ke atas / Math.ceil akan jadi 1 hari)
      expect(getCountdown(eventDate, today)).toBe('Besok')
    })
  })
})
