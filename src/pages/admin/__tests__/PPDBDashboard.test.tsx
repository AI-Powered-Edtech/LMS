import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/src/testing/test-utils'

import { PPDBDashboard } from '../PPDBDashboard'

describe('PPDBDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<PPDBDashboard />)
    expect(container).toBeTruthy()
  })
})
