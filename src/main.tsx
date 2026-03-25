import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { AppProviders } from './app/providers'
import { initSentry } from './utils/sentry'
import { reportWebVitals } from './utils/webVitals'

// Initialise Sentry before rendering so errors during boot are captured
initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
)

reportWebVitals()
