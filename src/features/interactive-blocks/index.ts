// ============================================================
// Phase 32A: Interactive Blocks — Public API
// ============================================================

// Types
export * from './types'

// API
export { interactiveBlockService } from './api/interactiveBlockService'

// Query keys
export { interactiveBlockKeys } from './queries/interactiveBlockKeys'

// Queries & mutations
export { useBlockProgress, useSaveBlockProgress } from './queries/interactiveBlockQueries'

// Hooks
export { useInteractiveProgress } from './hooks/useInteractiveProgress'

// Viewer components
export { DragDropBlock } from './components/DragDropBlock'
export { FillBlankBlock } from './components/FillBlankBlock'
export { FlashcardBlock } from './components/FlashcardBlock'
export { HotspotBlock } from './components/HotspotBlock'
export { SortingBlock } from './components/SortingBlock'
export { TimelineBlock } from './components/TimelineBlock'

// Editor components (for course builder)
export { DragDropEditor } from './components/DragDropEditor'
export { FillBlankEditor } from './components/FillBlankEditor'
export { FlashcardEditor } from './components/FlashcardEditor'
export { HotspotEditor } from './components/HotspotEditor'
export { SortingEditor } from './components/SortingEditor'
export { TimelineEditor } from './components/TimelineEditor'

// Scoring utilities
export {
  scoreDragDrop,
  scoreFillBlank,
  scoreFlashcard,
  scoreSorting,
} from './utils/interactiveScoring'
