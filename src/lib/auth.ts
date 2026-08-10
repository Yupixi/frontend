const ACCESS_TOKEN_KEY = 'yupixi_access_token'
const REFRESH_TOKEN_KEY = 'yupixi_refresh_token'

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
