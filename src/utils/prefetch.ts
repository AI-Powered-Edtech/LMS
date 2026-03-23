// EduSync LMS — Route chunk prefetching utility
// Injects <link rel="prefetch"> hints so subsequent navigations load instantly.

/* ─── Route → likely-next-route map ────────────────────────── */

const prefetchMap: Record<string, string[]> = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  '/login': ['/app/student/dashboard', '/app/teacher/dashboard', '/app/admin/dashboard'],

  // ── Student paths ─────────────────────────────────────────────────────────
  '/app/student/dashboard': ['/app/student/courses', '/app/student/assignments'],
  '/app/student/courses': ['/app/student/courses/'],
  '/app/student/assignments': ['/app/student/courses'],
  '/app/student/leaderboard': ['/app/student/dashboard'],
  '/app/student/announcements': ['/app/student/dashboard'],

  // ── Teacher paths ─────────────────────────────────────────────────────────
  '/app/teacher/dashboard': [
    '/app/teacher/classes',
    '/app/teacher/courses',
    '/app/teacher/analytics',
  ],
  '/app/teacher/classes': ['/app/teacher/classes/', '/app/teacher/courses'],
  '/app/teacher/courses': ['/app/teacher/courses/', '/app/teacher/dashboard'],
  '/app/teacher/courses/': ['/app/teacher/dashboard'],
  '/app/teacher/analytics': ['/app/teacher/dashboard'],
  '/app/teacher/gradebook': ['/app/teacher/classes'],
  '/app/teacher/assignments': ['/app/teacher/gradebook'],
  '/app/teacher/announcements': ['/app/teacher/dashboard'],
  '/app/teacher/calendar': ['/app/teacher/dashboard'],

  // ── Admin paths ───────────────────────────────────────────────────────────
  '/app/admin/dashboard': ['/app/admin/users', '/app/admin/analytics'],
  '/app/admin/users': ['/app/admin/dashboard'],
  '/app/admin/analytics': ['/app/admin/dashboard'],
  '/app/admin/moderation': ['/app/admin/dashboard'],
}

/** Routes whose chunks have already been prefetched */
const prefetched = new Set<string>()

/* ─── Public API ───────────────────────────────────────────── */

/**
 * Inject `<link rel="prefetch">` tags for the given route's likely next
 * navigations so the browser downloads chunks in the background.
 */
export function prefetchRoute(path: string): void {
  const targets = prefetchMap[path]
  if (!targets) return

  for (const target of targets) {
    if (prefetched.has(target)) continue
    prefetched.add(target)

    const link = document.createElement('link')
    link.rel = 'prefetch'
    // Vite produces chunk filenames derived from the route path.
    // We use modulepreload for the route entry point.
    link.href = target
    link.as = 'document'
    document.head.appendChild(link)
  }
}

/**
 * Attach mouseenter / focus listeners to all `<a>` elements whose href
 * starts with `/#/` so we prefetch the target route on hover/focus.
 *
 * Call once after initial render (e.g. in App.tsx useEffect).
 */
export function setupPrefetchListeners(): () => void {
  const handler = (event: Event) => {
    const target = event.target
    // event.target can be a Text node or other non-Element — guard before calling .closest()
    if (!(target instanceof Element)) return
    const anchor = target.closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href')
    if (!href || !href.startsWith('/#/')) return

    // Strip the hash prefix to get the route path
    const route = href.replace('/#', '')
    prefetchRoute(route)
  }

  document.addEventListener('mouseenter', handler, { capture: true, passive: true })
  document.addEventListener('focusin', handler, { capture: true, passive: true })

  // Return cleanup function
  return () => {
    document.removeEventListener('mouseenter', handler, { capture: true })
    document.removeEventListener('focusin', handler, { capture: true })
  }
}
