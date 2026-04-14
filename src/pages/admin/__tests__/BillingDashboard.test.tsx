import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { BillingDashboard } from '../BillingDashboard'

describe('BillingDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<BillingDashboard />)
    expect(container).toBeTruthy()
  })
})
