import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Announces route changes to screen readers via an aria-live region.
 * Place once in the app layout. Uses a visually-hidden element.
 */
export function RouteAnnouncer() {
  const location = useLocation()
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    // Use document.title if available (set by usePageTitle), otherwise derive from path
    const timer = setTimeout(() => {
      const title = document.title || 'EduSync'
      setAnnouncement(`Halaman dimuat: ${title}`)
    }, 100) // small delay to let usePageTitle set the title first

    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  )
}
