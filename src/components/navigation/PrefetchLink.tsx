import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { Link, LinkProps } from 'react-router-dom'

interface PrefetchLinkProps extends LinkProps {
  prefetchQuery?: {
    queryKey: readonly unknown[]
    queryFn: () => Promise<unknown>
  }
}

/**
 * PrefetchLink — Link yang secara otomatis melakukan prefetch data
 * saat pengguna mengarahkan kursor ke atasnya.
 *
 * Gunakan `prefetchQuery` untuk mendefinisikan query yang akan di-prefetch
 * sebelum navigasi terjadi, sehingga halaman tujuan terasa lebih cepat.
 *
 * @example
 * <PrefetchLink
 *   to={`/kursus/${course.id}`}
 *   prefetchQuery={{
 *     queryKey: queryKeys.courses.detail(course.id),
 *     queryFn: () => getCourseById(course.id),
 *   }}
 * >
 *   {course.title}
 * </PrefetchLink>
 */
export function PrefetchLink({ prefetchQuery, onMouseEnter, ...props }: PrefetchLinkProps) {
  const queryClient = useQueryClient()

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (prefetchQuery) {
        void queryClient.prefetchQuery(prefetchQuery)
      }
      onMouseEnter?.(e)
    },
    [queryClient, prefetchQuery, onMouseEnter]
  )

  return <Link onMouseEnter={handleMouseEnter} {...props} />
}
