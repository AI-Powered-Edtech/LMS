import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { QuizManager } from '../QuizManager'

describe('QuizManager', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<QuizManager />)
    expect(container).toBeTruthy()
  })
})
