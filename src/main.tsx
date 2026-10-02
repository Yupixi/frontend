import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import { apolloClient } from './lib/apollo'
import { registerServiceWorker } from './lib/serviceWorker'
import App from './App'
import LaunchGate from './components/LaunchGate'
import ErrorBoundary from './components/ErrorBoundary'
import EmailLinkPage, { isEmailLinkPath } from './components/EmailLinkPage'
import './index.css'

// /q/<code> (printed QR codes of the shops): a page of its own, outside the
// app and the launch gate (it shows the launch page itself).
const isQrPath = (pathname: string) => /^\/q\/[^/]+\/?$/.test(pathname)
const QrLandingPage = lazy(() => import('./components/QrLandingPage'))

// The entry script ran: index.html's stale-build guard stands down (a lazy
// chunk that fails from now on is lib/lazyPage's and the ErrorBoundaries').
;(window as Window & { __dilchapBooted?: boolean }).__dilchapBooted = true

registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Last resort: an error no page boundary caught (App's shell, the
        launch gate…) shows « Une erreur est survenue » instead of a blank page. */}
    <ErrorBoundary fullScreen>
      <ApolloProvider client={apolloClient}>
        {/* The links of our e-mails work even before the launch. */}
        {isEmailLinkPath(window.location.pathname) ? (
          <EmailLinkPage />
        ) : isQrPath(window.location.pathname) ? (
          <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
            <QrLandingPage />
          </Suspense>
        ) : (
          <LaunchGate>
            <App />
          </LaunchGate>
        )}
      </ApolloProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
