import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { ScanAttendance } from '../ScanAttendance'

describe('ScanAttendance', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<ScanAttendance />)
    expect(container).toBeTruthy()
  })
})
