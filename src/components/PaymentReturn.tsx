import { useEffect, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import Icon from './Icon'
import PaymentLogo from './PaymentLogo'
import { PAYMENT_QUERY, PENDING_PAYMENT_KEY, PROVIDERS, type PaymentIntent } from '../graphql/payments'

const OPEN = ['PENDING', 'PROCESSING']

// Back from the Wave checkout (…/?payment=<id>): show the outcome while
// the server confirms the payment with Paytic.
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

  useEffect(() => {
    if (!id || !isLoggedIn) return
    let stop = false
    let tries = 0
    const tick = () => {
      void client.query<{ payment: PaymentIntent }>({ query: PAYMENT_QUERY, variables: { id }, fetchPolicy: 'network-only' }).then(({ data }) => {
        if (stop || !data) return
        setIntent(data.payment)
        if (OPEN.includes(data.payment.status) && ++tries < 60) window.setTimeout(tick, 3000)
        else try { sessionStorage.removeItem(PENDING_PAYMENT_KEY) } catch { /* ignore */ }
      }).catch(() => setOpen(false))
    }
    tick()
    return () => { stop = true }
  }, [id, isLoggedIn, client])

  const close = () => {
    setOpen(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('payment')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }
  if (!id || !isLoggedIn) return null
  const method = PROVIDERS.find((p) => p.key === intent?.provider)?.method ?? 'WAVE'
  const waiting = !intent || OPEN.includes(intent.status)

  return (
    <BottomSheet open={open} onClose={close} title="Paiement Mobile Money" footer={
      <div className="border-0 border-t border-solid border-outline-variant px-4 py-3">
        <button onClick={close} className="h-12 w-full cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white">{waiting ? 'Continuer (vérification en cours)' : 'Terminer'}</button>
      </div>
    }>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <PaymentLogo method={method} size={56} />
        {waiting && <><Icon name="progress_activity" size={32} className="animate-spin text-primary" /><p className="m-0 text-headline-sm text-on-surface">Confirmation du paiement…</p><p className="m-0 text-body-sm text-on-surface-variant">Nous attendons la confirmation de l’opérateur.</p></>}
        {intent?.status === 'SUCCESS' && <><span className="flex h-14 w-14 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="check_circle" size={36} fill /></span><p className="m-0 text-headline-sm text-on-surface">Paiement confirmé</p><p className="m-0 text-body-sm text-on-surface-variant">Votre {intent.kind === 'CREDIT_PACK' ? 'recharge de crédits' : 'boost'} est actif. Réf. {intent.reference}</p></>}
        {intent?.status === 'FAILED' && <><span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="error" size={36} /></span><p className="m-0 text-headline-sm text-on-surface">Paiement non abouti</p><p className="m-0 text-body-sm text-on-surface-variant">{intent.failedReason ?? 'Aucun montant n’a été débité.'}</p></>}
        {intent?.status === 'FULFILMENT_FAILED' && <><Icon name="support_agent" size={36} className="text-primary" /><p className="m-0 text-headline-sm text-on-surface">Paiement reçu</p><p className="m-0 text-body-sm text-on-surface-variant">L’activation a échoué ; notre équipe s’en occupe. Réf. {intent.reference}</p></>}
      </div>
    </BottomSheet>
  )
}
