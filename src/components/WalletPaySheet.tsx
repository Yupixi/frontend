import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import Icon from './Icon'
import Price from './Price'
import TopUpSheet from './TopUpSheet'
import {
  PURCHASE_WITH_WALLET_MUTATION, WALLET_BALANCE_QUERY,
  type PaymentRequest, type PurchaseResult, type WalletBalance,
} from '../graphql/payments'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  amount: number
  request: PaymentRequest | null
  // Recap shown above the totals.
  children?: React.ReactNode
  onPaid: (result: PurchaseResult) => void
}

// "Payer avec mon solde": every purchase of the app is paid from the wallet
// balance. When it is short, the missing amount is topped up by Mobile
// Money first (TopUpSheet), then the purchase is confirmed.
export default function WalletPaySheet({ open, onClose, title, amount, request, children, onPaid }: Props) {
  const { data, refetch } = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { skip: !open, fetchPolicy: 'network-only' })
  const [buy, { loading }] = useMutation<{ purchaseWithWallet: PurchaseResult }>(PURCHASE_WITH_WALLET_MUTATION)
  const [error, setError] = useState('')
  const [topUp, setTopUp] = useState(false)
  const balance = data?.myWallet.balance ?? 0
  const missing = Math.max(0, amount - balance)
  const min = data?.walletSettings.topupMin ?? 500
  const suggested = missing ? Math.max(min, Math.ceil(missing / 100) * 100) : 0

  const close = () => { setError(''); onClose() }
  const pay = () => {
    if (!request) return
    setError('')
    void buy({ variables: { input: { kind: request.kind, product: request.product, listingId: request.listingId } } })
      .then(r => { if (r.data) { onPaid(r.data.purchaseWithWallet); onClose() } })
      .catch((e: Error) => { setError(e.message); void refetch() })
  }

  if (topUp) return <TopUpSheet open={open} suggested={suggested} onClose={() => setTopUp(false)} onDone={() => { setTopUp(false); void refetch() }} />

  const footer = !data ? undefined : (<div className="border-0 border-t border-solid border-outline-variant px-4 pb-3 pt-3">{missing > 0 ? (
    <button type="button" onClick={() => setTopUp(true)} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="add_card" size={19} /> Recharger mon porte-monnaie</button>
  ) : (
    <button type="button" disabled={loading || !request} onClick={pay} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-45"><Icon name="account_balance_wallet" size={19} /> {loading ? 'Paiement…' : <>Payer <Price amount={amount} /> avec mon solde</>}</button>
  )}</div>)
  return (
    <BottomSheet open={open} onClose={close} title={title} footer={footer} maxHeight="90vh" maxWidth="480px">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low px-3.5 py-2.5">
        <div className="min-w-0 text-body-sm text-on-surface-variant">{children}</div>
        <div className="shrink-0 text-right">
          <div className="text-label-sm uppercase text-on-surface-variant">Total</div>
          <div className="text-headline-sm text-primary"><Price amount={amount} /></div>
        </div>
      </div>
      <dl className="m-0 mt-3 flex flex-col gap-2 text-body-md">
        <div className="flex justify-between gap-3"><dt className="text-on-surface-variant">Solde du porte-monnaie</dt><dd className="m-0 font-semibold text-on-surface">{data ? <Price amount={balance} /> : '…'}</dd></div>
        {data && missing === 0 && <div className="flex justify-between gap-3 border-0 border-t border-solid border-outline-variant pt-2"><dt className="text-on-surface-variant">Solde après l’achat</dt><dd className="m-0 font-semibold text-on-surface"><Price amount={balance - amount} /></dd></div>}
      </dl>
      {data && missing > 0 && (
        <p className="m-0 mt-3 flex items-start gap-2 rounded-xl bg-primary-fixed/50 px-3 py-2.5 text-body-sm text-on-surface"><Icon name="info" size={18} className="mt-0.5 shrink-0 text-primary" /> <span>Il manque <b><Price amount={missing} /></b> sur votre solde. Rechargez par Mobile Money, puis confirmez l’achat.</span></p>
      )}
      {error && <p className="m-0 mt-3 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary">{error}</p>}
    </BottomSheet>
  )
}
