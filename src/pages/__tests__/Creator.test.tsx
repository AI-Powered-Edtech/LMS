import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Creator } from '../Creator'

describe('Creator', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Creator />)
    expect(container).toBeTruthy()
  })
})
