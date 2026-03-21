import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './app/providers'
import App from './App.tsx'
import './index.css'
import { reportWebVitals } from './utils/webVitals'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
)

reportWebVitals()
