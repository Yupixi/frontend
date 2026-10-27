// Coming back from Facebook's OAuth dialog (/connexion/facebook?code=…):
// read at start-up (main.tsx), before the app rewrites the address, and
// handed once to the sign-in screen or « Paramètres › Connexion ».
import authPhone from '../i18n/ns/authPhone'

export const FACEBOOK_GRAPH_VERSION = 'v21.0'
export const FACEBOOK_CALLBACK_PATH = '/connexion/facebook'

// What the page asked Facebook for (checked on the way back: `state`).
const FB_STATE_KEY = 'dilchap_fb_state'
export type FacebookIntent = { mode: 'login' | 'link'; state: string; country: string }

export function startFacebook(appId: string, mode: FacebookIntent['mode'], country: string) {
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
  try { sessionStorage.setItem(FB_STATE_KEY, JSON.stringify({ mode, state, country } satisfies FacebookIntent)) } catch { /* private mode: the state check fails, the visitor tries again */ }
  const u = new URL(`https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`)
  u.searchParams.set('client_id', appId)
  u.searchParams.set('redirect_uri', facebookRedirectUri())
  u.searchParams.set('state', state)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('scope', 'public_profile,email')
  window.location.assign(u.toString())
}

export const facebookRedirectUri = () => `${window.location.origin}${FACEBOOK_CALLBACK_PATH}`

/** Back from Facebook (/connexion/facebook?code=…&state=…): the code, once, if the state matches. */
function readFacebookReturn(): { code: string; intent: FacebookIntent } | { error: string } | null {
  if (window.location.pathname !== FACEBOOK_CALLBACK_PATH) return null
  const q = new URLSearchParams(window.location.search)
  let intent: FacebookIntent | null = null
  try { intent = JSON.parse(sessionStorage.getItem(FB_STATE_KEY) ?? 'null') as FacebookIntent | null } catch { intent = null }
  try { sessionStorage.removeItem(FB_STATE_KEY) } catch { /* ignore */ }
  // The code never stays in the address bar (nor in a recording).
  window.history.replaceState(window.history.state, '', intent?.mode === 'link' ? '/compte' : '/connexion')
  // Read at start-up, before English may be loaded: the message is a getter,
  // translated when shown.
  if (q.get('error')) {
    const key = q.get('error_reason') === 'user_denied' ? 'facebook.cancelled' : 'facebook.denied'
    return { get error() { return authPhone.t(key) } }
  }
  const code = q.get('code')
  if (!code || !intent || q.get('state') !== intent.state) return { get error() { return authPhone.t('facebook.expired') } }
  return { code, intent }
}

type FacebookReturn = ReturnType<typeof readFacebookReturn>
let captured: FacebookReturn = null
/** main.tsx: reads (and clears) the return address once. */
export function captureFacebookReturn() { captured = readFacebookReturn() }
/** The return from Facebook for `mode` (sign-in or linking), once; null when none. */
export function takeFacebookReturn(mode: FacebookIntent['mode']): FacebookReturn {
  const out = captured
  if (!out) return null
  const forMode = 'intent' in out ? out.intent.mode === mode : mode === 'login'
  if (!forMode) return null
  captured = null
  return out
}
