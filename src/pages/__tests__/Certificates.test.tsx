import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Certificates } from '../Certificates'

describe('Certificates', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Certificates />)
    expect(container).toBeTruthy()
  })
})
