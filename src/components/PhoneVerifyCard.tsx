import { useEffect, useState } from 'react'
import { useCooldown } from '../lib/useCooldown'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from './Icon'
import { announceAccountVerified } from '../lib/accountVerify'
import HelpLink from './HelpLink'
import {
  PHONE_CHANNEL_QUERY, REQUEST_PHONE_CODE_MUTATION, VERIFY_PHONE_MUTATION, codeVia, type PhoneChannelData,
} from '../graphql/phoneVerification'
import { useT } from '../i18n'
import verifyNs from '../i18n/ns/verify'

// « WhatsApp / SMS » alerts: the member proves they hold the number of their
// profile with a 6-digit code sent by SMS. Shown once the team opens the
// alerts — and, SMS first, whenever the account is confirmed by neither its
// e-mail nor its phone and SMS can be sent (the code confirms the account).
// `unsavedPhone`: the profile form holds another number not saved yet.
export default function PhoneVerifyCard({ wantsSms, unsavedPhone, onVerified }: { wantsSms: boolean; unsavedPhone: boolean; onVerified?: () => void }) {
  const t = useT(verifyNs)
  const { data, refetch } = useQuery<PhoneChannelData>(PHONE_CHANNEL_QUERY, { fetchPolicy: 'cache-and-network' })
  const [request, { loading: sending }] = useMutation<{ requestPhoneVerification: { alreadyVerified: boolean; phoneHint: string; expiresAt?: string | null; channel?: 'SMS' | 'WHATSAPP' } }>(REQUEST_PHONE_CODE_MUTATION)
  const [verify, { loading: checking }] = useMutation(VERIFY_PHONE_MUTATION)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [via, setVia] = useState(codeVia(null))
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const wait = useCooldown(resendAt)
  const me = data?.me
  // A number changed in the profile: any code in progress is for the old one.
  useEffect(() => { setSentTo(null); setCode(''); setError('') }, [me?.phone])
  if (!data || !me) return null
  const unconfirmed = !me.phoneVerifiedAt && !me.emailVerifiedAt
  const forAccount = unconfirmed && data.phoneVerificationAvailable
  if (!data.smsAlertsAvailable && !forAccount) return null

  const send = () => {
    setError('')
    request()
      .then(({ data: d }) => {
        if (d?.requestPhoneVerification.alreadyVerified) { void refetch(); return }
        setSentTo(d?.requestPhoneVerification.phoneHint ?? '')
        setVia(codeVia(d?.requestPhoneVerification))
        setCode('')
        setResendAt(Date.now() + 60_000)
      })
      .catch((e: Error) => setError(e.message))
  }
  const submit = () => {
    setError('')
    verify({ variables: { code } })
      .then(() => { setSentTo(null); setCode(''); void refetch(); announceAccountVerified(); onVerified?.() })
      .catch((e: Error) => setError(e.message))
  }

  const box = 'mb-3 rounded-xl p-3'
  if (me.phoneVerifiedAt && !unsavedPhone)
    return (
      <div className={`${box} flex items-center gap-3 bg-tertiary-soft`}>
        <Icon name="verified_user" size={20} className="text-tertiary" />
        <span className="flex-1 text-body-sm text-on-surface">{data.smsAlertsAvailable ? t('card.verifiedAlerts', { last4: (me.phone ?? '').slice(-4) }) : t('card.verifiedAccount', { last4: (me.phone ?? '').slice(-4) })}</span>
      </div>
    )
  if (!me.phone || unsavedPhone)
    return (
      <div className={`${box} flex items-start gap-3 bg-surface-container-low`}>
        <Icon name="phone_android" size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
        <span className="flex-1 text-body-sm text-on-surface">{forAccount
          ? (unsavedPhone ? t('card.saveFirstAccount') : t('card.addAccount'))
          : unsavedPhone ? t('card.saveFirstAlerts') : t('card.addAlerts')}</span>
      </div>
    )
  return (
    <div className={`${box} ${wantsSms || forAccount ? 'bg-primary-fixed/60' : 'bg-surface-container-low'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Icon name="password" size={20} className={`shrink-0 ${wantsSms || forAccount ? 'text-primary' : 'text-on-surface-variant'}`} />
        <span className="min-w-0 flex-1 basis-56 text-body-sm text-on-surface">
          {sentTo != null
            ? t('card.codeSent', { by: via.by, hint: sentTo.replace(/^…/, ''), count: via.ttl })
            : forAccount
              ? t('card.forAccount')
              : wantsSms
                ? t('card.wantsSms')
                : t('card.canSms')}
          {sentTo == null && <HelpLink article={forAccount ? 'confirmer-mon-compte' : 'alertes-sms-whatsapp'} className="ml-1 align-middle" />}
        </span>
        {sentTo == null && (
          <button type="button" disabled={sending} onClick={send} className="cursor-pointer rounded-lg border-none bg-primary px-3 py-1.5 text-label-md text-white disabled:opacity-60">
            {sending ? t('sending') : t('card.getCode')}
          </button>
        )}
      </div>
      {sentTo != null && (
        <form onSubmit={e => { e.preventDefault(); if (code.length === 6) submit() }} className="mt-2 flex flex-wrap items-center gap-2 sm:pl-8">
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label={t('codeAria')}
            className="h-10 w-32 rounded-lg border border-solid border-outline-variant bg-surface-lowest px-3 text-center font-mono text-body-lg tracking-[0.3em] text-on-surface outline-none focus:border-primary" />
          <button type="submit" disabled={checking || code.length !== 6} className="h-10 cursor-pointer rounded-lg border-none bg-primary px-4 text-label-md text-white disabled:opacity-60">{checking ? t('checking') : t('validate')}</button>
          <button type="button" disabled={sending || wait > 0} onClick={send} className="h-10 cursor-pointer rounded-lg border-none bg-transparent px-2 text-label-md text-primary disabled:cursor-default disabled:text-on-surface-variant">
            {wait > 0 ? t('resendWait', { wait }) : t('resendCode')}
          </button>
        </form>
      )}
      {error && <p role="alert" className="m-0 mt-2 text-body-sm font-semibold text-primary sm:pl-8">{error}</p>}
    </div>
  )
}
