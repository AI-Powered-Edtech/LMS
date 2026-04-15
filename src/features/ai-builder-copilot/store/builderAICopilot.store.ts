import { create } from 'zustand'

import type { AIBuilderArtifact, CopilotLaunchContext, CopilotTab } from '../types'

interface BuilderAICopilotState {
  isOpen: boolean
  activeTab: CopilotTab
  launchContext: CopilotLaunchContext | null
  hydratedArtifact: AIBuilderArtifact | null

  openDrawer: (tab?: CopilotTab, context?: CopilotLaunchContext) => void
  closeDrawer: () => void
  setActiveTab: (tab: CopilotTab) => void
  setLaunchContext: (context: CopilotLaunchContext) => void
  setHydratedArtifact: (artifact: AIBuilderArtifact | null) => void
}

export const useBuilderAICopilotStore = create<BuilderAICopilotState>((set) => ({
  isOpen: false,
  activeTab: 'outline',
  launchContext: null,
  hydratedArtifact: null,

  openDrawer: (tab, context) =>
    set({
      isOpen: true,
      activeTab: tab ?? 'outline',
      launchContext: context ?? null,
      hydratedArtifact: null,
    }),

  closeDrawer: () => set({ isOpen: false, launchContext: null, hydratedArtifact: null }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setLaunchContext: (context) => set({ launchContext: context }),

  setHydratedArtifact: (artifact) => set({ hydratedArtifact: artifact }),
}))
