import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { NotFound } from '../NotFound'

describe('NotFound', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<NotFound />)
    expect(container).toBeTruthy()
  })
})
