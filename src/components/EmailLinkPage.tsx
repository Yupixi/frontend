import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@apollo/client/react'
import DilchapLogo from './DilchapLogo'
import Icon from './Icon'
import { RESET_PASSWORD_MUTATION, UNSUBSCRIBE_EMAILS_MUTATION, VERIFY_EMAIL_MUTATION } from '../graphql/auth'

// The pages the links of our e-mails open (Backend MailModule):
// /verifier-email?token=… confirms the address, /nouveau-mot-de-passe?token=…
// sets a new password, /desabonnement?t=… stops a kind of e-mail (link at
// the bottom of activity e-mails). Shown on their own, outside the app.
export const EMAIL_LINK_PATHS = ['/verifier-email', '/nouveau-mot-de-passe', '/desabonnement']

export const isEmailLinkPath = (pathname: string) => EMAIL_LINK_PATHS.includes(pathname.replace(/\/+$/, ''))

// The token is read once, then dropped from the address bar (history,
// screenshots, Referer).
function useLinkToken(param = 'token') {
  const [token] = useState(() => {
    const url = new URL(window.location.href)
    const t = url.searchParams.get(param) ?? ''
    if (t) {
      url.searchParams.delete(param)
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    }
    return t
  })
  return token
}

const home = () => window.location.assign('/')
const btn = 'flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-4 text-label-lg text-white hover:bg-primary-dark disabled:opacity-60'

function Shell({ icon, tone, title, children }: { icon: string; tone: 'ok' | 'err' | 'info'; title: string; children: React.ReactNode }) {
  const toneCls = tone === 'ok' ? 'bg-tertiary-soft text-tertiary' : tone === 'err' ? 'bg-primary-fixed text-primary' : 'bg-surface-container-low text-on-surface-variant'
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-outline-variant/60 bg-surface-lowest p-6 text-center shadow-sm sm:p-8">
        <div className="flex justify-center"><DilchapLogo size="md" /></div>
        <span className={`mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full ${toneCls}`}><Icon name={icon} size={28} /></span>
        <h1 className="m-0 mt-4 text-headline-sm text-on-surface">{title}</h1>
        <div className="mt-2 text-body-md text-on-surface-variant">{children}</div>
      </div>
    </main>
  )
}

function VerifyEmail() {
  const token = useLinkToken()
  const [verify, { data, error }] = useMutation<{ verifyEmail: boolean }>(VERIFY_EMAIL_MUTATION)
  const sent = useRef(false)
  useEffect(() => {
    // StrictMode mounts twice: one request only.
    if (!token || sent.current) return
    sent.current = true
    void verify({ variables: { token } }).catch(() => undefined)
  }, [token, verify])

  if (!token || error)
    return (
      <Shell icon="link_off" tone="err" title="Lien non valable">
        <p className="m-0">{error?.message ?? 'Ce lien est incomplet.'} Connectez-vous : un bandeau vous permet de recevoir un nouvel e-mail.</p>
        <button onClick={home} className={`${btn} mt-6`}>Aller sur Dilchap</button>
      </Shell>
    )
  if (!data)
    return (
      <Shell icon="hourglass_top" tone="info" title="Vérification…">
        <p className="m-0">Un instant, nous confirmons votre adresse.</p>
      </Shell>
    )
  return (
    <Shell icon="mark_email_read" tone="ok" title="Adresse confirmée">
      <p className="m-0">Merci ! Vous pouvez maintenant publier des annonces, contacter les vendeurs et acheter des crédits.</p>
      <button onClick={home} className={`${btn} mt-6`}>Continuer sur Dilchap <Icon name="arrow_forward" size={19} /></button>
    </Shell>
  )
}

function PasswordField({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 focus-within:ring-1 focus-within:ring-primary">
      <Icon name="lock" size={19} className="text-on-surface-variant" />
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete="new-password" autoFocus={autoFocus} className="w-full border-none bg-transparent py-3 text-body-md text-on-surface outline-none" />
      <button type="button" onClick={() => setShow(s => !s)} className="flex cursor-pointer border-none bg-transparent p-0 text-on-surface-variant" aria-label={show ? 'Masquer' : 'Afficher'}><Icon name={show ? 'visibility_off' : 'visibility'} size={20} /></button>
    </div>
  )
}

