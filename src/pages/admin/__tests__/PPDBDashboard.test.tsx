import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { PPDBDashboard } from '../PPDBDashboard'

describe('PPDBDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<PPDBDashboard />)
    expect(container).toBeTruthy()
  })
})
