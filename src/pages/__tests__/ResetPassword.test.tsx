import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { ResetPassword } from '../ResetPassword'

describe('ResetPassword', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<ResetPassword />)
    expect(container).toBeTruthy()
  })
})
