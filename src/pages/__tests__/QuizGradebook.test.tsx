import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { QuizGradebook } from '../QuizGradebook'

describe('QuizGradebook', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<QuizGradebook />)
    expect(container).toBeTruthy()
  })
})
