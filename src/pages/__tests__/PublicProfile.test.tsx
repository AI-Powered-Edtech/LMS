import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { PublicProfile } from '../PublicProfile'

describe('PublicProfile', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<PublicProfile />)
    expect(container).toBeTruthy()
  })
})
