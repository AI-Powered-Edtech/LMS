/**
 * @licens
 * SPDX-License-Ide: Apache-2.
 */

import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'

import { AppRoutes } from './app/routes'
import { OfflineIndicator } from './components/OfflineIndicator'
import { PWAInstallBanner } from './components/PWAInstallBanner'
import { PWAUpdateToast } from './components/PWAUpdateToast'
import { SessionManager } from './components/SessionManager'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ToastContainer } from './components/ui/Toast'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SkipToContent } from './features/accessibility'
import { setupPrefetchListeners } from './utils/prefetch'

export default function App() {
  useEffect(() => {
    const cleanup = setupPrefetchListeners()
    return cleanup
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <SkipToContent />
              <ToastContainer />
              <OfflineIndicator />
              <PWAUpdateToast />
              <PWAInstallBanner />
              <SessionManager />
              <main id="main-content" tabIndex={-1} className="outline-none">
                <AppRoutes />
              </main>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </MotionConfig>
  )
}
