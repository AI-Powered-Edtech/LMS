import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/src/testing/test-utils'

import { SystemHealth } from '../SystemHealth'

describe('SystemHealth', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<SystemHealth />)
    expect(container).toBeTruthy()
  })
})
