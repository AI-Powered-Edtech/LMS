import { getSupabaseClient } from '@/services/supabase/client'

import type { StorageBucketClient, StorageProvider } from './types'

export function createSupabaseStorageProvider(): StorageProvider {
  return {
    from(bucket: string): StorageBucketClient {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return getSupabaseClient().storage.from(bucket) as any
    },
  }
}
