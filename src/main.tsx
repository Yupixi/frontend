import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import { apolloClient } from './lib/apollo'
import { registerServiceWorker } from './lib/serviceWorker'
import App from './App'
import LaunchGate from './components/LaunchGate'
import EmailLinkPage, { isEmailLinkPath } from './components/EmailLinkPage'
import './index.css'

registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      {/* The links of our e-mails work even before the launch. */}
      {isEmailLinkPath(window.location.pathname) ? (
        <EmailLinkPage />
      ) : (
        <LaunchGate>
          <App />
        </LaunchGate>
      )}
    </ApolloProvider>
  </React.StrictMode>,
)
