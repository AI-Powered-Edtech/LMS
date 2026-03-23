import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { GroupAssignment } from '../GroupAssignment'

describe('GroupAssignment', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<GroupAssignment />)
    expect(container).toBeTruthy()
  })
})
