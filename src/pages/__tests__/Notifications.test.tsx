import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { Notifications } from '../Notifications'

describe('Notifications', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Notifications />)
    expect(container).toBeTruthy()
  })
})
