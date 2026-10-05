import { useEffect, useRef } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from './Icon'
import { Shell } from './EmailLinkPage'
import { CONFIRM_ACCOUNT_LINK_MUTATION } from '../graphql/phoneVerification'
import { announceAccountVerified } from '../lib/accountVerify'
import { previewKey } from '../lib/launch'

// /v/<code>: the one-click link sent by SMS (« Dilchap : confirmez votre
// compte en 1 clic »). A page of its own, outside the app and the launch
// page (like /q/), so it works before the launch. The storefront's server
// (Caddyfile → Backend /seo/v/<code>) only serves this page, noindex; the
// link is used here, through GraphQL, so a link preview never uses it up.
// Every failure — expired, used, unknown, number changed — gets the same
// answer.
const codeOf = (pathname: string) => decodeURIComponent(pathname.replace(/^\/v\//, '').replace(/\/+$/, '')).slice(0, 40)

const btn = 'flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-4 text-label-lg text-white no-underline hover:bg-primary-dark'

function useNoIndex(title: string) {
  useEffect(() => {
    document.title = title
    let m = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m) }
    m.content = 'noindex, nofollow'
  }, [title])
}

export default function VerifyLinkPage() {
  const code = codeOf(window.location.pathname)
  const [confirm, { data, error }] = useMutation<{ confirmAccountLink: { state: 'CONFIRMED' | 'INVALID' } }>(CONFIRM_ACCOUNT_LINK_MUTATION)
  const sent = useRef(false)
  useEffect(() => {
    // StrictMode mounts twice: one request only. (The code stays in the
    // address: it works once, and a reload must still find this page.)
    if (sent.current) return
    sent.current = true
    void confirm({ variables: { code } }).then(r => { if (r.data?.confirmAccountLink.state === 'CONFIRMED') announceAccountVerified() }).catch(() => undefined)
  }, [code, confirm])
  const state = data?.confirmAccountLink.state
  useNoIndex(state === 'CONFIRMED' ? 'Compte confirmé | Dilchap' : 'Confirmation du compte | Dilchap')
  // The real site for testers who hold the preview key on this browser
  // (LaunchGate reads it), the launch page for everyone else.
  const go = (to: string) => { previewKey(); window.location.assign(to) }

  if (!data && !error)
    return (
      <Shell icon="hourglass_top" tone="info" title="Confirmation…">
        <p className="m-0">Un instant, nous confirmons votre compte.</p>
      </Shell>
    )
  if (state === 'CONFIRMED')
    return (
      <Shell icon="verified_user" tone="ok" title="Compte confirmé">
        <p className="m-0">Merci ! Votre numéro est vérifié : vous pouvez publier des annonces, contacter les vendeurs et acheter des crédits.</p>
        <button onClick={() => go('/')} className={`${btn} mt-6`}>Continuer sur Dilchap <Icon name="arrow_forward" size={19} /></button>
      </Shell>
    )
  return (
    <Shell icon="link_off" tone="err" title="Lien expiré ou déjà utilisé">
      <p className="m-0">{error ? 'Impossible de vérifier ce lien pour le moment. Réessayez dans un instant.' : 'Ce lien de confirmation n’est plus valable : il a expiré, a déjà servi, ou votre numéro a changé.'}</p>
      <p className="m-0 mt-2">Connectez-vous : dans <b>Mon compte</b>, touchez <b>Recevoir un code par SMS</b> pour confirmer votre compte.</p>
      <button onClick={() => go('/compte')} className={`${btn} mt-6`}><Icon name="sms" size={19} /> Recevoir un code par SMS</button>
    </Shell>
  )
}
