import { beforeEach, describe, expect, it, vi } from 'vitest'

import { calendarService } from '../api/calendarService'

const mockFromChain = vi.fn()

vi.mock('@/src/services/api/client', () => ({
  api: {
    from: (table: string) => {
      // Return a deeply chainable proxy that ultimately resolves via mockFromChain
      const chain: Record<string, unknown> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const makeChain = (depth = 0): any => {
        return new Proxy(chain, {
          get(_target, prop) {
            if (prop === 'then') {
              // Make the chain thenable so `await` resolves it
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (resolve: any) => resolve(mockFromChain(table))
            }
            return (..._args: unknown[]) => makeChain(depth + 1)
          },
        })
      }
      return makeChain()
    },
  },
}))

describe('calendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchEvents', () => {
    it('harus mengembalikan array event yang sudah digabung', async () => {
      // Mock all three api calls to return empty data
      mockFromChain.mockReturnValue({ data: [], error: null })

      const result = await calendarService.fetchEvents('tenant-1')
      expect(Array.isArray(result)).toBe(true)
    })

    it('harus mengembalikan event dari assignments', async () => {
      const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString()

      mockFromChain.mockImplementation((table: string) => {
        if (table === 'assignments') {
          return {
            data: [{ id: 'a1', title: 'Tugas 1', due_date: tomorrow, description: 'Desc' }],
            error: null,
          }
        }
        // class_schedules and quizzes return empty
        return { data: [], error: null }
      })

      const result = await calendarService.fetchEvents('tenant-1')
      const assignmentEvents = result.filter((e) => e.type === 'assignment')
      expect(assignmentEvents.length).toBeGreaterThanOrEqual(1)
    })
  })
})
