import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import Icon from './Icon'
import Price from './Price'
import PaymentSheet from './PaymentSheet'
import { WALLET_BALANCE_QUERY, type PaymentIntent, type WalletBalance } from '../graphql/payments'
import { formatNumber } from '../lib/format'

const PRESETS = [1000, 2000, 5000, 10_000, 20_000, 50_000]

// "Recharger mon porte-monnaie": amount (presets or free, within the limits
// set in the back-office), then Mobile Money. `suggested` preselects an
// amount (the missing part of a purchase).
export default function TopUpSheet({ open, onClose, onDone, suggested }: {
  open: boolean
  onClose: () => void
  onDone: (intent: PaymentIntent) => void
  suggested?: number
}) {
  const settings = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { skip: !open }).data?.walletSettings
  const min = settings?.topupMin ?? 500
  const max = settings?.topupMax ?? 500_000
  const [amount, setAmount] = useState(suggested ? String(suggested) : '')
  const [pay, setPay] = useState(false)
  const n = Number(amount)
  const ok = Number.isInteger(n) && n >= min && n <= max
  const presets = PRESETS.filter(p => p >= min && p <= max)

  if (pay) return (
    <PaymentSheet open={open} onClose={() => { setPay(false); onClose() }} title="Recharger mon porte-monnaie" amount={n}
      request={{ kind: 'WALLET_TOPUP', product: String(n) }} onPaid={i => { setPay(false); onDone(i) }}>
      Recharge du porte-monnaie Dilchap
    </PaymentSheet>
  )
  return (
    <BottomSheet open={open} onClose={onClose} title="Recharger mon porte-monnaie" maxWidth="480px"
      footer={<div className="border-0 border-t border-solid border-outline-variant px-4 pb-3 pt-3"><button type="button" disabled={!ok} onClick={() => setPay(true)} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-45"><Icon name="arrow_forward" size={19} /> {ok ? <>Recharger <Price amount={n} /></> : 'Choisissez un montant'}</button></div>}>
      <p className="m-0 text-body-sm text-on-surface-variant">Votre solde sert à payer boosts, crédits, badges, abonnement boutique et campagnes, sans ressaisir votre numéro à chaque achat.</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {presets.map(p => (
          <button key={p} type="button" onClick={() => setAmount(String(p))} className={`h-12 cursor-pointer whitespace-nowrap rounded-xl border-2 border-solid text-label-lg ${n === p ? 'border-primary bg-primary-fixed/30 text-primary' : 'border-outline-variant/70 bg-surface-lowest text-on-surface'}`}>{formatNumber(p)} F</button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-label-md text-on-surface">Autre montant</span>
        <span className="flex h-12 items-center gap-2 rounded-xl bg-surface-container-low px-3">
          <input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 7))} placeholder={`${formatNumber(min)} à ${formatNumber(max)}`} className="w-full min-w-0 border-none bg-transparent text-body-md text-on-surface outline-none" />
          <span className="text-label-md text-on-surface-variant">F</span>
        </span>
      </label>
      {amount && !ok && <p className="m-0 mt-2 text-body-sm text-primary">Entre {formatNumber(min)} F et {formatNumber(max)} F.</p>}
    </BottomSheet>
  )
}
