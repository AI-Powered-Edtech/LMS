import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Leaderboard } from '../Leaderboard'

describe('Leaderboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Leaderboard />)
    expect(container).toBeTruthy()
  })
})
