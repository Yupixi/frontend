import { useEffect, useRef } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from './Icon'
import { Shell } from './EmailLinkPage'
import { CONFIRM_ACCOUNT_LINK_MUTATION } from '../graphql/phoneVerification'
import { announceAccountVerified } from '../lib/accountVerify'
import { previewKey } from '../lib/launch'
import { useT } from '../i18n'
import verifyNs from '../i18n/ns/verify'

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
  const t = useT(verifyNs)
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
  useNoIndex(state === 'CONFIRMED' ? t('link.titleConfirmed') : t('link.titlePending'))
  // The real site for testers who hold the preview key on this browser
  // (LaunchGate reads it), the launch page for everyone else.
  const go = (to: string) => { previewKey(); window.location.assign(to) }

  if (!data && !error)
    return (
      <Shell icon="hourglass_top" tone="info" title={t('link.confirming')}>
        <p className="m-0">{t('link.confirmingText')}</p>
      </Shell>
    )
  if (state === 'CONFIRMED')
    return (
      <Shell icon="verified_user" tone="ok" title={t('link.confirmed')}>
        <p className="m-0">{t('link.confirmedText')}</p>
        <button onClick={() => go('/')} className={`${btn} mt-6`}>{t('continueOnDilchap')} <Icon name="arrow_forward" size={19} /></button>
      </Shell>
    )
  return (
    <Shell icon="link_off" tone="err" title={t('link.expired')}>
      <p className="m-0">{error ? t('link.error') : t('link.invalid')}</p>
      <p className="m-0 mt-2">{t.rich('link.howTo', { b: c => <b>{c}</b> })}</p>
      <button onClick={() => go('/compte')} className={`${btn} mt-6`}><Icon name="sms" size={19} /> {t('getSmsCode')}</button>
    </Shell>
  )
}
