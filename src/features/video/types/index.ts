export type VideoProvider = 'mux' | 'bunny' | 'direct'
export type VideoAssetStatus = 'processing' | 'ready' | 'error' | 'deleted'

export interface VideoAsset {
  id: string
  lesson_id: string | null
  block_id: string | null
  provider: VideoProvider
  provider_asset_id: string | null
  playback_id: string | null
  status: VideoAssetStatus
  duration_seconds: number | null
  resolution: string | null
  thumbnail_url: string | null
  hls_url: string | null
  dash_url: string | null
  mp4_url: string | null
  original_filename: string | null
  file_size_bytes: number | null
  metadata: Record<string, unknown>
  error_message: string | null
  tenant_id: string
  created_by: string
  created_at: string
  updated_at: string
}

export type VideoAssetInsert = Pick<
  VideoAsset,
  'lesson_id' | 'block_id' | 'provider' | 'original_filename' | 'file_size_bytes' | 'metadata'
>

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'error'
}
