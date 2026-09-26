import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import Select from '../../components/Select'
import ConfirmSheet from '../../components/ConfirmSheet'
import { AccountLayout } from './AccountLayout'
import {
  CREATE_SHOP_POST_MUTATION, CREATE_SHOP_SALE_MUTATION, END_SHOP_SALE_MUTATION, JOIN_CAMPAIGN_MUTATION, MY_SHOP_LISTINGS_QUERY,
  MY_SHOP_PROMOS_QUERY, MY_SHOP_QUERY, PROMO_STATE_LABEL, SAVE_SHOP_BUNDLE_MUTATION, STOP_SHOP_BUNDLE_MUTATION,
  UPDATE_SHOP_SALE_MUTATION, WITHDRAW_CAMPAIGN_ENTRY_MUTATION,
  type BundleTier, type MyShopData, type OpenCampaign, type PromoItem, type PromoState, type ShopListing, type ShopPromos, type ShopSale,
} from '../../graphql/shops'
import { uploadImages } from '../../lib/upload'
import { formatNumber } from '../../lib/format'
import type { AuthUser } from '../../graphql/auth'

type Props = { onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void }
type Tab = 'sales' | 'campaigns' | 'bundles' | 'posts'

const fdate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const dayInput = (d: Date) => d.toISOString().slice(0, 10)
// Local day → start / end of day in UTC (Côte d'Ivoire is UTC).
const endOf = (d: string) => new Date(`${d}T23:59:59.000Z`).toISOString()
const promoOf = (price: number, pct: number) => Math.round((price * (100 - pct)) / 100)
const card = 'rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5'
const inputCls = 'h-11 w-full min-w-0 rounded-xl border-none bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary'

function StatePill({ state }: { state: PromoState }) {
  const cls = state === 'LIVE' ? 'bg-tertiary-soft text-tertiary' : state === 'SCHEDULED' ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${cls}`}>{state === 'LIVE' && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{PROMO_STATE_LABEL[state]}</span>
}

function EntryPill({ status }: { status: PromoItem['status'] }) {
  const [cls, label] = status === 'APPROVED' ? ['bg-tertiary-soft text-tertiary', 'Acceptée'] : status === 'REJECTED' ? ['bg-primary-fixed text-primary', 'Refusée'] : ['bg-surface-container text-on-surface-variant', 'En attente']
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${cls}`}>{label}</span>
}

function Thumb({ url }: { url: string | null }) {
  return <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</span>
}

function Empty({ icon, title, text, action }: { icon: string, title: string, text: string, action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-lowest px-4 py-10 text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name={icon} size={24} /></span>
      <div className="text-headline-sm text-on-surface">{title}</div>
      <p className="m-0 max-w-md text-body-md text-on-surface-variant">{text}</p>
      {action}
    </div>
  )
}

