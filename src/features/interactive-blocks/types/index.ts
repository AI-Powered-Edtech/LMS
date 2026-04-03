// ============================================================
// Phase 32A: Interactive Block Type Definitions
// ============================================================

// Flashcard
export interface FlashcardItem {
  id: string
  front: string
  back: string
  order: number
}
export interface FlashcardData {
  cards: FlashcardItem[]
  shuffleOnLoad: boolean
}

// Drag & Drop
export interface DragItem {
  id: string
  label: string
  categoryId: string
}
export interface DropCategory {
  id: string
  label: string
  color: string
}
export interface DragDropData {
  items: DragItem[]
  categories: DropCategory[]
  showFeedback: boolean
}

// Hotspot
export interface HotspotRegion {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  content: string
}
export interface HotspotData {
  imageUrl: string
  regions: HotspotRegion[]
  revealMode: 'click' | 'hover'
}

// Timeline
export interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  imageUrl?: string
  order: number
}
export interface TimelineData {
  events: TimelineEvent[]
  orientation: 'vertical' | 'horizontal'
}

// Sorting
export interface SortingItem {
  id: string
  label: string
  correctIndex: number
}
export interface SortingData {
  items: SortingItem[]
  instruction: string
  showFeedback: boolean
}

// Fill in the Blank
export interface FillBlankAnswer {
  id: string
  acceptedAnswers: string[]
  caseSensitive: boolean
}
export interface FillBlankData {
  template: string
  answers: FillBlankAnswer[]
  showHints: boolean
}

// Interaction progress (from DB)
export interface InteractionProgress {
  is_completed: boolean
  score?: number | null
  interaction_data: Record<string, unknown>
  attempts?: number
}
