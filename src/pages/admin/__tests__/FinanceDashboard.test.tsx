import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { FinanceDashboard } from '../FinanceDashboard'

describe('FinanceDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<FinanceDashboard />)
    expect(container).toBeTruthy()
  })
})
