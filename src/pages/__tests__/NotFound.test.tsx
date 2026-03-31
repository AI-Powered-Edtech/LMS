import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { NotFound } from '../NotFound'

describe('NotFound', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<NotFound />)
    expect(container).toBeTruthy()
  })
})
