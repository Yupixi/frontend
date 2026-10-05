import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import BuyCreditsSheet from './BuyCreditsSheet'
import Credits from './Credits'
import Icon from './Icon'
import AccountVerifyPanel from './AccountVerifyPanel'
import { isNotVerifiedError } from '../lib/accountVerify'
import {
  PURCHASE_WITH_WALLET_MUTATION, WALLET_BALANCE_QUERY,
  type PaymentRequest, type PurchaseResult, type WalletBalance,
} from '../graphql/payments'
import { offerLabel, operationOf, useOfferPrice } from '../lib/priceOffers'
import { usePriceVars } from '../lib/countries'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  // Usual price in credits (the member's live offer is applied here, as the
  // server does).
  amount: number
  // Listing category, for category offers (boost, bump, campaign).
  categoryId?: string | null
  request: PaymentRequest | null
  // Recap shown above the totals.
  children?: React.ReactNode
  onPaid: (result: PurchaseResult) => void
}

// "Payer en crédits": every purchase of the app is paid in credits. When the
// balance is short, the missing credits are bought first (BuyCreditsSheet,
// Mobile Money), then the purchase is confirmed.
export default function WalletPaySheet({ open, onClose, title, amount: base, categoryId, request, children, onPaid }: Props) {
  const op = request ? operationOf(request.kind, request.product) : null
  const offer = useOfferPrice(op ?? 'BOOST', base, categoryId, request?.listingId)
  const amount = op && offer ? offer.price : base
  const { data, refetch } = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { variables: usePriceVars(), skip: !open, fetchPolicy: 'network-only' })
  const [buy, { loading }] = useMutation<{ purchaseWithWallet: PurchaseResult }>(PURCHASE_WITH_WALLET_MUTATION)
  const [error, setError] = useState('')
  // Account not confirmed: the SMS code inside this sheet, then the
  // purchase goes through.
  const [needsVerify, setNeedsVerify] = useState(false)
  const [topUp, setTopUp] = useState(false)
  // Set synchronously: a double tap lands before `loading` re-renders the
  // button disabled, and each purchase call is charged.
  const paying = useRef(false)
  const balance = data?.myWallet.credits ?? 0
  const missing = Math.max(0, amount - balance)

  const close = () => { setError(''); setNeedsVerify(false); onClose() }
  const pay = () => {
    if (!request || paying.current) return
    paying.current = true
    setError('')
    void buy({ variables: { input: { kind: request.kind, product: request.product, listingId: request.listingId } } })
      .then(r => { if (r.data) { onPaid(r.data.purchaseWithWallet); onClose() } })
      .catch((e: Error) => {
        if (isNotVerifiedError(e)) { setNeedsVerify(true); return }
        setError(e.message); void refetch()
      })
      .finally(() => { paying.current = false })
  }

  if (topUp) return <BuyCreditsSheet open={open} suggested={missing} onClose={() => setTopUp(false)} onDone={() => { setTopUp(false); void refetch() }} />

  const footer = !data ? undefined : (<div className="border-0 border-t border-solid border-outline-variant px-4 pb-3 pt-3">{missing > 0 ? (
    <button type="button" onClick={() => setTopUp(true)} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="add_card" size={19} /> Acheter des crédits</button>
  ) : (
    <button type="button" disabled={loading || !request} onClick={pay} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-45"><Icon name="toll" size={19} /> {loading ? 'Paiement…' : amount === 0 ? 'Confirmer (gratuit)' : <>Payer <Credits n={amount} /></>}</button>
  )}</div>)
  return (
    <BottomSheet open={open} onClose={close} title={title} footer={footer} maxHeight="90vh" maxWidth="480px">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low px-3.5 py-2.5">
        <div className="min-w-0 text-body-sm text-on-surface-variant">{children}</div>
        <div className="shrink-0 text-right">
          <div className="text-label-sm uppercase text-on-surface-variant">Total</div>
          {op && offer?.percent ? <div className="whitespace-nowrap text-body-sm text-on-surface-variant line-through"><Credits n={base} /></div> : null}
          <div className="whitespace-nowrap text-headline-sm text-primary">{amount === 0 && base > 0 ? 'Gratuit' : <Credits n={amount} />}</div>
        </div>
      </div>
      {op && offer?.percent ? (
        <p className="m-0 mt-3 flex items-center gap-2 rounded-xl bg-tertiary-soft px-3 py-2 text-body-sm text-tertiary"><Icon name="redeem" size={18} className="shrink-0" /> <span><b>{offerLabel(offer.percent)}</b> avec l’offre « {offer.name} »</span></p>
      ) : null}
      <dl className="m-0 mt-3 flex flex-col gap-2 text-body-md">
        <div className="flex justify-between gap-3"><dt className="text-on-surface-variant">Vos crédits</dt><dd className="m-0 whitespace-nowrap font-semibold text-on-surface">{data ? <Credits n={balance} /> : '…'}</dd></div>
        {data && missing === 0 && <div className="flex justify-between gap-3 border-0 border-t border-solid border-outline-variant pt-2"><dt className="text-on-surface-variant">Après l’achat</dt><dd className="m-0 whitespace-nowrap font-semibold text-on-surface"><Credits n={balance - amount} /></dd></div>}
      </dl>
      {data && missing > 0 && (
        <p className="m-0 mt-3 flex items-start gap-2 rounded-xl bg-primary-fixed/50 px-3 py-2.5 text-body-sm text-on-surface"><Icon name="info" size={18} className="mt-0.5 shrink-0 text-primary" /> <span>Il vous manque <b><Credits n={missing} /></b>. Achetez des crédits par Mobile Money, puis confirmez l’achat.</span></p>
      )}
      {error && <p className="m-0 mt-3 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary">{error}</p>}
      {needsVerify && <div className="mt-3"><AccountVerifyPanel intro="Pour acheter, confirmez votre compte : par SMS, c’est immédiat, et l’achat reprend aussitôt." onVerified={() => { setNeedsVerify(false); pay() }} /></div>}
    </BottomSheet>
  )
}
