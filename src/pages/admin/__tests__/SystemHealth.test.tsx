import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { SystemHealth } from '../SystemHealth'

describe('SystemHealth', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<SystemHealth />)
    expect(container).toBeTruthy()
  })
})
