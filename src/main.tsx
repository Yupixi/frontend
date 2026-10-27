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
import { captureCampaignParams } from './lib/campaignParams'
import { captureFacebookReturn } from './lib/facebookReturn'
import { startPwaTracking } from './lib/pwaInstall'
import { getStoredLocation } from './lib/location'
import { useLocale } from './i18n'
import { applyLocale, loadEnglish } from './i18n/core'
import { bootLocale, setLocaleSwitcher } from './i18n/locale'

// /q/<code> (printed QR codes of the shops): a page of its own, outside the
// app and the launch gate (it shows the launch page itself).
const isQrPath = (pathname: string) => /^\/q\/[^/]+\/?$/.test(pathname)
const QrLandingPage = lazy(() => import('./components/QrLandingPage'))
// /v/<code> (one-click confirmation link sent by SMS): same, it works
// before the launch.
const isVerifyLinkPath = (pathname: string) => /^\/v\/[^/]+\/?$/.test(pathname)
const VerifyLinkPage = lazy(() => import('./components/VerifyLinkPage'))

// The entry script ran: index.html's stale-build guard stands down (a lazy
// chunk that fails from now on is lib/lazyPage's and the ErrorBoundaries').
;(window as Window & { __dilchapBooted?: boolean }).__dilchapBooted = true

registerServiceWorker()

// Ad campaign parameters (?utm_…, ?fbclid=…, ?gclid=…): kept aside for the
// measurement tools (after consent) and taken off the address bar.
captureCampaignParams()

// Back from Facebook's sign-in dialog: the code is kept aside, the address
// cleaned before anything (Clarity, analytics) can see it.
captureFacebookReturn()

// Installed app: opened from its icon or in the browser (once a day per
// device), and the browser's install event — sent in one batch later.
startPwaTracking()

// Another language: its strings first, then the API's content asked again
// in it (empty cache), and the whole tree mounted afresh (LocalizedRoot).
setLocaleSwitcher(async (locale) => {
  if (locale === 'en') await loadEnglish()
  await apolloClient.clearStore().catch(() => undefined)
  await applyLocale(locale)
})

function LocalizedRoot({ children }: { children: React.ReactNode }) {
  return <React.Fragment key={useLocale()}>{children}</React.Fragment>
}

const render = () => ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Last resort: an error no page boundary caught (App's shell, the
        launch gate…) shows « Une erreur est survenue » instead of a blank page. */}
    <ErrorBoundary fullScreen>
      <ApolloProvider client={apolloClient}>
        <LocalizedRoot>
        {/* The links of our e-mails work even before the launch. */}
        {isEmailLinkPath(window.location.pathname) ? (
          <EmailLinkPage />
        ) : isQrPath(window.location.pathname) ? (
          <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
            <QrLandingPage />
          </Suspense>
        ) : isVerifyLinkPath(window.location.pathname) ? (
          <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
            <VerifyLinkPage />
          </Suspense>
        ) : (
          <LaunchGate>
            <App />
          </LaunchGate>
        )}
        </LocalizedRoot>
      </ApolloProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

// English is loaded before the first render (French is in the bundle).
void bootLocale(getStoredLocation()?.countryCode).then(render)
