import EmptyState from '../../components/EmptyState'
import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { CheckCircle2, ArrowRight, ShieldCheck, Star, ChevronLeft, ChevronRight } from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import BuyCreditsSheet from '../../components/BuyCreditsSheet'
import Credits from '../../components/Credits'
import { BoostSteps } from '../../components/boost/BoostKit'
import PaymentLogo, { PAYMENT_BRANDS, PaymentLogos } from '../../components/PaymentLogo'
import HelpLink from '../../components/HelpLink'
import { AccountLayout } from '../account/AccountLayout'
import {
  CREDIT_PACKS_QUERY, MY_WALLET_QUERY, MY_WALLET_TRANSACTIONS_QUERY,
  type CreditPack, type WalletSummary, type WalletTx, type WalletTxType,
} from '../../graphql/sellerHub'
import type { AuthUser } from '../../graphql/auth'
import type { WalletSettings } from '../../graphql/payments'
import { Claim, useNoCommissionClaims } from '../../lib/site'
import { METHOD_LABELS, methodsSentence, useAccountCountryCode, useCountry, usePriceVars } from '../../lib/countries'
import { fmtCfa, fmtDate, useT } from '../../i18n'
import common from '../../i18n/ns/common'
import walletNs from '../../i18n/ns/wallet'

type Props = { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }

const PAGE_SIZE = 5
const FILTERS: { key: 'all' | 'in' | 'out' | 'sales', types?: WalletTxType[] }[] = [
  { key: 'all' },
  { key: 'in', types: ['CREDIT_PURCHASE', 'CREDIT_GRANT', 'CREDIT_REFUND', 'WALLET_ADJUSTMENT', 'WALLET_TOPUP'] },
  { key: 'out', types: ['CREDIT_SPENT', 'BOOST_PURCHASE', 'SHOP_SUBSCRIPTION', 'BADGE_SUBSCRIPTION', 'CAMPAIGN_ENTRY'] },
  { key: 'sales', types: ['SALE'] },
]
// Read at render (never frozen in French at module load).
const methodLabel = (m: string): string => {
  const t = walletNs.t
  const own: Record<string, string> = { CASH: t('page.method.cash'), CREDITS: t('page.method.credits'), DIRECT: t('page.method.direct'), WALLET: t('page.method.credits'), DILCHAP: t('page.method.dilchap') }
  return own[m] ?? (METHOD_LABELS as Record<string, string>)[m] ?? m
}
type TxStatus = 'active' | 'validated' | 'paid' | 'offered' | 'refunded' | 'cashed' | 'credited' | 'adjusted'
// A type the backend adds later falls back to FALLBACK_META (never a blank page).
const TX_META: Partial<Record<WalletTxType, { icon: string, box: string, status: TxStatus, statusCls: string }>> = {
  BOOST_PURCHASE: { icon: 'rocket_launch', box: 'bg-primary-fixed text-primary', status: 'active', statusCls: 'bg-tertiary-soft text-tertiary' },
  CREDIT_SPENT: { icon: 'bolt', box: 'bg-surface-container text-on-surface', status: 'validated', statusCls: 'bg-surface-container-high text-on-surface-variant' },
  CREDIT_PURCHASE: { icon: 'add_card', box: 'bg-tertiary-soft text-tertiary', status: 'paid', statusCls: 'bg-tertiary-soft text-tertiary' },
  CREDIT_GRANT: { icon: 'redeem', box: 'bg-tertiary-soft text-tertiary', status: 'offered', statusCls: 'bg-tertiary-soft text-tertiary' },
  CREDIT_REFUND: { icon: 'undo', box: 'bg-tertiary-soft text-tertiary', status: 'refunded', statusCls: 'bg-tertiary-soft text-tertiary' },
  SALE: { icon: 'handshake', box: 'bg-tertiary-soft text-tertiary', status: 'cashed', statusCls: 'bg-tertiary-soft text-tertiary' },
  SHOP_SUBSCRIPTION: { icon: 'storefront', box: 'bg-primary-fixed text-primary', status: 'paid', statusCls: 'bg-surface-container-high text-on-surface-variant' },
  BADGE_SUBSCRIPTION: { icon: 'verified', box: 'bg-verified-soft text-verified', status: 'paid', statusCls: 'bg-surface-container-high text-on-surface-variant' },
  CAMPAIGN_ENTRY: { icon: 'campaign', box: 'bg-primary-fixed text-primary', status: 'paid', statusCls: 'bg-surface-container-high text-on-surface-variant' },
  WALLET_TOPUP: { icon: 'add_card', box: 'bg-tertiary-soft text-tertiary', status: 'credited', statusCls: 'bg-tertiary-soft text-tertiary' },
  WALLET_ADJUSTMENT: { icon: 'tune', box: 'bg-surface-container text-on-surface', status: 'adjusted', statusCls: 'bg-surface-container-high text-on-surface-variant' },
}
const FALLBACK_META: { icon: string, box: string, status: TxStatus, statusCls: string } = { icon: 'bolt', box: 'bg-surface-container text-on-surface', status: 'validated', statusCls: 'bg-surface-container-high text-on-surface-variant' }

