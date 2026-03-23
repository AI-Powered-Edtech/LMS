import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { Grades } from '../Grades'

describe('Grades', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Grades />)
    expect(container).toBeTruthy()
  })
})
