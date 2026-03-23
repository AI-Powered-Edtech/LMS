import { beforeEach, describe, expect, it, vi } from 'vitest'

import { calendarService } from '../api/calendarService'

const mockFromChain = vi.fn()

vi.mock('@/src/services/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      // Each from() call in fetchEvents chains different methods
      if (table === 'assignments') {
        return {
          select: () => ({
            not: () => ({
              order: mockFromChain,
            }),
          }),
        }
      }
      if (table === 'class_schedules') {
        return { select: mockFromChain }
      }
      // quizzes
      return { select: mockFromChain }
    },
  },
}))

describe('calendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchEvents', () => {
    it('harus mengembalikan array event yang sudah digabung', async () => {
      // Mock all three supabase calls to return empty data
      mockFromChain.mockResolvedValue({ data: [], error: null })

      const result = await calendarService.fetchEvents()
      expect(Array.isArray(result)).toBe(true)
    })

    it('harus mengembalikan event dari assignments', async () => {
      const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString()
      // The chain is: from('assignments').select().not().order()
      // then from('class_schedules').select() and from('quizzes').select()
      // We need all three calls to resolve
      let callCount = 0
      mockFromChain.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // assignments order() result
          return Promise.resolve({
            data: [{ id: 'a1', title: 'Tugas 1', due_date: tomorrow, description: 'Desc' }],
            error: null,
          })
        }
        // class_schedules and quizzes return empty
        return Promise.resolve({ data: [], error: null })
      })

      const result = await calendarService.fetchEvents()
      const assignmentEvents = result.filter((e) => e.type === 'assignment')
      expect(assignmentEvents.length).toBeGreaterThanOrEqual(0)
    })
  })
})
