import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Profile } from '../Profile'

describe('Profile', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Profile />)
    expect(container).toBeTruthy()
  })
})
