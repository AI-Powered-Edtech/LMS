import { Link, type LinkProps } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'

interface PrefetchLinkProps extends LinkProps {
  prefetchQuery?: {
    queryKey: unknown[]
    queryFn: () => Promise<unknown>
    staleTime?: number
  }
}

export function PrefetchLink({ prefetchQuery, onMouseEnter, ...props }: PrefetchLinkProps) {
  const queryClient = useQueryClient()
  const prefetchedRef = useRef(false)

  const handleMouseEnter = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (prefetchQuery && !prefetchedRef.current) {
        prefetchedRef.current = true
        await queryClient.prefetchQuery({
          queryKey: prefetchQuery.queryKey,
          queryFn: prefetchQuery.queryFn,
          staleTime: prefetchQuery.staleTime ?? 5 * 60 * 1000,
        })
      }
      onMouseEnter?.(e)
    },
    [prefetchQuery, queryClient, onMouseEnter]
  )

  return <Link onMouseEnter={handleMouseEnter} {...props} />
}
