import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import AppRouter from './AppRouter.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import CRMProviders from './crm/CRMProviders.jsx'
import { LanguageProvider } from './lib/i18n.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CRMProviders>
          <LanguageProvider>
            <AppErrorBoundary>
              <AppRouter />
            </AppErrorBoundary>
          </LanguageProvider>
        </CRMProviders>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

const SERVICE_WORKER_RESET_KEY = 'nexora-sw-reset-v3'

async function clearStaleServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations?.()
  await Promise.all((registrations || []).map((registration) => registration.unregister()))
  if ('caches' in window) {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.filter((name) => name.startsWith('nexora-pwa-')).map((name) => caches.delete(name)))
  }
}

if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (window.localStorage.getItem(SERVICE_WORKER_RESET_KEY) !== 'done') {
      clearStaleServiceWorkers()
        .then(() => {
          window.localStorage.setItem(SERVICE_WORKER_RESET_KEY, 'done')
          window.location.reload()
        })
        .catch(() => {
          window.localStorage.setItem(SERVICE_WORKER_RESET_KEY, 'done')
          navigator.serviceWorker.register('/service-worker.js').catch(() => {})
        })
      return
    }
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  clearStaleServiceWorkers().catch(() => {})
}
