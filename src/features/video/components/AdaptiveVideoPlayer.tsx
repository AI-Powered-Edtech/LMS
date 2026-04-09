import { useEffect, useRef, useState } from 'react'

import { cn } from '@/utils/cn'

/** WebVTT caption track descriptor */
export interface CaptionTrack {
  src: string
  srclang: string
  label: string
  default?: boolean
}

interface AdaptiveVideoPlayerProps {
  hlsUrl?: string | null
  mp4Url?: string | null
  thumbnailUrl?: string | null
  onProgress?: (pct: number) => void
  onEnded?: () => void
  controls?: boolean
  className?: string
  onTimeUpdate?: () => void
  onPlay?: () => void
  onSeeking?: () => void
  onCanPlay?: () => void
  onWaiting?: () => void
  onStalled?: () => void
  onError?: () => void
  /** Ref forwarded to the underlying <video> element */
  videoRef?: React.RefObject<HTMLVideoElement | null>
  controlsList?: string
  'aria-label'?: string
  /** Optional WebVTT caption tracks */
  captions?: CaptionTrack[]
}

/**
 * AdaptiveVideoPlayer — HLS.js-powered player with graceful MP4 fallback.
 *
 * If hlsUrl is provided and HLS.js is supported, streams via HLS with
 * optional quality-level selector. Falls back to native <video> src for
 * Safari (native HLS) or when only mp4Url is present.
 */
export function AdaptiveVideoPlayer({
  hlsUrl,
  mp4Url,
  thumbnailUrl,
  onProgress,
  onEnded,
  controls = true,
  className,
  onTimeUpdate: onTimeUpdateProp,
  onPlay,
  onSeeking,
  onCanPlay,
  onWaiting,
  onStalled,
  onError,
  videoRef: externalRef,
  controlsList,
  'aria-label': ariaLabel,
  captions,
}: AdaptiveVideoPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalRef ?? internalRef
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hlsRef = useRef<any>(null)
  const [isHlsActive, setIsHlsActive] = useState(false)
  const [qualities, setQualities] = useState<string[]>([])
  const [quality, setQuality] = useState<string>('auto')

  useEffect(() => {
    if (!hlsUrl) return

    let destroyed = false

    void import('hls.js').then(({ default: Hls }) => {
      if (destroyed) return

      if (Hls.isSupported() && videoRef.current) {
        setIsHlsActive(true)

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        })

        hls.loadSource(hlsUrl)
        hls.attachMedia(videoRef.current)

        hls.on(
          Hls.Events.MANIFEST_PARSED,
          (_: unknown, data: { levels: Array<{ height?: number }> }) => {
            const levelLabels = data.levels.map((l, i) =>
              l.height ? `${l.height}p` : `Level ${i}`
            )
            setQualities(['auto', ...levelLabels])
          }
        )

        hlsRef.current = hls
      } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari: native HLS support
        videoRef.current.src = hlsUrl
        setIsHlsActive(true)
      }
    })

    return () => {
      destroyed = true
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      setIsHlsActive(false)
      setQualities([])
    }
  }, [hlsUrl, videoRef])

  function handleTimeUpdate() {
    const video = videoRef.current
    if (!video || !video.duration) return
    const pct = Math.round((video.currentTime / video.duration) * 100)
    onProgress?.(pct)
    onTimeUpdateProp?.()
  }

  function handleQualityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setQuality(val)
    if (!hlsRef.current) return
    if (val === 'auto') {
      hlsRef.current.currentLevel = -1
    } else {
      const idx = qualities.indexOf(val) - 1
      hlsRef.current.currentLevel = idx
    }
  }

  // For non-HLS or when HLS.js is not attaching (e.g. Safari native), set src directly
  const videoSrc = !isHlsActive ? mp4Url || hlsUrl || undefined : undefined

  return (
    <div className={cn('relative w-full bg-black overflow-hidden group', className)}>
      <video
        ref={videoRef}
        src={videoSrc ?? undefined}
        poster={thumbnailUrl ?? undefined}
        controls={controls}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onEnded}
        onPlay={onPlay}
        onSeeking={onSeeking}
        onCanPlay={onCanPlay}
        onWaiting={onWaiting}
        onStalled={onStalled}
        onError={onError}
        className="w-full h-full object-cover"
        controlsList={controlsList}
        aria-label={ariaLabel ?? 'Video pelajaran'}
      >
        {captions?.map((track) => (
          <track
            key={track.srclang}
            kind="captions"
            src={track.src}
            srcLang={track.srclang}
            label={track.label}
            default={track.default}
          />
        ))}
      </video>

      {/* Quality selector — only visible on hover when multiple levels available */}
      {qualities.length > 1 && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <select
            value={quality}
            onChange={handleQualityChange}
            aria-label="Pilih kualitas video"
            className="text-xs bg-black/70 text-white border border-white/20 rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/40"
          >
            {qualities.map((q) => (
              <option key={q} value={q}>
                {q === 'auto' ? 'Otomatis' : q}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
