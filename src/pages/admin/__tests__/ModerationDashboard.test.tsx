import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/src/testing/test-utils'

import { ModerationDashboard } from '../ModerationDashboard'

describe('ModerationDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<ModerationDashboard />)
    expect(container).toBeTruthy()
  })
})
