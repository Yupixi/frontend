import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from './Icon'
import {
  LINK_FACEBOOK_MUTATION, LINK_GOOGLE_MUTATION, ME_QUERY, MY_LOGIN_METHODS_QUERY, SET_PASSWORD_MUTATION, SOCIAL_LOGIN_CONFIG_QUERY, UNLINK_IDENTITY_MUTATION,
  type LoginMethods, type SocialLoginConfig,
} from '../graphql/auth'
import { facebookRedirectUri, inAppBrowser, loadGoogle, startFacebook, takeFacebookReturn } from '../lib/social'
import { useMemberCountryCode } from '../lib/countries'
import { getLocale, useT } from '../i18n'
import auth from '../i18n/ns/auth'
import common from '../i18n/ns/common'

const row = 'mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3'
const smallBtn = 'cursor-pointer rounded-lg border border-solid border-outline-variant bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface disabled:opacity-50'
const field = 'h-10 min-w-0 flex-1 rounded-lg border-none bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:ring-1 focus:ring-primary'

// Paramètres › Sécurité: « Choisir un mot de passe » for an account that has
// none (SMS code, Google, Facebook), and the Google / Facebook accounts
// linked to it (« Connexion »). The server always keeps one way to log in.
export default function LoginMethodsCard() {
  const t = useT(auth)
  const tc = useT(common)
  const country = useMemberCountryCode() ?? 'CI'
  const { data, refetch } = useQuery<{ myLoginMethods: LoginMethods }>(MY_LOGIN_METHODS_QUERY, { fetchPolicy: 'cache-and-network' })
  const { data: cfgData } = useQuery<{ socialLoginConfig: SocialLoginConfig }>(SOCIAL_LOGIN_CONFIG_QUERY, { variables: { country } })
  const m = data?.myLoginMethods
  const cfg = cfgData?.socialLoginConfig
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pw, setPw] = useState('')
  const [setPassword, { loading: savingPw }] = useMutation(SET_PASSWORD_MUTATION, { refetchQueries: [{ query: ME_QUERY }] })
  const [linkGoogle] = useMutation(LINK_GOOGLE_MUTATION)
  const [linkFacebook] = useMutation(LINK_FACEBOOK_MUTATION)
  const [unlink, { loading: unlinking }] = useMutation(UNLINK_IDENTITY_MUTATION)
  const googleBox = useRef<HTMLDivElement>(null)
  const done = (text: string) => () => { setMsg({ ok: true, text }); void refetch() }
  const fail = (e: unknown) => setMsg({ ok: false, text: (e as Error).message })

  // Back from Facebook (« Relier Facebook »).
  useEffect(() => {
    const back = takeFacebookReturn('link')
    if (!back) return
    if ('error' in back) { setMsg({ ok: false, text: back.error }); return }
    void linkFacebook({ variables: { input: { code: back.code, redirectUri: facebookRedirectUri(), countryCode: back.intent.country } } }).then(done(auth.t('methods.facebookLinked')), fail)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const googleLinked = m?.identities.find(i => i.provider === 'GOOGLE')
  const facebookLinked = m?.identities.find(i => i.provider === 'FACEBOOK')
  const clientId = cfg?.google.enabled && !googleLinked && !inAppBrowser() ? cfg.google.clientId : null
  useEffect(() => {
    if (!clientId || !googleBox.current) return
    let cancelled = false
    void loadGoogle().then(g => {
      if (cancelled || !googleBox.current) return
      g.initialize({
        client_id: clientId, ux_mode: 'popup',
        callback: (res: { credential?: string }) => {
          if (res.credential) void linkGoogle({ variables: { input: { idToken: res.credential, countryCode: country } } }).then(done(auth.t('methods.googleLinked')), fail)
        },
      })
      g.renderButton(googleBox.current, { type: 'standard', theme: 'outline', size: 'medium', text: 'continue_with', shape: 'pill', locale: getLocale() })
    }).catch(() => undefined)
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  if (!m) return null
  const providers = [
    cfg?.google.enabled || googleLinked ? { key: 'GOOGLE' as const, label: 'Google', linked: googleLinked } : null,
    cfg?.facebook.enabled || facebookLinked ? { key: 'FACEBOOK' as const, label: 'Facebook', linked: facebookLinked } : null,
  ].filter(Boolean) as { key: 'GOOGLE' | 'FACEBOOK'; label: string; linked?: LoginMethods['identities'][number] }[]
  return (
    <>
      {!m.hasPassword && (
        <div className={row}>
          <Icon name="password" size={22} className="text-on-surface-variant" />
          <div className="min-w-[12rem] flex-1">
            <div className="text-label-md text-on-surface">{t('methods.choosePassword')}</div>
            <div className="text-body-sm text-on-surface-variant">{m.smsLogin ? t('methods.noPasswordSms') : t('methods.noPasswordSocial')}</div>
          </div>
          <form onSubmit={e => { e.preventDefault(); void setPassword({ variables: { input: { newPassword: pw } } }).then(() => { setPw(''); done(t('methods.passwordSaved'))() }, fail) }} className="flex w-full flex-col gap-2 sm:flex-row">
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder={t('password.min')} autoComplete="new-password" className={field} />
            <button type="submit" disabled={savingPw || pw.length < 8} className="shrink-0 cursor-pointer rounded-xl border-none bg-primary px-4 py-2 text-label-md text-white disabled:opacity-50">{savingPw ? tc('saving') : tc('save')}</button>
          </form>
        </div>
      )}
      {providers.length > 0 && (
        <div className={row}>
          <Icon name="login" size={22} className="text-on-surface-variant" />
          <div className="min-w-[12rem] flex-1">
            <div className="text-label-md text-on-surface">{t('methods.socialTitle')}</div>
            <div className="text-body-sm text-on-surface-variant">{t('methods.socialText')}</div>
          </div>
          <div className="flex w-full flex-col gap-2">
            {providers.map(p => (
              <div key={p.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-lowest px-3 py-2">
                <span className="min-w-0 text-body-sm text-on-surface"><b className="font-semibold">{p.label}</b> {p.linked ? (p.linked.email ? t('methods.linkedEmail', { email: p.linked.email }) : t('methods.linked')) : <span className="text-on-surface-variant">{t('methods.notLinked')}</span>}</span>
                {p.linked
                  ? <button type="button" disabled={unlinking} onClick={() => void unlink({ variables: { provider: p.key } }).then(done(t('methods.removed', { provider: p.label })), fail)} className={smallBtn}>{t('methods.remove')}</button>
                  : p.key === 'GOOGLE'
                    ? (inAppBrowser() ? <span className="text-body-sm text-on-surface-variant">{t('methods.openInBrowser')}</span> : <div ref={googleBox} />)
                    : <button type="button" onClick={() => cfg?.facebook.appId && startFacebook(cfg.facebook.appId, 'link', country)} className={smallBtn}>{t('methods.linkFacebook')}</button>}
              </div>
            ))}
          </div>
        </div>
      )}
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`m-0 mt-2 text-body-sm ${msg.ok ? 'text-tertiary' : 'text-primary'}`}>{msg.text}</p>}
    </>
  )
}
