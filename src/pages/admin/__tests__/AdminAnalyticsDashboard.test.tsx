import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/src/testing/test-utils'

import { AdminAnalyticsDashboard } from '../AdminAnalyticsDashboard'

describe('AdminAnalyticsDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<AdminAnalyticsDashboard />)
    expect(container).toBeTruthy()
  })
})
