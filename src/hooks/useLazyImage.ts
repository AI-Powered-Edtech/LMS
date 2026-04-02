import { useCallback, useEffect, useRef, useState } from 'react'

interface UseLazyImageOptions {
  /** Placeholder src atau warna (misal: '#e2e8f0') saat gambar belum dimuat */
  placeholder?: string
  /** Retry 1x setelah delay ini (ms) jika gambar gagal dimuat. Default: 2000 */
  retryDelay?: number
  /** IntersectionObserver rootMargin. Default: '200px' (preload sebelum masuk viewport) */
  rootMargin?: string
}

interface UseLazyImageResult {
  /** Src aktif — placeholder saat loading, src asli setelah loaded */
  src: string
  /** true setelah gambar berhasil dimuat */
  isLoaded: boolean
  /** Error object jika gambar gagal dimuat setelah retry */
  error: Error | null
  /** Ref untuk dipasang di elemen img atau container */
  ref: React.RefCallback<Element>
}

/**
 * useLazyImage — lazy loads an image using IntersectionObserver.
 *
 * Features:
 * - Hanya mulai load saat elemen mendekati viewport (rootMargin: 200px)
 * - Retry 1x setelah 2 detik jika gagal
 * - SSR-safe (IntersectionObserver tidak dipanggil di server)
 * - Returns src placeholder selama loading
 */
export function useLazyImage(
  imageSrc: string,
  options: UseLazyImageOptions = {}
): UseLazyImageResult {
  const { placeholder = '', retryDelay = 2000, rootMargin = '200px' } = options

  const [src, setSrc] = useState<string>(placeholder)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasTriedRef = useRef(false)
  const elementRef = useRef<Element | null>(null)

  const loadImage = useCallback(
    (src: string, isRetry = false) => {
      if (!src) return

      // SSR guard
      if (typeof window === 'undefined') return

      const img = new Image()

      img.onload = () => {
        setSrc(src)
        setIsLoaded(true)
        setError(null)
      }

      img.onerror = () => {
        if (!isRetry && !hasTriedRef.current) {
          hasTriedRef.current = true
          // Retry 1x setelah retryDelay ms
          retryTimerRef.current = setTimeout(() => {
            loadImage(src, true)
          }, retryDelay)
        } else {
          setError(new Error(`Gagal memuat gambar: ${src}`))
          // Tetap tampilkan src asli agar browser bisa coba sendiri
          setSrc(src)
        }
      }

      img.src = src
    },
    [retryDelay]
  )

  // Callback ref — dipanggil saat elemen mount/unmount
  const ref: React.RefCallback<Element> = useCallback(
    (element: Element | null) => {
      // Cleanup observer lama
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      // Cleanup retry timer
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }

      elementRef.current = element

      if (!element || !imageSrc) return

      // SSR guard — IntersectionObserver tidak tersedia di server
      if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        // Fallback: langsung load
        loadImage(imageSrc)
        return
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry?.isIntersecting) {
            // Hentikan observasi setelah trigger pertama
            observerRef.current?.disconnect()
            observerRef.current = null
            loadImage(imageSrc)
          }
        },
        { rootMargin }
      )

      observerRef.current.observe(element)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imageSrc, rootMargin]
  )

  // Reset state saat src berubah
  useEffect(() => {
    setIsLoaded(false)
    setError(null)
    hasTriedRef.current = false
    setSrc(placeholder)

    // Cleanup timer dari load sebelumnya
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }

    // Jika elemen sudah di-observe, trigger ulang load
    if (elementRef.current && imageSrc) {
      if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
        // Re-observe elemen dengan src baru
        if (observerRef.current) {
          observerRef.current.disconnect()
        }
        observerRef.current = new IntersectionObserver(
          (entries) => {
            const entry = entries[0]
            if (entry?.isIntersecting) {
              observerRef.current?.disconnect()
              observerRef.current = null
              loadImage(imageSrc)
            }
          },
          { rootMargin }
        )
        observerRef.current.observe(elementRef.current)
      } else {
        loadImage(imageSrc)
      }
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  return { src, isLoaded, error, ref }
}
