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
export { FlashcardBlock } from './components/FlashcardBlock'
export { DragDropBlock } from './components/DragDropBlock'
export { HotspotBlock } from './components/HotspotBlock'
export { TimelineBlock } from './components/TimelineBlock'
export { SortingBlock } from './components/SortingBlock'
export { FillBlankBlock } from './components/FillBlankBlock'

// Editor components (for course builder)
export { FlashcardEditor } from './components/FlashcardEditor'
export { DragDropEditor } from './components/DragDropEditor'
export { HotspotEditor } from './components/HotspotEditor'
export { TimelineEditor } from './components/TimelineEditor'
export { SortingEditor } from './components/SortingEditor'
export { FillBlankEditor } from './components/FillBlankEditor'

// Scoring utilities
export {
  scoreDragDrop,
  scoreSorting,
  scoreFillBlank,
  scoreFlashcard,
} from './utils/interactiveScoring'
