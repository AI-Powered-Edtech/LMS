import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/src/testing/test-utils'

import { BillingDashboard } from '../BillingDashboard'

describe('BillingDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<BillingDashboard />)
    expect(container).toBeTruthy()
  })
})
