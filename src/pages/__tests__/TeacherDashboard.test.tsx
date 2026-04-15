import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { TeacherDashboard } from '../TeacherDashboard'

describe('TeacherDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<TeacherDashboard />)
    expect(container).toBeTruthy()
  })
})
