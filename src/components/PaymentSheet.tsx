import { useEffect, useRef, useState } from 'react'
import { useApolloClient, useMutation } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import Icon from './Icon'
import Price from './Price'
import PaymentLogo from './PaymentLogo'
import {
  PAYMENT_QUERY, PENDING_PAYMENT_KEY, PROVIDERS, START_PAYMENT_MUTATION,
  type PaymentIntent, type PaymentProvider, type PaymentRequest,
} from '../graphql/payments'
import { momoNumberError, NETWORK_PREFIX } from '../lib/phone'

const PHONE_KEY = 'dilchap_momo_phone'
const POLL_MS = 3000
const POLL_LIMIT_MS = 4 * 60_000

type Props = {
  open: boolean
  onClose: () => void
  title: string
  amount: number
  request: PaymentRequest | null
  // Recap shown above the operator choice.
  children?: React.ReactNode
  onPaid: (intent: PaymentIntent) => void
}

// Mobile Money checkout (Paytic) for Dilchap services: operator → number
// (+ Orange Money code) → confirmation on the phone or in Wave → the pack is
// applied by the server once the payment is confirmed.
export default function PaymentSheet({ open, onClose, title, amount, request, children, onPaid }: Props) {
  const client = useApolloClient()
  const [provider, setProvider] = useState<PaymentProvider>('wave')
  // One remembered number per operator (an Orange number is no use for MTN).
  const savedPhone = (p: PaymentProvider) => { try { return localStorage.getItem(`${PHONE_KEY}_${p}`) ?? '' } catch { return '' } }
  const [phone, setPhone] = useState(() => savedPhone('wave'))
  const [touched, setTouched] = useState(false)
  const [otp, setOtp] = useState('')
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [start, { loading }] = useMutation<{ startPayment: PaymentIntent }>(START_PAYMENT_MUTATION)
  const timer = useRef<number | null>(null)

  const reset = () => { setIntent(null); setError(null); setOtp(''); setTouched(false) }
  useEffect(() => { if (!open) { reset(); if (timer.current) window.clearInterval(timer.current) } }, [open])
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current) }, [])

  const finish = (p: PaymentIntent) => {
    setIntent(p)
    if (p.status === 'SUCCESS') onPaid(p)
  }

  // Poll until the operator confirms (the server also listens to Paytic webhooks).
  const poll = (id: string) => {
    const started = Date.now()
    if (timer.current) window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      void client.query<{ payment: PaymentIntent }>({ query: PAYMENT_QUERY, variables: { id }, fetchPolicy: 'network-only' }).then(({ data }) => {
        const p = data?.payment
        if (!p) return
        if (p.status !== 'PENDING' && p.status !== 'PROCESSING') { window.clearInterval(timer.current!); finish(p) }
        else setIntent(p)
        if (Date.now() - started > POLL_LIMIT_MS) window.clearInterval(timer.current!)
      }).catch(() => undefined)
    }, POLL_MS)
  }

  const pay = async () => {
    if (!request) return
    setError(null)
    try { localStorage.setItem(`${PHONE_KEY}_${provider}`, phone) } catch { /* private mode */ }
    try {
      const { data } = await start({ variables: { input: { ...request, provider, msisdn: phone, otp: provider === 'orange' ? otp.trim() : undefined } } })
      const p = data!.startPayment
      if (p.status === 'SUCCESS' || p.status === 'FAILED' || p.status === 'FULFILMENT_FAILED') { finish(p); return }
      setIntent(p)
      if (p.redirectUrl) {
        try { sessionStorage.setItem(PENDING_PAYMENT_KEY, p.id) } catch { /* ignore */ }
        window.location.assign(p.redirectUrl)
        return
      }
      poll(p.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le paiement n’a pas pu être lancé.')
    }
  }

  const waiting = intent && (intent.status === 'PENDING' || intent.status === 'PROCESSING')
  const selected = PROVIDERS.find((p) => p.key === provider)!
  const phoneError = momoNumberError(phone, provider, selected.label)
  const showPhoneError = !!phoneError && (touched || phone.replace(/\D/g, '').length >= 10)
  const canPay = !!request && !phoneError && (provider !== 'orange' || /^\d{4,8}$/.test(otp.trim()))

  const footer = !intent || intent.status === 'FAILED' ? (
    <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
      <button onClick={onClose} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Annuler</button>
      <button onClick={() => { if (intent) reset(); else void pay() }} disabled={!intent && (!canPay || loading)} className="flex h-12 flex-[1.6] cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-50">
        {intent ? 'Réessayer' : loading ? 'Connexion…' : <>Payer <Price amount={amount} /></>}
      </button>
    </div>
  ) : (
    <div className="border-0 border-t border-solid border-outline-variant px-4 py-3">
      <button onClick={onClose} className="h-12 w-full cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">{waiting ? 'Fermer (le paiement continue)' : 'Terminer'}</button>
    </div>
  )

  return (
    <BottomSheet open={open} onClose={onClose} title={title} footer={footer}>
      {children && <div className="mb-4">{children}</div>}

      {!intent && (
        <>
          <div className="mb-2 text-label-md text-on-surface">Payer avec</div>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => (
              <button key={p.key} type="button" onClick={() => { setProvider(p.key); setPhone(savedPhone(p.key)); setTouched(false) }} aria-pressed={provider === p.key} className={`flex h-14 cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] border-solid px-3 text-left text-label-md text-on-surface ${provider === p.key ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant bg-surface-lowest'}`}>
                <PaymentLogo method={p.method} size={34} /> {p.label}
              </button>
            ))}
          </div>
          <p className="m-0 mt-2 text-body-sm text-on-surface-variant">{selected.hint}</p>
          <label className="mt-4 block text-label-md text-on-surface">Numéro {selected.label}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setTouched(true)} inputMode="tel" autoComplete="tel" aria-invalid={showPhoneError} placeholder={`${NETWORK_PREFIX[provider] ?? '07'} 00 00 00 00`} className={`mt-1.5 h-12 w-full rounded-xl border border-solid bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:border-primary ${showPhoneError ? 'border-primary' : 'border-outline-variant'}`} />
            {showPhoneError && phone && <span className="mt-1 flex items-center gap-1 text-body-sm font-normal text-primary"><Icon name="error" size={16} /> {phoneError}</span>}
          </label>
          {provider === 'orange' && (
            <label className="mt-3 block text-label-md text-on-surface">Code de paiement Orange Money
              <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={8} placeholder="Ex : 1234" className="mt-1.5 h-12 w-full rounded-xl border border-solid border-outline-variant bg-surface-lowest px-3 text-body-md tracking-widest text-on-surface outline-none focus:border-primary" />
              <span className="mt-1 flex items-center gap-1 text-body-sm font-normal text-on-surface-variant"><Icon name="dialpad" size={16} /> Composez <b className="text-on-surface">#144*82#</b> sur votre téléphone Orange pour obtenir ce code.</span>
            </label>
          )}
          {error && <p className="m-0 mt-3 rounded-lg bg-primary-fixed px-3 py-2 text-body-sm text-primary">{error}</p>}
          <p className="m-0 mt-4 flex items-start gap-1.5 text-body-sm text-on-surface-variant"><Icon name="lock" size={16} className="mt-0.5 shrink-0 text-tertiary" /> Paiement sécurisé via Paytic. Votre pack est activé dès la confirmation de l’opérateur.</p>
        </>
      )}

      {waiting && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <PaymentLogo method={selected.method} size={56} />
          <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
          <p className="m-0 text-headline-sm text-on-surface">{intent.redirectUrl ? 'Redirection vers Wave…' : 'Validez le paiement sur votre téléphone'}</p>
          <p className="m-0 max-w-xs text-body-sm text-on-surface-variant">{intent.redirectUrl ? 'Si rien ne se passe, ouvrez la page de paiement :' : `Une demande de ${amount.toLocaleString('fr-FR')} F a été envoyée au ${phone}. Confirmez-la avec votre code secret.`}</p>
          {intent.redirectUrl && <a href={intent.redirectUrl} className="rounded-xl bg-[#1DC8FF] px-4 py-2.5 text-label-lg text-white no-underline">Ouvrir Wave</a>}
          <p className="m-0 text-label-sm normal-case tracking-normal text-outline">Réf. {intent.reference}</p>
        </div>
      )}

      {intent?.status === 'SUCCESS' && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="check_circle" size={40} fill /></span>
          <p className="m-0 text-headline-sm text-on-surface">Paiement confirmé</p>
          <p className="m-0 text-body-sm text-on-surface-variant">{intent.simulated ? 'Mode test : paiement simulé (Paytic non configuré).' : `Réf. ${intent.reference}`}</p>
        </div>
      )}

      {intent && (intent.status === 'FAILED' || intent.status === 'FULFILMENT_FAILED') && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="error" size={40} /></span>
          <p className="m-0 text-headline-sm text-on-surface">{intent.status === 'FAILED' ? 'Paiement non abouti' : 'Paiement reçu, activation en attente'}</p>
          <p className="m-0 max-w-xs text-body-sm text-on-surface-variant">{intent.status === 'FAILED' ? intent.failedReason ?? 'L’opérateur a refusé ou annulé la transaction. Aucun montant n’a été débité.' : `Notre équipe a été alertée et activera votre pack. Réf. ${intent.reference}`}</p>
        </div>
      )}
    </BottomSheet>
  )
}
