import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Settings } from '../Settings'

describe('Settings', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Settings />)
    expect(container).toBeTruthy()
  })
})
