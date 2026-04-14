import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { logger } from '@/src/utils/logger'

import App from './App.tsx'
import { AppProviders } from './app/providers'
import { useToast } from './hooks/useToast'
import { initSentry } from './utils/sentry'
import { reportWebVitals } from './utils/webVitals'

// Initialise Sentry before rendering so errors during boot are captured
initSentry()

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const reason = event.reason
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : 'Kesalahan tidak terduga'

  if (import.meta.env.DEV) {
    logger.error('[Unhandled Rejection]', reason)
  }

  // 1. Chunk / dynamic import failure → prompt reload
  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Importing a module script failed') ||
    message.includes('Loading CSS chunk')
  ) {
    useToast.getState().addToast({
      type: 'warning',
      message: 'Perbarui halaman untuk mendapatkan versi terbaru',
      description: 'Klik untuk memuat ulang',
    })
    // Auto-reload after a brief delay so the toast is visible
    setTimeout(() => window.location.reload(), 2000)
    return
  }

  // 2. Auth errors (401/403 or JWT-related) → redirect to login
  const status = (reason as { status?: number })?.status
  if (status === 401 || status === 403 || message.includes('JWT')) {
    window.location.hash = '#/login'
    return
  }

  // 3. Generic fallback
  useToast.getState().addToast({
    type: 'error',
    message: 'Terjadi kesalahan tak terduga',
    description: import.meta.env.DEV ? message : undefined,
  })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
)

reportWebVitals()
