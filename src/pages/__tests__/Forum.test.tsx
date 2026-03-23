import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Forum } from '../Forum'

describe('Forum', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Forum />)
    expect(container).toBeTruthy()
  })
})
