import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { Calendar } from '../Calendar'

describe('Calendar', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Calendar />)
    expect(container).toBeTruthy()
  })
})
