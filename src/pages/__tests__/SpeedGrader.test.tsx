import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { SpeedGrader } from '../SpeedGrader'

describe('SpeedGrader', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<SpeedGrader />)
    expect(container).toBeTruthy()
  })
})
