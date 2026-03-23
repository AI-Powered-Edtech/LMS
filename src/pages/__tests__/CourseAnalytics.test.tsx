import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { CourseAnalytics } from '../CourseAnalytics'

describe('CourseAnalytics', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<CourseAnalytics />)
    expect(container).toBeTruthy()
  })
})
