import { logger } from '@/utils/logger'
/**
 * Log errors only in development mode.
 * Replaces 154+ instances of `if (import.meta.env.DEV) logger.error(...)`.
 */
export function logDevError(context: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    logger.error(`[${context}]`, ...args)
  }
}

export function logDevWarn(context: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    logger.warn(`[${context}]`, ...args)
  }
}
