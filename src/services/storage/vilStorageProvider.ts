import { logger } from '@/utils/logger'

/**
 * VIL S3/MinIO Storage Provider — Phase 5 Implementation
 *
 * Implements StorageProvider backed by the VIL backend API, which proxies
 * requests to an S3-compatible store (Cloudflare R2 in prod, MinIO in dev).
 *
 * Dual-write mode (VITE_STORAGE_DUAL_WRITE=true):
 *   - upload()  → writes to VIL S3 (dual-write to secondary removed)
 *   - remove()  → removes from VIL S3
 *   - getPublicUrl() → returns CDN/S3 URL when VITE_STORAGE_PRIMARY=s3
 *
 * Cutover mode (VITE_STORAGE_DUAL_WRITE=false, default):
 *   - All operations go to VIL S3 only.
 */
import type {
  StorageBucketClient,
  StorageDownloadResponse,
  StorageListOptions,
  StorageListResponse,
  StorageProvider,
  StoragePublicUrlResponse,
  StorageRemoveResponse,
  StorageSignedUrlResponse,
  StorageUploadOptions,
  StorageUploadResponse,
} from './types'

// ---------------------------------------------------------------------------
// Configuration — all read from env vars, no hardcoded URLs
// ---------------------------------------------------------------------------

const VIL_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const CDN_URL = (import.meta.env.VITE_CDN_URL ?? '') as string
const DUAL_WRITE = import.meta.env.VITE_STORAGE_DUAL_WRITE === 'true'
const STORAGE_PRIMARY = (import.meta.env.VITE_STORAGE_PRIMARY ?? 's3') as string
const IS_DEV = import.meta.env.DEV === true

/** Large-file threshold for presigned PUT upload (10 MiB). */
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024

// ---------------------------------------------------------------------------
// Token retrieval (mirrors vilRealtimeProvider pattern)
// ---------------------------------------------------------------------------

function getToken(): string | null {
  // Baca JWT dari localStorage (kunci yang digunakan oleh Supabase atau VIL)
  try {
    const raw = localStorage.getItem('sb-access-token') ?? localStorage.getItem('access_token')
    if (raw) return raw

    // Coba ambil dari sesi Supabase tersimpan (format: sb-{ref}-auth-token)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('-auth-token')) {
        const val = localStorage.getItem(key)
        if (val) {
          try {
            const parsed = JSON.parse(val) as { access_token?: string }
            if (parsed.access_token) return parsed.access_token
          } catch {
            // Abaikan kesalahan parse
          }
        }
      }
    }
  } catch {
    // Abaikan jika localStorage tidak tersedia
  }
  return null
}

// ---------------------------------------------------------------------------
// HTTP error mapping — user-facing messages in Bahasa Indonesia
// ---------------------------------------------------------------------------

function mapHttpError(status: number): { message: string; statusCode: string } {
  switch (status) {
    case 403:
      return { message: 'Akses ditolak', statusCode: '403' }
    case 404:
      return { message: 'File tidak ditemukan', statusCode: '404' }
    case 413:
      return { message: 'Ukuran file melebihi batas', statusCode: '413' }
    default:
      return { message: `Permintaan gagal (HTTP ${status})`, statusCode: String(status) }
  }
}

function networkError(): { message: string; statusCode: string } {
  return { message: 'Gagal terhubung ke server', statusCode: 'NETWORK_ERROR' }
}

// ---------------------------------------------------------------------------
// VilBucketClient
// ---------------------------------------------------------------------------

class VilBucketClient implements StorageBucketClient {
  constructor(
    private readonly apiUrl: string,
    private readonly bucket: string
  ) {}

  // -------------------------------------------------------------------------
  // upload
  // -------------------------------------------------------------------------

