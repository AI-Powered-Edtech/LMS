import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { AuditDashboard } from '../AuditDashboard'

describe('AuditDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<AuditDashboard />)
    expect(container).toBeTruthy()
  })
})
