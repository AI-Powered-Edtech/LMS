export interface ConflictInfo {
  entityType: string
  localVersion: number
  serverVersion: number
  localData: any
  serverData: any
}

export async function resolveConflict(
  conflict: ConflictInfo,
  entityType: string,
  strategy?: 'local' | 'server' | 'merge'
): Promise<{ strategy: string }> {
  return { strategy: strategy || 'auto' }
}
