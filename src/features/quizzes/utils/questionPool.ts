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
  totalQuestions: number;
  /** How many questions to show per attempt (null = show all) */
  poolSize: number | null;
  /** Whether to shuffle question order */
  shuffleQuestions: boolean;
  /** Whether to shuffle option order within questions */
  shuffleOptions: boolean;
}

export interface PoolSelection<T> {
  /** The selected & ordered items */
  items: T[];
  /** Number selected out of total */
  selectedCount: number;
  /** Total available */
  totalCount: number;
  /** Whether pool selection was applied */
  isPooled: boolean;
}

// ─── Seeded PRNG ─────────────────────────────────────────

/**
 * Simple seeded PRNG (Mulberry32).
 * Produces deterministic pseudo-random numbers from a numeric seed.
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a string seed to a numeric seed via simple hash.
 */
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash >>> 0;
}

// ─── Core Functions ──────────────────────────────────────

/**
 * Shuffle an array using Fisher-Yates with a seeded PRNG.
 * Returns a new array; does not mutate the input.
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const array = [...items];
  const rng = mulberry32(hashSeed(seed));

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

/**
 * Select a subset of questions from a pool using seeded randomization.
 *
 * @param items - All available questions
 * @param config - Pool configuration
 * @param seed - Attempt seed for deterministic selection
 * @returns PoolSelection with the selected items
 */
export function selectFromPool<T>(
  items: T[],
  config: PoolConfig,
  seed: string,
): PoolSelection<T> {
  const totalCount = items.length;

  // If no pool size or pool size >= total, use all questions
  if (!config.poolSize || config.poolSize >= totalCount) {
    const ordered = config.shuffleQuestions
      ? seededShuffle(items, seed)
      : items;
    return {
      items: ordered,
      selectedCount: totalCount,
      totalCount,
      isPooled: false,
    };
  }

  // Shuffle all items deterministically, then take the first poolSize
  const shuffled = seededShuffle(items, seed);
  const selected = shuffled.slice(0, config.poolSize);

  return {
    items: selected,
    selectedCount: config.poolSize,
    totalCount,
    isPooled: true,
  };
}

/**
 * Validate pool configuration.
 * Returns error message or null if valid.
 */
export function validatePoolConfig(config: PoolConfig): string | null {
  if (config.poolSize !== null) {
    if (config.poolSize < 1) {
      return "Jumlah soal per percobaan harus minimal 1";
    }
    if (config.poolSize > config.totalQuestions) {
      return `Jumlah soal per percobaan (${config.poolSize}) melebihi total soal (${config.totalQuestions})`;
    }
    if (config.totalQuestions < 2) {
      return "Dibutuhkan minimal 2 soal untuk mengaktifkan question pool";
    }
  }
  return null;
}

/**
 * Get a human-readable summary of the pool configuration.
 */
export function getPoolSummary(config: PoolConfig): string {
  if (!config.poolSize || config.poolSize >= config.totalQuestions) {
    return `Semua ${config.totalQuestions} soal ditampilkan`;
  }
  return `${config.poolSize} dari ${config.totalQuestions} soal dipilih secara acak`;
}

// ─── Phase 33A: Server-side bank pool helpers ─────────────────────────────

/** sessionStorage key prefix for pool mode flag */
const POOL_MODE_KEY_PREFIX = "edusync:pool_mode:";

/**
 * Mark a quiz as using server-side pool mode.
 * Called after load-quiz-data responds with pool_mode: true.
 * Uses sessionStorage (auto-cleared on tab close).
 */
export function setPoolModeFlag(quizId: string, isActive: boolean): void {
  try {
    if (isActive) {
      sessionStorage.setItem(`${POOL_MODE_KEY_PREFIX}${quizId}`, "1");
    } else {
      sessionStorage.removeItem(`${POOL_MODE_KEY_PREFIX}${quizId}`);
    }
  } catch {
    // sessionStorage may be unavailable in some contexts — fail silently
  }
}

/**
 * Check whether a quiz is running in server-side pool mode.
 * Reads the cached flag set by setPoolModeFlag() after quiz load.
 *
 * This enables UI components to display the "Mode Pool Aktif" indicator
 * without making an additional network request.
 *
 * @param quizId — The quiz UUID to check
 * @returns true if pool mode was active during the last quiz load
 */
export function isPoolModeActive(quizId: string): boolean {
  try {
    return sessionStorage.getItem(`${POOL_MODE_KEY_PREFIX}${quizId}`) === "1";
  } catch {
    return false;
  }
}

/**
 * Clear the pool mode flag for a quiz.
 * Call this when leaving a quiz attempt.
 */
export function clearPoolModeFlag(quizId: string): void {
  try {
    sessionStorage.removeItem(`${POOL_MODE_KEY_PREFIX}${quizId}`);
  } catch {
    // fail silently
  }
}
