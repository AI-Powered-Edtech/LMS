import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { ForgotPassword } from '../ForgotPassword'

describe('ForgotPassword', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<ForgotPassword />)
    expect(container).toBeTruthy()
  })
})
