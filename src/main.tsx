import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { AppProviders } from './app/providers'
import { validateEnv } from './config/env.schema'
import { useToast } from './hooks/useToast'
import { initSentry } from './utils/sentry'
import { reportWebVitals } from './utils/webVitals'

// Validate env vars before anything else — fails fast with helpful message
validateEnv()

// Initialise Sentry before rendering so errors during boot are captured
initSentry()

// Guard to prevent double-firing auth redirects from concurrent request failures
let authRedirectPending = false

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
    console.error('[Unhandled Rejection]', reason)
  }

  // 1. Chunk / dynamic import failure → dismissable toast with reload action
  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Importing a module script failed') ||
    message.includes('Loading CSS chunk')
  ) {
    useToast.getState().addToast({
      type: 'warning',
      message: 'Versi baru tersedia',
      description: 'Klik "Muat Ulang" untuk mendapatkan versi terbaru',
      action: { label: 'Muat Ulang', onClick: () => window.location.reload() },
      duration: Infinity,
    })
    return
  }

  // 2. Auth errors (401/403 or JWT-related) → redirect to login (guarded)
  const status = (reason as { status?: number })?.status
  if ((status === 401 || status === 403 || message.includes('JWT')) && !authRedirectPending) {
    authRedirectPending = true
    window.location.hash = '#/login'
    setTimeout(() => {
      authRedirectPending = false
    }, 2000)
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
