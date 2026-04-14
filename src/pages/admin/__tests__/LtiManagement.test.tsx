import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { LtiManagement } from '../LtiManagement'

describe('LtiManagement', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<LtiManagement />)
    expect(container).toBeTruthy()
  })
})
