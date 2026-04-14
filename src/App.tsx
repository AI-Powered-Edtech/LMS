/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect } from 'react'
import { HashRouter as Router } from 'react-router-dom'

import { AppRoutes } from './app/routes'
import { SessionManager } from './components/SessionManager'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ToastContainer } from './components/ui/Toast'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { setupPrefetchListeners } from './utils/prefetch'

const OfflineIndicator = lazy(() =>
  import('./components/OfflineIndicator').then((m) => ({ default: m.OfflineIndicator }))
)
const MotionConfigWrapper = lazy(() =>
  import('./app/providers').then((m) => ({ default: m.MotionConfigWrapper }))
)

export default function App() {
  useEffect(() => {
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
    <ErrorBoundary>
      <Suspense fallback={null}>
        <MotionConfigWrapper>
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
        </MotionConfigWrapper>
      </Suspense>
    </ErrorBoundary>
  )
}
