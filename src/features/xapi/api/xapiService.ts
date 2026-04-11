import { db } from '@/services/db'

import type { XAPIContext, XAPIObjectType, XAPIResult, XAPIVerb } from '../types/index'

/**
 * Records an xAPI statement via the record_xapi_statement RPC.
 *
 * Fire-and-forget design:
 *   - Never throws — errors are swallowed silently so xAPI never breaks the main UI flow.
 *   - Returns the new statement UUID on success, or null on failure.
 */
export const xapiService = {
  async recordStatement(
    verb: XAPIVerb,
    objectType: XAPIObjectType,
    objectId: string,
    result: XAPIResult = {},
    context: XAPIContext = {}
  ): Promise<string | null> {
    try {
      const { data, error } = await db.rpc('record_xapi_statement', {
        p_verb: verb,
        p_object_type: objectType,
        p_object_id: objectId,
        p_result: result as Record<string, unknown>,
        p_context: { ...context, platform: context.platform ?? 'edusync' } as Record<
          string,
          unknown
        >,
      })

      if (error) {
        if (import.meta.env.DEV) {
          console.warn('[xAPI] recordStatement error (non-critical):', error.message)
        }
        return null
      }

      return data as string | null
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[xAPI] recordStatement exception (non-critical):', err)
      }
      return null
    }
  },
}
