import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { AdminAnalyticsDashboard } from '../AdminAnalyticsDashboard'

describe('AdminAnalyticsDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<AdminAnalyticsDashboard />)
    expect(container).toBeTruthy()
  })
})
