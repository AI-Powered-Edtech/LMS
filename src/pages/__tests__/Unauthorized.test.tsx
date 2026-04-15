import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { Unauthorized } from '../Unauthorized'

describe('Unauthorized', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Unauthorized />)
    expect(container).toBeTruthy()
  })
})
