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

// "05 07 05 59 98" while typing a local number; anything else (+225…) as typed.
const formatPhone = (v: string) => {
  const digits = v.replace(/\D/g, '')
  if (/[^\d\s]/.test(v.trim()) || digits.length > 10) return v
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
}

// Mobile Money checkout (Paytic) for Dilchap services: operator → number
// (+ Orange Money code) → confirmation on the phone or in Wave → the pack is
// applied by the server once the payment is confirmed.
export default function PaymentSheet({ open, onClose, title, amount, request, children, onPaid }: Props) {
  const client = useApolloClient()
  // Nothing preselected: the number field appears once an operator is picked.
  const [provider, setProvider] = useState<PaymentProvider | null>(null)
  // One remembered number per operator (an Orange number is no use for MTN).
  const savedPhone = (p: PaymentProvider) => { try { return formatPhone(localStorage.getItem(`${PHONE_KEY}_${p}`) ?? '') } catch { return '' } }
  const [phone, setPhone] = useState('')
  const [touched, setTouched] = useState(false)
  const [otp, setOtp] = useState('')
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [start, { loading }] = useMutation<{ startPayment: PaymentIntent }>(START_PAYMENT_MUTATION)
  const timer = useRef<number | null>(null)

  const reset = () => { setIntent(null); setError(null); setOtp(''); setTouched(false); setCopied(false) }
  useEffect(() => { if (!open) { reset(); setProvider(null); setPhone(''); if (timer.current) window.clearInterval(timer.current) } }, [open])
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
    if (!request || !provider) return
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

  const copyRef = (ref: string) => {
    void navigator.clipboard?.writeText(ref).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) }).catch(() => undefined)
  }

  const waiting = intent && (intent.status === 'PENDING' || intent.status === 'PROCESSING')
  const selected = PROVIDERS.find((p) => p.key === provider)
  const phoneError = provider && selected ? momoNumberError(phone, provider, selected.label) : 'Choisissez un moyen de paiement.'
  const showPhoneError = !!phoneError && !!phone && (touched || phone.replace(/\D/g, '').length >= 10)
  // Operator of the payment in progress (the picker may have been reset).
  const paidWith = PROVIDERS.find((p) => p.key === intent?.provider) ?? selected ?? PROVIDERS[0]
  const otpOk = provider !== 'orange' || /^\d{4,8}$/.test(otp.trim())
  const canPay = !!request && !phoneError && otpOk

  const btn = 'h-12 cursor-pointer rounded-xl border-none text-label-lg'
  const footer = !intent || intent.status === 'FAILED' ? (
    <div className="border-0 border-t border-solid border-outline-variant px-4 pb-3 pt-3">
      <button onClick={() => { if (intent) reset(); else void pay() }} disabled={!intent && (!canPay || loading)} className={`${btn} flex w-full items-center justify-center gap-2 bg-primary text-white disabled:cursor-not-allowed disabled:opacity-45`}>
        {intent
          ? <><Icon name="refresh" size={18} /> Réessayer</>
          : loading
            ? <><Icon name="progress_activity" size={18} className="animate-spin" /> Connexion à {selected?.label}…</>
            : selected
              ? <><Icon name="lock" size={18} /> Payer <Price amount={amount} /></>
              : 'Choisissez un moyen de paiement'}
      </button>
      <p className="m-0 mt-2 flex items-center justify-center gap-1 text-label-sm normal-case tracking-normal text-on-surface-variant">
        <Icon name="verified_user" size={14} className="text-tertiary" /> Paiement sécurisé par Paytic · aucun frais ajouté
      </p>
    </div>
  ) : (
    <div className="border-0 border-t border-solid border-outline-variant px-4 py-3">
      <button onClick={onClose} className={`${btn} w-full bg-surface-container-high text-on-surface`}>{waiting ? 'Fermer (le paiement continue)' : 'Terminer'}</button>
    </div>
  )

  return (
    <BottomSheet open={open} onClose={onClose} title={title} footer={footer} maxHeight="90vh">
      {!intent && (
        <>
          {/* Order recap */}
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
            <div className="min-w-0 text-body-sm text-on-surface-variant">{children}</div>
            <div className="shrink-0 text-right">
              <div className="text-label-sm uppercase text-on-surface-variant">Total</div>
              <div className="text-headline-sm text-primary"><Price amount={amount} /></div>
            </div>
          </div>

          {/* 1. Operator */}
          <div className="mb-2 flex items-center gap-2 text-label-md text-on-surface">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-on-surface text-[11px] font-bold text-surface">1</span> Moyen de paiement
          </div>
          <div role="radiogroup" className="grid grid-cols-2 gap-3">
            {PROVIDERS.map((p) => {
              const on = provider === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => { if (!on) { setProvider(p.key); setPhone(savedPhone(p.key)); setOtp(''); setTouched(false); setError(null) } }}
                  className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-solid px-2 pb-3 pt-4 text-center transition-all duration-200 ${on ? 'scale-[1.02] border-primary bg-primary-fixed/25 shadow-card-hover' : 'border-outline-variant/70 bg-surface-lowest hover:border-outline active:scale-[0.98]'}`}
                >
                  <span className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200 ${on ? 'scale-100 bg-primary text-white opacity-100' : 'scale-50 opacity-0'}`}>
                    <Icon name="check" size={14} />
                  </span>
                  <PaymentLogo method={p.method} size={48} />
                  <span className="text-label-lg text-on-surface">{p.label}</span>
                  <span className="text-[11px] leading-tight text-on-surface-variant">{p.hint}</span>
                </button>
              )
            })}
          </div>

          {provider && selected && (
          <div key={provider} className="animate-[slideDown_0.35s_cubic-bezier(0.16,1,0.3,1)]">
          {/* 2. Number */}
          <div className="mb-2 mt-5 flex items-center gap-2 text-label-md text-on-surface">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-on-surface text-[11px] font-bold text-surface">2</span> Numéro {selected.label}
          </div>
          <label className={`flex h-14 items-center gap-2 rounded-2xl border-[1.5px] border-solid bg-surface-lowest pl-2 pr-3 transition-colors focus-within:border-primary ${showPhoneError ? 'border-primary' : 'border-outline-variant'}`}>
            <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-surface-container-low px-2 text-label-md text-on-surface">
              <PaymentLogo method={selected.method} size={22} /> +225
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              onBlur={() => setTouched(true)}
              inputMode="tel"
              autoComplete="tel-national"
              aria-label={`Numéro ${selected.label}`}
              aria-invalid={showPhoneError}
              autoFocus={!phone}
              placeholder={`${NETWORK_PREFIX[provider] ?? '07'} 00 00 00 00`}
              className="h-full min-w-0 flex-1 border-none bg-transparent text-body-lg tracking-wide text-on-surface outline-none"
            />
            {!phoneError && <Icon name="check_circle" size={22} fill className="shrink-0 text-tertiary" />}
          </label>
          {showPhoneError
            ? <p className="m-0 mt-1.5 flex items-start gap-1 text-body-sm text-primary"><Icon name="error" size={16} className="mt-0.5 shrink-0" /> {phoneError}</p>
            : <p className="m-0 mt-1.5 text-body-sm text-on-surface-variant">{provider === 'wave' ? 'Le numéro de votre compte Wave.' : `Le numéro qui recevra la demande de paiement ${selected.label}.`}</p>}

          {/* 3. Orange Money code */}
          {provider === 'orange' && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-label-md text-on-surface">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-on-surface text-[11px] font-bold text-surface">3</span> Code de paiement
              </div>
              <div className="rounded-2xl bg-[#FF7900]/10 p-3">
                <p className="m-0 flex items-center gap-2 text-body-sm text-on-surface">
                  <Icon name="dialpad" size={18} className="shrink-0 text-[#FF7900]" />
                  <span>Sur votre téléphone Orange, composez <a href="tel:%23144*82%23" className="font-bold text-on-surface">#144*82#</a> puis saisissez le code reçu.</span>
                </p>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  aria-label="Code de paiement Orange Money"
                  placeholder="• • • •"
                  className="mt-3 h-12 w-full rounded-xl border-[1.5px] border-solid border-outline-variant bg-surface-lowest px-3 text-center text-headline-sm tracking-[0.4em] text-on-surface outline-none focus:border-[#FF7900]"
                />
              </div>
            </div>
          )}
          </div>
          )}

          {error && <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-primary-fixed px-3 py-2.5 text-body-sm text-primary"><Icon name="error" size={18} className="shrink-0" /> {error}</p>}
        </>
      )}

      {waiting && (
        <div className="flex flex-col items-center gap-4 py-3 text-center">
          <span className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
            <PaymentLogo method={paidWith.method} size={64} />
          </span>
          <div>
            <p className="m-0 text-headline-sm text-on-surface">{intent.redirectUrl ? 'Redirection vers Wave…' : 'Validez sur votre téléphone'}</p>
            <p className="m-0 mt-1 max-w-xs text-body-sm text-on-surface-variant">
              {intent.redirectUrl ? 'Si rien ne se passe, ouvrez la page de paiement Wave.' : <>Une demande de <b className="text-on-surface"><Price amount={amount} /></b> a été envoyée au <b className="text-on-surface">{phone}</b>. Confirmez-la avec votre code secret {paidWith.label}.</>}
            </p>
          </div>
          {intent.redirectUrl && <a href={intent.redirectUrl} className="flex items-center gap-2 rounded-xl bg-[#1DC8FF] px-5 py-3 text-label-lg text-white no-underline"><Icon name="open_in_new" size={18} /> Ouvrir Wave</a>}
          <ol className="m-0 flex w-full max-w-xs list-none flex-col gap-2.5 rounded-2xl bg-surface-container-low p-4 text-left text-body-sm">
            <li className="flex items-center gap-2.5 text-on-surface"><Icon name="check_circle" size={20} fill className="text-tertiary" /> Demande envoyée à {paidWith.label}</li>
            <li className="flex items-center gap-2.5 text-on-surface"><Icon name="progress_activity" size={20} className="animate-spin text-primary" /> Confirmation de l’opérateur</li>
            <li className="flex items-center gap-2.5 text-on-surface-variant"><Icon name="radio_button_unchecked" size={20} /> Activation de votre pack</li>
          </ol>
          <button onClick={() => copyRef(intent.reference)} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent text-label-sm normal-case tracking-normal text-on-surface-variant">
            Réf. {intent.reference} <Icon name={copied ? 'check' : 'content_copy'} size={14} />
          </button>
        </div>
      )}

      {intent?.status === 'SUCCESS' && (
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="check_circle" size={48} fill /></span>
          <p className="m-0 mt-1 text-headline-sm text-on-surface">Paiement confirmé</p>
          <p className="m-0 max-w-xs text-body-sm text-on-surface-variant">{intent.simulated ? 'Mode test : paiement simulé (Paytic non configuré).' : <>Votre pack est activé. Réf. {intent.reference}</>}</p>
        </div>
      )}

      {intent && (intent.status === 'FAILED' || intent.status === 'FULFILMENT_FAILED') && (
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="error" size={48} /></span>
          <p className="m-0 mt-1 text-headline-sm text-on-surface">{intent.status === 'FAILED' ? 'Paiement non abouti' : 'Paiement reçu, activation en attente'}</p>
          <p className="m-0 max-w-xs text-body-sm text-on-surface-variant">{intent.status === 'FAILED' ? intent.failedReason ?? 'L’opérateur a refusé ou annulé la transaction. Aucun montant n’a été débité.' : `Notre équipe a été alertée et activera votre pack. Réf. ${intent.reference}`}</p>
        </div>
      )}
    </BottomSheet>
  )
}
