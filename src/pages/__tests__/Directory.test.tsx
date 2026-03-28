import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Directory } from '../Directory'

describe('Directory', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Directory />)
    expect(container).toBeTruthy()
  })
})
