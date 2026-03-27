import { RotateCcw,X } from 'lucide-react'
import { useEffect,useState } from 'react'

import { OptimizedImage } from '@/src/components/ui'

interface ImageBlockViewerProps {
  url: string
  alt: string
}

export function ImageBlockViewer({ url, alt }: ImageBlockViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const handleRetry = () => {
    setIsLoading(true)
    setHasError(false)
    // Force reload by adding a cache-busting query param
    const img = new Image()
    img.src = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
  }

  // Handle escape key for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZoomed) {
        setIsZoomed(false)
      }
    }

    if (isZoomed) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when zoomed
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isZoomed])

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-sm text-red-600 mb-3">Gambar gagal dimuat</p>
        <button
          onClick={handleRetry}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="relative">
        {isLoading && <div className="animate-pulse bg-slate-200 rounded-xl w-full h-[300px]" />}

        <OptimizedImage
          src={url}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          onClick={() => !isLoading && !hasError && setIsZoomed(true)}
          className={`
            w-full rounded-xl object-contain max-h-[600px] cursor-pointer transition-opacity
            ${isLoading ? 'opacity-0' : 'opacity-100'}
            hover:opacity-90
          `}
        />

        {alt && !isLoading && !hasError && (
          <p className="mt-2 text-sm text-slate-500 text-center">{alt}</p>
        )}
      </div>

      {/* Full-screen lightbox overlay */}
      {isZoomed && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <OptimizedImage
            src={url}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {alt && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80 text-center">
              {alt}
            </p>
          )}
        </div>
      )}
    </>
  )
}
