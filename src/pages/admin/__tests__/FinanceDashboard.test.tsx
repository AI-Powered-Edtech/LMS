import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/src/testing/test-utils'

import { FinanceDashboard } from '../FinanceDashboard'

describe('FinanceDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<FinanceDashboard />)
    expect(container).toBeTruthy()
  })
})
