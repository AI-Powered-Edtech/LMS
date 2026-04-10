// NOT_IMPLEMENTED — VIL S3/MinIO storage support is Phase 5
// Stub exists so the provider factory import tree is intact.

import type { StorageBucketClient, StorageProvider } from './types'

function createStubBucketClient(): StorageBucketClient {
  const notImpl = () => Promise.reject(new Error('[VilStorage] NOT_IMPLEMENTED'))
  return {
    upload: notImpl,
    download: notImpl,
    remove: notImpl,
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
    createSignedUrl: notImpl,
    list: notImpl,
  }
}

export function createVilStorageProvider(_baseUrl: string): StorageProvider {
  return {
    from(_bucket: string): StorageBucketClient {
      return createStubBucketClient()
    },
  }
}
