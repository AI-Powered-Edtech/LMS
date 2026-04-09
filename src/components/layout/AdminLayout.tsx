import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary'
import { AdminSidebar } from '@/components/navigation/AdminSidebar'
import { useAuth } from '@/contexts/AuthContext'
import { OnboardingChecklist } from '@/features/onboarding'
import { useToast } from '@/hooks/useToast'

import { HelpButton } from '../ui/HelpButton'
import { Header } from './Header'
import { MobileSidebar } from './MobileSidebar'
import { RouteAnnouncer } from './RouteAnnouncer'

const hiddenNavPaths = ['/lesson', '/grader', '/kiosk']

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHidden = hiddenNavPaths.includes(location.pathname)
  const { sessionExpired } = useAuth()
  const addToast = useToast((s) => s.addToast)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Redirect to login with toast when session expires
  useEffect(() => {
    if (sessionExpired) {
      addToast({ type: 'warning', message: 'Sesi Anda telah berakhir' })
      void navigate('/login', { replace: true })
    }
  }, [sessionExpired, addToast, navigate])

  return (
    <div className="flex h-[100dvh] overflow-hidden font-sans flex-col transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <RouteAnnouncer />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Langsung ke konten utama
      </a>
      <div className="flex-1 flex overflow-hidden relative">
        {!isHidden && (
          <>
            <AdminSidebar />
            <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
          </>
        )}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {!isHidden && <Header onMenuClick={() => setIsMobileMenuOpen(true)} />}
          <main
            id="main-content"
            tabIndex={-1}
            className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col outline-none ${isHidden ? 'p-0' : 'p-2 sm:p-4 md:p-8 pb-24 md:pb-8'}`}
          >
            <AnimatePresence mode="sync">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`${isHidden ? 'max-w-none' : 'max-w-5xl'} mx-auto w-full flex-1 flex flex-col`}
              >
                <FeatureErrorBoundary>
                  <Outlet />
                </FeatureErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      {!isHidden && <HelpButton />}
      <OnboardingChecklist />
    </div>
  )
}
