import { useCallback, useEffect, useState } from 'react'

interface MobileBuilderState {
  isMobile: boolean // < 768px
  isTablet: boolean // 768-1024px
  isDesktop: boolean // > 1024px
  sidebarOpen: boolean
  orientation: 'portrait' | 'landscape'
  toggleSidebar: () => void
  closeSidebar: () => void
  openSidebar: () => void
}

export function useMobileBuilder(): MobileBuilderState {
  const [viewport, setViewport] = useState(() => getViewport())
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1024)

  useEffect(() => {
    const mqlMobile = window.matchMedia('(max-width: 767px)')
    const mqlTablet = window.matchMedia('(min-width: 768px) and (max-width: 1024px)')
    const mqlLandscape = window.matchMedia('(orientation: landscape)')

    const update = () => {
      const vp = getViewport()
      setViewport(vp)
      // Auto-close sidebar when resizing to mobile
      if (vp.isMobile || vp.isTablet) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    mqlMobile.addEventListener('change', update)
    mqlTablet.addEventListener('change', update)
    mqlLandscape.addEventListener('change', update)

    return () => {
      mqlMobile.removeEventListener('change', update)
      mqlTablet.removeEventListener('change', update)
      mqlLandscape.removeEventListener('change', update)
    }
  }, [])

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const openSidebar = useCallback(() => setSidebarOpen(true), [])

  return {
    ...viewport,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
    openSidebar,
  }
}

function getViewport() {
  const w = window.innerWidth
  return {
    isMobile: w < 768,
    isTablet: w >= 768 && w <= 1024,
    isDesktop: w > 1024,
    orientation: (window.innerHeight > window.innerWidth ? 'portrait' : 'landscape') as
      | 'portrait'
      | 'landscape',
  }
}
