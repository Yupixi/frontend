import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from './Icon'
import { ADULT_ACCESS_QUERY, CONFIRM_ADULT_MUTATION, useAdultAccess, type AdultStatus } from '../lib/adult'
import { useMarketCode } from '../lib/countries'
import { setAuthReason } from '../lib/authReason'
import { useT } from '../i18n'
import adultNs from '../i18n/ns/adult'

type Props = {
  // The server's reason when it refused the data (else the visitor's
  // current standing).
  reason?: AdultStatus | null
  onNavigate: (page: string) => void
  // After a successful confirmation (the page refetches its data).
  onConfirmed?: () => void
  compact?: boolean
  // The country concerned when it isn't the visitor's market (a listing
  // being published).
  countryCode?: string | null
  // Wording of the « Confirmez votre âge » step (publishing in the section).
  confirmTitle?: string
  confirmText?: string
  confirmLabel?: string
}

// « Section Adultes (18+) »: what the visitor sees instead of its listings
// until they are logged in and confirmed their age.
export default function AdultGate({ reason, onNavigate, onConfirmed, compact, countryCode: country, confirmTitle, confirmText, confirmLabel }: Props) {
  const t = useT(adultNs)
  const access = useAdultAccess(false, country)
  const market = useMarketCode()
  const countryCode = country || market
  const [ticked, setTicked] = useState(false)
  const [error, setError] = useState('')
  const [confirm, { loading }] = useMutation(CONFIRM_ADULT_MUTATION, {
    refetchQueries: [
      { query: ADULT_ACCESS_QUERY, variables: { countryCode: countryCode ?? null } },
      ...(countryCode !== market ? [{ query: ADULT_ACCESS_QUERY, variables: { countryCode: market ?? null } }] : []),
    ],
    awaitRefetchQueries: true,
  })
  // The server's refusal wins over a cached « OK » (confirmation withdrawn
  // on another device) until the visitor confirms here.
  const [done, setDone] = useState(false)
  const status: AdultStatus = (access?.status === 'OK' && (done || !reason) ? null : reason) ?? access?.status ?? 'LOGIN'
  if (status === 'OK') return null

  const box = `mx-auto w-full ${compact ? 'max-w-md' : 'max-w-lg'} rounded-2xl bg-surface-lowest p-5 text-center shadow-sm sm:p-7`
  const head = (icon: string, title: string, text: string) => (
    <>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name={icon} size={28} /></span>
      <p className="m-0 mt-3 text-label-sm uppercase tracking-wide text-on-surface-variant">{t('sectionLabel')}</p>
      <h2 className="m-0 mt-1 text-headline-sm text-on-surface">{title}</h2>
      <p className="m-0 mx-auto mt-2 max-w-sm text-body-sm text-on-surface-variant">{text}</p>
    </>
  )

  if (status === 'DISABLED')
    return <div className={box} data-testid="adult-gate">{head('block', t('gate.disabled.title'), t('gate.disabled.text'))}</div>
  if (status === 'UNDERAGE')
    return <div className={box} data-testid="adult-gate">{head('block', t('gate.underage.title'), t('gate.underage.text'))}</div>
  if (status === 'LOGIN')
    return (
      <div className={box} data-testid="adult-gate">
        {head('lock', t('gate.login.title'), t('gate.login.text'))}
        <button type="button" onClick={() => { setAuthReason('adult'); onNavigate('auth') }} className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-5 py-2.5 text-label-md text-white">
          <Icon name="login" size={18} /> {t('gate.login.button')}
        </button>
      </div>
    )
  const submit = async () => {
    setError('')
    try {
      await confirm({ variables: { countryCode: countryCode ?? null } })
      setDone(true)
      onConfirmed?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('gate.confirmError'))
    }
  }
  return (
    <div className={box} data-testid="adult-gate">
      {head('verified_user', confirmTitle ?? t('gate.confirm.title'), confirmText ?? t('gate.confirm.text'))}
      {access?.notice && <p className="m-0 mt-4 rounded-xl bg-surface-container-low p-3 text-left text-body-sm text-on-surface-variant">{access.notice}</p>}
      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 text-label-lg text-on-surface">
        <input type="checkbox" checked={ticked} onChange={e => setTicked(e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
        {t('gate.confirm.check')}
      </label>
      <button type="button" disabled={!ticked || loading} onClick={submit} className="mt-4 cursor-pointer rounded-xl border-none bg-primary px-5 py-2.5 text-label-md text-white disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? t('gate.confirm.loading') : confirmLabel ?? t('gate.confirm.button')}
      </button>
      {error && <p role="alert" className="m-0 mt-3 text-body-sm text-primary">{error}</p>}
    </div>
  )
}