function ResetPassword() {
  const token = useLinkToken()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [reset, { data, loading, error }] = useMutation<{ resetPassword: boolean }>(RESET_PASSWORD_MUTATION)
  const mismatch = pw2.length > 0 && pw !== pw2

  if (!token)
    return (
      <Shell icon="link_off" tone="err" title="Lien non valable">
        <p className="m-0">Ce lien est incomplet. Refaites une demande « Mot de passe oublié » depuis la page de connexion.</p>
        <button onClick={() => window.location.assign('/connexion')} className={`${btn} mt-6`}>Page de connexion</button>
      </Shell>
    )
  if (data?.resetPassword)
    return (
      <Shell icon="check_circle" tone="ok" title="Mot de passe changé">
        <p className="m-0">Connectez-vous avec votre nouveau mot de passe. Par sécurité, vos autres appareils ont été déconnectés.</p>
        <button onClick={() => window.location.assign('/connexion')} className={`${btn} mt-6`}>Se connecter <Icon name="arrow_forward" size={19} /></button>
      </Shell>
    )
  return (
    <Shell icon="lock_reset" tone="info" title="Nouveau mot de passe">
      <p className="m-0">Choisissez un mot de passe d’au moins 8 caractères.</p>
      <form
        onSubmit={e => { e.preventDefault(); void reset({ variables: { input: { token, newPassword: pw } } }).catch(() => undefined) }}
        className="mt-5 flex flex-col gap-3 text-left"
      >
        <PasswordField value={pw} onChange={setPw} placeholder="Nouveau mot de passe" autoFocus />
        <PasswordField value={pw2} onChange={setPw2} placeholder="Confirmez le mot de passe" />
        {mismatch && <p className="m-0 text-body-sm text-primary">Les deux mots de passe sont différents.</p>}
        {error && <p role="alert" className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{error.message}</p>}
        <button type="submit" disabled={loading || pw.length < 8 || pw !== pw2} className={btn}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>
    </Shell>
  )
}

// One click on a button (not on load: mail scanners open links by
// themselves), then the member's e-mail switch of that kind is off.
function Unsubscribe() {
  const token = useLinkToken('t')
  const [unsubscribe, { data, loading, error }] = useMutation<{ unsubscribeEmails: string }>(UNSUBSCRIBE_EMAILS_MUTATION)

  if (!token || error)
    return (
      <Shell icon="link_off" tone="err" title="Lien non valable">
        <p className="m-0">{error?.message ?? 'Ce lien est incomplet.'} Vous pouvez choisir vos e‑mails dans Paramètres › Notifications & Alertes.</p>
        <button onClick={home} className={`${btn} mt-6`}>Aller sur Dilchap</button>
      </Shell>
    )
  if (data)
    return (
      <Shell icon="check_circle" tone="ok" title="C’est noté">
        <p className="m-0">Vous ne recevrez plus d’e‑mails « {data.unsubscribeEmails} ». Les notifications dans l’application continuent ; vous pouvez tout réactiver dans Paramètres › Notifications & Alertes.</p>
        <button onClick={home} className={`${btn} mt-6`}>Continuer sur Dilchap <Icon name="arrow_forward" size={19} /></button>
      </Shell>
    )
  return (
    <Shell icon="mark_email_read" tone="info" title="Moins d’e‑mails ?">
      <p className="m-0">Arrêtez les e‑mails de ce type. Les e‑mails de sécurité (mot de passe, connexion) et les reçus continueront d’arriver.</p>
      <button onClick={() => void unsubscribe({ variables: { t: token } }).catch(() => undefined)} disabled={loading} className={`${btn} mt-6`}>{loading ? 'Un instant…' : 'Ne plus recevoir ces e‑mails'}</button>
      <button onClick={home} className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border-none bg-transparent text-label-lg text-on-surface-variant hover:bg-surface-container-low">Garder mes e‑mails</button>
    </Shell>
  )
}

export default function EmailLinkPage() {
  const path = window.location.pathname
  return path.startsWith('/verifier-email') ? <VerifyEmail /> : path.startsWith('/desabonnement') ? <Unsubscribe /> : <ResetPassword />
}
