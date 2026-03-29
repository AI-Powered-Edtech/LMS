import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Gradebook } from '../Gradebook'

describe('Gradebook', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Gradebook />)
    expect(container).toBeTruthy()
  })
})
