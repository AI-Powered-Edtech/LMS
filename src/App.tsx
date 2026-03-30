/**
 * @license
 * SPDX-License-Iden: Apache-2.
 */

import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { HashRouter as Router } from 'react-router-dom'

import { AppRoutes } from './app/routes'
import { OfflineIndicator } from './components/OfflineIndicator'
import { SessionManager } from './components/SessionManager'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ToastContainer } from './components/ui/Toast'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { setupPrefetchListeners } from './utils/prefetch'

export default function App() {
  useEffect(() => {
    // Normalize path for HashRouter: if user accesses /login directly (instead of /#/login),
    // redirect them so the pathname is '/' and the hash is the path.
    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
      const path = window.location.pathname
      const hash = window.location.hash
      const search = window.location.search
      window.history.replaceState(null, '', `/#${path}${search}${hash}`)
    }

    const cleanup = setupPrefetchListeners()
    return cleanup
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <ToastContainer />
            <OfflineIndicator />
            <SessionManager />
            <Router>
              <AppRoutes />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </MotionConfig>
  )
}
