import { beforeEach, describe, expect, it } from 'vitest'

import { useBuilderAICopilotStore } from '../store/builderAICopilot.store'
import type { AIBuilderArtifact } from '../types'

const mockArtifact: AIBuilderArtifact = {
  id: 'artifact-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  created_by: 'user-1',
  artifact_kind: 'outline',
  target_type: 'course',
  target_id: 'course-1',
  source_type: 'prompt',
  source_ref_id: null,
  prompt_config: { subject: 'IPA' },
  output: {
    modules: [{ title: 'Modul 1', lessons: [] }],
  },
  status: 'generated',
  created_at: '2026-04-09T10:00:00.000Z',
  updated_at: '2026-04-09T10:00:00.000Z',
}

beforeEach(() => {
  useBuilderAICopilotStore.setState({
    isOpen: false,
    activeTab: 'outline',
    launchContext: null,
    hydratedArtifact: null,
  })
})

describe('useBuilderAICopilotStore', () => {
  it('opens drawer with selected tab and context', () => {
    useBuilderAICopilotStore.getState().openDrawer('assessment', {
      entryPoint: 'topbar',
      preSelectedTab: 'assessment',
    })

    const state = useBuilderAICopilotStore.getState()
    expect(state.isOpen).toBe(true)
    expect(state.activeTab).toBe('assessment')
    expect(state.launchContext?.entryPoint).toBe('topbar')
  })

  it('stores hydrated artifact for history replay', () => {
    useBuilderAICopilotStore.getState().setHydratedArtifact(mockArtifact)

    expect(useBuilderAICopilotStore.getState().hydratedArtifact).toEqual(mockArtifact)
  })

  it('openDrawer clears stale hydrated artifact', () => {
    useBuilderAICopilotStore.getState().setHydratedArtifact(mockArtifact)
    useBuilderAICopilotStore.getState().openDrawer('outline')

    expect(useBuilderAICopilotStore.getState().hydratedArtifact).toBeNull()
  })

  it('closeDrawer resets launch context and hydrated artifact', () => {
    useBuilderAICopilotStore.getState().openDrawer('improve', {
      entryPoint: 'block_action',
      targetType: 'block',
      targetId: 'block-1',
    })
    useBuilderAICopilotStore.getState().setHydratedArtifact(mockArtifact)

    useBuilderAICopilotStore.getState().closeDrawer()

    const state = useBuilderAICopilotStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.launchContext).toBeNull()
    expect(state.hydratedArtifact).toBeNull()
  })
})