  async upload(
    path: string,
    file: File | Blob | ArrayBuffer | FormData | ReadableStream,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResponse> {
    // Presigned PUT for large File objects (> 10 MiB)
    if (file instanceof File && file.size > LARGE_FILE_THRESHOLD) {
      return this._uploadLarge(path, file, options)
    }
    return this._uploadMultipart(path, file, options)
  }

  /** Multipart POST via API proxy (small/medium files). */
  private async _uploadMultipart(
    path: string,
    file: File | Blob | ArrayBuffer | FormData | ReadableStream,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResponse> {
    const token = getToken()

    try {
      const form = new FormData()
      if (file instanceof FormData) {
        // Pass-through if caller already built a FormData
        for (const [k, v] of file.entries()) {
          form.append(k, v)
        }
      } else if (file instanceof ArrayBuffer) {
        form.append('file', new Blob([file], { type: options?.contentType }))
      } else if (file instanceof ReadableStream) {
        // Consume the stream into a Blob first
        const reader = file.getReader()
        const chunks: Uint8Array[] = []
        let done = false
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (result.value) chunks.push(result.value)
        }
        const blob = new Blob(chunks, { type: options?.contentType })
        form.append('file', blob)
      } else {
        // File or Blob
        form.append('file', file)
      }

      const upsert = options?.upsert !== false // default true
      const url = new URL(`${this.apiUrl}/api/v1/storage/upload`)
      url.searchParams.set('bucket', this.bucket)
      url.searchParams.set('path', path)
      url.searchParams.set('upsert', String(upsert))

      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      if (options?.cacheControl) headers['Cache-Control'] = options.cacheControl

      if (IS_DEV) {
        logger.debug(`[VilStorage] upload → ${url.toString()}`)
      }

      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: form,
      })

      if (!resp.ok) {
        const err = mapHttpError(resp.status)
        return { data: null, error: err }
      }

      // Backend returns { path, public_url, size, content_type }
      const json = (await resp.json()) as { path?: string }
      const resultPath = json.path ?? path
      const result: StorageUploadResponse = { data: { path: resultPath }, error: null }

      // Dual-write: also upload to Supabase (fire-and-forget)
      if (DUAL_WRITE) {
        this._dualWriteToSupabase(path, file, options)
      }

      return result
    } catch (e) {
      if (IS_DEV) logger.warn('[VilStorage] upload error:', e)
      return { data: null, error: networkError() }
    }
  }

  /** Presigned PUT upload for large files (bypasses API, goes direct to S3). */
  private async _uploadLarge(
    path: string,
    file: File,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResponse> {
    const token = getToken()

    try {
      // 1. Request a presigned PUT URL
      const signResp = await fetch(`${this.apiUrl}/api/v1/storage/presign-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bucket: this.bucket,
          path,
          content_type: options?.contentType ?? file.type,
        }),
      })

      if (!signResp.ok) {
        return { data: null, error: mapHttpError(signResp.status) }
      }

      const { upload_url } = (await signResp.json()) as {
        upload_url: string
        fields?: Record<string, string>
      }

      if (!upload_url) {
        return {
          data: null,
          error: { message: 'URL unggah tidak valid', statusCode: 'PRESIGN_ERROR' },
        }
      }

      if (IS_DEV) {
        logger.debug(
          `[VilStorage] presigned upload → ${upload_url} (${(file.size / 1024 / 1024).toFixed(1)} MiB)`
        )
      }

      // 2. PUT directly to presigned URL (no auth header — signed URL is self-authorizing)
      const putResp = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': options?.contentType ?? file.type,
        },
        body: file,
      })

      if (!putResp.ok) {
        return {
          data: null,
          error: { message: 'Unggah file besar gagal', statusCode: String(putResp.status) },
        }
      }

      // Dual-write: also upload to Supabase (fire-and-forget)
      if (DUAL_WRITE) {
        this._dualWriteToSupabase(path, file, options)
      }

      return { data: { path }, error: null }
    } catch (e) {
      if (IS_DEV) logger.warn('[VilStorage] presigned upload error:', e)
      return { data: null, error: networkError() }
    }
  }

  // -------------------------------------------------------------------------
  // download
  // -------------------------------------------------------------------------

  async download(path: string): Promise<StorageDownloadResponse> {
    const token = getToken()
    try {
      const resp = await fetch(`${this.apiUrl}/api/v1/storage/object/${this.bucket}/${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!resp.ok) {
        return { data: null, error: mapHttpError(resp.status) }
      }

      const blob = await resp.blob()
      return { data: blob, error: null }
    } catch (e) {
      if (IS_DEV) logger.warn('[VilStorage] download error:', e)
      return { data: null, error: networkError() }
    }
  }

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  async remove(paths: string[]): Promise<StorageRemoveResponse> {
    const token = getToken()
    try {
      const resp = await fetch(`${this.apiUrl}/api/v1/storage/object/${this.bucket}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paths }),
      })

      if (!resp.ok) {
        return { data: null, error: mapHttpError(resp.status) }
      }

      const json = (await resp.json()) as { deleted?: string[] }
      const deleted = (json.deleted ?? paths).map((name) => ({ name }))

      if (DUAL_WRITE) {
        // Also remove from Supabase (fire-and-forget)
        this._dualRemoveFromSupabase(paths)
      }

      return { data: deleted, error: null }
    } catch (e) {
      if (IS_DEV) logger.warn('[VilStorage] remove error:', e)
      return { data: null, error: networkError() }
    }
  }

  // -------------------------------------------------------------------------
  // getPublicUrl — synchronous
  // -------------------------------------------------------------------------

  getPublicUrl(path: string): StoragePublicUrlResponse {
    // When running in dual-write mode with a non-S3 primary, fall through to VIL URL
    if (DUAL_WRITE && STORAGE_PRIMARY !== 's3') {
      // dual-write via Supabase client removed — VIL storage is now the sole provider
    }

    // CDN URL takes precedence over direct API URL
    if (CDN_URL) {
      return { data: { publicUrl: `${CDN_URL}/${this.bucket}/${path}` } }
    }

    return {
      data: {
        publicUrl: `${this.apiUrl}/api/v1/storage/object/${this.bucket}/${path}`,
      },
    }
  }

  // -------------------------------------------------------------------------
  // createSignedUrl
  // -------------------------------------------------------------------------

  async createSignedUrl(path: string, expiresIn: number): Promise<StorageSignedUrlResponse> {
    const token = getToken()
    try {
      const resp = await fetch(`${this.apiUrl}/api/v1/storage/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ bucket: this.bucket, path, expires_in: expiresIn }),
      })

      if (!resp.ok) {
        return { data: null, error: mapHttpError(resp.status) }
      }

      const json = (await resp.json()) as { signed_url?: string }
      if (!json.signed_url) {
        return {
          data: null,
          error: { message: 'URL bertanda tidak valid', statusCode: 'SIGN_ERROR' },
        }
      }

      return { data: { signedUrl: json.signed_url }, error: null }
    } catch (e) {
      if (IS_DEV) logger.warn('[VilStorage] createSignedUrl error:', e)
      return { data: null, error: networkError() }
    }
  }

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  async list(path?: string, options?: StorageListOptions): Promise<StorageListResponse> {
    const token = getToken()
    try {
      const url = new URL(`${this.apiUrl}/api/v1/storage/list/${this.bucket}`)
      if (path) url.searchParams.set('prefix', path)
      if (options?.limit) url.searchParams.set('limit', String(options.limit))

      const resp = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!resp.ok) {
        return { data: null, error: mapHttpError(resp.status) }
      }

      const json = (await resp.json()) as {
        objects?: Array<{ name: string; id?: string; metadata?: Record<string, unknown> }>
      }

      const data = (json.objects ?? []).map((obj) => ({
        name: obj.name,
        id: obj.id ?? null,
        metadata: obj.metadata ?? null,
      }))

      return { data, error: null }
    } catch (e) {
      if (IS_DEV) logger.warn('[VilStorage] list error:', e)
      return { data: null, error: networkError() }
    }
  }

  // -------------------------------------------------------------------------
  // Private: dual-write helpers (fire-and-forget)
  // -------------------------------------------------------------------------

  // Dual-write to secondary storage removed — VIL S3 is now the sole storage backend.
  // These stubs are kept so call-sites inside DUAL_WRITE guards compile without change.

  private _dualWriteToSupabase(
    _path: string,
    _file: File | Blob | ArrayBuffer | FormData | ReadableStream,
    _options?: StorageUploadOptions
  ): void {
    // no-op: secondary storage decommissioned
  }

  private _dualRemoveFromSupabase(_paths: string[]): void {
    // no-op: secondary storage decommissioned
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a VIL S3 storage provider.
 *
 * @param baseUrl - Override the API base URL (defaults to VITE_API_URL env var).
 */
export function createVilStorageProvider(baseUrl?: string): StorageProvider {
  const apiUrl = baseUrl ?? VIL_API_URL

  if (IS_DEV) {
    logger.debug(
      `[VilStorage] Initialized — apiUrl=${apiUrl} cdnUrl=${CDN_URL || '(none)'} dualWrite=${DUAL_WRITE} primary=${STORAGE_PRIMARY}`
    )
  }

  return {
    from(bucket: string): StorageBucketClient {
      return new VilBucketClient(apiUrl, bucket)
    },
  }
}
