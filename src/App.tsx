/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { MotionConfig } from 'motion/react'

import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ToastContainer } from './components/ui/Toast'
import { OfflineIndicator } from './components/OfflineIndicator'
import { SessionManager } from './components/SessionManager'
import { ThemeProvider } from './contexts/ThemeContext'
import { setupPrefetchListeners } from './utils/prefetch'

import { AppRoutes } from './app/routes'

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
