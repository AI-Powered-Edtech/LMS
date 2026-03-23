import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Analytics } from '../Analytics'

describe('Analytics', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Analytics />)
    expect(container).toBeTruthy()
  })
})
