import { describe, it, expect } from 'vitest'
import { diffSweeps } from '../sweep-diff.mjs'

const baseReport = (over = {}) => ({
  persona: 'admin',
  route: 'dashboard',
  url: 'http://localhost:5173/#/dashboard',
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  capturedAt: '2026-04-24T00:00:00.000Z',
  ...over,
})

describe('diffSweeps', () => {
  it('returns empty diff when baseline and current are identical', () => {
    const baseline = [baseReport()]
    const current = [baseReport()]
    expect(diffSweeps(baseline, current)).toEqual([])
  })

  it('flags a new console error on an existing route as a regression', () => {
    const baseline = [baseReport()]
    const current = [baseReport({ consoleErrors: ['ReferenceError: x is not defined'] })]
    const diff = diffSweeps(baseline, current)
    expect(diff).toHaveLength(1)
    expect(diff[0]).toMatchObject({ persona: 'admin', route: 'dashboard' })
    expect(diff[0].newConsoleErrors).toEqual(['ReferenceError: x is not defined'])
  })

  it('flags a brand-new route with errors as a regression', () => {
    const baseline = [baseReport()]
    const current = [
      baseReport(),
      baseReport({ route: 'gradebook', url: 'http://localhost:5173/#/gradebook', pageErrors: ['boom'] }),
    ]
    const diff = diffSweeps(baseline, current)
    expect(diff).toHaveLength(1)
    expect(diff[0].route).toBe('gradebook')
    expect(diff[0].newPageErrors).toEqual(['boom'])
  })

  it('does not flag a brand-new clean route as a regression', () => {
    const baseline = [baseReport()]
    const current = [
      baseReport(),
      baseReport({ route: 'gradebook', url: 'http://localhost:5173/#/gradebook' }),
    ]
    expect(diffSweeps(baseline, current)).toEqual([])
  })

  it('does not flag a fixed error as a regression', () => {
    const baseline = [baseReport({ consoleErrors: ['old error'] })]
    const current = [baseReport()]
    expect(diffSweeps(baseline, current)).toEqual([])
  })

  it('flags a new failed request status', () => {
    const baseline = [baseReport({ failedRequests: [{ url: '/api/v1/x', status: 404 }] })]
    const current = [
      baseReport({
        failedRequests: [
          { url: '/api/v1/x', status: 404 },
          { url: '/api/v1/y', status: 500 },
        ],
      }),
    ]
    const diff = diffSweeps(baseline, current)
    expect(diff).toHaveLength(1)
    expect(diff[0].newFailedRequests).toEqual([{ url: '/api/v1/y', status: 500 }])
  })
})
