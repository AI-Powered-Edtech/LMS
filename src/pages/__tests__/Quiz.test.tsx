import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { QuizModule } from '../Quiz'

describe('QuizModule', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<QuizModule />)
    expect(container).toBeTruthy()
  })
})
