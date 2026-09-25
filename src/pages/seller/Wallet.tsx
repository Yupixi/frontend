import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Star, Flame, Loader2, X, ChevronLeft, ChevronRight } from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import {
  CREDIT_PACKS_QUERY, MY_WALLET_QUERY, MY_WALLET_TRANSACTIONS_QUERY, BUY_CREDITS_MUTATION,
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
const METHODS = [
  { code: 'WAVE', label: 'Wave', dot: 'bg-sky-400' },
  { code: 'ORANGE_MONEY', label: 'Orange Money', dot: 'bg-orange-500' },
  { code: 'MTN_MOMO', label: 'MTN MoMo', dot: 'bg-yellow-400' },
  { code: 'MOOV_MONEY', label: 'Moov Money', dot: 'bg-blue-600' },
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
// visibility. No payment gateway yet — the chosen method is recorded.
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
  const [method, setMethod] = useState('WAVE')
  const [done, setDone] = useState<string | null>(null)
  const [buyCredits, { loading: buying }] = useMutation(BUY_CREDITS_MUTATION)
  const buy = () => {
    if (!checkout) return
    void buyCredits({ variables: { pack: checkout.pack, method } }).then(() => {
      setDone(`${checkout.credits + checkout.bonusCredits} crédits ajoutés à votre porte-monnaie.`)
      setCheckout(null); void refetchWallet(); void refetchTx()
    })
  }
  const recommended = packs[1]?.pack

  return (
    <AccountLayout active="seller-wallet" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1120px] pb-6">
        <div className="mb-1 flex items-center gap-1 text-label-sm uppercase text-primary"><Icon name="account_balance_wallet" size={14} /> Finances & visibilité vendeur</div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">Porte-monnaie &amp; Solde publicitaire</h1>
            <p className="m-0 mt-1 max-w-xl text-body-md text-on-surface-variant">Gérez vos crédits de visibilité, suivez vos gains de vente directe et rechargez vos options de boost pour placer vos annonces en tête de liste.</p>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-tertiary-soft px-3 py-2.5 text-label-md text-tertiary"><CheckCircle2 size={16} /> Commission 0% active</span>
            <button onClick={() => document.getElementById('recharge')?.scrollIntoView({ behavior: 'smooth' })} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark"><Zap size={16} /> Acheter des crédits</button>
          </div>
        </div>

        {done && <p className="mb-4 flex items-center gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><CheckCircle2 size={16} /> {done}</p>}

        {/* KPIs */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest">
            <div className="p-5">
              <div className="flex items-center justify-between text-label-md text-on-surface">Solde crédits de boost <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Zap size={17} /></span></div>
              <div className="mt-2 flex items-baseline gap-2"><span className="text-[44px] font-extrabold leading-none text-primary">{wallet?.credits ?? 0}</span><span className="text-headline-sm text-on-surface">crédit{(wallet?.credits ?? 0) > 1 ? 's' : ''}</span></div>
              <p className="m-0 mt-2 text-body-sm text-on-surface-variant">1 crédit = 1 remontée immédiate d'une annonce en haut du catalogue.</p>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low px-5 py-3 text-body-sm text-on-surface-variant">
              Utilisable sur toutes vos annonces
              <button onClick={() => document.getElementById('recharge')?.scrollIntoView({ behavior: 'smooth' })} className="flex cursor-pointer items-center gap-1 rounded-md border-none bg-primary px-2.5 py-1 text-label-sm text-white">Recharger <ArrowRight size={13} /></button>
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
              <div className="mt-2 flex items-baseline gap-2"><span className="text-[44px] font-extrabold leading-none text-on-surface">{wallet?.salesCount ?? 0}</span><span className="text-headline-sm text-on-surface">vente{(wallet?.salesCount ?? 0) > 1 ? 's' : ''} réussie{(wallet?.salesCount ?? 0) > 1 ? 's' : ''}</span></div>
              <p className="m-0 mt-2 flex items-center gap-1 text-body-sm text-on-surface-variant"><Star size={14} className="text-primary" /> {wallet?.reviewsCount ? `${wallet.averageRating.toFixed(1)} / 5 (sur ${wallet.reviewsCount} avis acheteurs)` : 'Pas encore d’avis acheteurs'}</p>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low px-5 py-3 text-body-sm text-on-surface-variant">Taux de confirmation <span className="font-semibold text-tertiary">{wallet?.confirmationRate != null ? `${wallet.confirmationRate}%` : '—'}</span></div>
          </div>
        </section>

        {/* Transparency */}
        <section className="mt-6 flex flex-col gap-4 rounded-2xl bg-surface-container-low p-5 md:flex-row md:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tertiary text-white"><ShieldCheck size={24} /></span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 text-headline-sm text-on-surface">Engagement Transparence Dilchap <span className="rounded bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary">Garanti sans frais cachés</span></div>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Dilchap ne retient pas vos fonds. Vos acheteurs vous payent directement de la main à la main ou via votre portefeuille mobile habituel (Wave, Orange Money, Moov). Vos gains restent intégralement vôtres.</p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-lowest px-3 py-2.5 text-label-md text-on-surface"><CheckCircle2 size={16} className="text-tertiary" /> 0% commission sur chaque vente</span>
        </section>

        {/* Packs */}
        <section id="recharge" className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="m-0 text-headline-md text-on-surface">Recharger des crédits de visibilité</h2>
              <p className="m-0 text-body-sm text-on-surface-variant">1 crédit = 1 remontée immédiate en haut de catalogue.</p>
            </div>
            <div className="flex items-center gap-2 text-label-sm text-on-surface-variant">
              Paiement mobile :
              {METHODS.slice(0, 2).map(m => <span key={m.code} className="flex items-center gap-1 rounded-lg bg-surface-lowest px-2 py-1 text-on-surface"><span className={`h-2 w-2 rounded-full ${m.dot}`} /> {m.label}</span>)}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {packs.map(p => {
              const top = p.pack === recommended
              return (
                <div key={p.pack} className={`relative flex flex-col rounded-2xl bg-surface-lowest p-5 ${top ? 'border-2 border-solid border-primary shadow-card-hover' : 'border border-outline-variant'}`}>
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
                    {top ? <>Payer <Price amount={p.price} /> via Mobile <Icon name="bolt" size={16} /></> : <>Choisir ce pack <ArrowRight size={15} /></>}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* History */}
        <section className="mt-8 overflow-hidden rounded-2xl bg-surface-container-low">
          <div className="flex flex-wrap items-end justify-between gap-3 p-5">
            <div>
              <h2 className="m-0 text-headline-sm text-on-surface">Historique financier &amp; Activités</h2>
              <p className="m-0 text-body-sm text-on-surface-variant">Transactions directes déclarées et consommations de crédits Dilchap</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }} className={`cursor-pointer rounded-lg border-none px-3 py-1.5 text-label-md ${filter === f.key ? 'bg-inverse-surface text-white' : 'bg-surface-lowest text-on-surface hover:bg-surface-container'}`}>{f.label}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto bg-surface-lowest">
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
                      <td className="px-5 py-4 text-on-surface-variant">{t.method ? METHOD_LABEL[t.method] ?? t.method : '—'}</td>
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
          <div className="flex items-center justify-between px-5 py-3 text-body-sm text-on-surface-variant">
            Affichage de {txs.length} opération{txs.length > 1 ? 's' : ''} sur {total} enregistrée{total > 1 ? 's' : ''}
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-surface-lowest px-2.5 py-1.5 text-label-md text-on-surface disabled:opacity-40"><ChevronLeft size={15} /> Précédent</button>
              <span className="px-2 text-label-md text-on-surface">{page}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-surface-lowest px-2.5 py-1.5 text-label-md text-on-surface disabled:opacity-40">Suivant <ChevronRight size={15} /></button>
            </div>
          </div>
        </section>
      </div>

      {/* Checkout */}
      {checkout && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-4 md:items-center" onClick={() => setCheckout(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-surface-lowest p-6 shadow-modal">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-label-sm uppercase text-primary">Recharge de crédits</div>
                <h3 className="m-0 text-headline-sm text-on-surface">{checkout.label}</h3>
              </div>
              <button onClick={() => setCheckout(null)} className="cursor-pointer border-none bg-transparent p-1 text-on-surface-variant" aria-label="Fermer"><X size={20} /></button>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-container-low p-4">
              <span className="text-body-md text-on-surface">{checkout.credits + checkout.bonusCredits} crédits de remontée</span>
              <span className="text-headline-sm font-extrabold text-primary"><Price amount={checkout.price} /></span>
            </div>
            <div className="mt-4 mb-2 text-label-md text-on-surface">Moyen de paiement</div>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map(m => (
                <button key={m.code} onClick={() => setMethod(m.code)} className={`flex cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-solid px-3 py-2.5 text-label-md text-on-surface ${method === m.code ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant bg-surface-lowest'}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} /> {m.label}
                </button>
              ))}
            </div>
            <button disabled={buying} onClick={buy} className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-primary py-3 text-label-lg text-white disabled:opacity-60">
              {buying ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} Confirmer la recharge
            </button>
            <p className="m-0 mt-2 text-center text-body-sm text-on-surface-variant">Les crédits sont ajoutés immédiatement à votre porte-monnaie.</p>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
