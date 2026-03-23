import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { QuestionBankPage } from '../QuestionBankPage'

describe('QuestionBankPage', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<QuestionBankPage />)
    expect(container).toBeTruthy()
  })
})
