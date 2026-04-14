export interface StorageError {
  message: string
  statusCode?: string | number
}

export interface StorageUploadResponse {
  data: { path: string } | null
  error: StorageError | null
}

export interface StorageRemoveResponse {
  data: Array<{ name: string }> | null
  error: StorageError | null
}

export interface StorageDownloadResponse {
  data: Blob | null
  error: StorageError | null
}

export interface StorageSignedUrlResponse {
  data: { signedUrl: string } | null
  error: StorageError | null
}

export interface StoragePublicUrlResponse {
  data: { publicUrl: string }
}

export interface StorageListResponse {
  data: Array<{ name: string; id: string | null; metadata: Record<string, unknown> | null }> | null
  error: StorageError | null
}

export interface StorageUploadOptions {
  cacheControl?: string
  contentType?: string
  upsert?: boolean
}

export interface StorageListOptions {
  limit?: number
  offset?: number
  sortBy?: { column: string; order: 'asc' | 'desc' }
}

export interface StorageBucketClient {
  upload(
    path: string,
    file: File | Blob | ArrayBuffer | FormData | ReadableStream,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResponse>
  download(path: string): Promise<StorageDownloadResponse>
  remove(paths: string[]): Promise<StorageRemoveResponse>
  getPublicUrl(path: string): StoragePublicUrlResponse
  createSignedUrl(path: string, expiresIn: number): Promise<StorageSignedUrlResponse>
  list(path?: string, options?: StorageListOptions): Promise<StorageListResponse>
}

export interface StorageProvider {
  from(bucket: string): StorageBucketClient
}
