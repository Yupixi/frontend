import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from './Icon'
import HelpLink from './HelpLink'
import { useCooldown } from '../lib/useCooldown'
import { formatIntl } from '../lib/dialing'
import { announceAccountVerified } from '../lib/accountVerify'
import { RESEND_VERIFICATION_MUTATION } from '../graphql/auth'
import {
  PHONE_CHANNEL_QUERY, REQUEST_PHONE_CODE_MUTATION, VERIFY_PHONE_MUTATION, type PhoneChannelData,
} from '../graphql/phoneVerification'

// « Confirmez votre compte », SMS first: a 6-digit code to the member's
// number (primary), the confirmation e-mail again (secondary). Shown on the
// account home, in the app-wide sheet opened when an action fails with
// EMAIL_NOT_VERIFIED, and inline where publishing failed. `onVerified`:
// called once confirmed (the caller retries its action).
// `tone`: « card » on a page, « plain » inside a sheet or a form.
export default function AccountVerifyPanel({ onVerified, onAddPhone, tone = 'card', intro, heading = true }: {
  onVerified?: () => void
  onAddPhone?: () => void
  tone?: 'card' | 'plain'
  intro?: string
  // false: inside a sheet that already says « Confirmez votre compte ».
  heading?: boolean
}) {
  const { data, refetch } = useQuery<PhoneChannelData>(PHONE_CHANNEL_QUERY, { fetchPolicy: 'cache-and-network' })
  const [request, { loading: sending }] = useMutation<{ requestPhoneVerification: { alreadyVerified: boolean; phoneHint: string } }>(REQUEST_PHONE_CODE_MUTATION)
  const [verify, { loading: checking }] = useMutation(VERIFY_PHONE_MUTATION)
  const [resendEmail, { loading: mailing }] = useMutation<{ resendVerificationEmail: boolean }>(RESEND_VERIFICATION_MUTATION)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [mailSent, setMailSent] = useState(false)
  const [done, setDone] = useState(false)
  const [resendAt, setResendAt] = useState(0)
  const wait = useCooldown(resendAt)
  const me = data?.me
  useEffect(() => { setSentTo(null); setCode(''); setError('') }, [me?.phone])
  if (!me || me.isGuest) return null

  const confirmed = !!(me.phoneVerifiedAt || me.emailVerifiedAt)
  const finish = () => {
    setDone(true)
    announceAccountVerified()
    void refetch()
    onVerified?.()
  }
  // Confirmed meanwhile (another tab, the link): nothing to ask.
  if (confirmed && !done) return null
  const wrap = tone === 'card'
    ? 'rounded-2xl border border-solid border-primary/25 bg-primary-fixed/40 p-4 md:p-5'
    : ''

  if (done)
    return (
      <div role="status" className={`${tone === 'card' ? 'rounded-2xl bg-tertiary-soft p-4' : 'rounded-xl bg-tertiary-soft p-3'} flex items-center gap-3`}>
        <Icon name="verified_user" size={22} className="shrink-0 text-tertiary" />
        <span className="min-w-0 text-body-md text-on-surface"><b>Compte confirmé.</b> Vous pouvez publier, contacter les vendeurs et payer.</span>
      </div>
    )

  const sms = data.phoneVerificationAvailable && !!me.phone
  const email = me.email
  const send = () => {
    setError('')
    request()
      .then(({ data: d }) => {
        if (d?.requestPhoneVerification.alreadyVerified) { finish(); return }
        setSentTo(d?.requestPhoneVerification.phoneHint ?? '')
        setCode('')
        setResendAt(Date.now() + 60_000)
      })
      .catch((e: Error) => setError(e.message))
  }
  const submit = () => {
    setError('')
    verify({ variables: { code } })
      .then(() => { setSentTo(null); setCode(''); finish() })
      .catch((e: Error) => setError(e.message))
  }
  const mail = () => {
    setError('')
    resendEmail().then(() => setMailSent(true)).catch((e: Error) => setError(e.message))
  }

  return (
    <section aria-labelledby="account-verify-title" className={wrap}>
      {heading ? (
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Icon name="sms" size={21} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="account-verify-title" className="m-0 text-label-lg text-on-surface">Confirmez votre compte <HelpLink article="confirmer-mon-compte" className="ml-1 align-middle" /></h2>
            <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">
              {intro ?? 'Pour publier une annonce, contacter les vendeurs et payer, confirmez votre compte. Par SMS, c’est immédiat.'}
            </p>
          </div>
        </div>
      ) : (
        <p id="account-verify-title" className="m-0 text-body-md text-on-surface-variant">{intro} <HelpLink article="confirmer-mon-compte" className="ml-1 align-middle" /></p>
      )}

      {sms && sentTo == null && (
        <button type="button" disabled={sending} onClick={send}
          className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-4 py-2 text-center text-label-lg text-white hover:bg-primary-dark disabled:opacity-60">
          <Icon name="sms" size={19} className="shrink-0" />
          <span className="min-w-0 break-words">{sending ? 'Envoi du code…' : <>Recevoir un code par SMS au <span className="whitespace-nowrap">{formatIntl(me.phone)}</span></>}</span>
        </button>
      )}
      {sms && sentTo != null && (
        <form onSubmit={e => { e.preventDefault(); if (code.length === 6) submit() }} className="mt-3">
          <p className="m-0 text-body-sm text-on-surface">Code envoyé par SMS au <b className="whitespace-nowrap">{formatIntl(me.phone)}</b>. Il expire dans 5 minutes.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Code reçu par SMS" autoFocus
              className="h-12 w-36 rounded-xl border border-solid border-outline-variant bg-surface-lowest px-3 text-center font-mono text-body-lg tracking-[0.3em] text-on-surface outline-none focus:border-primary" />
            <button type="submit" disabled={checking || code.length !== 6} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-primary px-4 text-label-lg text-white disabled:opacity-60 sm:flex-none">{checking ? 'Vérification…' : 'Valider'}</button>
            <button type="button" disabled={sending || wait > 0} onClick={send} className="h-12 cursor-pointer rounded-xl border-none bg-transparent px-2 text-label-md text-primary disabled:cursor-default disabled:text-on-surface-variant">
              {wait > 0 ? `Renvoyer (${wait} s)` : 'Renvoyer un code'}
            </button>
          </div>
        </form>
      )}
      {data.phoneVerificationAvailable && !me.phone && (
        <p className="m-0 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-surface-lowest p-3 text-body-sm text-on-surface">
          <Icon name="phone_android" size={18} className="shrink-0 text-on-surface-variant" />
          <span className="min-w-0 flex-1">Ajoutez votre numéro dans <b>Paramètres › Profil</b> pour recevoir un code par SMS.</span>
          {onAddPhone && <button type="button" onClick={onAddPhone} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary underline underline-offset-2">Ajouter mon numéro</button>}
        </p>
      )}

      {email && (
        <div className={`mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-on-surface-variant ${sms ? '' : 'rounded-xl bg-surface-lowest p-3'}`}>
          {mailSent
            ? <span className="min-w-0 break-words"><Icon name="mark_email_read" size={16} className="mr-1 align-[-3px] text-tertiary" />E-mail envoyé à <b className="font-semibold text-on-surface">{email}</b> : pensez à regarder dans les spams.</span>
            : <>
                <span className="min-w-0 break-words">{sms ? 'Ou confirmez votre adresse e-mail :' : <>Ouvrez le lien envoyé à <b className="font-semibold text-on-surface">{email}</b> (regardez aussi dans les spams).</>}</span>
                <button type="button" disabled={mailing} onClick={mail} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary underline underline-offset-2 disabled:opacity-60">{mailing ? 'Envoi…' : 'Renvoyer l’e-mail de confirmation'}</button>
              </>}
        </div>
      )}
      {!sms && !email && !(data.phoneVerificationAvailable && !me.phone) && (
        <p className="m-0 mt-3 text-body-sm text-on-surface-variant">La confirmation par SMS est momentanément indisponible. Réessayez un peu plus tard.</p>
      )}
      {error && <p role="alert" className="m-0 mt-2 text-body-sm font-semibold text-primary">{error}</p>}
    </section>
  )
}
