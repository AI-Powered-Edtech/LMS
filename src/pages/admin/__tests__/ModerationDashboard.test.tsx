import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { ModerationDashboard } from '../ModerationDashboard'

describe('ModerationDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<ModerationDashboard />)
    expect(container).toBeTruthy()
  })
})
