import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './app/providers'
import App from './App.tsx'
import './index.css'
import { reportWebVitals } from './utils/webVitals'
import { initSentry } from './utils/sentry'

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
