import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/src/testing/test-utils'

import { AuditDashboard } from '../AuditDashboard'

describe('AuditDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<AuditDashboard />)
    expect(container).toBeTruthy()
  })
})
