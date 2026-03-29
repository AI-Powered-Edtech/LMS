import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { WorkspaceSelector } from '../WorkspaceSelector'

describe('WorkspaceSelector', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<WorkspaceSelector />)
    expect(container).toBeTruthy()
  })
})
