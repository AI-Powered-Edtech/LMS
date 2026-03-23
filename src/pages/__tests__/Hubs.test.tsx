import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { TeachingHub } from '../Hubs'

describe('TeachingHub', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<TeachingHub />)
    expect(container).toBeTruthy()
  })
})
