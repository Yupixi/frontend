import EmptyState from '../../components/EmptyState'
import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Star, Flame, ChevronLeft, ChevronRight } from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import PaymentSheet from '../../components/PaymentSheet'
import PaymentLogo, { PAYMENT_BRANDS, PaymentLogos } from '../../components/PaymentLogo'
import { AccountLayout } from '../account/AccountLayout'
import {
  CREDIT_PACKS_QUERY, MY_WALLET_QUERY, MY_WALLET_TRANSACTIONS_QUERY,
  type CreditPack, type WalletSummary, type WalletTx, type WalletTxType,
} from '../../graphql/sellerHub'
import type { AuthUser } from '../../graphql/auth'

type Props = { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }

const PAGE_SIZE = 5
const FILTERS: { key: string, label: string, types?: WalletTxType[] }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'boost', label: 'Achats de boost', types: ['BOOST_PURCHASE', 'CREDIT_SPENT'] },
  { key: 'sales', label: 'Ventes déclarées', types: ['SALE'] },
  { key: 'topup', label: 'Recharges', types: ['CREDIT_PURCHASE'] },
]
const METHOD_LABEL: Record<string, string> = { WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo', MOOV_MONEY: 'Moov Money', CASH: 'Espèces en main propre', CREDITS: 'Crédit déduit', DIRECT: 'Remise directe' }
const TX_META: Record<WalletTxType, { icon: string, box: string, status: string, statusCls: string }> = {
  BOOST_PURCHASE: { icon: 'rocket_launch', box: 'bg-primary-fixed text-primary', status: 'Actif', statusCls: 'bg-tertiary-soft text-tertiary' },
  CREDIT_SPENT: { icon: 'bolt', box: 'bg-surface-container text-on-surface', status: 'Validé', statusCls: 'bg-surface-container-high text-on-surface-variant' },
  CREDIT_PURCHASE: { icon: 'account_balance_wallet', box: 'bg-primary-fixed text-primary', status: 'Crédité', statusCls: 'bg-tertiary-soft text-tertiary' },
  SALE: { icon: 'handshake', box: 'bg-tertiary-soft text-tertiary', status: 'Encaissé', statusCls: 'bg-tertiary-soft text-tertiary' },
}

// "Porte-monnaie & Solde publicitaire" mockup. Dilchap never holds sale
// funds: sales are declarative (deals concluded in chat); credits buy
// visibility, paid by Mobile Money through Paytic (PaymentSheet).
export default function Wallet({ onNavigate, currentUser, onLogout }: Props) {
  const { data: walletData, refetch: refetchWallet } = useQuery<{ myWallet: WalletSummary }>(MY_WALLET_QUERY)
  const wallet = walletData?.myWallet
  const { data: packsData } = useQuery<{ creditPacks: CreditPack[] }>(CREDIT_PACKS_QUERY)
  const packs = packsData?.creditPacks ?? []
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const types = FILTERS.find(f => f.key === filter)?.types
  const { data: txData, refetch: refetchTx } = useQuery<{ myWalletTransactions: { items: WalletTx[], totalCount: number } }>(MY_WALLET_TRANSACTIONS_QUERY, { variables: { types, page, pageSize: PAGE_SIZE } })
  const txs = txData?.myWalletTransactions.items ?? []
  const total = txData?.myWalletTransactions.totalCount ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const [checkout, setCheckout] = useState<CreditPack | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const recommended = packs[1]?.pack
  const toRecharge = () => document.getElementById('recharge')?.scrollIntoView({ behavior: 'smooth' })
  const credits = wallet?.credits ?? 0
  const salesCount = wallet?.salesCount ?? 0

  return (
    <AccountLayout active="seller-wallet" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1120px] pb-6">
        {/* Desktop heading; on mobile the shell titles the page and the balance comes first. */}
        <div className="mb-1 hidden items-center gap-1 text-label-sm uppercase text-primary lg:flex"><Icon name="account_balance_wallet" size={14} /> Finances & visibilité vendeur</div>
        <div className="mb-6 hidden flex-wrap items-end justify-between gap-3 lg:flex">
          <div>
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">Porte-monnaie &amp; Solde publicitaire</h1>
            <p className="m-0 mt-1 max-w-xl text-body-md text-on-surface-variant">Gérez vos crédits de visibilité, suivez vos gains de vente directe et rechargez vos options de boost pour placer vos annonces en tête de liste.</p>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-tertiary-soft px-3 py-2.5 text-label-md text-tertiary"><CheckCircle2 size={16} /> Commission 0% active</span>
            <button onClick={toRecharge} className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark"><Zap size={16} /> Acheter des crédits</button>
          </div>
        </div>

        {done && <p className="mb-4 flex items-center gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><CheckCircle2 size={16} className="shrink-0" /> {done}</p>}

        {/* Mobile: balance card first, then two mini KPIs */}
        <section className="md:hidden">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-container p-4 text-white shadow-float">
            <div className="text-label-md text-white/85">Solde de visibilité</div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-1.5"><span className="text-[40px] font-extrabold leading-none">{credits}</span><span className="text-headline-sm">crédit{credits > 1 ? 's' : ''}</span></div>
              <button onClick={toRecharge} className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-white px-4 text-label-lg text-primary"><Icon name="add_circle" size={18} /> Recharger</button>
            </div>
            <p className="m-0 mt-2 border-0 border-t border-solid border-white/20 pt-2 text-body-sm text-white/85">1 crédit = 1 remontée immédiate en tête du catalogue.</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-outline-variant bg-surface-lowest p-3">
              <div className="text-label-sm text-on-surface-variant">Ventes générées</div>
              <div className="mt-0.5 text-headline-sm font-extrabold text-on-surface"><Price amount={wallet?.totalSales ?? 0} /></div>
              <div className="text-[11px] text-tertiary">0 F de commission</div>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-lowest p-3">
              <div className="text-label-sm text-on-surface-variant">Ventes conclues</div>
              <div className="mt-0.5 text-headline-sm font-extrabold text-on-surface">{salesCount}</div>
              <div className="text-[11px] text-on-surface-variant">Confirmation : <b className="text-tertiary">{wallet?.confirmationRate != null ? `${wallet.confirmationRate}%` : '—'}</b></div>
            </div>
          </div>
        </section>

        {/* KPIs (tablet / desktop) */}
        <section className="hidden gap-4 md:grid md:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest">
            <div className="p-5">
              <div className="flex items-center justify-between text-label-md text-on-surface">Solde crédits de boost <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Zap size={17} /></span></div>
              <div className="mt-2 flex items-baseline gap-2"><span className="text-[44px] font-extrabold leading-none text-primary">{credits}</span><span className="text-headline-sm text-on-surface">crédit{credits > 1 ? 's' : ''}</span></div>
              <p className="m-0 mt-2 text-body-sm text-on-surface-variant">1 crédit = 1 remontée immédiate d'une annonce en haut du catalogue.</p>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low px-5 py-3 text-body-sm text-on-surface-variant">
              Utilisable sur toutes vos annonces
              <button onClick={toRecharge} className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md border-none bg-primary px-2.5 py-1 text-label-sm text-white">Recharger <ArrowRight size={13} /></button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest">
            <div className="p-5">
              <div className="flex items-center justify-between text-label-md text-on-surface">Total des ventes générées <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tertiary text-white"><Icon name="payments" size={17} /></span></div>
              <div className="mt-2 text-[36px] font-extrabold leading-none text-on-surface"><Price amount={wallet?.totalSales ?? 0} /></div>
              <p className="m-0 mt-2 flex items-center gap-1 text-body-sm text-tertiary"><CheckCircle2 size={14} /> 100% perçu par vous • 0 F de commission</p>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low px-5 py-3 text-body-sm text-on-surface-variant">Paiements reçus en direct <span className="font-semibold text-on-surface">Direct vendeur</span></div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest">
            <div className="p-5">
              <div className="flex items-center justify-between text-label-md text-on-surface">Transactions directes conclues <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface"><Icon name="handshake" size={17} /></span></div>
              <div className="mt-2 flex items-baseline gap-2"><span className="text-[44px] font-extrabold leading-none text-on-surface">{salesCount}</span><span className="text-headline-sm text-on-surface">vente{salesCount > 1 ? 's' : ''} réussie{salesCount > 1 ? 's' : ''}</span></div>
              <p className="m-0 mt-2 flex items-center gap-1 text-body-sm text-on-surface-variant"><Star size={14} className="text-primary" /> {wallet?.reviewsCount ? `${wallet.averageRating.toFixed(1)} / 5 (sur ${wallet.reviewsCount} avis acheteurs)` : 'Pas encore d’avis acheteurs'}</p>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low px-5 py-3 text-body-sm text-on-surface-variant">Taux de confirmation <span className="font-semibold text-tertiary">{wallet?.confirmationRate != null ? `${wallet.confirmationRate}%` : '—'}</span></div>
          </div>
        </section>

        {/* Transparency */}
        <section className="mt-4 flex items-start gap-3 rounded-2xl bg-tertiary-soft/50 p-4 md:mt-6 md:flex-row md:items-center md:gap-4 md:bg-surface-container-low md:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary text-white md:h-12 md:w-12"><ShieldCheck size={22} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-label-lg text-on-surface md:text-headline-sm">
              <span className="md:hidden">0% de commission sur vos ventes</span>
              <span className="hidden md:inline">Engagement Transparence Dilchap</span>
              <span className="hidden rounded bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary md:inline">Garanti sans frais cachés</span>
            </div>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant md:hidden">Vos acheteurs vous payent directement (main à la main, Wave, Orange Money). Dilchap ne retient pas vos fonds.</p>
            <p className="m-0 mt-1 hidden text-body-md text-on-surface-variant md:block">Dilchap ne retient pas vos fonds. Vos acheteurs vous payent directement de la main à la main ou via votre portefeuille mobile habituel (Wave, Orange Money, Moov). Vos gains restent intégralement vôtres.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-surface-lowest px-3 py-2.5 text-label-md text-on-surface md:flex"><CheckCircle2 size={16} className="text-tertiary" /> 0% commission sur chaque vente</span>
        </section>

        {/* Packs */}
        <section id="recharge" className="mt-6 scroll-mt-4 md:mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 md:mb-4 md:gap-3">
            <div>
              <h2 className="m-0 text-headline-sm text-on-surface md:text-headline-md">Recharger des crédits<span className="hidden md:inline"> de visibilité</span></h2>
              <p className="m-0 text-body-sm text-on-surface-variant">1 crédit = 1 remontée immédiate en haut de catalogue.</p>
            </div>
            <div className="hidden items-center gap-2 text-label-sm text-on-surface-variant md:flex">
              Paiement mobile :
              <PaymentLogos size={26} />
            </div>
          </div>
          {/* Mobile: compact pack rows, as in the mockup */}
          <div className="flex flex-col gap-2 md:hidden">
            {packs.map(p => {
              const top = p.pack === recommended
              const total = p.credits + p.bonusCredits
              return (
                <button key={p.pack} onClick={() => setCheckout(p)} className={`relative flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-surface-lowest p-3 text-left ${top ? 'border-2 border-solid border-primary' : 'border border-solid border-outline-variant'}`}>
                  {top && <span className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-white"><Flame size={11} /> Le plus populaire</span>}
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${top ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface'}`}><Icon name={top ? 'rocket_launch' : 'bolt'} size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-label-lg text-on-surface">{p.label}</span>
                      {p.bonusCredits > 0 && <span className="shrink-0 rounded-full bg-tertiary-soft px-1.5 text-[11px] font-bold text-tertiary">+{p.bonusCredits} offert{p.bonusCredits > 1 ? 's' : ''}</span>}
                    </span>
                    <span className="block text-body-sm text-on-surface-variant">{total} crédit{total > 1 ? 's' : ''} au total</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block whitespace-nowrap text-label-lg font-extrabold ${top ? 'text-primary' : 'text-on-surface'}`}><Price amount={p.price} /></span>
                    <span className="block whitespace-nowrap text-[11px] text-on-surface-variant"><Price amount={Math.round(p.price / Math.max(1, total))} /> / crédit</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-3">
            {packs.map(p => {
              const top = p.pack === recommended
              return (
                <div key={p.pack} className={`relative flex flex-col rounded-2xl bg-surface-lowest p-5 ${top ? 'border-2 border-solid border-primary' : 'border border-outline-variant'}`}>
                  {top && <span className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-label-sm uppercase text-white"><Flame size={13} /> Le plus populaire</span>}
                  <div className="flex items-center justify-between">
                    <span className={`text-label-sm uppercase ${top ? 'text-primary' : 'text-on-surface-variant'}`}>{p.tagline}</span>
                    {p.bonusCredits > 0 && !top && <span className="rounded bg-tertiary px-1.5 text-label-sm text-white">Meilleur ratio</span>}
                  </div>
                  <div className="mt-1 text-headline-sm text-on-surface">{p.label}</div>
                  <div className={`mt-3 text-[44px] font-extrabold leading-none ${top ? 'text-primary' : 'text-on-surface'}`}><Price amount={p.price} /></div>
                  <div className="mt-2 flex items-center gap-2 text-label-md">
                    <span className={top ? 'text-primary' : 'text-tertiary'}>{p.credits} crédits</span>
                    {p.bonusCredits > 0 && <span className="rounded-full bg-tertiary-soft px-2 text-label-sm text-tertiary">+{p.bonusCredits} offert{p.bonusCredits > 1 ? 's' : ''}</span>}
                  </div>
                  <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface">
                    {p.perks.map(t => <li key={t} className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-tertiary" /> {t}</li>)}
                  </ul>
                  <button onClick={() => setCheckout(p)} className={`mt-5 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none py-2.5 text-label-md ${top ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'}`}>
                    {/* Single text run: the flex gap would otherwise pad the amount and its unit. */}
                    {top ? <><span>Payer <Price amount={p.price} /> via Mobile</span> <Icon name="bolt" size={16} /></> : <>Choisir ce pack <ArrowRight size={15} /></>}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* History */}
        <section className="mt-8 overflow-hidden rounded-2xl bg-surface-container-low">
          <div className="flex flex-wrap items-end justify-between gap-3 p-4 md:p-5">
            <div>
              <h2 className="m-0 text-headline-sm text-on-surface">Historique<span className="hidden md:inline"> financier &amp; Activités</span></h2>
              <p className="m-0 hidden text-body-sm text-on-surface-variant md:block">Transactions directes déclarées et consommations de crédits Dilchap</p>
            </div>
            <div className="-mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:w-auto md:flex-wrap md:px-0">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }} className={`shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-none px-3 py-2 text-label-md ${filter === f.key ? 'bg-inverse-surface text-white' : 'bg-surface-lowest text-on-surface hover:bg-surface-container'}`}>{f.label}</button>
              ))}
            </div>
          </div>
          {/* Mobile: one card per operation instead of a 720px table. */}
          <div className="flex flex-col gap-2 px-3 md:hidden">
            {txs.length === 0 && <EmptyState icon="empty-wallet" fallback="account_balance_wallet" tone="neutral" title="Aucune opération pour le moment" text="Vos recharges de crédits et vos boosts apparaîtront ici." />}
            {txs.map(t => {
              const meta = TX_META[t.type]
              return (
                <div key={t.id} className="flex items-start gap-3 rounded-xl bg-surface-lowest p-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.box}`}><Icon name={meta.icon} size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-label-md text-on-surface">{t.label}</div>
                    {t.listing?.title && <div className="truncate text-body-sm text-on-surface-variant">{t.listing.title}</div>}
                    <div className="text-[11px] text-on-surface-variant">
                      {new Date(t.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {t.method && <> • {METHOD_LABEL[t.method] ?? t.method}</>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`whitespace-nowrap text-label-lg ${t.amount > 0 || (t.amount === 0 && t.credits > 0) ? 'text-tertiary' : 'text-on-surface'}`}>
                      {t.amount !== 0 ? <>{t.amount > 0 ? '+' : '−'}<Price amount={Math.abs(t.amount)} /></> : `${t.credits > 0 ? '+' : ''}${t.credits} crédit${Math.abs(t.credits) > 1 ? 's' : ''}`}
                    </div>
                    <span className={`mt-0.5 inline-block rounded-full px-1.5 text-[11px] font-semibold ${meta.statusCls}`}>{meta.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="hidden overflow-x-auto bg-surface-lowest md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-body-sm">
              <thead>
                <tr className="text-label-sm uppercase text-on-surface-variant">
                  {['Date', 'Type d’opération', 'Article / Référence', 'Méthode', 'Montant', 'Statut'].map(h => <th key={h} className="px-5 py-3 font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {txs.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant">Aucune opération pour le moment.</td></tr>}
                {txs.map(t => {
                  const meta = TX_META[t.type]
                  return (
                    <tr key={t.id} className="border-0 border-t border-solid border-outline-variant">
                      <td className="px-5 py-4 text-on-surface-variant">{new Date(t.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-5 py-4"><span className="flex items-center gap-2 text-on-surface"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.box}`}><Icon name={meta.icon} size={16} /></span>{t.label}</span></td>
                      <td className="px-5 py-4 text-on-surface">{t.listing?.title ?? '—'}{t.type === 'SALE' && <div className="text-[11px] text-tertiary">0 F commission prélevée</div>}</td>
                      <td className="px-5 py-4 text-on-surface-variant">{t.method ? <span className="flex items-center gap-2">{PAYMENT_BRANDS[t.method] && <PaymentLogo method={t.method} size={22} />}{METHOD_LABEL[t.method] ?? t.method}</span> : '—'}</td>
                      <td className={`px-5 py-4 text-label-lg ${t.amount > 0 ? 'text-tertiary' : 'text-on-surface'}`}>
                        {t.amount !== 0 ? <>{t.amount > 0 ? '+' : '−'}<Price amount={Math.abs(t.amount)} /></> : `${t.credits > 0 ? '+' : ''}${t.credits} crédit`}
                      </td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2 py-0.5 text-label-sm ${meta.statusCls}`}>✓ {meta.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-body-sm text-on-surface-variant md:px-5">
            <span>{txs.length} opération{txs.length > 1 ? 's' : ''} sur {total}</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} aria-label="Page précédente" className="flex h-10 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-lowest px-2.5 text-label-md text-on-surface disabled:opacity-40"><ChevronLeft size={15} /> <span className="max-md:hidden">Précédent</span></button>
              <span className="px-2 text-label-md text-on-surface">{page}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} aria-label="Page suivante" className="flex h-10 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-lowest px-2.5 text-label-md text-on-surface disabled:opacity-40"><span className="max-md:hidden">Suivant</span> <ChevronRight size={15} /></button>
            </div>
          </div>
        </section>
      </div>

      {/* Checkout: Mobile Money payment (Paytic); credits are added once the operator confirms. */}
      <PaymentSheet
        open={!!checkout}
        title={checkout ? `Recharge · ${checkout.label}` : 'Recharge'}
        amount={checkout?.price ?? 0}
        request={checkout ? { kind: 'CREDIT_PACK', product: checkout.pack } : null}
        onClose={() => setCheckout(null)}
        onPaid={() => {
          if (checkout) setDone(`${checkout.credits + checkout.bonusCredits} crédits ajoutés à votre porte-monnaie.`)
          void refetchWallet(); void refetchTx()
        }}
      >
        {checkout && <>
          <b className="block text-label-lg text-on-surface">{checkout.label}</b>
          {checkout.credits + checkout.bonusCredits} crédits de remontée
        </>}
      </PaymentSheet>
    </AccountLayout>
  )
}
