import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { CourseBuilder } from '../CourseBuilder'

describe('CourseBuilder', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<CourseBuilder />)
    expect(container).toBeTruthy()
  })
})
