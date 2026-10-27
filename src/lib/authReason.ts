// Why the visitor was sent to the login screen (favourite, offer…), so it
// can say it. Set right before navigating; short-lived so a stale value
// never shows on a later, deliberate visit. Lives outside pages/Auth so the
// storefront can set it without pulling the (lazy) auth page into its bundle.
const REASON_KEY = 'dilchap_auth_reason'
// The sentence of each reason: i18n auth `reason.<key>` (pages/Auth).
export const AUTH_REASONS = {
  favorite: { icon: 'favorite' },
  offer: { icon: 'sell' },
  follow: { icon: 'person_add' },
  report: { icon: 'flag' },
  alert: { icon: 'notifications' },
  contact: { icon: 'chat' },
  adult: { icon: 'lock' },
} as const
export type AuthReason = keyof typeof AUTH_REASONS
export const setAuthReason = (reason: AuthReason) => {
  try { sessionStorage.setItem(REASON_KEY, JSON.stringify({ reason, at: Date.now() })) } catch { /* private mode */ }
}
export const takeAuthReason = (): AuthReason | null => {
  try {
    const raw = sessionStorage.getItem(REASON_KEY)
    sessionStorage.removeItem(REASON_KEY)
    if (!raw) return null
    const { reason, at } = JSON.parse(raw) as { reason: AuthReason; at: number }
    return Date.now() - at < 5000 && reason in AUTH_REASONS ? reason : null
  } catch { return null }
}
