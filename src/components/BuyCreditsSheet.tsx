import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import Credits from './Credits'
import Icon from './Icon'
import Price from './Price'
import PaymentSheet from './PaymentSheet'
import { PAYMENT_SETTINGS_QUERY, WALLET_BALANCE_QUERY, type PaymentIntent, type PaymentSettings, type WalletBalance } from '../graphql/payments'
import { CREDIT_PACKS_QUERY, type CreditPack } from '../graphql/sellerHub'
import { useAccountCountryCode, useCountry, usePriceVars } from '../lib/countries'
import { fmtNumber, useT } from '../i18n'
import wallet from '../i18n/ns/wallet'

// "Acheter des crédits": a pack (credits offered on the bigger ones) or a
// free number of credits at the credit price, both set in the back-office,
// paid by Mobile Money. `suggested` preselects a free amount (the credits
// missing for a purchase); `pack` preselects a pack.
export default function BuyCreditsSheet({ open, onClose, onDone, suggested, pack }: {
  open: boolean
  onClose: () => void
  onDone: (intent: PaymentIntent) => void
  suggested?: number
  pack?: string
}) {
  const t = useT(wallet)
  const balanceData = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { variables: usePriceVars(), skip: !open }).data
  const settings = balanceData?.walletSettings
  const packs = useQuery<{ creditPacks: CreditPack[] }>(CREDIT_PACKS_QUERY, { variables: usePriceVars(), skip: !open }).data?.creditPacks ?? []
  const paymentsOff = useQuery<PaymentSettings>(PAYMENT_SETTINGS_QUERY, { skip: !open }).data?.paymentSettings.environment === 'disabled'
  const value = settings?.creditValue ?? 0
  const min = settings?.topupMin ?? 1
  const max = settings?.topupMax ?? 100_000
  // A pack code, or 'FREE' for a free number of credits.
  const [choice, setChoice] = useState(pack ?? (suggested ? 'FREE' : ''))
  const [count, setCount] = useState(suggested ? String(Math.max(min, suggested)) : '')
  const [pay, setPay] = useState(false)
  // Mobile Money collection is open per country (« Pays » in the BO).
  const country = useCountry(useAccountCountryCode(), true)
  const notHere = !!country && !country.payments

  // Whole credits only: "2.5" or "2,5" is refused with a message instead of
  // silently becoming 25.
  const whole = /^\d+$/.test(count)
  const n = whole ? Number(count) : NaN
  const freeOk = whole && n >= min && n <= max
  const picked = packs.find((p) => p.pack === choice)
  const credits = picked ? picked.credits + picked.bonusCredits : choice === 'FREE' && freeOk ? n : 0
  const amount = picked ? picked.price : choice === 'FREE' && freeOk ? n * value : 0
  const ok = credits > 0 && amount > 0 && !paymentsOff

  if (notHere) return (
    <BottomSheet open={open} onClose={onClose} title={t('buy.title')} maxWidth="480px"
      footer={<div className="border-0 border-t border-solid border-outline-variant px-4 pb-3 pt-3"><button type="button" onClick={onClose} className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border-none bg-primary text-label-lg text-white">{t('buy.understood')}</button></div>}>
      <p className="m-0 flex gap-2 rounded-xl bg-surface-container-low p-3 text-body-md text-on-surface"><Icon name="schedule" size={20} className="shrink-0 text-primary" /> {t('buy.notHere', { country: country.inName })}</p>
    </BottomSheet>
  )

  if (pay) return (
    <PaymentSheet open={open} onClose={() => { setPay(false); onClose() }} title={t('buy.title')} amount={amount}
      request={picked ? { kind: 'CREDIT_PACK', product: picked.pack } : { kind: 'WALLET_TOPUP', product: String(n) }}
      onPaid={(i) => { setPay(false); onDone(i) }}>
      <b className="block text-label-lg text-on-surface"><Credits n={credits} /></b>
      {picked ? picked.label : t('buy.freeAmount')}
    </PaymentSheet>
  )

  const radio = (on: boolean) => `flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-solid p-3 text-left ${on ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant/70 bg-surface-lowest'}`
  return (
    <BottomSheet open={open} onClose={onClose} title={t('buy.title')} maxWidth="480px"
      footer={<div className="border-0 border-t border-solid border-outline-variant px-4 pb-3 pt-3"><button type="button" disabled={!ok} onClick={() => setPay(true)} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-45"><Icon name="lock" size={18} /> {paymentsOff ? t('buy.soon') : ok ? t.rich('buy.pay', { price: <Price amount={amount} /> }) : t('buy.choose')}</button></div>}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface-variant">
        <span>{t.rich('buy.balance', { balance: balanceData ? <Credits n={balanceData.myWallet.credits} /> : '…', b: c => <b className="text-on-surface">{c}</b> })}</span>
        {value > 0 && <span>{t.rich('buy.rate', { price: <Price amount={value} />, b: c => <b className="text-on-surface">{c}</b> })}</span>}
      </div>
      {!!suggested && <p className="m-0 mt-2 flex items-center gap-2 text-body-sm text-on-surface"><Icon name="info" size={17} className="shrink-0 text-primary" /> <span>{t.rich('buy.missing', { credits: <Credits n={suggested} />, b: c => <b>{c}</b> })}</span></p>}
      {paymentsOff && <p className="m-0 mt-3 flex gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface"><Icon name="schedule" size={18} className="shrink-0 text-primary" /> {t('buy.paymentsOff')}</p>}
      <div className="mt-3 flex flex-col gap-2">
        {packs.map((p) => {
          const total = p.credits + p.bonusCredits
          return (
            <button key={p.pack} type="button" onClick={() => setChoice(p.pack)} className={radio(choice === p.pack)}>
              <Icon name={choice === p.pack ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} className={choice === p.pack ? 'text-primary' : 'text-outline'} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label-lg text-on-surface">{p.label}</span>
                <span className="block truncate text-body-sm text-on-surface-variant"><Credits n={total} />{p.bonusCredits > 0 && t.rich('buy.bonus', { n: String(p.bonusCredits), b: c => <b className="font-semibold text-tertiary">{c}</b> })}</span>
                {suggested ? (total < suggested && <span className="block text-label-sm text-primary">{t('buy.notEnough')}</span>) : null}
              </span>
              <span className="shrink-0 whitespace-nowrap text-label-lg font-extrabold text-on-surface"><Price amount={p.price} /></span>
            </button>
          )
        })}
        <div className={radio(choice === 'FREE')} onClick={() => setChoice('FREE')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setChoice('FREE') }}>
          <Icon name={choice === 'FREE' ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} className={choice === 'FREE' ? 'text-primary' : 'text-outline'} />
          <span className="min-w-0 flex-1">
            <span className="block text-label-lg text-on-surface">{t('buy.other')}</span>
            <span className="block truncate text-body-sm text-on-surface-variant">{value ? t.rich('buy.perCredit', { price: <Price amount={value} /> }) : '…'}</span>
          </span>
          <label className="flex h-10 w-32 shrink-0 items-center gap-1 rounded-lg bg-surface-container-low pr-2">
            <input value={count} onFocus={() => setChoice('FREE')} onChange={(e) => { setChoice('FREE'); setCount(e.target.value.replace(/[^\d.,]/g, '').slice(0, 7)) }} inputMode="numeric" aria-label={t('buy.countAria')} aria-invalid={!!count && !freeOk} placeholder={String(min)} className="h-10 w-full min-w-0 border-none bg-transparent px-2 text-right text-body-md text-on-surface outline-none" />
            <span className="text-body-sm text-on-surface-variant">{t('creditUnit', { count: 2 })}</span>
          </label>
        </div>
      </div>
      {choice === 'FREE' && count && !freeOk && <p role="alert" className="m-0 mt-2 text-body-sm text-primary">{whole ? t('buy.range', { min: String(min), max: fmtNumber(max) }) : t('buy.wholeOnly')}</p>}
      {choice === 'FREE' && freeOk && value > 0 && <p className="m-0 mt-2 text-body-sm text-on-surface-variant"><Credits n={n} /> = <b className="text-on-surface"><Price amount={n * value} /></b></p>}
    </BottomSheet>
  )
}
