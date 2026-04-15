import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { Forum } from '../Forum'

describe('Forum', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Forum />)
    expect(container).toBeTruthy()
  })
})
