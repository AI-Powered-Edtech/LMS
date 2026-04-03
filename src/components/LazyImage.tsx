import { cn } from '@/utils/cn'

import { useLazyImage } from '../hooks/useLazyImage'

interface LazyImageProps {
  /** URL gambar yang akan dimuat secara lazy */
  src: string
  /** Alt text untuk aksesibilitas */
  alt: string
  /** Tailwind class names tambahan untuk elemen img */
  className?: string
  /**
   * Placeholder — bisa berupa warna CSS (misal '#e2e8f0') atau data URI.
   * Ditampilkan selama gambar loading.
   */
  placeholder?: string
  /**
   * Fallback — ditampilkan jika gambar gagal dimuat (setelah retry).
   * Default: initials avatar dari prop `alt`.
   */
  fallback?: React.ReactNode
  /** Ukuran container (untuk kalkulasi initials avatar fallback) */
  size?: 'sm' | 'md' | 'lg'
}

/** Ambil 1-2 huruf pertama dari teks untuk initials */
function getInitials(text: string): string {
  return text
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

/** Mapping warna berdasarkan huruf pertama */
function getInitialsColor(text: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  ]
  const charCode = (text.charCodeAt(0) ?? 0) % colors.length
  return colors[charCode] ?? colors[0]!
}

const sizeClasses: Record<string, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

/**
 * LazyImage — komponen gambar dengan lazy loading via IntersectionObserver.
 *
 * Features:
 * - Lazy load dengan IntersectionObserver (SSR-safe)
 * - Placeholder blur/color saat loading
 * - Transisi smooth saat gambar loaded
 * - Fallback initials avatar jika gambar gagal
 * - Dark mode support
 * - Retry logic (1x setelah 2 detik) via useLazyImage hook
 */
export function LazyImage({
  src,
  alt,
  className,
  placeholder,
  fallback,
  size = 'md',
}: LazyImageProps) {
  const { src: activeSrc, isLoaded, error, ref } = useLazyImage(src, { placeholder })

  // Tampilkan fallback jika ada error setelah retry
  if (error) {
    if (fallback) {
      return <>{fallback}</>
    }

    // Default fallback: initials avatar
    const initials = getInitials(alt)
    const colorClass = getInitialsColor(alt)
    return (
      <div
        ref={ref as React.RefCallback<HTMLDivElement>}
        className={cn(
          'flex items-center justify-center font-bold select-none',
          colorClass,
          sizeClasses[size],
          className
        )}
        aria-label={alt}
        role="img"
      >
        {initials || '?'}
      </div>
    )
  }

  return (
    <div
      ref={ref as React.RefCallback<HTMLDivElement>}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Placeholder / shimmer */}
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse',
            placeholder && !placeholder.startsWith('#') ? '' : 'bg-slate-200 dark:bg-slate-700'
          )}
          style={placeholder?.startsWith('#') ? { backgroundColor: placeholder } : undefined}
          aria-hidden="true"
        />
      )}

      {/* Gambar asli */}
      <img
        src={activeSrc || undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onError={
          // Fallback tambahan: jika img element sendiri error (setelah hook retry)
          !error
            ? (e) => {
                const img = e.currentTarget
                img.style.display = 'none'
              }
            : undefined
        }
      />
    </div>
  )
}
