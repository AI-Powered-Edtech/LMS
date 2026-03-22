/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { MotionConfig } from 'motion/react'

import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
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
        <ToastProvider>
          <AuthProvider>
            <OfflineIndicator />
            <SessionManager />
            <Router>
              <AppRoutes />
            </Router>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
    </MotionConfig>
  )
}
