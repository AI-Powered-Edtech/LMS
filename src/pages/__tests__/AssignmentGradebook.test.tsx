import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { AssignmentGradebook } from '../AssignmentGradebook'

describe('AssignmentGradebook', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<AssignmentGradebook />)
    expect(container).toBeTruthy()
  })
})
