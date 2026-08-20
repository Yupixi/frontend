import { ApolloClient, InMemoryCache, HttpLink, from, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { ErrorLink } from '@apollo/client/link/error'
import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { setContext } from '@apollo/client/link/context'
import { createClient } from 'graphql-ws'
import { Observable } from 'rxjs'
import { clearTokens, getAccessToken, getRefreshToken, storeTokens, SESSION_EXPIRED_EVENT } from './auth'

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_API_URL || 'http://localhost:3000/graphql'
const GRAPHQL_WS_URL = GRAPHQL_URL.replace(/^http/, 'ws')

const httpLink = new HttpLink({ uri: GRAPHQL_URL })

// The token can be refreshed mid-connection, so this reads localStorage
// fresh on every WS (re)connect rather than capturing it once at import time.
const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_URL,
    connectionParams: () => {
      const token = getAccessToken()
      return token ? { authorization: `Bearer ${token}` } : {}
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

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `mutation($rt: String!) { refreshToken(refreshToken: $rt) { accessToken refreshToken } }`,
        variables: { rt: refreshToken },
      }),
    })
    const json = await res.json()
    const tokens = json.data?.refreshToken
    if (!tokens) {
      clearTokens()
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      return null
    }
    storeTokens(tokens.accessToken, tokens.refreshToken)
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
})
