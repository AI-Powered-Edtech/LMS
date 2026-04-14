import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { LessonViewer } from '../LessonViewer'

describe('LessonViewer', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<LessonViewer />)
    expect(container).toBeTruthy()
  })
})
