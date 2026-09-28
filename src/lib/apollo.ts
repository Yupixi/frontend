import { ApolloClient, InMemoryCache, HttpLink, from, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { ErrorLink } from '@apollo/client/link/error'
import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { setContext } from '@apollo/client/link/context'
import { createClient } from 'graphql-ws'
import { Observable } from 'rxjs'
import { clearTokens, dropLegacyRefreshToken, getAccessToken, getLegacyRefreshToken, storeAccessToken, storeGuestSecret, tokenExpiry, SESSION_EXPIRED_EVENT } from './auth'

// A deployed browser must never call its own `localhost`; only local
// development uses the separate Nest server. In production the API is served
// from the same public origin (or can be overridden explicitly).
const defaultGraphqlUrl = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000/graphql'
  : `${window.location.origin}/graphql`
export const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_API_URL || defaultGraphqlUrl
const GRAPHQL_WS_URL = GRAPHQL_URL.replace(/^http/, 'ws')

// credentials: the refresh token travels as the API's HttpOnly cookie.
const httpLink = new HttpLink({ uri: GRAPHQL_URL, credentials: 'include' })

// The server closes a socket (4403) once its token expires or is revoked;
// the client then reconnects, so connectionParams reads localStorage fresh
// on every (re)connect and refreshes the access token first when it is
// expired or was just refused.
let wsTokenRefused = false
const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_URL,
    connectionParams: async () => {
      let token = getAccessToken()
      const exp = token ? tokenExpiry(token) : null
      if (token && (wsTokenRefused || (exp != null && exp * 1000 < Date.now() + 10_000))) {
        refreshPromise = refreshPromise ?? refreshAccessToken()
        token = await refreshPromise.finally(() => { refreshPromise = null })
      }
      wsTokenRefused = false
      return token ? { authorization: `Bearer ${token}` } : {}
    },
    on: {
      closed: (event) => {
        if ((event as { code?: number }).code === 4403) wsTokenRefused = true
      },
    },
  }),
)

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken()
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }
})

// A single in-flight refresh is shared across concurrent 401s so a page that
// fires several queries at once doesn't spend multiple refresh tokens.
let refreshPromise: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  // The cookie is invisible from here: the stored (possibly expired) access
  // token is what says there's a session worth refreshing.
  const legacy = getLegacyRefreshToken()
  if (!getAccessToken() && !legacy) return null

  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        // A pre-cookie session sends its stored token once; the server
        // answers with the cookie from then on.
        query: `mutation($rt: String) { refreshToken(refreshToken: $rt) { accessToken guestSecret } }`,
        variables: { rt: legacy },
      }),
    })
    const json = await res.json()
    const tokens = json.data?.refreshToken
    if (!tokens) {
      clearTokens()
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      return null
    }
    storeAccessToken(tokens.accessToken)
    dropLegacyRefreshToken()
    storeGuestSecret(tokens.guestSecret)
    return tokens.accessToken as string
  } catch {
    return null
  }
}

const errorLink = new ErrorLink(({ error, operation, forward }) => {
  if (!CombinedGraphQLErrors.is(error)) return
  const unauthenticated = error.errors.some((e) => e.extensions?.code === 'UNAUTHENTICATED')
  if (!unauthenticated) return

  return new Observable((observer) => {
    refreshPromise = refreshPromise ?? refreshAccessToken()
    refreshPromise.then((newToken) => {
      refreshPromise = null
      if (!newToken) {
        observer.error(error)
        return
      }
      operation.setContext(({ headers }: { headers?: Record<string, string> }) => ({
        headers: { ...headers, authorization: `Bearer ${newToken}` },
      }))
      forward(operation).subscribe({
        next: (result) => observer.next(result),
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      })
    })
  })
})

const httpChain = from([errorLink, authLink, httpLink])

// Subscriptions ride the WS link (no HTTP request to authenticate/refresh
// against, hence not part of the auth/error chain above); everything else
// keeps going through the existing HTTP pipeline.
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
  },
  wsLink,
  httpChain,
)

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    // Polled badges (notifications, conversations…) stop polling while the
    // tab is hidden — a locked phone or a background tab kept hitting the API
    // every 15-30 s for counts nobody was looking at.
    watchQuery: { skipPollAttempt: () => document.hidden },
  },
})
