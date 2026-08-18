// ============================================================
// Phase 32A: Interactive Block Scoring Utilities (Pure Functions)
// ============================================================

import type {
  DragDropData,
  FillBlankData,
  FlashcardData,
  SortingData,
} from "../types";

// ── Drag & Drop Scoring ──────────────────────────────────────────

/**
 * Score a drag-drop interaction.
 * @param data     Original block data with correct categoryId per item
 * @param placed   Map of itemId → categoryId (current placement)
 */
export function scoreDragDrop(
  data: DragDropData,
  placed: Record<string, string>,
): { score: number; correctCount: number; totalCount: number } {
  const totalCount = data.items.length;
  if (totalCount === 0) return { score: 0, correctCount: 0, totalCount: 0 };

  const correctCount = data.items.filter(
    (item) => placed[item.id] === item.categoryId,
  ).length;
  const score = Math.round((correctCount / totalCount) * 100);
  return { score, correctCount, totalCount };
}

// ── Sorting Scoring ──────────────────────────────────────────────

/**
 * Score a sorting interaction.
 * @param data          Original block data with correctIndex per item
 * @param currentOrder  Array of item IDs in the student's current order
 */
export function scoreSorting(
  data: SortingData,
  currentOrder: string[],
): { score: number; correctPositions: number[]; totalCount: number } {
  const totalCount = data.items.length;
  if (totalCount === 0)
    return { score: 0, correctPositions: [], totalCount: 0 };

  // ⚡ Perf: Replace O(N^2) nested loop with O(N) hash map lookup
  const itemMap = new Map(data.items.map((i) => [i.id, i]));

  const correctPositions: number[] = [];
  currentOrder.forEach((itemId, idx) => {
    const item = itemMap.get(itemId);
    if (item && item.correctIndex === idx) {
      correctPositions.push(idx);
    }
  });

  const score = Math.round((correctPositions.length / totalCount) * 100);
  return { score, correctPositions, totalCount };
}

// ── Fill in the Blank Scoring ────────────────────────────────────

/**
 * Score a fill-blank interaction.
 * @param data     Original block data with acceptedAnswers per blank
 * @param answers  Map of answerId → student's input string
 */
export function scoreFillBlank(
  data: FillBlankData,
  answers: Record<string, string>,
): {
  score: number;
  results: { id: string; isCorrect: boolean }[];
  totalCount: number;
} {
  const totalCount = data.answers.length;
  if (totalCount === 0) return { score: 0, results: [], totalCount: 0 };

  const results = data.answers.map((blankDef) => {
    const studentAnswer = (answers[blankDef.id] ?? "").trim();
    const isCorrect = blankDef.acceptedAnswers.some((accepted) => {
      const a = accepted.trim();
      if (blankDef.caseSensitive) return studentAnswer === a;
      return studentAnswer.toLowerCase() === a.toLowerCase();
    });
    return { id: blankDef.id, isCorrect };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;
  const score = Math.round((correctCount / totalCount) * 100);
  return { score, results, totalCount };
}

// ── Flashcard Scoring ────────────────────────────────────────────

/**
 * Score a flashcard interaction (engagement-based).
 * @param data        Original block data with all cards
 * @param flippedIds  Set of card IDs the student has flipped
 */
export function scoreFlashcard(
  data: FlashcardData,
  flippedIds: Set<string>,
): { score: number; flippedCount: number; totalCount: number } {
  const totalCount = data.cards.length;
  if (totalCount === 0) return { score: 0, flippedCount: 0, totalCount: 0 };

  const flippedCount = data.cards.filter((card) =>
    flippedIds.has(card.id),
  ).length;
  const score = Math.round((flippedCount / totalCount) * 100);
  return { score, flippedCount, totalCount };
}
