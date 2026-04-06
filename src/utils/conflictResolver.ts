/**
 * Conflict Resolver — Handles offline sync conflicts
 * 
 * When offline operations are synced, conflicts may occur if:
 * - The same entity was modified on the server
 * - Multiple devices edited the same data
 * - The entity was deleted on the server
 * 
 * This module provides conflict detection and resolution strategies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConflictStrategy =
  | 'last-write-wins'
  | 'server-wins'
  | 'client-wins'
  | 'manual-merge'
  | 'discard'

export interface ConflictInfo {
  /** Entity ID in conflict */
  entityId: string
  /** Entity type (quiz, assignment, grade, etc.) */
  entityType: string
  /** Local version timestamp */
  localVersion: string
  /** Server version timestamp */
  serverVersion: string
  /** Local data snapshot */
  localData: Record<string, unknown>
  /** Server data snapshot */
  serverData: Record<string, unknown>
  /** Detected conflict type */
  conflictType: 'update-update' | 'update-delete' | 'delete-update' | 'create-create'
}

export interface ConflictResolution {
  /** Resolution strategy used */
  strategy: ConflictStrategy
  /** Resolved data to apply */
  resolvedData: Record<string, unknown>
  /** Whether to apply to server */
  applyToServer: boolean
  /** Whether to discard local changes */
  discardLocal: boolean
}

export type ConflictResolver = (
  conflict: ConflictInfo
) => Promise<ConflictResolution>

// ---------------------------------------------------------------------------
// Conflict Detection
// ---------------------------------------------------------------------------

/**
 * Detect if a conflict exists between local and server data.
 * 
 * @param localData - Local entity data with metadata
 * @param serverData - Server entity data with metadata
 * @returns ConflictInfo if conflict detected, null otherwise
 */
export function detectConflict(
  localData: Record<string, unknown> & { updated_at?: string; deleted_at?: string },
  serverData: Record<string, unknown> & { updated_at?: string; deleted_at?: string } | null,
  entityType: string,
  entityId: string
): ConflictInfo | null {
  // No server data = no conflict (entity may be new)
  if (!serverData) {
    return null
  }

  const localUpdatedAt = localData.updated_at ? new Date(localData.updated_at as string).getTime() : 0
  const serverUpdatedAt = serverData.updated_at ? new Date(serverData.updated_at as string).getTime() : 0

  // Check for update-update conflict (both sides modified)
  if (localUpdatedAt > 0 && serverUpdatedAt > 0 && localUpdatedAt !== serverUpdatedAt) {
    return {
      entityId,
      entityType,
      localVersion: localData.updated_at as string,
      serverVersion: serverData.updated_at as string,
      localData,
      serverData,
      conflictType: 'update-update',
    }
  }

  // Check for update-delete conflict (server deleted, local updated)
  if (serverData.deleted_at && !localData.deleted_at) {
    return {
      entityId,
      entityType,
      localVersion: localData.updated_at as string,
      serverVersion: serverData.deleted_at as string,
      localData,
      serverData,
      conflictType: 'update-delete',
    }
  }

  // Check for delete-update conflict (local deleted, server updated)
  if (localData.deleted_at && !serverData.deleted_at) {
    return {
      entityId,
      entityType,
      localVersion: localData.deleted_at as string,
      serverVersion: serverData.updated_at as string,
      localData,
      serverData,
      conflictType: 'delete-update',
    }
  }

  // No conflict detected
  return null
}

// ---------------------------------------------------------------------------
// Conflict Resolution Strategies
// ---------------------------------------------------------------------------

/**
 * Last Write Wins — Use the most recent version based on timestamps.
 * This is the default strategy for most entities.
 */
export const lastWriteWins: ConflictResolver = async (conflict: ConflictInfo): Promise<ConflictResolution> => {
  const localTime = new Date(conflict.localVersion).getTime()
  const serverTime = new Date(conflict.serverVersion).getTime()

  if (localTime > serverTime) {
    // Local is newer — apply local to server
    return {
      strategy: 'last-write-wins',
      resolvedData: conflict.localData,
      applyToServer: true,
      discardLocal: false,
    }
  } else {
    // Server is newer — discard local
    return {
      strategy: 'last-write-wins',
      resolvedData: conflict.serverData,
      applyToServer: false,
      discardLocal: true,
    }
  }
}

/**
 * Server Wins — Always prefer server version.
 * Use for critical data where server is source of truth.
 */
export const serverWins: ConflictResolver = async (conflict: ConflictInfo): Promise<ConflictResolution> => {
  return {
    strategy: 'server-wins',
    resolvedData: conflict.serverData,
    applyToServer: false,
    discardLocal: true,
  }
}

/**
 * Client Wins — Always prefer local version.
 * Use for user-generated content like quiz answers.
 */
export const clientWins: ConflictResolver = async (conflict: ConflictInfo): Promise<ConflictResolution> => {
  return {
    strategy: 'client-wins',
    resolvedData: conflict.localData,
    applyToServer: true,
    discardLocal: false,
  }
}

