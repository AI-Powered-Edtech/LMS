import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { StudentAttendance } from '../StudentAttendance'

describe('StudentAttendance', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<StudentAttendance />)
    expect(container).toBeTruthy()
  })
})
