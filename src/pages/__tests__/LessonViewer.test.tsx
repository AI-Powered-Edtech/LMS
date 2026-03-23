import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { LessonViewer } from '../LessonViewer'

describe('LessonViewer', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<LessonViewer />)
    expect(container).toBeTruthy()
  })
})
