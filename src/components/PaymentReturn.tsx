import { useEffect, useState } from 'react'
import SupportAboutButton from './SupportAboutButton'
import { useApolloClient } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import Icon from './Icon'
import PaymentLogo from './PaymentLogo'
import { trackCreditPurchase } from '../lib/analytics'
import { OPEN_PAYMENT, PAYMENT_QUERY, PENDING_PAYMENT_KEY, PROVIDERS, VERIFYING_PAYMENT, type PaymentIntent } from '../graphql/payments'
import PaymentVerifying from './PaymentVerifying'

// Back from the Wave checkout (…/?payment=<id>): show the outcome while
// the server confirms the payment with Paytic. Wave sends the payer to the
// same address whether it says paid or failed: only the server's status
// (Paytic's confirmation) is shown, never the way back.
const POLL_TRIES = 60
export default function PaymentReturn({ isLoggedIn }: { isLoggedIn: boolean }) {
  const client = useApolloClient()
  const [id] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('payment')
    let pending: string | null = null
    try { pending = sessionStorage.getItem(PENDING_PAYMENT_KEY) } catch { /* ignore */ }
    return fromUrl ?? pending
  })
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [open, setOpen] = useState(!!id)
  // The status could not be read (network): the sheet says so instead of
  // closing without a word.
  const [unreachable, setUnreachable] = useState(false)
  // Still not confirmed when the polling stops: « Vérification en cours ».
  const [stopped, setStopped] = useState(false)

  useEffect(() => {
    if (!id || !isLoggedIn) return
    let stop = false
    let tries = 0
    let failures = 0
    let timer: number | undefined
    const tick = () => {
      void client.query<{ payment: PaymentIntent }>({ query: PAYMENT_QUERY, variables: { id }, fetchPolicy: 'network-only' }).then(({ data }) => {
        if (stop || !data) return
        failures = 0
        setUnreachable(false)
        setIntent(data.payment)
        if (OPEN_PAYMENT.includes(data.payment.status) && ++tries < POLL_TRIES) timer = window.setTimeout(tick, 3000)
        else {
          if (OPEN_PAYMENT.includes(data.payment.status)) setStopped(true)
          try { sessionStorage.removeItem(PENDING_PAYMENT_KEY) } catch { /* ignore */ }
          // Bought credits: counted once (lib/analytics, with consent only).
          trackCreditPurchase(data.payment)
          // Credits added (or not): the balance and history shown anywhere
          // come from the server again, not from the cache (queries on
          // screen refetch at once, the others on their next display).
          client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'myWallet' })
          client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'myWalletTransactions' })
          client.cache.gc()
        }
      }).catch(() => {
        if (stop) return
        // A dropped connection on the way back from the operator: keep
        // checking a while, slower each time.
        if (++failures <= 5) timer = window.setTimeout(tick, 3000 * 2 ** (failures - 1))
        else setUnreachable(true)
      })
    }
    tick()
    return () => { stop = true; window.clearTimeout(timer) }
  }, [id, isLoggedIn, client])

  const close = () => {
    setOpen(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('payment')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }
  if (!id || !isLoggedIn) return null
  const method = PROVIDERS.find((p) => p.key === intent?.provider)?.method ?? 'WAVE'
  const verifying = !!intent && (VERIFYING_PAYMENT.includes(intent.status) || (OPEN_PAYMENT.includes(intent.status) && stopped))
  const waiting = !verifying && (!intent || OPEN_PAYMENT.includes(intent.status))

  return (
    <BottomSheet open={open} onClose={close} title="Paiement Mobile Money" footer={
      <div className="border-0 border-t border-solid border-outline-variant px-4 py-3">
        <button onClick={close} className="h-12 w-full cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white">{waiting || verifying ? 'Continuer (vérification en cours)' : 'Terminer'}</button>
      </div>
    }>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <PaymentLogo method={method} size={56} />
        {waiting && unreachable && <><Icon name="wifi_off" size={32} className="text-on-surface-variant" /><p className="m-0 text-headline-sm text-on-surface">Vérification impossible</p><p className="m-0 text-body-sm text-on-surface-variant">Nous n’arrivons pas à joindre Dilchap. Votre solde sera mis à jour dès la confirmation de l’opérateur.</p></>}
        {waiting && !unreachable && <><Icon name="progress_activity" size={32} className="animate-spin text-primary" /><p className="m-0 text-headline-sm text-on-surface">Confirmation du paiement…</p><p className="m-0 text-body-sm text-on-surface-variant">Nous attendons la confirmation de l’opérateur.</p></>}
        {verifying && <PaymentVerifying intent={intent} method={method} compact />}
        {intent?.status === 'SUCCESS' && <><span className="flex h-14 w-14 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="check_circle" size={36} fill /></span><p className="m-0 text-headline-sm text-on-surface">Paiement confirmé</p><p className="m-0 text-body-sm text-on-surface-variant">{intent.credits ? `${intent.credits} crédits ajoutés à votre solde.` : 'Vos crédits sont ajoutés à votre solde.'} Réf. {intent.reference}</p></>}
        {intent?.status === 'FAILED' && <><span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="error" size={36} /></span><p className="m-0 text-headline-sm text-on-surface">Paiement non abouti</p><p className="m-0 text-body-sm text-on-surface-variant">{intent.failedReason ?? 'Aucun montant n’a été débité.'}</p></>}
        {intent && !waiting && intent.status !== 'SUCCESS' && <SupportAboutButton about={{ kind: 'PAYMENT', id: intent.id }} what="ce paiement" className="order-last mt-1" onBefore={close} />}
        {intent?.status === 'FULFILMENT_FAILED' && <><Icon name="support_agent" size={36} className="text-primary" /><p className="m-0 text-headline-sm text-on-surface">Paiement reçu</p><p className="m-0 text-body-sm text-on-surface-variant">L’activation a échoué ; notre équipe s’en occupe. Réf. {intent.reference}</p></>}
      </div>
    </BottomSheet>
  )
}
