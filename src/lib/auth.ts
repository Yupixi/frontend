const ACCESS_TOKEN_KEY = 'yupixi_access_token'
// The refresh token is an HttpOnly cookie set by the API (yupixi_rt), out of
// reach of page scripts. Browsers logged in before that still hold one here
// until their next refresh or logout hands it to the server once.
const LEGACY_REFRESH_TOKEN_KEY = 'yupixi_refresh_token'
const GUEST_SECRET_KEY = 'yupixi_guest_secret'

// Dispatched when a stored refresh token is rejected by the server (expired
// or revoked) so React state outside Apollo's non-reactive client module
// (App.tsx's isLoggedIn/currentUser) can react and stop showing a stale
// logged-in UI.
export const SESSION_EXPIRED_EVENT = 'yupixi:session-expired'

// Blocked storage (cookies disabled, some in-app WebViews) throws a
// SecurityError on access: the visitor is then just signed out, never a
// blank page.
function read(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch { /* storage unavailable */ }
}

export function storeAccessToken(accessToken: string) {
  write(ACCESS_TOKEN_KEY, accessToken)
}

export function clearTokens() {
  write(ACCESS_TOKEN_KEY, null)
  write(LEGACY_REFRESH_TOKEN_KEY, null)
}

export function getAccessToken(): string | null {
  return read(ACCESS_TOKEN_KEY)
}

export function getLegacyRefreshToken(): string | null {
  return read(LEGACY_REFRESH_TOKEN_KEY)
}

export function dropLegacyRefreshToken() {
  write(LEGACY_REFRESH_TOKEN_KEY, null)
}

// A guest identity (see GuestForm) can only be resumed by the browser that
// created it: the server hands this secret out once and asks for it again.
// Kept across logouts/expired sessions, unlike the tokens.
export function storeGuestSecret(secret: string | null | undefined) {
  if (secret) write(GUEST_SECRET_KEY, secret)
}

export function getGuestSecret(): string | null {
  return read(GUEST_SECRET_KEY)
}

function tokenPayload(token: string): { exp?: unknown; sub?: unknown } | null {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: unknown; sub?: unknown }
  } catch {
    return null
  }
}

// Seconds-precision `exp` of a JWT, null if unreadable.
export function tokenExpiry(token: string): number | null {
  const exp = tokenPayload(token)?.exp
  return typeof exp === 'number' ? exp : null
}

// Account id of the stored session (JWT `sub`), readable before `me` answers.
export function sessionUserId(): string | null {
  const token = getAccessToken()
  const sub = token ? tokenPayload(token)?.sub : null
  return typeof sub === 'string' ? sub : null
}
