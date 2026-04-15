import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { Dashboard } from '../Dashboard'

describe('Dashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Dashboard />)
    expect(container).toBeTruthy()
  })
})
