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
  WITHDRAW_CAMPAIGN_ENTRY_MUTATION,
  type BundleTier, type MyShopData, type OpenCampaign, type PromoItem, type PromoState, type ShopListing, type ShopPromos,
} from '../../graphql/shops'
import { uploadImages } from '../../lib/upload'
import { formatNumber } from '../../lib/format'
import type { AuthUser } from '../../graphql/auth'

type Props = { onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void }
type Tab = 'sales' | 'campaigns' | 'bundles' | 'posts'

const fdate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const dayInput = (d: Date) => d.toISOString().slice(0, 10)
// Local day → start / end of day in UTC (Côte d'Ivoire is UTC).
const startOf = (d: string) => new Date(`${d}T00:00:00.000Z`).toISOString()
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
function ItemPicker({ listings, aisles, picks, onChange, minPercent }: {
  listings: ShopListing[], aisles: { id: string, name: string }[], picks: Pick[], onChange: (p: Pick[]) => void, minPercent?: number | null
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
  }
  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]">
        <label className="flex h-11 items-center gap-2 rounded-xl bg-surface-container-low px-3"><Icon name="search" size={18} className="text-outline" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un article…" className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" /></label>
        <Select value={aisle} onChange={e => setAisle(e.target.value)} className={`${inputCls} cursor-pointer`}>
          <option value="">Tous les rayons</option>
          {aisles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </div>
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
                  {p && <span className="font-bold text-primary"><Price amount={promoOf(l.price!, p.percent)} /></span>}
                </div>
              </div>
              {p && (
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
  const [editor, setEditor] = useState<null | 'sale' | 'bundle' | 'post' | { campaign: OpenCampaign }>(null)
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
  if (editor && typeof editor === 'object') return layout(<CampaignJoin campaign={editor.campaign} listings={listings} aisles={shop!.aisles} onDone={done} onCancel={() => setEditor(null)} />)

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
      {cta && <button onClick={cta[1]} className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-lg text-white"><Icon name="add" size={19} /> {cta[0]}</button>}
    </div>

    <div className="relative mt-5">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-container p-1 pr-8 [scrollbar-width:none] md:pr-1">
        {tabs.map(([k, icon, label, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none px-3.5 text-label-md md:flex-1 md:justify-center ${tab === k ? 'bg-surface-lowest text-primary shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>
            <Icon name={icon} size={17} /> {label}{n > 0 && <span className={`rounded-full px-1.5 text-label-sm ${tab === k ? 'bg-primary text-white' : 'bg-surface-lowest text-on-surface-variant'}`}>{n}</span>}
          </button>
        ))}
      </div>
    </div>

    <div className="mt-4">
      {tab === 'sales' && <SalesTab sales={d.myShopSales} onCreate={() => setEditor('sale')} onChanged={() => void refetch()} />}
      {tab === 'campaigns' && <CampaignsTab campaigns={d.openShopCampaigns} onJoin={c => setEditor({ campaign: c })} onChanged={() => void refetch()} />}
      {tab === 'bundles' && <BundlesTab bundles={d.myShopBundles} onCreate={() => setEditor('bundle')} onChanged={() => void refetch()} />}
      {tab === 'posts' && <PostsTab posts={d.myShopPosts} quota={d.myShopPostQuota} onCreate={() => setEditor('post')} />}
    </div>
  </>)
}

// ─── Sales ────────────────────────────────────────────────────────────────

function SalesTab({ sales, onCreate, onChanged }: { sales: ShopPromos['myShopSales'], onCreate: () => void, onChanged: () => void }) {
  const [stopping, setStopping] = useState<string | null>(null)
  const [end, { loading }] = useMutation(END_SHOP_SALE_MUTATION)
  if (!sales.length) return <Empty icon="sell" title="Aucunes soldes pour l’instant" text="Mettez une sélection d’articles en promotion : prix barré, badge « -20 % » sur vos cartes et section « En promotion » sur votre page." action={<button onClick={onCreate} className="mt-2 flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="add" size={18} /> Créer des soldes</button>} />
  return (
    <div className="flex flex-col gap-3">
      {sales.map(s => {
        const pcts = s.items.map(i => i.discountPercent ?? (i.price && i.promoPrice != null ? Math.round((1 - i.promoPrice / i.price) * 100) : 0))
        const range = pcts.length ? (Math.min(...pcts) === Math.max(...pcts) ? `-${pcts[0]} %` : `-${Math.min(...pcts)} à -${Math.max(...pcts)} %`) : ''
        return (
          <section key={s.id} className={card}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h3 className="m-0 text-headline-sm text-on-surface">{s.name}</h3><StatePill state={s.state} /></div>
                <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">Du {fdate(s.startsAt)} au {fdate(s.endsAt)} · {s.items.length} article{s.items.length > 1 ? 's' : ''} · <b className="text-primary">{range}</b></p>
                {s.notifyFollowers && <p className="m-0 mt-0.5 flex items-center gap-1 text-body-sm text-tertiary"><Icon name="notifications_active" size={15} /> {s.followersNotifiedAt ? `Abonnés prévenus le ${fdate(s.followersNotifiedAt)}` : 'Abonnés prévenus au lancement'}</p>}
              </div>
              {s.state !== 'ENDED' && <button onClick={() => setStopping(s.id)} className="flex h-10 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="stop_circle" size={17} /> Arrêter</button>}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {s.items.map(i => (
                <div key={i.entryId} className="w-28 shrink-0">
                  <div className="aspect-square overflow-hidden rounded-lg bg-surface-container">{i.coverUrl && <img src={i.coverUrl} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="mt-1 truncate text-label-sm text-on-surface">{i.title}</div>
                  <div className="text-label-sm font-bold text-primary"><Price amount={i.promoPrice} /></div>
                  <div className="text-[11px] text-outline line-through"><Price amount={i.price} /></div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
      <ConfirmSheet open={!!stopping} title="Arrêter ces soldes ?" confirmLabel={loading ? 'Arrêt…' : 'Arrêter maintenant'} onConfirm={() => stopping && void end({ variables: { id: stopping } }).then(() => { setStopping(null); onChanged() })} onClose={() => setStopping(null)} loading={loading}>
        <p className="m-0 text-body-sm text-on-surface-variant">Les articles reviennent immédiatement à leur prix habituel.</p>
      </ConfirmSheet>
    </div>
  )
}

function SaleEditor({ listings, aisles, onDone, onCancel, followers }: { listings: ShopListing[], aisles: { id: string, name: string }[], onDone: () => void, onCancel: () => void, followers: number }) {
  const today = dayInput(new Date())
  const [name, setName] = useState('')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(dayInput(new Date(Date.now() + 7 * 86_400_000)))
  const [picks, setPicks] = useState<Pick[]>([])
  const [notify, setNotify] = useState(true)
  const [error, setError] = useState('')
  const [save, { loading }] = useMutation(CREATE_SHOP_SALE_MUTATION)
  const first = listings.find(l => l.id === picks[0]?.listingId)
  const ok = name.trim().length >= 2 && picks.length > 0 && to >= from
  const submit = () => {
    setError('')
    void save({ variables: { input: { name: name.trim(), startsAt: from === today ? new Date().toISOString() : startOf(from), endsAt: endOf(to), notifyFollowers: notify, items: picks.map(p => ({ listingId: p.listingId, discountPercent: p.percent })) } } })
      .then(onDone).catch((e: Error) => setError(e.message))
  }
  return (
    <>
      <h1 className="m-0 text-headline-lg text-on-surface">Créer des soldes</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">Une remise sur une sélection d’articles, pendant la période choisie (60 jours au maximum).</p>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className={card}>
          <label className="block"><span className="mb-1.5 block text-label-md text-on-surface">Nom des soldes</span><input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Ex : Soldes de rentrée" className={inputCls} /></label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1.5 block text-label-md text-on-surface">Début</span><input type="date" min={today} value={from} onChange={e => setFrom(e.target.value)} className={inputCls} /></label>
            <label className="block"><span className="mb-1.5 block text-label-md text-on-surface">Fin</span><input type="date" min={from} value={to} onChange={e => setTo(e.target.value)} className={inputCls} /></label>
          </div>
          <div className="mb-2 mt-4 text-label-lg text-on-surface">Articles en promotion</div>
          <ItemPicker listings={listings} aisles={aisles} picks={picks} onChange={setPicks} />
        </section>
        <aside className="flex flex-col gap-4">
          <section className={card}>
            <div className="mb-2 text-label-sm uppercase text-on-surface-variant">Aperçu sur la carte</div>
            {first ? (
              <div className="overflow-hidden rounded-xl bg-surface-container-low">
                <div className="relative aspect-[4/3] bg-surface-container">{first.coverImageUrl && <img src={first.coverImageUrl} alt="" className="h-full w-full object-cover" />}<span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-label-sm font-bold text-white">-{picks[0].percent}%</span></div>
                <div className="p-3"><div className="truncate text-label-lg text-on-surface">{first.title}</div><div className="flex items-baseline gap-2"><span className="text-headline-sm font-extrabold text-primary"><Price amount={promoOf(first.price!, picks[0].percent)} /></span><span className="text-body-sm text-outline line-through"><Price amount={first.price} /></span></div></div>
              </div>
            ) : <p className="m-0 text-body-sm text-on-surface-variant">Sélectionnez un article pour voir l’aperçu.</p>}
          </section>
          <label className={`${card} flex cursor-pointer items-start gap-3`}>
            <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
            <span><span className="block text-label-lg text-on-surface">Prévenir mes abonnés au lancement</span><span className="text-body-sm text-on-surface-variant">Une notification à vos {formatNumber(followers)} abonné{followers > 1 ? 's' : ''} le jour du début.</span></span>
          </label>
        </aside>
      </div>
      {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
      <div className="mt-4 flex gap-3 lg:justify-end">
        <button onClick={onCancel} className="flex h-12 shrink-0 cursor-pointer items-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">Annuler</button>
        <button disabled={!ok || loading} onClick={submit} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45 lg:flex-none"><Icon name="sell" size={19} /> {loading ? 'Création…' : 'Lancer les soldes'}</button>
      </div>
    </>
  )
}

// ─── Dilchap campaigns ────────────────────────────────────────────────────

function CampaignsTab({ campaigns, onJoin, onChanged }: { campaigns: OpenCampaign[], onJoin: (c: OpenCampaign) => void, onChanged: () => void }) {
  const [withdraw] = useMutation(WITHDRAW_CAMPAIGN_ENTRY_MUTATION)
  if (!campaigns.length) return <Empty icon="campaign" title="Aucune campagne ouverte" text="Quand l’équipe Dilchap ouvre une campagne aux boutiques (Black Friday, fêtes…), vous pourrez y inscrire vos articles ici." />
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {campaigns.map(c => (
        <section key={c.id} className={`${card} min-w-0`}>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: c.themeColor || 'var(--primary)' }}><Icon name="campaign" size={22} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="m-0 text-headline-sm text-on-surface">{c.name}</h3><StatePill state={c.state} /></div>
              <p className="m-0 text-body-sm text-on-surface-variant">Du {fdate(c.startsAt)} au {fdate(c.endsAt)}{c.minDiscountPercent ? ` · remise minimale ${c.minDiscountPercent} %` : ''}</p>
            </div>
          </div>
          {c.description && <p className="m-0 mt-2 text-body-sm text-on-surface">{c.description}</p>}
          {c.myItems.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="text-label-sm uppercase text-on-surface-variant">Mes articles inscrits</div>
              {c.myItems.map(i => (
                <div key={i.entryId} className="flex items-center gap-2 rounded-xl bg-surface-container-low p-2">
                  <Thumb url={i.coverUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-label-md text-on-surface">{i.title}</div>
                    <div className="text-body-sm"><span className="font-bold text-primary"><Price amount={i.promoPrice} /></span> <span className="text-outline line-through"><Price amount={i.price} /></span></div>
                    {i.status === 'REJECTED' && i.rejectReason && <div className="text-body-sm text-primary">Motif : {i.rejectReason}</div>}
                  </div>
                  <EntryPill status={i.status} />
                  {i.status === 'PENDING' && <button onClick={() => void withdraw({ variables: { entryId: i.entryId } }).then(onChanged)} aria-label="Retirer" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-on-surface-variant"><Icon name="close" size={16} /></button>}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => onJoin(c)} className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary text-label-md text-white"><Icon name={c.myItems.length ? 'add' : 'how_to_reg'} size={18} /> {c.myItems.length ? 'Inscrire d’autres articles' : 'Participer'}</button>
        </section>
      ))}
    </div>
  )
}

function CampaignJoin({ campaign, listings, aisles, onDone, onCancel }: { campaign: OpenCampaign, listings: ShopListing[], aisles: { id: string, name: string }[], onDone: () => void, onCancel: () => void }) {
  const already = new Set(campaign.myItems.filter(i => i.status !== 'REJECTED').map(i => i.listingId))
  const [picks, setPicks] = useState<Pick[]>([])
  const [error, setError] = useState('')
  const [join, { loading }] = useMutation(JOIN_CAMPAIGN_MUTATION)
  const min = campaign.minDiscountPercent ?? 0
  const ok = picks.length > 0 && picks.every(p => p.percent >= min)
  return (
    <>
      <h1 className="m-0 text-headline-lg text-on-surface">Participer à « {campaign.name} »</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">Du {fdate(campaign.startsAt)} au {fdate(campaign.endsAt)}. Vos articles sont vérifiés par l’équipe Dilchap avant la campagne.</p>
      <section className={`${card} mt-4`}>
        <ItemPicker listings={listings.filter(l => !already.has(l.id))} aisles={aisles} picks={picks} onChange={setPicks} minPercent={campaign.minDiscountPercent} />
      </section>
      {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
      <div className="mt-4 flex gap-3 lg:justify-end">
        <button onClick={onCancel} className="flex h-12 shrink-0 cursor-pointer items-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">Annuler</button>
        <button disabled={!ok || loading} onClick={() => void join({ variables: { input: { campaignId: campaign.id, items: picks.map(p => ({ listingId: p.listingId, discountPercent: p.percent })) } } }).then(onDone).catch((e: Error) => setError(e.message))} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45 lg:flex-none"><Icon name="send" size={19} /> {loading ? 'Envoi…' : `Inscrire ${picks.length} article${picks.length > 1 ? 's' : ''}`}</button>
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