// Article picker with a promotional price per item (sales and campaigns).
type Pick = { listingId: string; percent: number }
function ItemPicker({ listings, aisles, picks, onChange, minPercent, priceMode }: {
  listings: ShopListing[], aisles: { id: string, name: string }[], picks: Pick[], onChange: (p: Pick[]) => void, minPercent?: number | null
  // Custom promotional price per item instead of a percentage.
  priceMode?: { prices: Record<string, string>, onPrice: (id: string, v: string) => void }
}) {
  const [q, setQ] = useState('')
  const [aisle, setAisle] = useState('')
  const [bulk, setBulk] = useState(String(minPercent ?? 20))
  const priced = listings.filter(l => l.price != null)
  const rows = priced.filter(l => (!q || l.title.toLowerCase().includes(q.toLowerCase())) && (!aisle || l.aisleId === aisle))
  const on = (id: string) => picks.find(p => p.listingId === id)
  const toggle = (l: ShopListing) => onChange(on(l.id) ? picks.filter(p => p.listingId !== l.id) : [...picks, { listingId: l.id, percent: Number(bulk) || 10 }])
  const setPct = (id: string, pct: number) => onChange(picks.map(p => (p.listingId === id ? { ...p, percent: pct } : p)))
  const applyAll = () => {
    const pct = Math.min(90, Math.max(1, Number(bulk) || 10))
    const ids = new Set(rows.map(r => r.id))
    onChange([...picks.filter(p => !ids.has(p.listingId)), ...rows.map(r => ({ listingId: r.id, percent: pct }))])
    rows.forEach(r => priceMode?.onPrice(r.id, String(promoOf(r.price!, pct))))
  }
  return (
    <div>
      <label className="flex h-11 items-center gap-2 rounded-xl bg-surface-container-low px-3"><Icon name="search" size={18} className="text-outline" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un article…" className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" /></label>
      {aisles.length > 0 && (
        <div className="relative mt-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 pr-6 [scrollbar-width:none]">
            {[{ id: '', name: 'Tous les rayons' }, ...aisles].map(a => (
              <button key={a.id || 'all'} type="button" onClick={() => setAisle(a.id)} className={`h-8 shrink-0 cursor-pointer whitespace-nowrap rounded-full border-none px-3 text-label-md ${aisle === a.id ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface'}`}>{a.name}</button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
        <span className="text-label-md text-on-surface">Remise</span>
        <span className="flex items-center gap-1"><input type="number" min={minPercent ?? 1} max={90} value={bulk} onChange={e => setBulk(e.target.value)} className="h-9 w-16 rounded-lg border-none bg-surface-lowest text-center text-label-lg text-on-surface outline-none" aria-label="Remise en %" /> <span className="text-label-md text-on-surface">%</span></span>
        <button type="button" onClick={applyAll} disabled={!rows.length} className="ml-auto flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-primary px-3 text-label-md text-white disabled:opacity-40"><Icon name="done_all" size={16} /> Appliquer aux {rows.length} articles affichés</button>
      </div>
      {minPercent ? <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Remise minimale demandée : {minPercent} %.</p> : null}
      <div className="mt-2 flex max-h-[420px] flex-col gap-1.5 overflow-y-auto pr-1">
        {rows.length === 0 && <p className="m-0 p-3 text-center text-body-sm text-on-surface-variant">Aucun article en ligne avec un prix.</p>}
        {rows.map(l => {
          const p = on(l.id)
          const bad = p && minPercent && p.percent < minPercent
          return (
            <div key={l.id} className={`flex items-center gap-3 rounded-xl p-2 ${p ? 'bg-primary-fixed/40' : 'bg-surface-container-low'}`}>
              <input type="checkbox" checked={!!p} onChange={() => toggle(l)} className="h-5 w-5 shrink-0 cursor-pointer accent-primary" aria-label={`Inclure ${l.title}`} />
              <Thumb url={l.coverImageUrl} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-label-md text-on-surface">{l.title}</div>
                <div className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
                  <span className={p ? 'text-outline line-through' : 'text-on-surface-variant'}><Price amount={l.price} /></span>
                  {p && !priceMode && <span className="font-bold text-primary"><Price amount={promoOf(l.price!, p.percent)} /></span>}
                </div>
              </div>
              {p && priceMode && (
                <span className="flex shrink-0 items-center gap-1">
                  <input type="number" min={1} value={priceMode.prices[l.id] ?? String(promoOf(l.price!, p.percent))} onChange={e => priceMode.onPrice(l.id, e.target.value)} className={`h-9 w-24 rounded-lg border-none px-2 text-right text-label-md outline-none ${Number(priceMode.prices[l.id] ?? promoOf(l.price!, p.percent)) >= l.price! ? 'bg-primary-fixed text-primary' : 'bg-surface-lowest text-on-surface'}`} aria-label="Prix promo" />
                  <span className="text-label-md text-on-surface">F</span>
                </span>
              )}
              {p && !priceMode && (
                <span className="flex shrink-0 items-center gap-1">
                  <span className="text-label-md text-on-surface">-</span>
                  <input type="number" min={1} max={90} value={p.percent} onChange={e => setPct(l.id, Math.min(90, Math.max(1, Number(e.target.value) || 1)))} className={`h-9 w-14 rounded-lg border-none text-center text-label-md outline-none ${bad ? 'bg-primary-fixed text-primary' : 'bg-surface-lowest text-on-surface'}`} aria-label="Remise %" />
                  <span className="text-label-md text-on-surface">%</span>
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p className="m-0 mt-2 text-body-sm text-on-surface-variant">{picks.length} article{picks.length > 1 ? 's' : ''} sélectionné{picks.length > 1 ? 's' : ''}</p>
    </div>
  )
}

export default function ShopPromos({ onNavigate, currentUser, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('sales')
  const [editor, setEditor] = useState<null | 'sale' | 'bundle' | 'post' | { campaign: OpenCampaign, retry?: PromoItem } | { sale: ShopSale, relaunch?: boolean }>(null)
  const { data: shopData } = useQuery<MyShopData>(MY_SHOP_QUERY)
  const { data, loading, refetch } = useQuery<ShopPromos>(MY_SHOP_PROMOS_QUERY, { fetchPolicy: 'cache-and-network' })
  const { data: ld } = useQuery<{ myListings: { items: ShopListing[] } }>(MY_SHOP_LISTINGS_QUERY)
  const shop = shopData?.myShop.shop
  const official = !!shop && shop.status === 'APPROVED' && !!shop.paidUntil && new Date(shop.paidUntil) > new Date()
  const listings = ld?.myListings.items ?? []

  const layout = (children: React.ReactNode) => (
    <AccountLayout active="seller-shop-promos" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title="Promotions" onBack={editor ? () => setEditor(null) : () => onNavigate('seller-shop')}>
      <div className="mx-auto max-w-[1100px] pb-24 lg:pb-8">{children}</div>
    </AccountLayout>
  )
  if (!shopData || (loading && !data)) return layout(<p className="text-body-md text-on-surface-variant">Chargement…</p>)
  if (!official) return layout(
    <Empty icon="storefront" title="Réservé aux Boutiques officielles" text="Soldes, campagnes Dilchap, offres groupées et annonces aux abonnés sont inclus dans l’abonnement Boutique officielle." action={<button onClick={() => onNavigate('seller-shop')} className="mt-2 flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="storefront" size={18} /> Ma Boutique officielle</button>} />,
  )
  const d = data!
  const done = () => { setEditor(null); void refetch() }

  if (editor === 'sale') return layout(<SaleEditor listings={listings} aisles={shop!.aisles} onDone={done} onCancel={() => setEditor(null)} followers={d.myShopPostQuota.followers} />)
  if (editor === 'bundle') return layout(<BundleEditor listings={listings} aisles={shop!.aisles} onDone={done} onCancel={() => setEditor(null)} />)
  if (editor === 'post') return layout(<PostEditor listings={listings} quota={d.myShopPostQuota} onDone={done} onCancel={() => setEditor(null)} />)
  if (editor && typeof editor === 'object' && 'sale' in editor) return layout(<SaleEditor key={editor.sale.id} sale={editor.sale} relaunch={editor.relaunch} listings={listings} aisles={shop!.aisles} onDone={done} onCancel={() => setEditor(null)} followers={d.myShopPostQuota.followers} />)
  if (editor && typeof editor === 'object') return layout(<CampaignJoin campaign={editor.campaign} retry={editor.retry} listings={listings} aisles={shop!.aisles} onDone={done} onCancel={() => setEditor(null)} />)

  const tabs: [Tab, string, string, number][] = [
    ['sales', 'sell', 'Soldes', d.myShopSales.filter(s => s.state !== 'ENDED').length],
    ['campaigns', 'campaign', 'Campagnes Dilchap', d.openShopCampaigns.length],
    ['bundles', 'inventory_2', 'Offres groupées', d.myShopBundles.filter(b => b.state !== 'ENDED').length],
    ['posts', 'forum', 'Annonces aux abonnés', d.myShopPosts.length],
  ]
  const create: Record<Tab, [string, () => void] | null> = {
    sales: ['Créer des soldes', () => setEditor('sale')],
    campaigns: null,
    bundles: ['Créer une offre groupée', () => setEditor('bundle')],
    posts: ['Nouvelle annonce', () => setEditor('post')],
  }
  const cta = create[tab]

  return layout(<>
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary"><Icon name="verified" size={14} fill /> {shop!.name}</span>
        <h1 className="m-0 mt-1 text-headline-lg text-on-surface">Promotions de ma boutique</h1>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">Soldes, campagnes Dilchap, offres groupées et annonces à vos {formatNumber(d.myShopPostQuota.followers)} abonnés.</p>
      </div>
      {cta && <button onClick={cta[1]} className="flex h-12 w-full shrink-0 cursor-pointer md:h-11 md:w-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-lg text-white"><Icon name="add" size={19} /> {cta[0]}</button>}
    </div>

    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-lowest text-primary"><Icon name="info" size={19} /></span>
      <div className="min-w-0"><div className="text-label-lg text-on-surface">Transactions directes & zéro commission</div><p className="m-0 text-body-sm text-on-surface-variant">Vos remises s’affichent directement sur vos annonces. Les règlements se concluent en direct (espèces ou Mobile Money), sans frais de plateforme ni code promo.</p></div>
    </div>

    <section className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:gap-3">
      {(() => {
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        const monthSales = d.myShopSales.filter(s => new Date(s.endsAt) >= monthStart)
        const live = new Set([...d.myShopSales.filter(s => s.state === 'LIVE').flatMap(s => s.items.map(i => i.listingId)), ...d.openShopCampaigns.filter(c => c.state === 'LIVE').flatMap(c => c.myItems.filter(i => i.status === 'APPROVED').map(i => i.listingId))]).size
        const stats: [string, string, React.ReactNode, string][] = [
          ['shopping_bag', 'Ventes en soldes ce mois', formatNumber(monthSales.reduce((t, s) => t + s.salesCount, 0)), 'ventes conclues pendant vos soldes'],
          ['sell', 'Articles remisés actuellement', formatNumber(live), `sur ${formatNumber(listings.length)} article${listings.length > 1 ? 's' : ''} en ligne`],
          ['payments', 'Réalisé en soldes ce mois', <Price amount={monthSales.reduce((t, s) => t + s.salesVolume, 0)} />, 'montant des ventes conclues'],
        ]
        return stats.map(([icon, label, value, sub]) => (
          <div key={label} className="w-44 min-w-0 shrink-0 rounded-2xl bg-surface-lowest p-3 shadow-sm sm:w-auto sm:p-4">
            <div className="flex items-start justify-between gap-2"><span className="text-label-sm uppercase text-on-surface-variant">{label}</span><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icon name={icon} size={18} /></span></div>
            <div className="mt-1 text-headline-md font-extrabold text-on-surface sm:text-headline-lg">{value}</div>
            <div className="text-body-sm leading-tight text-on-surface-variant">{sub}</div>
          </div>
        ))
      })()}
    </section>

    <div className="relative mt-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-container p-1 pr-8 [scrollbar-width:none] md:pr-1">
        {tabs.map(([k, icon, label, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none px-3.5 text-label-md md:flex-1 md:justify-center ${tab === k ? 'bg-surface-lowest text-primary shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>
            <Icon name={icon} size={17} /> {label}{n > 0 && <span className={`rounded-full px-1.5 text-label-sm ${tab === k ? 'bg-primary text-white' : 'bg-surface-lowest text-on-surface-variant'}`}>{n}</span>}
          </button>
        ))}
      </div>
    </div>

    <div className="mt-4">
      {tab === 'sales' && <SalesTab sales={d.myShopSales} onCreate={() => setEditor('sale')} onEdit={sale => setEditor({ sale })} onRelaunch={sale => setEditor({ sale, relaunch: true })} onChanged={() => void refetch()} />}
      {tab === 'campaigns' && <CampaignsTab campaigns={d.openShopCampaigns} onJoin={(c, retry) => setEditor({ campaign: c, retry })} onChanged={() => void refetch()} />}
      {tab === 'bundles' && <BundlesTab bundles={d.myShopBundles} onCreate={() => setEditor('bundle')} onChanged={() => void refetch()} />}
      {tab === 'posts' && <PostsTab posts={d.myShopPosts} quota={d.myShopPostQuota} onCreate={() => setEditor('post')} />}
    </div>
  </>)
}

// ─── Sales ────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000
const countdown = (s: ShopSale) => {
  const now = Date.now()
  if (s.state === 'SCHEDULED') { const d = Math.ceil((new Date(s.startsAt).getTime() - now) / DAY_MS); return d <= 1 ? 'Démarre demain' : `Démarre dans ${d} jours` }
  if (s.state === 'LIVE') { const d = Math.ceil((new Date(s.endsAt).getTime() - now) / DAY_MS); return d <= 1 ? 'Se termine aujourd’hui' : `Se termine dans ${d} jours` }
  return null
}
const pctOf = (i: PromoItem) => i.discountPercent ?? (i.price && i.promoPrice != null ? Math.round((1 - i.promoPrice / i.price) * 100) : 0)

function SalesTab({ sales, onCreate, onEdit, onRelaunch, onChanged }: {
  sales: ShopPromos['myShopSales'], onCreate: () => void, onEdit: (s: ShopSale) => void, onRelaunch: (s: ShopSale) => void, onChanged: () => void
}) {
  const [stopping, setStopping] = useState<ShopSale | null>(null)
  const [filter, setFilter] = useState<'ALL' | PromoState>('ALL')
  const [q, setQ] = useState('')
  const [end, { loading }] = useMutation(END_SHOP_SALE_MUTATION)
  if (!sales.length) return <Empty icon="sell" title="Aucunes soldes pour l’instant" text="Mettez une sélection d’articles en promotion : prix barré, badge « -20 % » sur vos cartes et section « En promotion » sur votre page." action={<button onClick={onCreate} className="mt-2 flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="add" size={18} /> Créer des soldes</button>} />
  const count = (s: 'ALL' | PromoState) => (s === 'ALL' ? sales.length : sales.filter(x => x.state === s).length)
  const rows = sales.filter(s => (filter === 'ALL' || s.state === filter) && (!q || s.name.toLowerCase().includes(q.toLowerCase()) || s.items.some(i => i.title.toLowerCase().includes(q.toLowerCase()))))
  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2 rounded-2xl bg-surface-lowest p-3 shadow-sm md:flex-row md:items-center">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low px-3"><Icon name="search" size={18} className="shrink-0 text-outline" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une opération par nom ou produit…" className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" /></label>
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {([['ALL', 'Toutes'], ['LIVE', 'En cours'], ['SCHEDULED', 'Programmées'], ['ENDED', 'Terminées']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-xl border-none px-3 text-label-md ${filter === k ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface'}`}>{l} ({count(k)})</button>
          ))}
        </div>
      </section>
      {rows.length === 0 && <p className="m-0 rounded-2xl bg-surface-lowest p-6 text-center text-body-md text-on-surface-variant shadow-sm">Aucune opération ne correspond.</p>}
      {rows.map(s => {
        const pcts = s.items.map(pctOf)
        const max = pcts.length ? Math.max(...pcts) : 0
        const uniform = pcts.every(p => p === max)
        const cd = countdown(s)
        return (
          <section key={s.id} className={card}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <span className={`hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl md:flex ${s.state === 'LIVE' ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'}`}><Icon name={s.state === 'LIVE' ? 'bolt' : s.state === 'SCHEDULED' ? 'schedule' : 'task_alt'} size={28} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5"><StatePill state={s.state} /><span className="whitespace-nowrap rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm font-bold text-primary">{uniform ? '' : 'Jusqu’à '}-{max} %</span></div>
                {cd && <p className="m-0 mt-1 flex items-center gap-1 text-body-sm text-on-surface-variant"><Icon name="timer" size={15} className="text-primary" /> {cd}</p>}
                <h3 className="m-0 mt-1 text-headline-sm text-on-surface">{s.name}</h3>
                <p className="m-0 mt-1 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="calendar_month" size={15} /> Du {fdate(s.startsAt)} au {fdate(s.endsAt)}</p>
                <p className="m-0 mt-0.5 flex min-w-0 items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="sell" size={15} className="shrink-0" /> <span className="truncate">{s.items.length} article{s.items.length > 1 ? 's' : ''} remisé{s.items.length > 1 ? 's' : ''} ({s.items.slice(0, 3).map(i => i.title).join(', ')}{s.items.length > 3 ? '…' : ''})</span></p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                {s.state === 'SCHEDULED' ? (
                  s.notifyFollowers && <div className="text-body-sm md:text-right"><div className="text-label-sm uppercase text-on-surface-variant">Diffusion</div><div className="flex items-center gap-1 text-label-md text-on-surface md:justify-end"><Icon name="notifications_active" size={16} className="text-primary" /> Abonnés prévenus au lancement</div></div>
                ) : (
                  <div className="text-body-sm md:text-right">
                    <div className="text-label-sm uppercase text-on-surface-variant">{s.state === 'LIVE' ? 'Volume réalisé' : 'Bilan final'}</div>
                    <div className="text-headline-sm font-extrabold text-on-surface"><Price amount={s.salesVolume} /></div>
                    <div className="text-tertiary">{s.salesCount} vente{s.salesCount > 1 ? 's' : ''} conclue{s.salesCount > 1 ? 's' : ''} en direct</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 md:flex">
                  {s.state !== 'ENDED' && <button onClick={() => onEdit(s)} className="flex h-10 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="edit" size={16} /> Modifier</button>}
                  {s.state === 'LIVE' && <button onClick={() => setStopping(s)} className="flex h-10 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl border-none bg-primary-fixed px-3 text-label-md text-primary"><Icon name="stop_circle" size={16} /> Clôturer</button>}
                  {s.state === 'SCHEDULED' && <button onClick={() => setStopping(s)} className="flex h-10 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="cancel" size={16} /> Annuler</button>}
                  {s.state === 'ENDED' && <button onClick={() => onRelaunch(s)} className="col-span-2 flex h-10 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl border-none bg-primary-fixed px-3 text-label-md text-primary"><Icon name="replay" size={16} /> Relancer</button>}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5">
              <div className="flex shrink-0 -space-x-3">
                {s.items.slice(0, 4).map(i => <span key={i.entryId} className="h-10 w-10 overflow-hidden rounded-full border-2 border-solid border-surface-lowest bg-surface-container">{i.coverUrl && <img src={i.coverUrl} alt="" className="h-full w-full object-cover" />}</span>)}
                {s.items.length > 4 && <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-solid border-surface-lowest bg-surface-container text-label-sm text-on-surface">+{s.items.length - 4}</span>}
              </div>
              <p className="m-0 min-w-0 flex-1 truncate text-body-sm text-on-surface-variant">Prix barrés et badge promo visibles sur vos annonces{s.state === 'LIVE' ? '' : ' pendant la période'}.</p>
            </div>
          </section>
        )
      })}
      <ConfirmSheet open={!!stopping} title={stopping?.state === 'SCHEDULED' ? 'Annuler ces soldes ?' : 'Clôturer ces soldes ?'} confirmLabel={loading ? '…' : stopping?.state === 'SCHEDULED' ? 'Annuler les soldes' : 'Clôturer maintenant'} onConfirm={() => stopping && void end({ variables: { id: stopping.id } }).then(() => { setStopping(null); onChanged() })} onClose={() => setStopping(null)} loading={loading}>
        <p className="m-0 text-body-sm text-on-surface-variant">{stopping?.state === 'SCHEDULED' ? 'Elles ne démarreront pas.' : 'Les articles reviennent immédiatement à leur prix habituel.'}</p>
      </ConfirmSheet>
    </div>
  )
}

const timeOf = (iso: string) => new Date(iso).toISOString().slice(11, 16)
const at = (day: string, time: string) => new Date(`${day}T${time || '00:00'}:00.000Z`).toISOString()

function SaleEditor({ listings, aisles, onDone, onCancel, followers, sale, relaunch }: {
  listings: ShopListing[], aisles: { id: string, name: string }[], onDone: () => void, onCancel: () => void, followers: number
  // Editing this sale, or starting a new one from an ended sale ("Relancer").
  sale?: ShopSale, relaunch?: boolean
}) {
  const today = dayInput(new Date())
  const editing = !!sale && !relaunch
  const [name, setName] = useState(sale ? sale.name : '')
  const [from, setFrom] = useState(editing ? dayInput(new Date(sale!.startsAt)) : today)
  const [fromTime, setFromTime] = useState(editing ? timeOf(sale!.startsAt) : '08:00')
  const [to, setTo] = useState(editing ? dayInput(new Date(sale!.endsAt)) : dayInput(new Date(Date.now() + 7 * DAY_MS)))
  const [toTime, setToTime] = useState(editing ? timeOf(sale!.endsAt) : '23:59')
  const [mode, setMode] = useState<'PERCENT' | 'PRICE'>(sale?.items.some(i => i.salePrice != null) ? 'PRICE' : 'PERCENT')
  const [picks, setPicks] = useState<Pick[]>(() => (sale?.items ?? []).filter(i => listings.some(l => l.id === i.listingId)).map(i => ({ listingId: i.listingId, percent: pctOf(i) })))
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries((sale?.items ?? []).filter(i => i.salePrice != null).map(i => [i.listingId, String(i.salePrice)])))
  const [notify, setNotify] = useState(sale ? sale.notifyFollowers : true)
  const [error, setError] = useState('')
  const [create, { loading: creating }] = useMutation(CREATE_SHOP_SALE_MUTATION)
  const [update, { loading: updating }] = useMutation(UPDATE_SHOP_SALE_MUTATION)
  const loading = creating || updating
  const priceOf = (id: string) => listings.find(l => l.id === id)?.price ?? 0
  const promo = (p: Pick) => (mode === 'PRICE' && prices[p.listingId] ? Number(prices[p.listingId]) : promoOf(priceOf(p.listingId), p.percent))
  const first = picks[0] && listings.find(l => l.id === picks[0].listingId)
  const startIso = from === today && !editing && fromTime <= new Date().toISOString().slice(11, 16) ? new Date().toISOString() : at(from, fromTime)
  const pricesOk = mode === 'PERCENT' || picks.every(p => { const v = Number(prices[p.listingId]); return v > 0 && v < priceOf(p.listingId) })
  const ok = name.trim().length >= 2 && picks.length > 0 && at(to, toTime) > startIso && pricesOk
  const submit = () => {
    setError('')
    const input = {
      name: name.trim(), startsAt: startIso, endsAt: at(to, toTime), notifyFollowers: notify,
      items: picks.map(p => (mode === 'PRICE' ? { listingId: p.listingId, salePrice: Number(prices[p.listingId]) } : { listingId: p.listingId, discountPercent: p.percent })),
    }
    void (editing ? update({ variables: { id: sale!.id, input } }) : create({ variables: { input } })).then(onDone).catch((e: Error) => setError(e.message))
  }
  const step = (n: number, title: string, sub: string) => (
    <div className="mb-3 flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-label-lg text-primary">{n}</span><div className="min-w-0"><h2 className="m-0 text-headline-sm text-on-surface">{title}</h2><p className="m-0 text-body-sm text-on-surface-variant">{sub}</p></div></div>
  )
  return (
    <>
      <button onClick={onCancel} className="mb-2 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Icon name="arrow_back" size={17} /> Retour aux promotions</button>
      <h1 className="m-0 text-headline-lg text-on-surface">{editing ? 'Modifier les soldes' : relaunch ? 'Relancer des soldes' : 'Créer des soldes pour ma boutique'}</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">Définissez vos réductions et sélectionnez les articles de votre vitrine officielle à remiser (60 jours au maximum).</p>
      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={card}>
            {step(1, 'Informations générales', 'Nommez et cadrez la période de validité de votre offre')}
            <label className="block"><span className="mb-1.5 block text-label-md text-on-surface">Nom de l’opération <span className="text-primary">*</span></span><input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Ex : Soldes de rentrée" className={inputCls} /></label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><span className="mb-1.5 block text-label-md text-on-surface">Début <span className="text-primary">*</span></span><div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2"><input type="date" min={editing ? undefined : today} value={from} onChange={e => setFrom(e.target.value)} className={inputCls} aria-label="Date de début" /><input type="time" value={fromTime} onChange={e => setFromTime(e.target.value)} className={inputCls} aria-label="Heure de début" /></div></div>
              <div><span className="mb-1.5 block text-label-md text-on-surface">Fin <span className="text-primary">*</span></span><div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2"><input type="date" min={from} value={to} onChange={e => setTo(e.target.value)} className={inputCls} aria-label="Date de fin" /><input type="time" value={toTime} onChange={e => setToTime(e.target.value)} className={inputCls} aria-label="Heure de fin" /></div></div>
            </div>
          </section>
          <section className={card}>
            {step(2, 'Réduction & application', 'Choisissez la modalité de calcul du rabais')}
            <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([['PERCENT', 'Remise en pourcentage (%)', 'Le même pourcentage ou un pourcentage par article'], ['PRICE', 'Prix promotionnel par article', 'Saisie manuelle du prix pour chaque article']] as const).map(([k, t, d]) => (
                <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={`flex cursor-pointer items-start gap-2 rounded-xl border-2 border-solid p-3 text-left ${mode === k ? 'border-primary bg-primary-fixed/30' : 'border-transparent bg-surface-container-low'}`}>
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-solid ${mode === k ? 'border-primary' : 'border-outline-variant'}`}>{mode === k && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                  <span className="min-w-0"><span className="block text-label-md text-on-surface">{t}</span><span className="block text-body-sm text-on-surface-variant">{d}</span></span>
                </button>
              ))}
            </div>
          </section>
          <section className={card}>
            {step(3, 'Sélection des articles', 'Cochez les articles en ligne à inclure dans les soldes')}
            <ItemPicker listings={listings} aisles={aisles} picks={picks} onChange={setPicks} priceMode={mode === 'PRICE' ? { prices, onPrice: (id, v) => setPrices(p => ({ ...p, [id]: v })) } : undefined} />
          </section>
          <section className={card}>
            {step(4, 'Communication & diffusion', 'Faites savoir à vos abonnés que vos soldes commencent')}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-container-low p-3">
              <span className="min-w-0 flex-1"><span className="block text-label-lg text-on-surface">Prévenir mes abonnés au lancement</span><span className="text-body-sm text-on-surface-variant">Une notification à vos {formatNumber(followers)} abonné{followers > 1 ? 's' : ''} le {new Date(startIso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}.</span></span>
              <input type="checkbox" role="switch" checked={notify} onChange={e => setNotify(e.target.checked)} className="peer sr-only" />
              <span className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-outline-variant transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5" />
            </label>
          </section>
        </div>
        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4">
          <section className={card}>
            <div className="mb-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-label-lg text-on-surface"><Icon name="visibility" size={18} className="text-primary" /> Aperçu sur Dilchap</span></div>
            {first ? (
              <div className="overflow-hidden rounded-xl bg-surface-container-low">
                <div className="relative aspect-[4/3] bg-surface-container">{first.coverImageUrl && <img src={first.coverImageUrl} alt="" className="h-full w-full object-cover" />}<span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-label-sm font-bold text-white">-{Math.max(0, Math.round((1 - promo(picks[0]) / (first.price || 1)) * 100))} %</span></div>
                <div className="p-3">
                  <div className="truncate text-label-lg text-on-surface">{first.title}</div>
                  <div className="flex flex-wrap items-baseline gap-2"><span className="text-headline-sm font-extrabold text-primary"><Price amount={promo(picks[0])} /></span><span className="text-body-sm text-outline line-through"><Price amount={first.price} /></span></div>
                  <div className="text-body-sm text-tertiary">Économisez <Price amount={(first.price ?? 0) - promo(picks[0])} /></div>
                </div>
              </div>
            ) : <p className="m-0 text-body-sm text-on-surface-variant">Sélectionnez un article pour voir l’aperçu.</p>}
          </section>
          <p className="m-0 flex items-start gap-2 rounded-2xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="lightbulb" size={18} className="mt-0.5 shrink-0 text-tertiary" /> L’acheteur voit immédiatement la remise et peut vous contacter pour convenir d’un rendez-vous de remise en main propre.</p>
        </aside>
      </div>
      {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
      <div className="mt-4 flex gap-3 lg:justify-end">
        <button onClick={onCancel} className="flex h-12 shrink-0 cursor-pointer items-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">Annuler</button>
        <button disabled={!ok || loading} onClick={submit} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45 lg:flex-none"><Icon name="bolt" size={19} /> <span className="truncate">{loading ? 'Enregistrement…' : editing ? 'Enregistrer les modifications' : 'Activer et programmer les soldes'}</span></button>
      </div>
    </>
  )
}

// ─── Dilchap campaigns ────────────────────────────────────────────────────

function CampaignsTab({ campaigns, onJoin, onChanged }: { campaigns: OpenCampaign[], onJoin: (c: OpenCampaign, retry?: PromoItem) => void, onChanged: () => void }) {
  const [withdraw] = useMutation(WITHDRAW_CAMPAIGN_ENTRY_MUTATION)
  const [openId, setOpenId] = useState<string | null>(() => campaigns.find(c => c.myItems.length)?.id ?? null)
  if (!campaigns.length) return <Empty icon="campaign" title="Aucune campagne ouverte" text="Quand l’équipe Dilchap ouvre une campagne aux boutiques (Black Friday, fêtes…), vous pourrez y inscrire vos articles ici." />
  const detail = campaigns.find(c => c.id === openId && c.myItems.length)
  const n = (c: OpenCampaign, s: PromoItem['status']) => c.myItems.filter(i => i.status === s).length
  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><span className="h-2 w-2 rounded-full bg-primary" /> Campagnes ouvertes aux boutiques ({campaigns.length})</h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {campaigns.map(c => (
          <section key={c.id} className={`${card} flex min-w-0 flex-col`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="whitespace-nowrap rounded-md bg-surface-container px-2 py-0.5 text-label-sm uppercase text-on-surface-variant">Campagne Dilchap</span><StatePill state={c.state} /></div>
            <h3 className="m-0 mt-2 text-headline-sm text-on-surface">{c.name}</h3>
            <p className="m-0 mt-0.5 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="calendar_month" size={15} /> Du {fdate(c.startsAt)} au {fdate(c.endsAt)}</p>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm">
              <Icon name="percent" size={18} className="mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0"><div className="text-label-md text-on-surface">Conditions de participation</div><div className="text-on-surface-variant">{c.minDiscountPercent ? `Remise minimale demandée : ${c.minDiscountPercent} % sur chaque article inscrit.` : 'Pas de remise minimale.'} Chaque article est vérifié par l’équipe Dilchap.</div></div>
            </div>
            {c.description && <p className="m-0 mt-2 text-body-sm text-on-surface">{c.description}</p>}
            <div className="mt-auto pt-3">
              {c.myItems.length > 0 ? (
                <>
                  <p className="m-0 mb-2 flex items-center gap-1.5 rounded-xl bg-primary-fixed/40 px-3 py-2 text-body-sm text-on-surface"><Icon name="info" size={16} className="shrink-0 text-primary" /> {c.myItems.length} article{c.myItems.length > 1 ? 's' : ''} inscrit{c.myItems.length > 1 ? 's' : ''} : {n(c, 'APPROVED')} accepté{n(c, 'APPROVED') > 1 ? 's' : ''}, {n(c, 'PENDING')} en attente, {n(c, 'REJECTED')} refusé{n(c, 'REJECTED') > 1 ? 's' : ''}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button onClick={() => setOpenId(c.id)} className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-3 text-label-md text-white"><Icon name="checklist" size={18} /> Gérer mes articles</button>
                    <button onClick={() => onJoin(c)} className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="add" size={18} /> Inscrire d’autres articles</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="m-0 mb-2 flex items-center gap-1.5 rounded-xl bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant"><Icon name="radio_button_unchecked" size={16} className="shrink-0" /> Statut boutique : non inscrite</p>
                  <button onClick={() => onJoin(c)} className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary text-label-md text-white"><Icon name="add_circle" size={18} /> Participer à cette campagne</button>
                </>
              )}
            </div>
          </section>
        ))}
      </div>
      {detail && (
        <section className={card}>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0"><h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="checklist" size={20} className="text-primary" /> Ma participation : {detail.name}</h2><p className="m-0 text-body-sm text-on-surface-variant">{detail.myItems.length} article{detail.myItems.length > 1 ? 's' : ''} soumis à l’équipe Dilchap</p></div>
            <div className="flex flex-wrap gap-1.5">
              <span className="whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary">{n(detail, 'APPROVED')} accepté{n(detail, 'APPROVED') > 1 ? 's' : ''}</span>
              <span className="whitespace-nowrap rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">{n(detail, 'PENDING')} en attente</span>
              <span className="whitespace-nowrap rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">{n(detail, 'REJECTED')} refusé{n(detail, 'REJECTED') > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {detail.myItems.map(i => (
              <div key={i.entryId} className={`flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:flex-wrap sm:items-center ${i.status === 'REJECTED' ? 'bg-primary-fixed/30' : 'bg-surface-container-low'}`}>
                <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
                  <Thumb url={i.coverUrl} />
                  <div className="min-w-0 flex-1"><div className="truncate text-label-md text-on-surface">{i.title}</div><div className="flex flex-wrap items-baseline gap-x-2 text-body-sm"><span className="font-bold text-primary"><Price amount={i.promoPrice} /></span><span className="text-outline line-through"><Price amount={i.price} /></span><span className="text-on-surface-variant">-{pctOf(i)} %</span></div></div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                  <EntryPill status={i.status} />
                  {i.status === 'REJECTED' && <button onClick={() => onJoin(detail, i)} className="flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-primary px-3 text-label-md text-white"><Icon name="replay" size={16} /> Réajuster la remise</button>}
                  {i.status === 'PENDING' && <button onClick={() => void withdraw({ variables: { entryId: i.entryId } }).then(onChanged)} className="flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-lowest px-3 text-label-md text-on-surface"><Icon name="close" size={16} /> Retirer</button>}
                </div>
                {i.status === 'REJECTED' && i.rejectReason && <p className="m-0 flex basis-full items-start gap-1 text-body-sm text-primary"><Icon name="warning" size={15} className="mt-0.5 shrink-0" /> <span>{i.rejectReason}</span></p>}
              </div>
            ))}
          </div>
          <button onClick={() => onJoin(detail)} className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="add_circle" size={18} /> Inscrire un article supplémentaire</button>
        </section>
      )}
    </div>
  )
}

function CampaignJoin({ campaign, retry, listings, aisles, onDone, onCancel }: { campaign: OpenCampaign, retry?: PromoItem, listings: ShopListing[], aisles: { id: string, name: string }[], onDone: () => void, onCancel: () => void }) {
  const already = new Set(campaign.myItems.filter(i => i.status !== 'REJECTED').map(i => i.listingId))
  const [picks, setPicks] = useState<Pick[]>(retry ? [{ listingId: retry.listingId, percent: Math.max(campaign.minDiscountPercent ?? 1, pctOf(retry)) }] : [])
  const [error, setError] = useState('')
  const [join, { loading }] = useMutation(JOIN_CAMPAIGN_MUTATION)
  const min = campaign.minDiscountPercent ?? 0
  const ok = picks.length > 0 && picks.every(p => p.percent >= min)
  return (
    <>
      <button onClick={onCancel} className="mb-2 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Icon name="arrow_back" size={17} /> Retour aux promotions</button>
      <h1 className="m-0 text-headline-lg text-on-surface">{retry ? 'Réajuster la remise' : `Participer à « ${campaign.name} »`}</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">Du {fdate(campaign.startsAt)} au {fdate(campaign.endsAt)}. Vos articles sont vérifiés par l’équipe Dilchap avant la campagne.</p>
      {retry?.rejectReason && <p className="m-0 mt-3 flex items-start gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="warning" size={17} className="shrink-0" /> Motif du refus : {retry.rejectReason}</p>}
      <section className={`${card} mt-4`}>
        <ItemPicker listings={listings.filter(l => !already.has(l.id))} aisles={aisles} picks={picks} onChange={setPicks} minPercent={campaign.minDiscountPercent} />
      </section>
      {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
      <div className="mt-4 flex gap-3 lg:justify-end">
        <button onClick={onCancel} className="flex h-12 shrink-0 cursor-pointer items-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">Annuler</button>
        <button disabled={!ok || loading} onClick={() => void join({ variables: { input: { campaignId: campaign.id, items: picks.map(p => ({ listingId: p.listingId, discountPercent: p.percent })) } } }).then(onDone).catch((e: Error) => setError(e.message))} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45 lg:flex-none"><Icon name="send" size={19} /> {loading ? 'Envoi…' : `Soumettre ${picks.length} article${picks.length > 1 ? 's' : ''}`}</button>
      </div>
    </>
  )
}

// ─── Bundles ──────────────────────────────────────────────────────────────

function BundlesTab({ bundles, onCreate, onChanged }: { bundles: ShopPromos['myShopBundles'], onCreate: () => void, onChanged: () => void }) {
  const [stop] = useMutation(STOP_SHOP_BUNDLE_MUTATION)
  if (!bundles.length) return <Empty icon="inventory_2" title="Aucune offre groupée" text="Encouragez les achats en plusieurs exemplaires : « 2 achetés = -10 % ». La remise s’applique quand vous concluez la vente." action={<button onClick={onCreate} className="mt-2 flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="add" size={18} /> Créer une offre groupée</button>} />
  const scope = (b: ShopPromos['myShopBundles'][number]) => b.scope === 'ALL' ? 'Toute la boutique' : b.scope === 'AISLE' ? `Rayon ${b.aisleName ?? ''}` : `${b.listingIds.length} article${b.listingIds.length > 1 ? 's' : ''} choisi${b.listingIds.length > 1 ? 's' : ''}`
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {bundles.map(b => (
        <section key={b.id} className={`${card} min-w-0`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="m-0 text-headline-sm text-on-surface">{b.name}</h3><StatePill state={b.state} /></div><p className="m-0 text-body-sm text-on-surface-variant">{scope(b)} · {b.listingsCount} article{b.listingsCount > 1 ? 's' : ''}{b.endsAt ? ` · jusqu’au ${fdate(b.endsAt)}` : ''}</p></div>
            {b.state !== 'ENDED' && <button onClick={() => void stop({ variables: { id: b.id } }).then(onChanged)} className="flex h-9 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="stop_circle" size={16} /> Arrêter</button>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {b.tiers.map(t => <span key={t.minQty} className="whitespace-nowrap rounded-xl bg-tertiary-soft px-3 py-2 text-label-md text-tertiary">{t.minQty} achetés : <b>-{t.percent} %</b></span>)}
          </div>
        </section>
      ))}
    </div>
  )
}

function BundleEditor({ listings, aisles, onDone, onCancel }: { listings: ShopListing[], aisles: { id: string, name: string }[], onDone: () => void, onCancel: () => void }) {
  const [name, setName] = useState('')
  const [tiers, setTiers] = useState<BundleTier[]>([{ minQty: 2, percent: 10 }, { minQty: 3, percent: 15 }])
  const [scope, setScope] = useState<'ALL' | 'AISLE' | 'LISTINGS'>('ALL')
  const [aisleId, setAisleId] = useState(aisles[0]?.id ?? '')
  const [ids, setIds] = useState<string[]>([])
  const [until, setUntil] = useState('')
  const [error, setError] = useState('')
  const [save, { loading }] = useMutation(SAVE_SHOP_BUNDLE_MUTATION)
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty)
  const tiersOk = sorted.every((t, i) => t.minQty >= 2 && t.percent >= 1 && t.percent <= 80 && (i === 0 || (t.minQty > sorted[i - 1].minQty && t.percent > sorted[i - 1].percent)))
  const ok = name.trim().length >= 2 && tiersOk && (scope !== 'AISLE' || !!aisleId) && (scope !== 'LISTINGS' || ids.length > 0)
  const setTier = (i: number, p: Partial<BundleTier>) => setTiers(ts => ts.map((t, j) => (j === i ? { ...t, ...p } : t)))
  const multi = listings.filter(l => l.quantity > 1)
  return (
    <>
      <h1 className="m-0 text-headline-lg text-on-surface">Créer une offre groupée</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">Affichée sur les articles concernés ayant au moins 2 exemplaires en stock, appliquée au montant quand vous concluez la vente.</p>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={card}>
          <label className="block"><span className="mb-1.5 block text-label-md text-on-surface">Nom</span><input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Ex : Plus vous achetez, moins vous payez" className={inputCls} /></label>
          <div className="mb-1.5 mt-4 text-label-md text-on-surface">Paliers</div>
          <div className="flex flex-col gap-2">
            {tiers.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low p-2.5 text-label-md text-on-surface">
                <input type="number" min={2} max={50} value={t.minQty} onChange={e => setTier(i, { minQty: Number(e.target.value) || 2 })} aria-label="Quantité" className="h-9 w-14 rounded-lg border-none bg-surface-lowest text-center outline-none" /> achetés =
                <span className="flex items-center gap-1">-<input type="number" min={1} max={80} value={t.percent} onChange={e => setTier(i, { percent: Number(e.target.value) || 1 })} aria-label="Remise" className="h-9 w-14 rounded-lg border-none bg-surface-lowest text-center outline-none" /> %</span>
                {tiers.length > 1 && <button type="button" onClick={() => setTiers(ts => ts.filter((_, j) => j !== i))} aria-label="Supprimer le palier" className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-on-surface-variant"><Icon name="delete" size={16} /></button>}
              </div>
            ))}
          </div>
          {tiers.length < 4 && <button type="button" onClick={() => setTiers(ts => [...ts, { minQty: (Math.max(...ts.map(t => t.minQty)) || 1) + 1, percent: Math.min(80, (Math.max(...ts.map(t => t.percent)) || 0) + 5) }])} className="mt-2 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary"><Icon name="add" size={17} /> Ajouter un palier</button>}
          {!tiersOk && <p className="m-0 mt-2 text-body-sm text-primary">La remise doit augmenter avec la quantité (à partir de 2 exemplaires, 80 % au plus).</p>}
          <label className="mt-4 block"><span className="mb-1.5 block text-label-md text-on-surface">Jusqu’au (facultatif)</span><input type="date" min={dayInput(new Date())} value={until} onChange={e => setUntil(e.target.value)} className={inputCls} /></label>
        </section>
        <section className={card}>
          <div className="mb-2 text-label-md text-on-surface">S’applique à</div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-container p-1">
            {([['ALL', 'Toute la boutique'], ['AISLE', 'Un rayon'], ['LISTINGS', 'Des articles']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setScope(k)} className={`h-10 cursor-pointer truncate rounded-lg border-none px-1 text-label-md ${scope === k ? 'bg-surface-lowest text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>{l}</button>
            ))}
          </div>
          {scope === 'AISLE' && (aisles.length ? (
            <Select value={aisleId} onChange={e => setAisleId(e.target.value)} className={`${inputCls} mt-3 cursor-pointer`}>{aisles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          ) : <p className="m-0 mt-3 text-body-sm text-on-surface-variant">Créez d’abord des rayons dans « Ma Boutique ».</p>)}
          {scope === 'LISTINGS' && (
            <div className="mt-3 flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
              {multi.length === 0 && <p className="m-0 text-body-sm text-on-surface-variant">Aucun article avec plusieurs exemplaires en stock.</p>}
              {multi.map(l => (
                <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-xl bg-surface-container-low p-2">
                  <input type="checkbox" checked={ids.includes(l.id)} onChange={() => setIds(s => (s.includes(l.id) ? s.filter(x => x !== l.id) : [...s, l.id]))} className="h-5 w-5 shrink-0 accent-primary" />
                  <Thumb url={l.coverImageUrl} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-label-md text-on-surface">{l.title}</span><span className="text-body-sm text-on-surface-variant">{l.quantity} en stock</span></span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-4 rounded-xl bg-tertiary-soft p-3">
            <div className="text-label-sm uppercase text-tertiary">Aperçu sur l’annonce</div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-body-sm text-on-surface">{sorted.map(t => <span key={t.minQty} className="whitespace-nowrap">{t.minQty} achetés : <b>-{t.percent} %</b></span>)}</div>
          </div>
        </section>
      </div>
      {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
      <div className="mt-4 flex gap-3 lg:justify-end">
        <button onClick={onCancel} className="flex h-12 shrink-0 cursor-pointer items-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">Annuler</button>
        <button disabled={!ok || loading} onClick={() => void save({ variables: { input: { name: name.trim(), tiers: sorted, scope, aisleId: scope === 'AISLE' ? aisleId : undefined, listingIds: scope === 'LISTINGS' ? ids : undefined, endsAt: until ? endOf(until) : undefined } } }).then(onDone).catch((e: Error) => setError(e.message))} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45 lg:flex-none"><Icon name="inventory_2" size={19} /> {loading ? 'Enregistrement…' : 'Activer l’offre'}</button>
      </div>
    </>
  )
}

// ─── Posts to followers ───────────────────────────────────────────────────

function PostsTab({ posts, quota, onCreate }: { posts: ShopPromos['myShopPosts'], quota: ShopPromos['myShopPostQuota'], onCreate: () => void }) {
  const left = quota.limit - quota.used
  return (
    <div className="flex flex-col gap-3">
      <section className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="group" size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-label-lg text-on-surface">{formatNumber(quota.followers)} abonné{quota.followers > 1 ? 's' : ''} recevront vos annonces</div>
          <div className="text-body-sm text-on-surface-variant">{left > 0 ? `${left} annonce${left > 1 ? 's' : ''} possible${left > 1 ? 's' : ''} cette semaine (${quota.limit} au maximum).` : `Limite atteinte : prochaine annonce le ${fdate(quota.nextAt!)}.`}</div>
        </div>
        <button disabled={left <= 0} onClick={onCreate} className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white disabled:opacity-45"><Icon name="edit_square" size={18} /> Nouvelle annonce</button>
      </section>
      {posts.length === 0 && <Empty icon="forum" title="Aucune annonce envoyée" text="Arrivage, nouvelle collection, promotion : prévenez vos abonnés, l’annonce reste aussi visible dans l’onglet « Actualités » de votre page." />}
      {posts.map(p => (
        <article key={p.id} className={`${card} flex gap-3`}>
          {p.imageUrl && <img src={p.imageUrl} alt="" className="hidden h-20 w-20 shrink-0 rounded-xl object-cover sm:block" />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-label-lg text-on-surface">{p.title}</h3><span className="text-body-sm text-on-surface-variant">{fdate(p.createdAt)}</span></div>
            <p className="m-0 mt-0.5 line-clamp-2 text-body-sm text-on-surface-variant">{p.body}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant"><Icon name="send" size={14} /> Envoyée à {formatNumber(p.recipients)}</span>
              <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant"><Icon name="visibility" size={14} /> {formatNumber(p.views)} vue{p.views > 1 ? 's' : ''}</span>
              {p.listings.length > 0 && <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant"><Icon name="link" size={14} /> {p.listings.length} article{p.listings.length > 1 ? 's' : ''}</span>}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function PostEditor({ listings, quota, onDone, onCancel }: { listings: ShopListing[], quota: ShopPromos['myShopPostQuota'], onDone: () => void, onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [send, { loading }] = useMutation(CREATE_SHOP_POST_MUTATION)
  const input = useRef<HTMLInputElement>(null)
  const rows = useMemo(() => listings.filter(l => !q || l.title.toLowerCase().includes(q.toLowerCase())).slice(0, 40), [listings, q])
  const ok = title.trim().length >= 3 && body.trim().length >= 3
  const pick = async (f?: File) => {
    if (!f) return
    setBusy(true); setError('')
    try { setImageUrl((await uploadImages([f]))[0]) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <>
      <h1 className="m-0 text-headline-lg text-on-surface">Nouvelle annonce aux abonnés</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">Envoyée en notification à vos {formatNumber(quota.followers)} abonnés et visible dans « Actualités » sur votre page.</p>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={card}>
          <label className="block"><span className="mb-1.5 flex justify-between text-label-md text-on-surface">Titre <span className="text-label-sm text-on-surface-variant">{title.length}/80</span></span><input value={title} onChange={e => setTitle(e.target.value.slice(0, 80))} placeholder="Ex : Arrivage iPhone 15 Pro" className={inputCls} /></label>
          <label className="mt-3 block"><span className="mb-1.5 flex justify-between text-label-md text-on-surface">Message <span className="text-label-sm text-on-surface-variant">{body.length}/1000</span></span><textarea value={body} onChange={e => setBody(e.target.value.slice(0, 1000))} rows={5} placeholder="Décrivez la nouveauté, les conditions, les dates…" className="w-full resize-y rounded-xl border-none bg-surface-container-low p-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary" /></label>
          <input ref={input} type="file" accept="image/*" hidden onChange={e => { void pick(e.target.files?.[0]); e.target.value = '' }} />
          <div className="mb-1.5 mt-3 text-label-md text-on-surface">Photo (facultatif)</div>
          {imageUrl ? (
            <div className="relative overflow-hidden rounded-xl"><img src={imageUrl} alt="" className="max-h-56 w-full object-cover" /><button type="button" onClick={() => setImageUrl('')} aria-label="Retirer la photo" className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest/95 text-on-surface"><Icon name="close" size={17} /></button></div>
          ) : (
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-outline-variant bg-transparent text-on-surface-variant"><Icon name={busy ? 'progress_activity' : 'add_photo_alternate'} size={24} className={busy ? 'animate-spin' : ''} /><span className="text-label-md">{busy ? 'Envoi…' : 'Ajouter une photo'}</span></button>
          )}
        </section>
        <section className={card}>
          <div className="mb-1.5 flex justify-between text-label-md text-on-surface">Articles liés <span className="text-label-sm text-on-surface-variant">{ids.length}/4</span></div>
          <label className="flex h-11 items-center gap-2 rounded-xl bg-surface-container-low px-3"><Icon name="search" size={18} className="text-outline" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un article…" className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" /></label>
          <div className="mt-2 flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
            {rows.map(l => {
              const on = ids.includes(l.id)
              return (
                <label key={l.id} className={`flex cursor-pointer items-center gap-2 rounded-xl p-2 ${on ? 'bg-primary-fixed/40' : 'bg-surface-container-low'}`}>
                  <input type="checkbox" checked={on} disabled={!on && ids.length >= 4} onChange={() => setIds(s => (on ? s.filter(x => x !== l.id) : [...s, l.id]))} className="h-5 w-5 shrink-0 accent-primary" />
                  <Thumb url={l.coverImageUrl} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-label-md text-on-surface">{l.title}</span><span className="text-body-sm text-on-surface-variant"><Price amount={l.price} /></span></span>
                </label>
              )
            })}
          </div>
        </section>
      </div>
      {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
      <div className="mt-4 flex gap-3 lg:justify-end">
        <button onClick={onCancel} className="flex h-12 shrink-0 cursor-pointer items-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">Annuler</button>
        <button disabled={!ok || loading || busy} onClick={() => void send({ variables: { input: { title: title.trim(), body: body.trim(), imageUrl: imageUrl || undefined, listingIds: ids } } }).then(onDone).catch((e: Error) => setError(e.message))} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45 lg:flex-none"><Icon name="send" size={19} /> {loading ? 'Envoi…' : `Envoyer à ${formatNumber(quota.followers)} abonné${quota.followers > 1 ? 's' : ''}`}</button>
      </div>
    </>
  )
}
