// « Continuer avec Google / Facebook » in the browser. Loaded only on the
// sign-in / sign-up screens and in « Paramètres › Connexion », only when the
// BO switched the provider on (socialLoginConfig): these are functional
// (signing in), not measurement, so no consent banner gates them — and no
// other page ever loads them.
//
// Google: Google Identity Services (accounts.google.com/gsi/client) renders
// its button and gives the page an ID token, checked by our server.
// Facebook: no Facebook script at all — the page goes to Facebook's OAuth
// dialog and comes back to /connexion/facebook with a `code` the server
// exchanges (it also works inside Facebook's own in-app browser).

const GSI_SRC = 'https://accounts.google.com/gsi/client'

type GoogleId = {
  initialize: (o: Record<string, unknown>) => void
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
  cancel: () => void
}
declare global {
  interface Window { google?: { accounts?: { id?: GoogleId } } }
}

let gsi: Promise<GoogleId> | null = null
/** Google Identity Services, loaded once (rejects offline / blocked). */
export function loadGoogle(): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  gsi ??= new Promise<GoogleId>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.defer = true
    s.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('gsi')))
    s.onerror = () => { gsi = null; reject(new Error('gsi')) }
    document.head.appendChild(s)
  })
  return gsi
}

/** Facebook's, Instagram's or Messenger's in-app browser (Google refuses to sign in there). */
export const inAppBrowser = () => /FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(navigator.userAgent)

export { FACEBOOK_CALLBACK_PATH, facebookRedirectUri, startFacebook, takeFacebookReturn, type FacebookIntent } from './facebookReturn'
