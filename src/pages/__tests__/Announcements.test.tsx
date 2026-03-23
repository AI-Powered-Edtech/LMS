import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Announcements } from '../Announcements'

describe('Announcements', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Announcements />)
    expect(container).toBeTruthy()
  })
})
