import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Unauthorized } from '../Unauthorized'

describe('Unauthorized', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Unauthorized />)
    expect(container).toBeTruthy()
  })
})
