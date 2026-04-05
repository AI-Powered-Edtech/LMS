// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  UploadProgress,
  VideoAsset,
  VideoAssetInsert,
  VideoAssetStatus,
  VideoProvider,
} from './types'

// ─── API Services ────────────────────────────────────────────────────────────
export { videoAssetService } from './api/videoAssetService'
export { videoUploadService } from './api/videoUploadService'

// ─── Query Keys ──────────────────────────────────────────────────────────────
export { videoKeys, videoQueryKeys } from './queries/videoKeys'

// ─── Queries / Mutations ─────────────────────────────────────────────────────
export {
  useUploadVideo,
  useVideoAssetByBlock,
  useVideoAssetsByLesson,
} from './queries/videoQueries'

// ─── Components ──────────────────────────────────────────────────────────────
export type { CaptionTrack } from './components/AdaptiveVideoPlayer'
export { AdaptiveVideoPlayer } from './components/AdaptiveVideoPlayer'
export { VideoProcessingStatus } from './components/VideoProcessingStatus'
export { VideoUploader } from './components/VideoUploader'