/**
 * Discard Local — Always discard local changes.
 * Use for non-critical cached data.
 */
export const discardLocal: ConflictResolver = async (_conflict: ConflictInfo): Promise<ConflictResolution> => {
  return {
    strategy: 'discard',
    resolvedData: {},
    applyToServer: false,
    discardLocal: true,
  }
}

/**
 * Manual Merge — Return both versions for user to decide.
 * This strategy requires UI intervention.
 */
export const manualMerge: ConflictResolver = async (conflict: ConflictInfo): Promise<ConflictResolution> => {
  // Return a special resolution that indicates manual intervention needed
  return {
    strategy: 'manual-merge',
    resolvedData: {
      _conflict: conflict,
      _requiresUserAction: true,
    },
    applyToServer: false,
    discardLocal: false,
  }
}

// ---------------------------------------------------------------------------
// Entity-Specific Strategies
// ---------------------------------------------------------------------------

/**
 * Get the appropriate conflict resolution strategy for an entity type.
 * 
 * @param entityType - Type of entity (quiz, assignment, grade, etc.)
 * @returns ConflictResolver function
 */
export function getStrategyForEntityType(entityType: string): ConflictResolver {
  switch (entityType) {
    // Quiz answers — student work should never be lost
    case 'quiz-answer':
    case 'quiz-submission':
      return clientWins

    // Assignments — student submissions are critical
    case 'assignment-submission':
      return clientWins

    // Grades — teacher overrides are source of truth
    case 'grade':
      return serverWins

    // Attendance — last write is usually correct
    case 'attendance':
      return lastWriteWins

    // Messages — don't lose user's unsent messages
    case 'message':
      return clientWins

    // Course builder — manual merge needed
    case 'course':
    case 'lesson':
      return manualMerge

    // Default to last-write-wins
    default:
      return lastWriteWins
  }
}

// ---------------------------------------------------------------------------
// Conflict Resolution Orchestrator
// ---------------------------------------------------------------------------

/**
 * Resolve a conflict using the appropriate strategy for the entity type.
 * 
 * @param conflict - Detected conflict information
 * @param entityType - Type of entity in conflict
 * @param overrideStrategy - Optional override strategy (uses entity-specific if not provided)
 * @returns Resolution with data to apply
 */
export async function resolveConflict(
  conflict: ConflictInfo,
  entityType: string,
  overrideStrategy?: ConflictStrategy
): Promise<ConflictResolution> {
  const resolver = overrideStrategy
    ? getStrategyByName(overrideStrategy)
    : getStrategyForEntityType(entityType)

  return await resolver(conflict)
}

/**
 * Get a conflict resolver by strategy name.
 * 
 * @param strategy - Strategy name
 * @returns ConflictResolver function
 */
function getStrategyByName(strategy: ConflictStrategy): ConflictResolver {
  switch (strategy) {
    case 'last-write-wins':
      return lastWriteWins
    case 'server-wins':
      return serverWins
    case 'client-wins':
      return clientWins
    case 'manual-merge':
      return manualMerge
    case 'discard':
      return discardLocal
    default:
      return lastWriteWins
  }
}

// ---------------------------------------------------------------------------
// Merge Utilities
// ---------------------------------------------------------------------------

/**
 * Deep merge two objects, preferring newer values for conflicting keys.
 * 
 * @param local - Local object
 * @param server - Server object
 * @param localTimestamp - Local modification timestamp
 * @param serverTimestamp - Server modification timestamp
 * @returns Merged object
 */
export function deepMergeWithTimestamps(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
  localTimestamp: string,
  serverTimestamp: string
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...server }
  const localTime = new Date(localTimestamp).getTime()
  const serverTime = new Date(serverTimestamp).getTime()

  for (const key of Object.keys(local)) {
    if (!(key in server)) {
      // Key only exists in local — add it
      merged[key] = local[key]
    } else if (local[key] !== server[key]) {
      // Conflict — use timestamp to decide
      merged[key] = localTime > serverTime ? local[key] : server[key]
    }
    // If values are the same, no conflict
  }

  return merged
}

/**
 * Check if two data snapshots have meaningful differences.
 * 
 * @param data1 - First data snapshot
 * @param data2 - Second data snapshot
 * @param ignoreKeys - Keys to ignore in comparison (e.g., updated_at)
 * @returns True if data differs
 */
export function hasMeaningfulDifference(
  data1: Record<string, unknown>,
  data2: Record<string, unknown>,
  ignoreKeys: string[] = ['updated_at', 'created_at', 'deleted_at']
): boolean {
  const keys1 = Object.keys(data1).filter((k) => !ignoreKeys.includes(k))
  const keys2 = Object.keys(data2).filter((k) => !ignoreKeys.includes(k))

  // Different keys
  if (keys1.length !== keys2.length || !keys1.every((k) => keys2.includes(k))) {
    return true
  }

  // Different values
  for (const key of keys1) {
    if (data1[key] !== data2[key]) {
      return true
    }
  }

  return false
}
