/**
 * questionPool.ts — Question Pool & Randomization Utility
 *
 * Provides seeded shuffle and pool selection for quiz questions.
 * Uses the attempt_seed to ensure deterministic ordering per student
 * so the same student always sees the same questions/order on resume.
 *
 * Architecture note: The authoritative question selection happens
 * server-side in the v1_start_quiz_attempt RPC. This utility is used
 * for client-side preview and validation.
 */

// ─── Types ───────────────────────────────────────────────

export interface PoolConfig {
  /** Total questions available in the quiz */
  totalQuestions: number
  /** How many questions to show per attempt (null = show all) */
  poolSize: number | null
  /** Whether to shuffle question order */
  shuffleQuestions: boolean
  /** Whether to shuffle option order within questions */
  shuffleOptions: boolean
}

export interface PoolSelection<T> {
  /** The selected & ordered items */
  items: T[]
  /** Number selected out of total */
  selectedCount: number
  /** Total available */
  totalCount: number
  /** Whether pool selection was applied */
  isPooled: boolean
}

// ─── Seeded PRNG ─────────────────────────────────────────

/**
 * Simple seeded PRNG (Mulberry32).
 * Produces deterministic pseudo-random numbers from a numeric seed.
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Convert a string seed to a numeric seed via simple hash.
 */
function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash >>> 0
}

// ─── Core Functions ──────────────────────────────────────

/**
 * Shuffle an array using Fisher-Yates with a seeded PRNG.
 * Returns a new array; does not mutate the input.
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const array = [...items]
  const rng = mulberry32(hashSeed(seed))

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }

  return array
}

/**
 * Select a subset of questions from a pool using seeded randomization.
 *
 * @param items - All available questions
 * @param config - Pool configuration
 * @param seed - Attempt seed for deterministic selection
 * @returns PoolSelection with the selected items
 */
export function selectFromPool<T>(items: T[], config: PoolConfig, seed: string): PoolSelection<T> {
  const totalCount = items.length

  // If no pool size or pool size >= total, use all questions
  if (!config.poolSize || config.poolSize >= totalCount) {
    const ordered = config.shuffleQuestions ? seededShuffle(items, seed) : items
    return {
      items: ordered,
      selectedCount: totalCount,
      totalCount,
      isPooled: false,
    }
  }

  // Shuffle all items deterministically, then take the first poolSize
  const shuffled = seededShuffle(items, seed)
  const selected = shuffled.slice(0, config.poolSize)

  return {
    items: selected,
    selectedCount: config.poolSize,
    totalCount,
    isPooled: true,
  }
}

/**
 * Validate pool configuration.
 * Returns error message or null if valid.
 */
export function validatePoolConfig(config: PoolConfig): string | null {
  if (config.poolSize !== null) {
    if (config.poolSize < 1) {
      return 'Jumlah soal per percobaan harus minimal 1'
    }
    if (config.poolSize > config.totalQuestions) {
      return `Jumlah soal per percobaan (${config.poolSize}) melebihi total soal (${config.totalQuestions})`
    }
    if (config.totalQuestions < 2) {
      return 'Dibutuhkan minimal 2 soal untuk mengaktifkan question pool'
    }
  }
  return null
}

/**
 * Get a human-readable summary of the pool configuration.
 */
export function getPoolSummary(config: PoolConfig): string {
  if (!config.poolSize || config.poolSize >= config.totalQuestions) {
    return `Semua ${config.totalQuestions} soal ditampilkan`
  }
  return `${config.poolSize} dari ${config.totalQuestions} soal dipilih secara acak`
}