// "Porte-monnaie & Solde publicitaire" mockup. Dilchap never holds sale
// funds: sales are declarative (deals concluded in chat). Credits, bought
// by Mobile Money, are the only currency of the app: they pay boosts,
// badges, the shop plan and campaign fees.
export default function Wallet({ onNavigate, currentUser, onLogout }: Props) {
  const t = useT(walletNs)
  const tc = useT(common)
  const noCommission = useNoCommissionClaims()
  // Member's country: its payment methods; credits by Mobile Money only
  // where the BO opened them (« Pays »).
  const country = useCountry(useAccountCountryCode(), true)
  const mobile = methodsSentence((country?.methods ?? ['WAVE', 'ORANGE_MONEY']).filter(m => m !== 'CASH'))
  const { data: walletData, refetch: refetchWallet } = useQuery<{ myWallet: WalletSummary; walletSettings: WalletSettings }>(MY_WALLET_QUERY, { variables: usePriceVars() })
  const wallet = walletData?.myWallet
  const { data: packsData } = useQuery<{ creditPacks: CreditPack[] }>(CREDIT_PACKS_QUERY, { variables: usePriceVars() })
  const packs = packsData?.creditPacks ?? []
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const types = FILTERS.find(f => f.key === filter)?.types
  const { data: txData, refetch: refetchTx } = useQuery<{ myWalletTransactions: { items: WalletTx[], totalCount: number } }>(MY_WALLET_TRANSACTIONS_QUERY, { variables: { types, page, pageSize: PAGE_SIZE } })
  const txs = txData?.myWalletTransactions.items ?? []
  const total = txData?.myWalletTransactions.totalCount ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // null = closed, '' = no pack preselected, else a pack code.
  const [buying, setBuying] = useState<string | null>(null)
  const creditValue = walletData?.walletSettings.creditValue ?? 0
  const [done, setDone] = useState<string | null>(null)
  const credits = wallet?.credits ?? 0
  const salesCount = wallet?.salesCount ?? 0

  return (
    <AccountLayout active="seller-wallet" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1120px] pb-6">
        {/* Desktop heading; on mobile the shell titles the page and the balance comes first. */}
        <div className="mb-1 hidden items-center gap-1 text-label-sm uppercase text-primary lg:flex"><Icon name="account_balance_wallet" size={14} /> {t('page.eyebrow')}</div>
        <div className="mb-6 hidden flex-wrap items-end justify-between gap-3 lg:flex">
          <div>
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">{t('page.title')}</h1>
            <p className="m-0 mt-1 max-w-xl text-body-md text-on-surface-variant">{t('page.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Claim><span className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-tertiary-soft px-3 py-2.5 text-label-md text-tertiary"><CheckCircle2 size={16} /> {t('page.zeroCommissionActive')}</span></Claim>
            <button onClick={() => setBuying('')} className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark"><Icon name="add_card" size={16} /> {t('buy.title')}</button>
          </div>
        </div>

        {done && <p className="mb-4 flex items-center gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><CheckCircle2 size={16} className="shrink-0" /> {done}</p>}

        {/* Mobile: balance card first, then two mini KPIs */}
        <section className="md:hidden">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-container p-4 text-white shadow-float">
            <div className="text-label-md text-white/85">{t('pay.yourCredits')}</div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="min-w-0 truncate text-[34px] font-extrabold leading-none"><Credits n={credits} /></div>
              <button onClick={() => setBuying('')} className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-white px-4 text-label-lg text-primary"><Icon name="add_circle" size={18} /> {t('page.buy')}</button>
            </div>
            <p className="m-0 mt-2 flex items-center justify-between gap-2 border-0 border-t border-solid border-white/20 pt-2 text-body-sm text-white/85"><span>{t('page.value')}</span><b className="text-white">{creditValue ? <>≈ <Price amount={credits * creditValue} /></> : '—'}</b></p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-outline-variant bg-surface-lowest p-3">
              <div className="text-label-sm text-on-surface-variant">{t('page.salesGenerated')}</div>
              <div className="mt-0.5 text-headline-sm font-extrabold text-on-surface"><Price amount={wallet?.totalSales ?? 0} /></div>
              <Claim><div className="text-[11px] text-tertiary">{t('page.zeroCommission', { zero: fmtCfa(0) })}</div></Claim>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-lowest p-3">
              <div className="text-label-sm text-on-surface-variant">{t('page.salesConfirmed')}</div>
              <div className="mt-0.5 text-headline-sm font-extrabold text-on-surface">{salesCount}</div>
              <div className="text-[11px] text-on-surface-variant">{t.rich('page.confirmationShort', { rate: wallet?.confirmationRate != null ? `${wallet.confirmationRate}%` : '—', b: c => <b className="text-tertiary">{c}</b> })}</div>
            </div>
          </div>
        </section>

        {/* KPIs (tablet / desktop) */}
        <section className="hidden gap-4 md:grid md:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest">
            <div className="p-5">
              <div className="flex items-center justify-between text-label-md text-on-surface">{t('pay.yourCredits')} <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icon name="toll" size={17} /></span></div>
              <div className="mt-2 truncate text-[30px] font-extrabold leading-none text-primary xl:text-[40px]"><Credits n={credits} /></div>
              <p className="m-0 mt-2 text-body-sm text-on-surface-variant">{creditValue ? <>≈ <Price amount={credits * creditValue} /></> : null}</p>
            </div>
            <div className="flex items-center justify-between gap-2 bg-surface-container-low px-5 py-3 text-body-sm text-on-surface-variant">
              <span className="truncate">{creditValue ? t.rich('page.rate', { price: <Price amount={creditValue} /> }) : '—'}</span>
              <button onClick={() => setBuying('')} className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md border-none bg-primary px-2.5 py-1 text-label-sm text-white">{t('page.buy')} <ArrowRight size={13} /></button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest">
            <div className="p-5">
              <div className="flex items-center justify-between text-label-md text-on-surface">{t('page.totalSales')} <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tertiary text-white"><Icon name="payments" size={17} /></span></div>
              <div className="mt-2 text-[36px] font-extrabold leading-none text-on-surface"><Price amount={wallet?.totalSales ?? 0} /></div>
              <Claim><p className="m-0 mt-2 flex items-center gap-1 text-body-sm text-tertiary"><CheckCircle2 size={14} /> {t('page.fullAmount', { zero: fmtCfa(0) })}</p></Claim>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low px-5 py-3 text-body-sm text-on-surface-variant">{t('page.directPayments')} <span className="font-semibold text-on-surface">{t('page.directSeller')}</span></div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest">
            <div className="p-5">
              <div className="flex items-center justify-between text-label-md text-on-surface">{t('page.directDeals')} <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface"><Icon name="handshake" size={17} /></span></div>
              <div className="mt-2 flex items-baseline gap-2"><span className="text-[44px] font-extrabold leading-none text-on-surface">{salesCount}</span><span className="text-headline-sm text-on-surface">{t('page.confirmedSalesUnit', { count: salesCount })}</span></div>
              <p className="m-0 mt-2 flex items-center gap-1 text-body-sm text-on-surface-variant"><Star size={14} className="text-primary" /> {wallet?.reviewsCount ? t('page.rating', { avg: wallet.averageRating.toFixed(1), n: String(wallet.reviewsCount) }) : t('page.noReviews')}</p>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low px-5 py-3 text-body-sm text-on-surface-variant">{t('page.confirmationRate')} <span className="font-semibold text-tertiary">{wallet?.confirmationRate != null ? `${wallet.confirmationRate}%` : '—'}</span></div>
          </div>
        </section>

        <BoostSteps className="mt-4 md:mt-6" />

        {/* Transparency */}
        <section className="mt-4 flex items-start gap-3 rounded-2xl bg-tertiary-soft/50 p-4 md:mt-6 md:flex-row md:items-center md:gap-4 md:bg-surface-container-low md:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary text-white md:h-12 md:w-12"><ShieldCheck size={22} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-label-lg text-on-surface md:text-headline-sm">
              <span className="md:hidden">{noCommission ? t('page.zeroCommissionSales') : t('page.transparency')}</span>
              <span className="hidden md:inline">{t('page.transparency')}</span>
              <Claim><span className="hidden rounded bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary md:inline">{t('page.noHiddenFees')}</span></Claim>
            </div>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant md:text-body-md">{t('page.directPayText', { methods: mobile })}</p>
          </div>
          <Claim><span className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-surface-lowest px-3 py-2.5 text-label-md text-on-surface md:flex"><CheckCircle2 size={16} className="text-tertiary" /> {t('page.zeroCommissionEach')}</span></Claim>
        </section>

        {/* Packs */}
        <section id="recharge" className="mt-6 scroll-mt-4 md:mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 md:mb-4 md:gap-3">
            <div>
              <h2 className="m-0 text-headline-sm text-on-surface md:text-headline-md">{t('buy.title')}</h2>
              <p className="m-0 text-body-sm text-on-surface-variant">{creditValue ? t.rich('page.packsSubRate', { price: <Price amount={creditValue} /> }) : t('page.packsSub')} <HelpLink article="acheter-des-credits" className="ml-1 align-middle" /></p>
            </div>
            {country?.payments !== false && <div className="hidden items-center gap-2 text-label-sm text-on-surface-variant md:flex">
              {t('page.mobilePayment')} <PaymentLogos size={26} />
            </div>}
          </div>
          {country && !country.payments && <p className="m-0 mb-3 flex gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface"><Icon name="schedule" size={18} className="shrink-0 text-primary" /> {t('buy.notHere', { country: country.inName })}</p>}
          {/* Mobile: compact pack rows, as in the mockup */}
          <div className="flex flex-col gap-2 md:hidden">
            {packs.map(p => {
              const total = p.credits + p.bonusCredits
              return (
                <button key={p.pack} onClick={() => setBuying(p.pack)} className="relative flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-solid border-outline-variant bg-surface-lowest p-3 text-left">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface"><Icon name="toll" size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label-lg text-on-surface"><Credits n={total} /></span>
                    <span className="block truncate text-body-sm text-on-surface-variant">{p.label}{p.bonusCredits > 0 && t.rich('page.bonus', { n: String(p.bonusCredits), b: c => <b className="font-semibold text-tertiary">{c}</b> })}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block whitespace-nowrap text-label-lg font-extrabold text-on-surface"><Price amount={p.price} /></span>
                    <span className="block whitespace-nowrap text-[11px] text-on-surface-variant">{t.rich('page.perCredit', { price: <Price amount={Math.round(p.price / Math.max(1, total))} /> })}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {/* Tablet / desktop: the packs side by side, figures only. */}
          {packs.length > 0 && (
            <div className="hidden overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest md:block">
              <table className="w-full table-fixed border-collapse text-center text-body-md">
                <caption className="sr-only">{t('page.table.caption')}</caption>
                <thead>
                  <tr className="bg-surface-container-low">
                    <th scope="col" className="w-[22%] p-3 text-left text-label-md text-on-surface-variant">{t('page.table.pack')}</th>
                    {packs.map(p => <th key={p.pack} scope="col" className="p-3 text-label-lg text-on-surface">{p.label}</th>)}
                    <th scope="col" className="p-3 text-label-lg text-on-surface">{t('buy.other')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-0 border-t border-solid border-outline-variant">
                    <th scope="row" className="p-3 text-left text-label-md font-normal text-on-surface-variant">{t('page.table.received')}</th>
                    {packs.map(p => <td key={p.pack} className="p-3 text-headline-sm text-on-surface"><Credits n={p.credits + p.bonusCredits} /></td>)}
                    <td className="p-3 text-on-surface-variant">{t('page.table.yourChoice')}</td>
                  </tr>
                  <tr className="border-0 border-t border-solid border-outline-variant">
                    <th scope="row" className="p-3 text-left text-label-md font-normal text-on-surface-variant">{t('page.table.bonus')}</th>
                    {packs.map(p => <td key={p.pack} className="p-3">{p.bonusCredits > 0 ? <span className="rounded-full bg-tertiary-soft px-2 py-0.5 text-label-md text-tertiary">+{p.bonusCredits}</span> : <Icon name="remove" size={18} className="text-outline" />}</td>)}
                    <td className="p-3"><Icon name="remove" size={18} className="text-outline" /></td>
                  </tr>
                  <tr className="border-0 border-t border-solid border-outline-variant">
                    <th scope="row" className="p-3 text-left text-label-md font-normal text-on-surface-variant">{t('page.table.creditPrice')}</th>
                    {packs.map(p => <td key={p.pack} className="p-3 text-on-surface"><Price amount={Math.round(p.price / Math.max(1, p.credits + p.bonusCredits))} /></td>)}
                    <td className="p-3 text-on-surface">{creditValue ? <Price amount={creditValue} /> : '—'}</td>
                  </tr>
                  <tr className="border-0 border-t border-solid border-outline-variant bg-surface-container-low/60">
                    <th scope="row" className="p-3 text-left text-label-md text-on-surface">{t('page.table.price')}</th>
                    {packs.map(p => <td key={p.pack} className="p-3 text-headline-sm font-extrabold text-on-surface"><Price amount={p.price} /></td>)}
                    <td className="p-3 text-on-surface-variant">{t('page.table.byQuantity')}</td>
                  </tr>
                  <tr className="border-0 border-t border-solid border-outline-variant">
                    <td />
                    {packs.map(p => <td key={p.pack} className="p-3"><button onClick={() => setBuying(p.pack)} className="h-10 w-full cursor-pointer rounded-lg border-none bg-primary text-label-md text-white">{t('page.choose')}</button></td>)}
                    <td className="p-3"><button onClick={() => setBuying('')} className="h-10 w-full cursor-pointer rounded-lg border-none bg-surface-container-high text-label-md text-on-surface">{t('page.choose')}</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* History */}
        <section className="mt-8 overflow-hidden rounded-2xl bg-surface-container-low">
          <div className="flex flex-wrap items-end justify-between gap-3 p-4 md:p-5">
            <div>
              <h2 className="m-0 text-headline-sm text-on-surface">{t.rich('page.history.title', { md: c => <span className="hidden md:inline">{c}</span> })}</h2>
              <p className="m-0 hidden text-body-sm text-on-surface-variant md:block">{t('page.history.subtitle')}</p>
            </div>
            <div className="-mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:w-auto md:flex-wrap md:px-0">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }} className={`shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-none px-3 py-2 text-label-md ${filter === f.key ? 'bg-inverse-surface text-white' : 'bg-surface-lowest text-on-surface hover:bg-surface-container'}`}>{t(`page.filter.${f.key}`)}</button>
              ))}
            </div>
          </div>
          {/* Mobile: one card per operation instead of a 720px table. */}
          <div className="flex flex-col gap-2 px-3 md:hidden">
            {txs.length === 0 && <EmptyState icon="empty-wallet" fallback="account_balance_wallet" tone="neutral" title={t('page.history.emptyTitle')} text={t('page.history.emptyText')} />}
            {txs.map(tx => {
              const meta = TX_META[tx.type] ?? FALLBACK_META
              return (
                <div key={tx.id} className="flex items-start gap-3 rounded-xl bg-surface-lowest p-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.box}`}><Icon name={meta.icon} size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-label-md text-on-surface">{tx.label}</div>
                    {tx.listing?.title && <div className="truncate text-body-sm text-on-surface-variant">{tx.listing.title}</div>}
                    <div className="truncate text-[11px] text-on-surface-variant">
                      {fmtDate(tx.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {tx.method && <> • {methodLabel(tx.method)}</>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <TxAmount t={tx} />
                    <span className={`mt-0.5 inline-block rounded-full px-1.5 text-[11px] font-semibold ${meta.statusCls}`}>{t(`page.status.${meta.status}`)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="hidden overflow-x-auto bg-surface-lowest md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-body-sm">
              <thead>
                <tr className="text-label-sm uppercase text-on-surface-variant">
                  {[t('page.col.date'), t('page.col.type'), t('page.col.item'), t('page.col.method'), t('page.col.amount'), t('page.col.status')].map(h => <th key={h} className="px-5 py-3 font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {txs.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant">{t('page.history.emptyRow')}</td></tr>}
                {txs.map(tx => {
                  const meta = TX_META[tx.type] ?? FALLBACK_META
                  return (
                    <tr key={tx.id} className="border-0 border-t border-solid border-outline-variant">
                      <td className="px-5 py-4 text-on-surface-variant">{fmtDate(tx.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-5 py-4"><span className="flex items-center gap-2 text-on-surface"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.box}`}><Icon name={meta.icon} size={16} /></span>{tx.label}</span></td>
                      <td className="px-5 py-4 text-on-surface">{tx.listing?.title ?? '—'}{tx.type === 'SALE' && <Claim><div className="text-[11px] text-tertiary">{t('page.zeroCommissionTaken', { zero: fmtCfa(0) })}</div></Claim>}</td>
                      <td className="px-5 py-4 text-on-surface-variant">{tx.method ? <span className="flex items-center gap-2">{PAYMENT_BRANDS[tx.method] && <PaymentLogo method={tx.method} size={22} />}{methodLabel(tx.method)}</span> : '—'}</td>
                      <td className="px-5 py-4"><TxAmount t={tx} /></td>
                      <td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${meta.statusCls}`}>✓ {t(`page.status.${meta.status}`)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-body-sm text-on-surface-variant md:px-5">
            <span>{t('page.history.count', { count: txs.length, n: String(txs.length), total: String(total) })}</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} aria-label={t('page.prevPage')} className="flex h-10 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-lowest px-2.5 text-label-md text-on-surface disabled:opacity-40"><ChevronLeft size={15} /> <span className="max-md:hidden">{tc('previous')}</span></button>
              <span className="px-2 text-label-md text-on-surface">{page}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} aria-label={t('page.nextPage')} className="flex h-10 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-lowest px-2.5 text-label-md text-on-surface disabled:opacity-40"><span className="max-md:hidden">{tc('next')}</span> <ChevronRight size={15} /></button>
            </div>
          </div>
        </section>
      </div>

      {/* Credits bought by Mobile Money (Paytic): a pack, or a free number. */}
      {buying !== null && <BuyCreditsSheet open pack={buying || undefined} onClose={() => setBuying(null)} onDone={(i) => { setBuying(null); setDone(i.credits ? t('page.creditsAdded', { n: String(i.credits) }) : t('page.creditsAddedNoCount')); void refetchWallet(); void refetchTx() }} />}
    </AccountLayout>
  )
}

// Declared sales are in F CFA; everything else moves credits (a credit
// purchase also shows the F CFA paid).
function TxAmount({ t }: { t: WalletTx }) {
  if (t.type === 'SALE') return <div className="whitespace-nowrap text-label-lg text-tertiary">+<Price amount={t.amount} /></div>
  return (
    <div className={`whitespace-nowrap text-label-lg ${t.credits > 0 ? 'text-tertiary' : 'text-on-surface'}`}>
      {t.credits > 0 ? '+' : t.credits < 0 ? '−' : ''}<Credits n={Math.abs(t.credits)} />
      {t.type === 'CREDIT_PURCHASE' && t.amount > 0 && <div className="text-[11px] font-normal text-on-surface-variant"><Price amount={t.amount} /></div>}
    </div>
  )
}
