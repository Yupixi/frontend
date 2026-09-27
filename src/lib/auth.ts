const ACCESS_TOKEN_KEY = 'yupixi_access_token'
const REFRESH_TOKEN_KEY = 'yupixi_refresh_token'
const GUEST_SECRET_KEY = 'yupixi_guest_secret'

// Dispatched when a stored refresh token is rejected by the server (expired
// or revoked) so React state outside Apollo's non-reactive client module
// (App.tsx's isLoggedIn/currentUser) can react and stop showing a stale
// logged-in UI.
export const SESSION_EXPIRED_EVENT = 'yupixi:session-expired'

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

// A guest identity (see GuestForm) can only be resumed by the browser that
// created it: the server hands this secret out once and asks for it again.
// Kept across logouts/expired sessions, unlike the tokens.
export function storeGuestSecret(secret: string | null | undefined) {
  if (secret) localStorage.setItem(GUEST_SECRET_KEY, secret)
}

export function getGuestSecret(): string | null {
  return localStorage.getItem(GUEST_SECRET_KEY)
}

// Seconds-precision `exp` of a JWT, null if unreadable.
export function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}
