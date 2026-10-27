import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import Select from '../../components/Select'
import ConfirmSheet from '../../components/ConfirmSheet'
import WalletPaySheet from '../../components/WalletPaySheet'
import OfferCredits from '../../components/OfferCredits'
import { AccountLayout } from './AccountLayout'
import {
  CREATE_SHOP_POST_MUTATION, CREATE_SHOP_SALE_MUTATION, END_SHOP_SALE_MUTATION, JOIN_CAMPAIGN_MUTATION, MY_SHOP_LISTINGS_QUERY,
  MY_SHOP_PROMOS_QUERY, MY_SHOP_QUERY, PROMO_STATE_LABEL, SAVE_SHOP_BUNDLE_MUTATION, STOP_SHOP_BUNDLE_MUTATION, DELETE_SHOP_BUNDLE_MUTATION,
  UPDATE_SHOP_SALE_MUTATION, WITHDRAW_CAMPAIGN_ENTRY_MUTATION,
  type BundleTier, type MyShopData, type OpenCampaign, type PromoItem, type PromoState, type ShopListing, type ShopPromos, type ShopSale, type ShopBundle, type ShopPost,
} from '../../graphql/shops'
import { uploadImages } from '../../lib/upload'
import { formatNumber } from '../../lib/format'
import { feeText } from '../../lib/campaignFees'
import { ACTION_BUTTON, EARLY_ACCESS_BUTTON } from '../../lib/campaignActions'
import type { AuthUser } from '../../graphql/auth'
import { Claim } from '../../lib/site'
import RichTextEditor from '../../components/RichTextEditor'
import { richHtml } from '../../lib/richText'
import { plainText } from '../../lib/format'
import { usePriceVars } from '../../lib/countries'
import { cfaUnit, fmtDate, useT } from '../../i18n'
import common from '../../i18n/ns/common'
import shopPromos from '../../i18n/ns/shopPromos'

type Props = { onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void; onOpenShop: (slug: string) => void }
type Tab = 'sales' | 'campaigns' | 'bundles' | 'posts'

const fdate = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'short', year: 'numeric' })
const dayInput = (d: Date) => d.toISOString().slice(0, 10)
const promoOf = (price: number, pct: number) => Math.round((price * (100 - pct)) / 100)
const card = 'rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5'
const inputCls = 'h-11 w-full min-w-0 rounded-xl border-none bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary'

function StatePill({ state }: { state: PromoState }) {
  useT(shopPromos) // re-renders on a language change (the labels are getters)
  const cls = state === 'LIVE' ? 'bg-tertiary-soft text-tertiary' : state === 'SCHEDULED' ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${cls}`}>{state === 'LIVE' && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{PROMO_STATE_LABEL[state]}</span>
}

function EntryPill({ status }: { status: PromoItem['status'] }) {
  const t = useT(shopPromos)
  const [cls, label] = status === 'APPROVED' ? ['bg-tertiary-soft text-tertiary', t('entry.APPROVED')] : status === 'REJECTED' ? ['bg-primary-fixed text-primary', t('entry.REJECTED')] : status === 'AWAITING_PAYMENT' ? ['bg-amber-100 text-amber-800', t('entry.AWAITING_PAYMENT')] : status === 'WAITLISTED' ? ['bg-amber-100 text-amber-800', t('entry.WAITLISTED')] : ['bg-surface-container text-on-surface-variant', t('entry.PENDING')]
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
  const t = useT(shopPromos)
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
      <label className="flex h-11 items-center gap-2 rounded-xl bg-surface-container-low px-3"><Icon name="search" size={18} className="text-outline" /><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('picker.search')} className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" /></label>
      {aisles.length > 0 && (
        <div className="relative mt-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 pr-6 [scrollbar-width:none]">
            {[{ id: '', name: t('picker.allAisles') }, ...aisles].map(a => (
              <button key={a.id || 'all'} type="button" onClick={() => setAisle(a.id)} className={`h-8 shrink-0 cursor-pointer whitespace-nowrap rounded-full border-none px-3 text-label-md ${aisle === a.id ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface'}`}>{a.name}</button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
        <span className="text-label-md text-on-surface">{t('picker.discount')}</span>
        <span className="flex items-center gap-1"><input type="number" min={minPercent ?? 1} max={90} value={bulk} onChange={e => setBulk(e.target.value)} className="h-9 w-16 rounded-lg border-none bg-surface-lowest text-center text-label-lg text-on-surface outline-none" aria-label={t('picker.discountAria')} /> <span className="text-label-md text-on-surface">%</span></span>
        <button type="button" onClick={applyAll} disabled={!rows.length} className="ml-auto flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-primary px-3 text-label-md text-white disabled:opacity-40"><Icon name="done_all" size={16} /> {t('picker.applyAll', { n: rows.length })}</button>
      </div>
      {minPercent ? <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('picker.minPercent', { pct: minPercent })}</p> : null}
      <div className="mt-2 flex max-h-[420px] flex-col gap-1.5 overflow-y-auto pr-1">
        {rows.length === 0 && <p className="m-0 p-3 text-center text-body-sm text-on-surface-variant">{t('picker.empty')}</p>}
        {rows.map(l => {
          const p = on(l.id)
          const bad = p && minPercent && p.percent < minPercent
          return (
            <div key={l.id} className={`flex items-center gap-3 rounded-xl p-2 ${p ? 'bg-primary-fixed/40' : 'bg-surface-container-low'}`}>
              <input type="checkbox" checked={!!p} onChange={() => toggle(l)} className="h-5 w-5 shrink-0 cursor-pointer accent-primary" aria-label={t('picker.includeAria', { title: l.title })} />
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
                  <input type="number" min={1} value={priceMode.prices[l.id] ?? String(promoOf(l.price!, p.percent))} onChange={e => priceMode.onPrice(l.id, e.target.value)} className={`h-9 w-24 rounded-lg border-none px-2 text-right text-label-md outline-none ${Number(priceMode.prices[l.id] ?? promoOf(l.price!, p.percent)) >= l.price! ? 'bg-primary-fixed text-primary' : 'bg-surface-lowest text-on-surface'}`} aria-label={t('picker.promoPriceAria')} />
                  <span className="text-label-md text-on-surface">{cfaUnit()}</span>
                </span>
              )}
              {p && !priceMode && (
                <span className="flex shrink-0 items-center gap-1">
                  <span className="text-label-md text-on-surface">-</span>
                  <input type="number" min={1} max={90} value={p.percent} onChange={e => setPct(l.id, Math.min(90, Math.max(1, Number(e.target.value) || 1)))} className={`h-9 w-14 rounded-lg border-none text-center text-label-md outline-none ${bad ? 'bg-primary-fixed text-primary' : 'bg-surface-lowest text-on-surface'}`} aria-label={t('picker.percentAria')} />
                  <span className="text-label-md text-on-surface">%</span>
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p className="m-0 mt-2 text-body-sm text-on-surface-variant">{t('picker.selected', { count: picks.length })}</p>
    </div>
  )
}

export default function ShopPromos({ onNavigate, currentUser, onLogout, onOpenShop }: Props) {
  const t = useT(shopPromos)
  const [tab, setTab] = useState<Tab>('sales')
  const [editor, setEditor] = useState<null | 'sale' | 'bundle' | 'post' | { bundle: ShopBundle, reactivate?: boolean } | { post: ShopPost } | { campaign: OpenCampaign, retry?: PromoItem } | { sale: ShopSale, relaunch?: boolean }>(null)
  const { data: shopData } = useQuery<MyShopData>(MY_SHOP_QUERY, { variables: usePriceVars() })
  const { data, loading, refetch } = useQuery<ShopPromos>(MY_SHOP_PROMOS_QUERY, { fetchPolicy: 'cache-and-network' })
  const { data: ld } = useQuery<{ myListings: { items: ShopListing[] } }>(MY_SHOP_LISTINGS_QUERY)
  const shop = shopData?.myShop.shop
  const official = !!shop && shop.status === 'APPROVED' && !!shop.paidUntil && new Date(shop.paidUntil) > new Date()
  const listings = ld?.myListings.items ?? []

  const layout = (children: React.ReactNode) => (
    <AccountLayout active="seller-shop-promos" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title={t('title')} onBack={editor ? () => setEditor(null) : () => onNavigate('seller-shop')}>
      <div className="mx-auto max-w-[1100px] pb-24 lg:pb-8">{children}</div>
    </AccountLayout>
  )
  if (!shopData || (loading && !data)) return layout(<p className="text-body-md text-on-surface-variant">{common.t('loading')}</p>)
  if (!official) return layout(
    <Empty icon="storefront" title={t('notOfficial.title')} text={t('notOfficial.text')} action={<div className="mt-2 flex flex-wrap justify-center gap-2"><button onClick={() => onNavigate('seller-shop')} className="flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="storefront" size={18} /> {t('notOfficial.myShop')}</button><button onClick={() => onNavigate('seller-campaigns')} className="flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-surface-container px-4 text-label-md text-on-surface"><Icon name="campaign" size={18} /> {t('tab.campaigns')}</button></div>} />,
  )
  const d = data!
  const done = () => { setEditor(null); void refetch() }

  if (editor === 'sale') return layout(<SaleEditor listings={listings} aisles={shop!.aisles} onDone={done} onCancel={() => setEditor(null)} followers={d.myShopPostQuota.followers} />)
  if (editor === 'bundle') return layout(<BundleEditor listings={listings} aisles={shop!.aisles} onDone={done} onCancel={() => setEditor(null)} />)
  if (editor === 'post') return layout(<PostEditor listings={listings} quota={d.myShopPostQuota} shopName={shop!.name} onDone={done} onCancel={() => setEditor(null)} />)
  if (editor && typeof editor === 'object' && 'bundle' in editor) return layout(<BundleEditor key={editor.bundle.id} bundle={editor.bundle} reactivate={editor.reactivate} listings={listings} aisles={shop!.aisles} onDone={done} onCancel={() => setEditor(null)} />)
  if (editor && typeof editor === 'object' && 'post' in editor) return layout(<PostEditor key={editor.post.id} from={editor.post} listings={listings} quota={d.myShopPostQuota} shopName={shop!.name} onDone={done} onCancel={() => setEditor(null)} />)
  if (editor && typeof editor === 'object' && 'sale' in editor) return layout(<SaleEditor key={editor.sale.id} sale={editor.sale} relaunch={editor.relaunch} listings={listings} aisles={shop!.aisles} onDone={done} onCancel={() => setEditor(null)} followers={d.myShopPostQuota.followers} />)
  if (editor && typeof editor === 'object') return layout(<CampaignJoin campaign={editor.campaign} retry={editor.retry} listings={listings} aisles={shop!.aisles} onDone={done} onCancel={() => setEditor(null)} />)

  const tabs: [Tab, string, string, number][] = [
    ['sales', 'sell', t('tab.sales'), d.myShopSales.filter(s => s.state !== 'ENDED').length],
    ['campaigns', 'campaign', t('tab.campaigns'), d.openShopCampaigns.length],
    ['bundles', 'inventory_2', t('tab.bundles'), d.myShopBundles.filter(b => b.state !== 'ENDED').length],
    ['posts', 'forum', t('tab.posts'), d.myShopPosts.length],
  ]
  const create: Record<Tab, [string, () => void] | null> = {
    sales: [t('sales.create'), () => setEditor('sale')],
    campaigns: null,
    bundles: [t('bundles.create'), () => setEditor('bundle')],
    posts: [t('posts.create'), () => setEditor('post')],
  }
  const cta = create[tab]

  return layout(<>
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary"><Icon name="verified" size={14} fill /> {shop!.name}</span>
        <h1 className="m-0 mt-1 text-headline-lg text-on-surface">{t('heading')}</h1>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('intro', { n: formatNumber(d.myShopPostQuota.followers) })}</p>
      </div>
      {cta && <button onClick={cta[1]} className="flex h-12 w-full shrink-0 cursor-pointer md:h-11 md:w-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-lg text-white"><Icon name="add" size={19} /> {cta[0]}</button>}
    </div>

    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-lowest text-primary"><Icon name="info" size={19} /></span>
      <div className="min-w-0"><div className="text-label-lg text-on-surface">{t.rich('direct.title', { claim: c => <Claim>{c}</Claim> })}</div><p className="m-0 text-body-sm text-on-surface-variant">{t.rich('direct.text', { claim: c => <Claim>{c}</Claim> })}</p></div>
    </div>

    <section className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:gap-3">
      {(() => {
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        const monthSales = d.myShopSales.filter(s => new Date(s.endsAt) >= monthStart)
        const live = new Set([...d.myShopSales.filter(s => s.state === 'LIVE').flatMap(s => s.items.map(i => i.listingId)), ...d.openShopCampaigns.filter(c => c.state === 'LIVE').flatMap(c => c.myItems.filter(i => i.status === 'APPROVED').map(i => i.listingId))]).size
        const stats: [string, string, React.ReactNode, string][] = [
          ['shopping_bag', t('kpi.sales'), formatNumber(monthSales.reduce((n, s) => n + s.salesCount, 0)), t('kpi.salesSub')],
          ['sell', t('kpi.discounted'), formatNumber(live), t('kpi.discountedSub', { count: listings.length })],
          ['payments', t('kpi.volume'), <Price amount={monthSales.reduce((n, s) => n + s.salesVolume, 0)} />, t('kpi.volumeSub')],
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
      {tab === 'campaigns' && <CampaignsTab campaigns={d.openShopCampaigns} onJoin={(c, retry) => setEditor({ campaign: c, retry })} onChanged={() => void refetch()} onNavigate={onNavigate} />}
      {tab === 'bundles' && <BundlesTab bundles={d.myShopBundles} listings={listings} onCreate={() => setEditor('bundle')} onEdit={(bundle, reactivate) => setEditor({ bundle, reactivate })} onChanged={() => void refetch()} />}
      {tab === 'posts' && <PostsTab posts={d.myShopPosts} quota={d.myShopPostQuota} onCreate={() => setEditor('post')} onDuplicate={post => setEditor({ post })} onOpenShop={() => onOpenShop(shop!.slug)} />}
    </div>
  </>)
}

// ─── Sales ────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000
const countdown = (s: ShopSale) => {
  const now = Date.now()
  const t = shopPromos.t
  if (s.state === 'SCHEDULED') { const d = Math.ceil((new Date(s.startsAt).getTime() - now) / DAY_MS); return d <= 1 ? t('countdown.startsTomorrow') : t('countdown.startsIn', { n: d }) }
  if (s.state === 'LIVE') { const d = Math.ceil((new Date(s.endsAt).getTime() - now) / DAY_MS); return d <= 1 ? t('countdown.endsToday') : t('countdown.endsIn', { n: d }) }
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
  const t = useT(shopPromos)
  if (!sales.length) return <Empty icon="sell" title={t('sales.emptyTitle')} text={t('sales.emptyText')} action={<button onClick={onCreate} className="mt-2 flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="add" size={18} /> {t('sales.create')}</button>} />
  const count = (s: 'ALL' | PromoState) => (s === 'ALL' ? sales.length : sales.filter(x => x.state === s).length)
  const rows = sales.filter(s => (filter === 'ALL' || s.state === filter) && (!q || s.name.toLowerCase().includes(q.toLowerCase()) || s.items.some(i => i.title.toLowerCase().includes(q.toLowerCase()))))
  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2 rounded-2xl bg-surface-lowest p-3 shadow-sm md:flex-row md:items-center">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low px-3"><Icon name="search" size={18} className="shrink-0 text-outline" /><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('sales.search')} className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" /></label>
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {(['ALL', 'LIVE', 'SCHEDULED', 'ENDED'] as const).map(k => (
            <button key={k} onClick={() => setFilter(k)} className={`h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-xl border-none px-3 text-label-md ${filter === k ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface'}`}>{t(`sales.filter.${k}` as const, { n: count(k) })}</button>
          ))}
        </div>
      </section>
      {rows.length === 0 && <p className="m-0 rounded-2xl bg-surface-lowest p-6 text-center text-body-md text-on-surface-variant shadow-sm">{t('sales.noMatch')}</p>}
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
                <div className="flex flex-wrap items-center gap-1.5"><StatePill state={s.state} /><span className="whitespace-nowrap rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm font-bold text-primary">{uniform ? t('pct', { pct: max }) : t('upToPct', { pct: max })}</span></div>
                {cd && <p className="m-0 mt-1 flex items-center gap-1 text-body-sm text-on-surface-variant"><Icon name="timer" size={15} className="text-primary" /> {cd}</p>}
                <h3 className="m-0 mt-1 text-headline-sm text-on-surface">{s.name}</h3>
                <p className="m-0 mt-1 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="calendar_month" size={15} /> {t('fromTo', { from: fdate(s.startsAt), to: fdate(s.endsAt) })}</p>
                <p className="m-0 mt-0.5 flex min-w-0 items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="sell" size={15} className="shrink-0" /> <span className="truncate">{t('sales.itemsDiscounted', { count: s.items.length, titles: `${s.items.slice(0, 3).map(i => i.title).join(', ')}${s.items.length > 3 ? '…' : ''}` })}</span></p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                {s.state === 'SCHEDULED' ? (
                  s.notifyFollowers && <div className="text-body-sm md:text-right"><div className="text-label-sm uppercase text-on-surface-variant">{t('sales.broadcast')}</div><div className="flex items-center gap-1 text-label-md text-on-surface md:justify-end"><Icon name="notifications_active" size={16} className="text-primary" /> {t('sales.notifiedAtLaunch')}</div></div>
                ) : (
                  <div className="text-body-sm md:text-right">
                    <div className="text-label-sm uppercase text-on-surface-variant">{s.state === 'LIVE' ? t('sales.volume') : t('sales.final')}</div>
                    <div className="text-headline-sm font-extrabold text-on-surface"><Price amount={s.salesVolume} /></div>
                    <div className="text-tertiary">{t('sales.closedDirect', { count: s.salesCount })}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 md:flex">
                  {s.state !== 'ENDED' && <button onClick={() => onEdit(s)} className="flex h-10 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="edit" size={16} /> {common.t('edit')}</button>}
                  {s.state === 'LIVE' && <button onClick={() => setStopping(s)} className="flex h-10 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl border-none bg-primary-fixed px-3 text-label-md text-primary"><Icon name="stop_circle" size={16} /> {t('sales.close')}</button>}
                  {s.state === 'SCHEDULED' && <button onClick={() => setStopping(s)} className="flex h-10 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="cancel" size={16} /> {common.t('cancel')}</button>}
                  {s.state === 'ENDED' && <button onClick={() => onRelaunch(s)} className="col-span-2 flex h-10 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl border-none bg-primary-fixed px-3 text-label-md text-primary"><Icon name="replay" size={16} /> {t('sales.relaunch')}</button>}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5">
              <div className="flex shrink-0 -space-x-3">
                {s.items.slice(0, 4).map(i => <span key={i.entryId} className="h-10 w-10 overflow-hidden rounded-full border-2 border-solid border-surface-lowest bg-surface-container">{i.coverUrl && <img src={i.coverUrl} alt="" className="h-full w-full object-cover" />}</span>)}
                {s.items.length > 4 && <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-solid border-surface-lowest bg-surface-container text-label-sm text-on-surface">+{s.items.length - 4}</span>}
              </div>
              <p className="m-0 min-w-0 flex-1 truncate text-body-sm text-on-surface-variant">{s.state === 'LIVE' ? t('sales.visibleLive') : t('sales.visiblePeriod')}</p>
            </div>
          </section>
        )
      })}
      <ConfirmSheet open={!!stopping} title={stopping?.state === 'SCHEDULED' ? t('sales.cancelTitle') : t('sales.closeTitle')} confirmLabel={loading ? '…' : stopping?.state === 'SCHEDULED' ? t('sales.cancelConfirm') : t('sales.closeConfirm')} onConfirm={() => stopping && void end({ variables: { id: stopping.id } }).then(() => { setStopping(null); onChanged() })} onClose={() => setStopping(null)} loading={loading}>
        <p className="m-0 text-body-sm text-on-surface-variant">{stopping?.state === 'SCHEDULED' ? t('sales.cancelText') : t('sales.closeText')}</p>
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
  const t = useT(shopPromos)
  const tc = useT(common)
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
      <button onClick={onCancel} className="mb-2 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Icon name="arrow_back" size={17} /> {t('backToPromos')}</button>
      <h1 className="m-0 text-headline-lg text-on-surface">{editing ? t('saleEditor.editTitle') : relaunch ? t('saleEditor.relaunchTitle') : t('saleEditor.createTitle')}</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('saleEditor.intro')}</p>
      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={card}>
            {step(1, t('saleEditor.step1'), t('saleEditor.step1Sub'))}
            <label className="block"><span className="mb-1.5 block text-label-md text-on-surface">{t('saleEditor.name')} <span className="text-primary">*</span></span><input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder={t('saleEditor.namePlaceholder')} className={inputCls} /></label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><span className="mb-1.5 block text-label-md text-on-surface">{t('start')} <span className="text-primary">*</span></span><div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2"><input type="date" min={editing ? undefined : today} value={from} onChange={e => setFrom(e.target.value)} className={inputCls} aria-label={t('startDate')} /><input type="time" value={fromTime} onChange={e => setFromTime(e.target.value)} className={inputCls} aria-label={t('startTime')} /></div></div>
              <div><span className="mb-1.5 block text-label-md text-on-surface">{t('end')} <span className="text-primary">*</span></span><div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2"><input type="date" min={from} value={to} onChange={e => setTo(e.target.value)} className={inputCls} aria-label={t('endDate')} /><input type="time" value={toTime} onChange={e => setToTime(e.target.value)} className={inputCls} aria-label={t('endTime')} /></div></div>
            </div>
          </section>
          <section className={card}>
            {step(2, t('saleEditor.step2'), t('saleEditor.step2Sub'))}
            <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([['PERCENT', t('saleEditor.modePercent'), t('saleEditor.modePercentSub')], ['PRICE', t('saleEditor.modePrice'), t('saleEditor.modePriceSub')]] as const).map(([k, title, d]) => (
                <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={`flex cursor-pointer items-start gap-2 rounded-xl border-2 border-solid p-3 text-left ${mode === k ? 'border-primary bg-primary-fixed/30' : 'border-transparent bg-surface-container-low'}`}>
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-solid ${mode === k ? 'border-primary' : 'border-outline-variant'}`}>{mode === k && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                  <span className="min-w-0"><span className="block text-label-md text-on-surface">{title}</span><span className="block text-body-sm text-on-surface-variant">{d}</span></span>
                </button>
              ))}
            </div>
          </section>
          <section className={card}>
            {step(3, t('saleEditor.step3'), t('saleEditor.step3Sub'))}
            <ItemPicker listings={listings} aisles={aisles} picks={picks} onChange={setPicks} priceMode={mode === 'PRICE' ? { prices, onPrice: (id, v) => setPrices(p => ({ ...p, [id]: v })) } : undefined} />
          </section>
          <section className={card}>
            {step(4, t('saleEditor.step4'), t('saleEditor.step4Sub'))}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-container-low p-3">
              <span className="min-w-0 flex-1"><span className="block text-label-lg text-on-surface">{t('saleEditor.notify')}</span><span className="text-body-sm text-on-surface-variant">{t('saleEditor.notifyText', { count: followers, date: fmtDate(startIso, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) })}</span></span>
              <input type="checkbox" role="switch" checked={notify} onChange={e => setNotify(e.target.checked)} className="peer sr-only" />
              <span className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-outline-variant transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5" />
            </label>
          </section>
        </div>
        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4">
          <section className={card}>
            <div className="mb-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-label-lg text-on-surface"><Icon name="visibility" size={18} className="text-primary" /> {t('preview.title')}</span></div>
            {first ? (
              <div className="overflow-hidden rounded-xl bg-surface-container-low">
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-container">{first.coverImageUrl && <img src={first.coverImageUrl} alt="" className="h-full w-full object-cover" />}<span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-label-sm font-bold text-white">{t('pct', { pct: Math.max(0, Math.round((1 - promo(picks[0]) / (first.price || 1)) * 100)) })}</span></div>
                <div className="p-3">
                  <div className="truncate text-label-lg text-on-surface">{first.title}</div>
                  <div className="flex flex-wrap items-baseline gap-2"><span className="text-headline-sm font-extrabold text-primary"><Price amount={promo(picks[0])} /></span><span className="text-body-sm text-outline line-through"><Price amount={first.price} /></span></div>
                  <div className="text-body-sm text-tertiary">{t.rich('preview.save', { price: <Price amount={(first.price ?? 0) - promo(picks[0])} /> })}</div>
                </div>
              </div>
            ) : <p className="m-0 text-body-sm text-on-surface-variant">{t('preview.empty')}</p>}
          </section>
          <p className="m-0 flex items-start gap-2 rounded-2xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="lightbulb" size={18} className="mt-0.5 shrink-0 text-tertiary" /> {t('saleEditor.tip')}</p>
        </aside>
      </div>
      {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
      <div className="mt-4 flex gap-3 lg:justify-end">
        <button onClick={onCancel} className="flex h-12 shrink-0 cursor-pointer items-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">{tc('cancel')}</button>
        <button disabled={!ok || loading} onClick={submit} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45 lg:flex-none"><Icon name="bolt" size={19} /> <span className="truncate">{loading ? tc('saving') : editing ? t('saveChanges') : t('saleEditor.submit')}</span></button>
      </div>
    </>
  )
}

// ─── Dilchap campaigns ────────────────────────────────────────────────────

// "Gratuite", "20 crédits de participation + 5 crédits par article accepté"…
// (shared with the public campaign page).
export { feeText }

function DueBox({ c, onPay }: { c: OpenCampaign, onPay: () => void }) {
  const t = useT(shopPromos)
  if (c.amountDue <= 0) return null
  const n = c.myItems.filter(i => i.status === 'AWAITING_PAYMENT').length
  return (
    <div className="mb-2 flex flex-col gap-2 rounded-xl bg-amber-50 p-3 sm:flex-row sm:items-center dark:bg-amber-500/10">
      <div className="min-w-0 flex-1 text-body-sm"><div className="text-label-md text-on-surface">{t.rich('due.title', { price: <OfferCredits op="CAMPAIGN" n={c.amountDue} /> })}</div><div className="text-on-surface-variant">{!c.entryFeePaid && c.entryFee > 0 ? t('due.textWithEntry', { count: n }) : t('due.text', { count: n })}</div></div>
      <button onClick={onPay} className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="toll" size={18} /> {t.rich('due.pay', { price: <OfferCredits op="CAMPAIGN" n={c.amountDue} tag={false} /> })}</button>
    </div>
  )
}

// Every condition of a campaign, as set by the Dilchap team (folded after
// the first few), and the team's own terms.
export function CampaignConditions({ c }: { c: OpenCampaign }) {
  const [all, setAll] = useState(false)
  const t = useT(shopPromos)
  const lines = c.sellerConditions
  const shown = all ? lines : lines.slice(0, 4)
  return (
    <div className="mt-3 rounded-xl bg-surface-container-low p-3 text-body-sm">
      <div className="flex items-center gap-2 text-label-md text-on-surface"><Icon name="checklist" size={18} className="shrink-0 text-primary" /> {t('conditions.title')}</div>
      <ul className="m-0 mt-1.5 list-none space-y-1 p-0 text-on-surface-variant">
        {shown.map(l => <li key={l} className="flex items-start gap-1.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" /> <span className="min-w-0">{l}</span></li>)}
      </ul>
      {lines.length > 4 && <button type="button" onClick={() => setAll(a => !a)} className="mt-1 cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">{all ? common.t('seeLess') : t('conditions.seeAll', { n: lines.length })}</button>}
      {c.sellerTerms && (all || lines.length <= 4) && <div className="rich-text mt-2 text-on-surface" dangerouslySetInnerHTML={{ __html: richHtml(c.sellerTerms) }} />}
    </div>
  )
}

// « Vous pouvez vous inscrire », or exactly what is missing and the button
// that gets it (the server decides; this only shows its answer).
export function Eligibility({ c, onNavigate }: { c: OpenCampaign, onNavigate: (p: any) => void }) {
  const t = useT(shopPromos)
  if (!c.eligible)
    return (
      <div className="mb-2 rounded-xl bg-primary-fixed/50 p-3 text-body-sm">
        <p className="m-0 flex items-start gap-2 text-on-surface"><Icon name="lock" size={18} className="mt-0.5 shrink-0 text-primary" />
          <span className="min-w-0">{c.ineligibleMessage && <span className="block">{c.ineligibleMessage}</span>}{t.rich('eligibility.missing', { list: c.missing.join(t('eligibility.missingSep')), b: ch => <b className="font-semibold">{ch}</b> })}</span>
        </p>
        {c.actions.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {c.actions.map(a => (
              <button key={a} onClick={() => onNavigate(ACTION_BUTTON[a].page)} className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-3 text-label-md text-white"><Icon name={ACTION_BUTTON[a].icon} size={18} /> {ACTION_BUTTON[a].label}</button>
            ))}
          </div>
        )}
      </div>
    )
  if (c.blockedReason)
    return (
      <div className="mb-2 rounded-xl bg-tertiary-soft px-3 py-2.5 text-body-sm text-on-surface">
        <p className="m-0 flex items-start gap-2"><Icon name="lock_clock" size={18} className="mt-0.5 shrink-0 text-tertiary" /> <span className="min-w-0">{c.blockedReason}</span></p>
        {c.blockedCode === 'EARLY_ACCESS' && (
          <button onClick={() => onNavigate(EARLY_ACCESS_BUTTON.page)} className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-3 text-label-md text-white sm:w-auto"><Icon name={EARLY_ACCESS_BUTTON.icon} size={18} /> {EARLY_ACCESS_BUTTON.label}</button>
        )}
      </div>
    )
  const left = [
    c.placesLeft != null ? (c.placesLeft > 0 ? t('eligibility.placesLeft', { count: c.placesLeft }) : t('eligibility.full')) : '',
    c.sellerLimitLeft != null ? t('eligibility.sellerLimit', { count: c.sellerLimitLeft }) : '',
  ].filter(Boolean).join(' · ')
  return (
    <p className="m-0 mb-2 flex items-start gap-2 rounded-xl bg-tertiary-soft px-3 py-2 text-body-sm text-on-surface">
      <Icon name="check_circle" size={18} fill className="mt-0.5 shrink-0 text-tertiary" />
      <span className="min-w-0"><b className="font-semibold">{t('eligibility.canJoin')}</b>{left && <span className="block text-on-surface-variant">{left}</span>}</span>
    </p>
  )
}

// « 2 actifs, 1 à régler, 1 en attente de validation, 3 en liste d’attente,
// 1 refusé » — only the non-empty ones (actifs always).
const countOf = (c: OpenCampaign, s: PromoItem['status']) => c.myItems.filter(i => i.status === s).length
export function entryCounts(c: OpenCampaign) {
  const t = shopPromos.t
  const approved = countOf(c, 'APPROVED'), due = countOf(c, 'AWAITING_PAYMENT'), pending = countOf(c, 'PENDING'), waiting = countOf(c, 'WAITLISTED'), rejected = countOf(c, 'REJECTED')
  return [
    t('counts.approved', { count: approved }),
    due ? t('counts.due', { n: due }) : '',
    pending ? t('counts.pending', { n: pending }) : '',
    waiting ? t('counts.waitlisted', { n: waiting }) : '',
    rejected ? t('counts.rejected', { count: rejected }) : '',
  ].filter(Boolean)
}

// Under « Ma participation »: what happens to the items, by validation mode.
function participationLine(c: OpenCampaign) {
  const t = shopPromos.t
  const k = c.myItems.length
  const items = t('participation.items', { count: k })
  const waiting = countOf(c, 'WAITLISTED')
  const list = waiting ? t('participation.waitlist', { count: waiting }) : ''
  return c.validation === 'AUTO'
    ? t('participation.auto', { items, list })
    : t('participation.team', { items, list })
}

export function CampaignsTab({ campaigns, onJoin, onChanged, onNavigate }: { campaigns: OpenCampaign[], onJoin: (c: OpenCampaign, retry?: PromoItem) => void, onChanged: () => void, onNavigate: (p: any) => void }) {
  const [withdraw] = useMutation(WITHDRAW_CAMPAIGN_ENTRY_MUTATION)
  const [openId, setOpenId] = useState<string | null>(() => campaigns.find(c => c.myItems.length)?.id ?? null)
  const [paying, setPaying] = useState<OpenCampaign | null>(null)
  const t = useT(shopPromos)
  if (!campaigns.length) return <Empty icon="campaign" title={t('campaigns.emptyTitle')} text={t('campaigns.emptyText')} />
  const detail = campaigns.find(c => c.id === openId && c.myItems.length)
  const n = (c: OpenCampaign, s: PromoItem['status']) => c.myItems.filter(i => i.status === s).length
  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><span className="h-2 w-2 rounded-full bg-primary" /> {t('campaigns.open', { n: campaigns.length })}</h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {campaigns.map(c => (
          <section key={c.id} className={`${card} flex min-w-0 flex-col`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="whitespace-nowrap rounded-md bg-surface-container px-2 py-0.5 text-label-sm uppercase text-on-surface-variant">{t('campaigns.kind')}</span><span className="flex flex-wrap items-center gap-1.5">{c.earlyAccessUntil && <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary"><Icon name="verified" size={13} fill /> {t('campaigns.earlyAccess')}</span>}<StatePill state={c.state} /></span></div>
            <h3 className="m-0 mt-2 text-headline-sm text-on-surface">{c.name}</h3>
            <p className="m-0 mt-0.5 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="calendar_month" size={15} /> {t('fromTo', { from: fdate(c.startsAt), to: fdate(c.endsAt) })}</p>
            <CampaignConditions c={c} />
            <p className="m-0 mt-2 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm"><Icon name="payments" size={18} className="mt-0.5 shrink-0 text-primary" /> <span className="min-w-0"><span className="block text-label-md text-on-surface">{feeText(c)}</span>{(c.entryFee > 0 || c.listingFee > 0) && <span className="text-on-surface-variant">{t('campaigns.feeNote')}</span>}</span></p>
            {c.description && <div className="rich-text mt-2 text-body-sm text-on-surface" dangerouslySetInnerHTML={{ __html: richHtml(c.description) }} />}
            <div className="mt-auto pt-3">
              <Eligibility c={c} onNavigate={onNavigate} />
              {c.myItems.length > 0 ? (
                <>
                  <DueBox c={c} onPay={() => setPaying(c)} />
                  <p className="m-0 mb-2 flex items-center gap-1.5 rounded-xl bg-primary-fixed/40 px-3 py-2 text-body-sm text-on-surface"><Icon name="info" size={16} className="shrink-0 text-primary" /> {t('campaigns.entered', { count: c.myItems.length, detail: entryCounts(c).join(', ') })}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button onClick={() => setOpenId(c.id)} className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-3 text-label-md text-white"><Icon name="checklist" size={18} /> {t('campaigns.manage')}</button>
                    <button onClick={() => onJoin(c)} disabled={!c.canJoin} className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-surface-container px-3 text-label-md text-on-surface disabled:cursor-default disabled:opacity-50"><Icon name="add" size={18} /> {t('campaigns.addMore')}</button>
                  </div>
                </>
              ) : (
                <>
                  {c.canJoin && <button onClick={() => onJoin(c)} className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary text-label-md text-white"><Icon name="add_circle" size={18} /> {c.placesLeft === 0 && c.waitlist ? t('campaigns.joinWaitlist') : t('campaigns.join')}</button>}
                </>
              )}
            </div>
          </section>
        ))}
      </div>
      {detail && (
        <section className={card}>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0"><h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="checklist" size={20} className="text-primary" /> {t('participation.title', { name: detail.name })}</h2><p className="m-0 text-body-sm text-on-surface-variant">{participationLine(detail)}</p></div>
            <div className="flex flex-wrap gap-1.5">
              <span className="whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary">{t('counts.approved', { count: n(detail, 'APPROVED') })}</span>
              {n(detail, 'AWAITING_PAYMENT') > 0 && <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-label-sm text-amber-800">{t('counts.due', { n: n(detail, 'AWAITING_PAYMENT') })}</span>}
              {(n(detail, 'PENDING') > 0 || detail.validation !== 'AUTO') && <span className="whitespace-nowrap rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">{t('counts.pending', { n: n(detail, 'PENDING') })}</span>}
              {n(detail, 'WAITLISTED') > 0 && <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-label-sm text-amber-800">{t('counts.waitlisted', { n: n(detail, 'WAITLISTED') })}</span>}
              <span className="whitespace-nowrap rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">{t('counts.rejected', { count: n(detail, 'REJECTED') })}</span>
            </div>
          </div>
          <div className="mt-3"><DueBox c={detail} onPay={() => setPaying(detail)} /></div>
          <div className="mt-1 flex flex-col gap-2">
            {detail.myItems.map(i => (
              <div key={i.entryId} className={`flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:flex-wrap sm:items-center ${i.status === 'REJECTED' ? 'bg-primary-fixed/30' : 'bg-surface-container-low'}`}>
                <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
                  <Thumb url={i.coverUrl} />
                  <div className="min-w-0 flex-1"><div className="truncate text-label-md text-on-surface">{i.title}</div><div className="flex flex-wrap items-baseline gap-x-2 text-body-sm"><span className="font-bold text-primary"><Price amount={i.promoPrice} /></span><span className="text-outline line-through"><Price amount={i.price} /></span><span className="text-on-surface-variant">{t('pct', { pct: pctOf(i) })}</span></div></div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                  <EntryPill status={i.status} />
                  {i.status === 'REJECTED' && detail.canJoin && <button onClick={() => onJoin(detail, i)} className="flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-primary px-3 text-label-md text-white"><Icon name="replay" size={16} /> {t('join.retryTitle')}</button>}
                  {(i.status === 'PENDING' || i.status === 'WAITLISTED') && <button onClick={() => void withdraw({ variables: { entryId: i.entryId } }).then(onChanged)} className="flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-lowest px-3 text-label-md text-on-surface"><Icon name="close" size={16} /> {t('campaigns.withdraw')}</button>}
                </div>
                {i.status === 'REJECTED' && i.rejectReason && <p className="m-0 flex basis-full items-start gap-1 text-body-sm text-primary"><Icon name="warning" size={15} className="mt-0.5 shrink-0" /> <span>{i.rejectReason}</span></p>}
              </div>
            ))}
          </div>
          {detail.canJoin && <button onClick={() => onJoin(detail)} className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="add_circle" size={18} /> {t('campaigns.addOne')}</button>}
        </section>
      )}
      <WalletPaySheet
        open={!!paying}
        title={paying ? t('campaigns.payTitle', { name: paying.name }) : ''}
        amount={paying?.amountDue ?? 0}
        request={paying ? { kind: 'CAMPAIGN_ENTRY', product: paying.id } : null}
        onClose={() => setPaying(null)}
        onPaid={() => { setPaying(null); onChanged() }}
      />
    </div>
  )
}

export function CampaignJoin({ campaign, retry, listings, aisles, onDone, onCancel }: { campaign: OpenCampaign, retry?: PromoItem, listings: ShopListing[], aisles: { id: string, name: string }[], onDone: () => void, onCancel: () => void }) {
  const already = new Set(campaign.myItems.filter(i => i.status !== 'REJECTED').map(i => i.listingId))
  const [picks, setPicks] = useState<Pick[]>(retry ? [{ listingId: retry.listingId, percent: Math.max(campaign.minDiscountPercent ?? 1, pctOf(retry)) }] : [])
  const [error, setError] = useState('')
  const [join, { loading }] = useMutation(JOIN_CAMPAIGN_MUTATION)
  const t = useT(shopPromos)
  const tc = useT(common)
  const min = campaign.minDiscountPercent ?? 0
  const ok = picks.length > 0 && picks.every(p => p.percent >= min) && (campaign.sellerLimitLeft == null || picks.length <= campaign.sellerLimitLeft)
  return (
    <>
      <button onClick={onCancel} className="mb-2 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Icon name="arrow_back" size={17} /> {t('join.back')}</button>
      <h1 className="m-0 text-headline-lg text-on-surface">{retry ? t('join.retryTitle') : t('join.title', { name: campaign.name })}</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('fromTo', { from: fdate(campaign.startsAt), to: fdate(campaign.endsAt) })}. {campaign.validation === 'AUTO' ? t('join.auto') : t('join.team')}{campaign.sellerLimitLeft != null ? ` ${t('join.limit', { count: campaign.sellerLimitLeft })}` : ''}{campaign.placesLeft === 0 && campaign.waitlist ? ` ${t('join.full')}` : ''}</p>
      <CampaignConditions c={campaign} />
      <p className="m-0 mt-3 flex items-start gap-2 rounded-xl bg-surface-lowest p-3 text-body-sm shadow-sm"><Icon name="payments" size={18} className="mt-0.5 shrink-0 text-primary" /> <span className="min-w-0"><span className="block text-label-md text-on-surface">{feeText(campaign)}</span>{(campaign.entryFee > 0 || campaign.listingFee > 0) && <span className="text-on-surface-variant">{campaign.entryFeePaid ? t('join.nothingNowPaid') : t('join.nothingNow')}</span>}</span></p>
      {retry?.rejectReason && <p className="m-0 mt-3 flex items-start gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="warning" size={17} className="shrink-0" /> {t('join.rejectReason', { reason: retry.rejectReason })}</p>}
      <section className={`${card} mt-4`}>
        <ItemPicker listings={listings.filter(l => !already.has(l.id))} aisles={aisles} picks={picks} onChange={setPicks} minPercent={campaign.minDiscountPercent} />
      </section>
      {campaign.sellerLimitLeft != null && picks.length > campaign.sellerLimitLeft && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {t('join.max', { count: campaign.sellerLimitLeft })}</p>}
      {error && <p className="m-0 mt-3 flex items-start gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} className="mt-0.5 shrink-0" /> <span className="min-w-0">{error}</span></p>}
      <div className="mt-4 flex gap-3 lg:justify-end">
        <button onClick={onCancel} className="flex h-12 shrink-0 cursor-pointer items-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">{tc('cancel')}</button>
        <button disabled={!ok || loading} onClick={() => void join({ variables: { input: { campaignId: campaign.id, items: picks.map(p => ({ listingId: p.listingId, discountPercent: p.percent })) } } }).then(onDone).catch((e: Error) => setError(e.message))} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45 lg:flex-none"><Icon name="send" size={19} /> {loading ? t('sending') : t('join.submit', { count: picks.length })}</button>
      </div>
    </>
  )
}

// ─── Bundles ──────────────────────────────────────────────────────────────

const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS))

function BundlesTab({ bundles, listings, onCreate, onEdit, onChanged }: {
  bundles: ShopPromos['myShopBundles'], listings: ShopListing[], onCreate: () => void, onEdit: (b: ShopBundle, reactivate?: boolean) => void, onChanged: () => void
}) {
  const [stop] = useMutation(STOP_SHOP_BUNDLE_MUTATION)
  const [remove] = useMutation(DELETE_SHOP_BUNDLE_MUTATION)
  const [filter, setFilter] = useState<'ALL' | PromoState>('ALL')
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState<{ b: ShopBundle, kind: 'stop' | 'delete' } | null>(null)
  const t = useT(shopPromos)
  const info = (
    <p className="m-0 flex items-start gap-2 rounded-2xl bg-surface-lowest p-4 text-body-sm text-on-surface-variant shadow-sm">
      <Icon name="info" size={18} className="mt-0.5 shrink-0 text-primary" />
      <span>{t.rich('bundles.info', { b: c => <b className="text-on-surface">{c}</b> })}</span>
    </p>
  )
  if (!bundles.length) return <div className="flex flex-col gap-3">{info}<Empty icon="inventory_2" title={t('bundles.emptyTitle')} text={t('bundles.emptyText')} action={<button onClick={onCreate} className="mt-2 flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="add" size={18} /> {t('bundles.create')}</button>} /></div>
  const count = (s: 'ALL' | PromoState) => (s === 'ALL' ? bundles.length : bundles.filter(x => x.state === s).length)
  const rows = bundles.filter(b => (filter === 'ALL' || b.state === filter) && (!q || b.name.toLowerCase().includes(q.toLowerCase())))
  const scope = (b: ShopBundle) => b.scope === 'ALL' ? t('bundles.scopeAll') : b.scope === 'AISLE' ? t('bundles.scopeAisle', { name: b.aisleName ?? '' }) : t('bundles.scopeListings', { count: b.listingIds.length })
  const validity = (b: ShopBundle) => b.state === 'ENDED'
    ? { icon: 'event_busy', text: b.endsAt && new Date(b.endsAt) < new Date() ? t('bundles.closedOn', { date: fdate(b.endsAt) }) : t('bundles.stopped') }
    : b.state === 'SCHEDULED'
      ? { icon: 'event_upcoming', text: b.endsAt ? t('bundles.startsOnUntil', { from: fdate(b.startsAt!), to: fdate(b.endsAt) }) : t('bundles.startsOn', { date: fdate(b.startsAt!) }) }
      : b.endsAt ? { icon: 'event', text: t('bundles.validUntil', { date: fdate(b.endsAt), count: daysLeft(b.endsAt) }) } : { icon: 'all_inclusive', text: t('bundles.noEnd') }
  const actions = (b: ShopBundle, cls: string) => (
    <div className={`${cls} shrink-0 grid-cols-2 gap-2`}>
      {b.state !== 'ENDED' ? <>
        <button onClick={() => onEdit(b)} className="flex h-9 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="edit" size={16} /> {common.t('edit')}</button>
        <button onClick={() => setConfirm({ b, kind: 'stop' })} className={`flex h-9 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border-none px-3 text-label-md ${b.state === 'LIVE' ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface'}`}><Icon name={b.state === 'LIVE' ? 'stop_circle' : 'cancel'} size={16} /> {b.state === 'LIVE' ? t('bundles.stop') : common.t('cancel')}</button>
      </> : <>
        <button onClick={() => onEdit(b, true)} className="flex h-9 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="replay" size={16} /> {t('bundles.reactivate')}</button>
        <button onClick={() => setConfirm({ b, kind: 'delete' })} className="flex h-9 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border-none bg-primary-fixed px-3 text-label-md text-primary"><Icon name="delete" size={16} /> {common.t('delete')}</button>
      </>}
    </div>
  )
  return (
    <div className="flex flex-col gap-3">
      {info}
      <section className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {(['ALL', 'LIVE', 'SCHEDULED', 'ENDED'] as const).map(k => (
            <button key={k} onClick={() => setFilter(k)} className={`h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-xl border-none px-3 text-label-md ${filter === k ? 'bg-inverse-surface text-white' : 'bg-surface-lowest text-on-surface shadow-sm'}`}>{t(`sales.filter.${k}` as const, { n: count(k) })}</button>
          ))}
        </div>
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-lowest px-3 shadow-sm md:ml-auto md:max-w-xs"><Icon name="search" size={18} className="shrink-0 text-outline" /><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('bundles.search')} className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" /></label>
      </section>
      {rows.length === 0 && <p className="m-0 rounded-2xl bg-surface-lowest p-6 text-center text-body-md text-on-surface-variant shadow-sm">{t('bundles.noMatch')}</p>}
      {rows.map(b => {
        const v = validity(b)
        const items = b.scope === 'LISTINGS' ? b.listingIds.map(id => listings.find(l => l.id === id)).filter((l): l is ShopListing => !!l) : []
        return (
          <section key={b.id} className={`${card} ${b.state === 'ENDED' ? 'opacity-80' : ''}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <StatePill state={b.state} />
                <span className="whitespace-nowrap rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface">{scope(b)}</span>
                <span className="whitespace-nowrap text-body-sm text-on-surface-variant">{t('bundles.concerned', { count: b.listingsCount })}</span>
              </div>
              {actions(b, 'hidden md:flex')}
            </div>
            <h3 className="m-0 mt-2 text-headline-sm text-on-surface">{b.name}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {b.tiers.map((tier, i) => {
                const last = i === b.tiers.length - 1 && b.tiers.length > 1
                return <span key={tier.minQty} className={`whitespace-nowrap rounded-xl px-3 py-2 text-label-md ${last ? 'bg-primary-fixed text-primary' : 'bg-surface-container-low text-on-surface'}`}>{t.rich(last ? 'bundles.tierMore' : 'bundles.tier', { n: tier.minQty, pct: tier.percent, b: c => <b className="text-primary">{c}</b> })}</span>
              })}
            </div>
            {items.length > 0 && (
              <>
                <div className="mt-4 text-label-sm uppercase text-on-surface-variant">{t('bundles.included')}</div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {items.slice(0, 8).map(l => (
                    <div key={l.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-container-low p-2">
                      <Thumb url={l.coverImageUrl} />
                      <div className="min-w-0"><div className="truncate text-label-md text-on-surface">{l.title}</div><div className="text-body-sm text-on-surface-variant">{t('bundles.stock', { n: l.quantity })}</div></div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="m-0 mt-3 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name={v.icon} size={16} /> {v.text}</p>
            <div className="mt-3 md:hidden">{actions(b, 'grid')}</div>
          </section>
        )
      })}
      <ConfirmSheet open={!!confirm} title={confirm?.kind === 'delete' ? t('bundles.deleteTitle') : confirm?.b.state === 'LIVE' ? t('bundles.stopTitle') : t('bundles.cancelTitle')} confirmLabel={confirm?.kind === 'delete' ? common.t('delete') : common.t('confirm')} onConfirm={() => {
        if (!confirm) return
        void (confirm.kind === 'delete' ? remove({ variables: { id: confirm.b.id } }) : stop({ variables: { id: confirm.b.id } })).then(() => { setConfirm(null); onChanged() })
      }} onClose={() => setConfirm(null)}>
        <p className="m-0 text-body-sm text-on-surface-variant">{confirm?.kind === 'delete' ? t('bundles.deleteText') : t('bundles.stopText')}</p>
      </ConfirmSheet>
    </div>
  )
}

function BundleEditor({ listings, aisles, onDone, onCancel, bundle, reactivate }: {
  listings: ShopListing[], aisles: { id: string, name: string }[], onDone: () => void, onCancel: () => void
  // Editing this bundle, or reactivating an ended one (same row, new dates).
  bundle?: ShopBundle, reactivate?: boolean
}) {
  const t = useT(shopPromos)
  const tc = useT(common)
  const today = dayInput(new Date())
  const [name, setName] = useState(bundle?.name ?? '')
  const [tiers, setTiers] = useState<BundleTier[]>(bundle?.tiers.map(t => ({ minQty: t.minQty, percent: t.percent })) ?? [{ minQty: 2, percent: 10 }, { minQty: 3, percent: 15 }])
  const [scope, setScope] = useState<'ALL' | 'AISLE' | 'LISTINGS'>(bundle?.scope ?? 'ALL')
  const [aisleId, setAisleId] = useState(bundle?.aisleId ?? aisles[0]?.id ?? '')
  const [ids, setIds] = useState<string[]>(bundle?.listingIds ?? [])
  const keepDates = bundle && !reactivate
  const [dated, setDated] = useState(!!(keepDates && (bundle!.startsAt || bundle!.endsAt)))
  const [from, setFrom] = useState(keepDates && bundle!.startsAt ? dayInput(new Date(bundle!.startsAt)) : today)
  const [fromTime, setFromTime] = useState(keepDates && bundle!.startsAt ? timeOf(bundle!.startsAt) : '08:00')
  const [to, setTo] = useState(keepDates && bundle!.endsAt ? dayInput(new Date(bundle!.endsAt)) : dayInput(new Date(Date.now() + 30 * DAY_MS)))
  const [toTime, setToTime] = useState(keepDates && bundle!.endsAt ? timeOf(bundle!.endsAt) : '23:59')
  const [aisleFilter, setAisleFilter] = useState('')
  const [error, setError] = useState('')
  const [save, { loading }] = useMutation(SAVE_SHOP_BUNDLE_MUTATION)
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty)
  const tiersOk = sorted.every((t, i) => t.minQty >= 2 && t.percent >= 1 && t.percent <= 80 && (i === 0 || (t.minQty > sorted[i - 1].minQty && t.percent > sorted[i - 1].percent)))
  const priced = listings.filter(l => l.price != null)
  const rows = priced.filter(l => !aisleFilter || l.aisleId === aisleFilter)
  const eligible = priced.filter(l => l.quantity >= 2)
  const startIso = from === today && fromTime <= new Date().toISOString().slice(11, 16) ? new Date().toISOString() : at(from, fromTime)
  const ok = name.trim().length >= 2 && tiersOk && (scope !== 'AISLE' || !!aisleId) && (scope !== 'LISTINGS' || ids.length > 0) && (!dated || at(to, toTime) > startIso)
  const setTier = (i: number, p: Partial<BundleTier>) => setTiers(ts => ts.map((t, j) => (j === i ? { ...t, ...p } : t)))
  const preview = (scope === 'LISTINGS' ? eligible.find(l => ids.includes(l.id)) : scope === 'AISLE' ? eligible.find(l => l.aisleId === aisleId) : eligible[0]) ?? eligible[0] ?? priced[0]
  const submit = () => {
    setError('')
    void save({
      variables: {
        id: bundle?.id,
        input: {
          name: name.trim(), tiers: sorted, scope, aisleId: scope === 'AISLE' ? aisleId : undefined, listingIds: scope === 'LISTINGS' ? ids : undefined,
          startsAt: dated ? startIso : undefined, endsAt: dated ? at(to, toTime) : undefined,
        },
      },
    }).then(onDone).catch((e: Error) => setError(e.message))
  }
  const step = (n: number, title: string, sub: string) => (
    <div className="mb-3 flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-label-lg text-on-surface">{n}</span><div className="min-w-0"><h2 className="m-0 text-headline-sm text-on-surface">{title}</h2><p className="m-0 text-body-sm text-on-surface-variant">{sub}</p></div></div>
  )
  return (
    <>
      <button onClick={onCancel} className="mb-2 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Icon name="arrow_back" size={17} /> {t('bundleEditor.back')}</button>
      <h1 className="m-0 text-headline-lg text-on-surface">{bundle && !reactivate ? t('bundleEditor.editTitle') : reactivate ? t('bundleEditor.reactivateTitle') : t('bundles.create')}</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('bundleEditor.intro')}</p>
      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={card}>
            {step(1, t('saleEditor.step1'), t('bundleEditor.step1Sub'))}
            <label className="block"><span className="mb-1.5 block text-label-md text-on-surface">{t('bundleEditor.name')}</span><input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder={t('bundleEditor.namePlaceholder')} className={inputCls} /></label>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-label-md text-on-surface"><input type="checkbox" checked={dated} onChange={e => setDated(e.target.checked)} className="h-5 w-5 accent-primary" /> {t('bundleEditor.dated')}</label>
            {dated && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><span className="mb-1.5 block text-label-sm uppercase text-on-surface-variant">{t('start')}</span><div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2"><input type="date" min={today} value={from} onChange={e => setFrom(e.target.value)} className={inputCls} aria-label={t('startDate')} /><input type="time" value={fromTime} onChange={e => setFromTime(e.target.value)} className={inputCls} aria-label={t('startTime')} /></div></div>
                <div><span className="mb-1.5 block text-label-sm uppercase text-on-surface-variant">{t('end')}</span><div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2"><input type="date" min={from} value={to} onChange={e => setTo(e.target.value)} className={inputCls} aria-label={t('endDate')} /><input type="time" value={toTime} onChange={e => setToTime(e.target.value)} className={inputCls} aria-label={t('endTime')} /></div></div>
              </div>
            )}
          </section>
          <section className={card}>
            {step(2, t('bundleEditor.step2'), t('bundleEditor.step2Sub'))}
            <div className="flex flex-col gap-2">
              {tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
                  <span className="hidden whitespace-nowrap rounded-md bg-surface-lowest px-2 py-1 text-label-sm text-on-surface-variant sm:inline">{t('bundleEditor.tier', { n: i + 1 })}</span>
                  <Select value={String(tier.minQty)} onChange={e => setTier(i, { minQty: Number(e.target.value) })} className="h-10 min-w-0 flex-1 cursor-pointer rounded-lg border-none bg-surface-lowest px-3 text-label-md text-on-surface outline-none" aria-label={t('bundleEditor.quantity')}>
                    {Array.from({ length: 9 }, (_, k) => k + 2).map(n => <option key={n} value={n}>{i === tiers.length - 1 && tiers.length > 1 ? t('bundleEditor.boughtMore', { n }) : t('bundleEditor.bought', { n })}</option>)}
                  </Select>
                  <span className="flex items-center gap-1 text-label-md text-on-surface">-<input type="number" min={1} max={80} value={tier.percent} onChange={e => setTier(i, { percent: Number(e.target.value) || 1 })} aria-label={t('picker.percentAria')} className="h-10 w-16 rounded-lg border-none bg-surface-lowest text-center text-label-lg outline-none" />%</span>
                  <button type="button" disabled={tiers.length <= 1} onClick={() => setTiers(ts => ts.filter((_, j) => j !== i))} aria-label={t('bundleEditor.removeTier')} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-on-surface-variant disabled:opacity-30"><Icon name="delete" size={18} /></button>
                </div>
              ))}
            </div>
            {tiers.length < 4 && <button type="button" onClick={() => setTiers(ts => [...ts, { minQty: Math.min(10, (Math.max(...ts.map(x => x.minQty)) || 1) + 1), percent: Math.min(80, (Math.max(...ts.map(x => x.percent)) || 0) + 5) }])} className="mt-3 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary"><Icon name="add_circle" size={18} /> {t('bundleEditor.addTier', { n: tiers.length })}</button>}
            {!tiersOk && <p className="m-0 mt-2 text-body-sm text-primary">{t('bundleEditor.tiersError')}</p>}
          </section>
          <section className={card}>
            {step(3, t('bundleEditor.step3'), t('bundleEditor.step3Sub'))}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-container p-1">
              {([['ALL', t('bundles.scopeAll'), t('bundleEditor.scopeAllShort')], ['AISLE', t('bundleEditor.scopeAisle'), t('bundleEditor.scopeAisleShort')], ['LISTINGS', t('bundleEditor.scopeListings'), t('bundleEditor.scopeListingsShort')]] as const).map(([k, l, short]) => (
                <button key={k} type="button" onClick={() => setScope(k)} className={`h-10 cursor-pointer whitespace-nowrap rounded-lg border-none px-1 text-label-md ${scope === k ? 'bg-surface-lowest text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant'}`}><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{l}</span></button>
              ))}
            </div>
            <p className="m-0 mt-3 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="info" size={17} className="mt-0.5 shrink-0 text-tertiary" /> {t('bundleEditor.eligibleNote', { count: eligible.length })}</p>
            {scope === 'AISLE' && (aisles.length ? (
              <Select value={aisleId} onChange={e => setAisleId(e.target.value)} className={`${inputCls} mt-3 cursor-pointer`}>{aisles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
            ) : <p className="m-0 mt-3 text-body-sm text-on-surface-variant">{t('bundleEditor.noAisles')}</p>)}
            {scope === 'LISTINGS' && (
              <>
                {aisles.length > 0 && (
                  <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                    {[{ id: '', name: t('bundleEditor.allEligible', { n: eligible.length }) }, ...aisles].map(a => (
                      <button key={a.id || 'all'} type="button" onClick={() => setAisleFilter(a.id)} className={`h-8 shrink-0 cursor-pointer whitespace-nowrap rounded-full border-none px-3 text-label-md ${aisleFilter === a.id ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface'}`}>{a.name}</button>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
                  {rows.map(l => {
                    const ok2 = l.quantity >= 2
                    return (
                      <label key={l.id} className={`flex items-center gap-3 rounded-xl p-2 ${ok2 ? 'cursor-pointer bg-surface-container-low' : 'bg-surface-container-low/50 opacity-60'}`}>
                        <input type="checkbox" disabled={!ok2} checked={ids.includes(l.id)} onChange={() => setIds(s => (s.includes(l.id) ? s.filter(x => x !== l.id) : [...s, l.id]))} className="h-5 w-5 shrink-0 accent-primary" />
                        <Thumb url={l.coverImageUrl} />
                        <span className="min-w-0 flex-1"><span className="block truncate text-label-md text-on-surface">{l.title}</span><span className={`block truncate text-body-sm ${ok2 ? 'text-on-surface-variant' : 'text-primary'}`}><span className="sm:hidden"><Price amount={l.price} /> · </span>{ok2 ? t.rich('bundleEditor.stockOk', { n: l.quantity, wide: c => <span className="hidden sm:inline">{c}</span> }) : t.rich('bundleEditor.stockLow', { wide: c => <span className="hidden sm:inline">{c}</span> })}</span></span>
                        <span className={`hidden shrink-0 text-label-md sm:inline ${ok2 ? 'text-on-surface' : 'text-outline line-through'}`}><Price amount={l.price} /></span>
                      </label>
                    )
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-body-sm">
                  <span className="text-on-surface-variant">{t('bundleEditor.selectedOf', { count: ids.length, eligible: t('bundleEditor.eligibleCount', { count: eligible.length }) })}</span>
                  <button type="button" onClick={() => setIds(eligible.filter(l => !aisleFilter || l.aisleId === aisleFilter).map(l => l.id))} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">{t('bundleEditor.checkAll')}</button>
                </div>
              </>
            )}
          </section>
        </div>
        <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-4">
          <section className={card}>
            <div className="mb-3 flex items-center gap-1.5 text-label-lg text-on-surface"><Icon name="visibility" size={18} className="text-primary" /> {t('bundleEditor.previewTitle')}</div>
            {preview ? (
              <>
                <div className="aspect-[4/3] max-h-64 w-full overflow-hidden rounded-xl bg-surface-container xl:max-h-none">{preview.coverImageUrl && <img src={preview.coverImageUrl} alt="" className="h-full w-full object-cover" />}</div>
                <div className="mt-2 truncate text-label-lg text-on-surface">{preview.title}</div>
                <div className="text-headline-sm font-extrabold text-on-surface"><Price amount={preview.price} /> <span className="text-body-sm font-normal text-on-surface-variant">{t('bundleEditor.perUnit')}</span></div>
                <div className="mt-3 rounded-xl bg-primary-fixed/30 p-3">
                  <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1 text-label-sm uppercase text-primary"><Icon name="inventory_2" size={16} /> {t('bundleEditor.bundle')}</span>{sorted.length > 0 && <span className="whitespace-nowrap rounded-md bg-primary px-2 py-0.5 text-label-sm text-white">{t('upToPct', { pct: Math.max(...sorted.map(x => x.percent)) })}</span>}</div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {sorted.map((tier, i) => (
                      <div key={tier.minQty} className="flex items-center gap-2 rounded-lg bg-surface-lowest px-2.5 py-2 text-body-sm">
                        <span className="min-w-0 flex-1 truncate text-on-surface">{i === sorted.length - 1 && sorted.length > 1 ? t('bundleEditor.boughtPlus', { n: tier.minQty }) : t('bundleEditor.bought', { n: tier.minQty })}</span>
                        <span className="whitespace-nowrap rounded bg-primary px-1.5 text-label-sm text-white">{t('pct', { pct: tier.percent })}</span>
                        <span className="whitespace-nowrap text-label-md text-on-surface">{t.rich('bundleEditor.unitPrice', { price: <Price amount={promoOf(preview.price ?? 0, tier.percent)} /> })}</span>
                      </div>
                    ))}
                  </div>
                  <p className="m-0 mt-2 text-[11px] text-on-surface-variant">{t('bundleEditor.appliedBySeller')}</p>
                </div>
              </>
            ) : <p className="m-0 text-body-sm text-on-surface-variant">{t('bundleEditor.previewEmpty')}</p>}
          </section>
          <p className="m-0 flex items-start gap-2 rounded-2xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="verified_user" size={18} className="mt-0.5 shrink-0 text-tertiary" /> {t('bundleEditor.directPay')}</p>
        </aside>
      </div>
      {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
      <div className="mt-4 flex gap-3 lg:justify-end">
        <button onClick={onCancel} className="flex h-12 shrink-0 cursor-pointer items-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">{tc('cancel')}</button>
        <button disabled={!ok || loading} onClick={submit} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45 lg:flex-none"><Icon name="bolt" size={19} /> <span className="truncate">{loading ? tc('saving') : bundle && !reactivate ? t.rich('bundleEditor.saveChanges', { wide: c => <span className="hidden sm:inline">{c}</span> }) : t('bundleEditor.submit')}</span></button>
      </div>
    </>
  )
}

// ─── Posts to followers ───────────────────────────────────────────────────

function QuotaBar({ quota }: { quota: ShopPromos['myShopPostQuota'] }) {
  const t = useT(shopPromos)
  const left = Math.max(0, quota.limit - quota.used)
  return (
    <div className="mt-2 max-w-md">
      <div className="flex justify-between gap-2 text-label-sm text-on-surface-variant"><span className="min-w-0 truncate">{t.rich('quota.text', { count: left, limit: quota.limit, b: c => <b className="text-on-surface">{c}</b> })}</span><span className="shrink-0 whitespace-nowrap text-primary">{t('quota.used', { pct: Math.round((quota.used / quota.limit) * 100) })}</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }} /></div>
    </div>
  )
}

function PostsTab({ posts, quota, onCreate, onDuplicate, onOpenShop }: {
  posts: ShopPromos['myShopPosts'], quota: ShopPromos['myShopPostQuota'], onCreate: () => void, onDuplicate: (p: ShopPost) => void, onOpenShop: () => void
}) {
  const [withItems, setWithItems] = useState(false)
  const t = useT(shopPromos)
  const left = quota.limit - quota.used
  const rows = posts.filter(p => !withItems || p.listings.length > 0)
  const when = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="flex flex-col gap-3">
      <section className={`${card} flex flex-col gap-4 border-0 border-l-4 border-solid border-primary md:flex-row md:items-center`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="notifications_active" size={24} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-label-lg text-on-surface md:text-headline-sm">{t('posts.reach', { count: quota.followers })}</div>
          <div className="text-label-md text-primary">{left > 0 ? t('posts.left', { count: left, limit: quota.limit }) : t('posts.limitReached', { date: fdate(quota.nextAt!) })}</div>
          <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('posts.intro')}</p>
          <QuotaBar quota={quota} />
        </div>
        <button disabled={left <= 0} onClick={onCreate} className="flex h-12 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45"><Icon name="add" size={19} /> {t('posts.create')}</button>
      </section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface">{t('posts.history')} <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">{t('posts.count', { count: posts.length })}</span></h2>
        <div className="flex gap-1 rounded-xl bg-surface-container p-1">
          {([[false, t('posts.filterAll')], [true, t('posts.filterItems')]] as const).map(([v, l]) => <button key={String(v)} onClick={() => setWithItems(v)} className={`h-8 cursor-pointer whitespace-nowrap rounded-lg border-none px-3 text-label-md ${withItems === v ? 'bg-surface-lowest text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>{l}</button>)}
        </div>
      </div>
      {posts.length === 0 && <Empty icon="forum" title={t('posts.emptyTitle')} text={t('posts.emptyText')} />}
      {rows.map(p => (
        <article key={p.id} className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2 py-1 text-label-sm text-on-surface-variant"><Icon name="schedule" size={15} /> {t('posts.sentOn', { date: when(p.createdAt) })}</span>
            <div className="flex gap-2">
              <button onClick={onOpenShop} className="flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="visibility" size={16} /> {t('posts.view')}</button>
              <button onClick={() => onDuplicate(p)} className="flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="content_copy" size={16} /> {t('posts.duplicate')}</button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-4 md:flex-row">
            {p.imageUrl && <img src={p.imageUrl} alt="" className="aspect-[16/10] w-full shrink-0 rounded-xl object-cover md:w-56" />}
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-headline-sm text-on-surface">{p.title}</h3>
              <p className="m-0 mt-1 line-clamp-2 text-body-md text-on-surface-variant">{plainText(p.body)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-surface-container-low px-2 py-1 text-label-sm text-on-surface"><Icon name="group" size={15} /> {t('posts.sentTo', { count: p.recipients, n: formatNumber(p.recipients) })}</span>
                <span className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-surface-container-low px-2 py-1 text-label-sm text-on-surface"><Icon name="visibility" size={15} /> {t('posts.views', { count: p.views, n: formatNumber(p.views) })}</span>
              </div>
            </div>
          </div>
          {p.listings.length > 0 ? (
            <div className="mt-3 rounded-xl bg-surface-container-low p-3">
              <div className="text-label-sm uppercase text-on-surface-variant">{t('posts.attached', { n: p.listings.length })}</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {p.listings.map(l => (
                  <div key={l.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-lowest p-2">
                    <Thumb url={l.coverUrl} />
                    <div className="min-w-0"><div className="truncate text-label-md text-on-surface">{l.title}</div><div className="text-label-lg text-primary"><Price amount={l.price} /></div></div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-surface-container-low px-3 py-2 text-body-sm italic text-on-surface-variant"><Icon name="info" size={15} /> {t('posts.noItems')}</p>}
        </article>
      ))}
      <p className="m-0 flex items-start gap-3 rounded-2xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant"><Icon name="verified_user" size={20} className="shrink-0 text-tertiary" /> <span>{t.rich('posts.rule', { limit: quota.limit, b: c => <b className="block text-on-surface">{c}</b> })}</span></p>
    </div>
  )
}

function PostEditor({ listings, quota, shopName, onDone, onCancel, from }: {
  listings: ShopListing[], quota: ShopPromos['myShopPostQuota'], shopName: string, onDone: () => void, onCancel: () => void
  // Duplicate of a previous announcement.
  from?: ShopPost
}) {
  const t = useT(shopPromos)
  const tc = useT(common)
  const [title, setTitle] = useState(from?.title ?? '')
  const [body, setBody] = useState(from?.body ?? '')
  const [imageUrl, setImageUrl] = useState(from?.imageUrl ?? '')
  const [ids, setIds] = useState<string[]>(from?.listings.map(l => l.id).filter(id => listings.some(l => l.id === id)) ?? [])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [send, { loading }] = useMutation(CREATE_SHOP_POST_MUTATION)
  const input = useRef<HTMLInputElement>(null)
  const rows = useMemo(() => listings.filter(l => !q || l.title.toLowerCase().includes(q.toLowerCase())).slice(0, 40), [listings, q])
  const chosen = ids.map(id => listings.find(l => l.id === id)).filter((l): l is ShopListing => !!l)
  const bodyLength = plainText(body).length
  const ok = title.trim().length >= 3 && bodyLength >= 3 && bodyLength <= 1000
  const pick = async (f?: File) => {
    if (!f) return
    setBusy(true); setError('')
    try { setImageUrl((await uploadImages([f]))[0]) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <>
      <button onClick={onCancel} className="mb-2 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Icon name="arrow_back" size={17} /> {t('postEditor.back')}</button>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-headline-lg text-on-surface">{t('postEditor.title')}</h1>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('postEditor.intro')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-surface-lowest p-3 shadow-sm lg:w-96">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="group" size={22} /></span>
          <div className="min-w-0 flex-1"><div className="text-headline-sm font-extrabold text-on-surface">{t.rich('postEditor.followers', { count: quota.followers, n: formatNumber(quota.followers), small: c => <span className="text-label-sm font-normal text-tertiary">{c}</span> })}</div><QuotaBar quota={quota} /></div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={card}>
            <label className="block"><span className="mb-1 flex justify-between gap-2 text-label-lg text-on-surface">{t('postEditor.titleLabel')} <span className="text-label-sm font-normal text-on-surface-variant">{t('postEditor.titleCount', { n: title.length })}</span></span><span className="mb-2 block text-body-sm text-on-surface-variant">{t('postEditor.titleHelp')}</span><input value={title} onChange={e => setTitle(e.target.value.slice(0, 80))} placeholder={t('postEditor.titlePlaceholder')} className={inputCls} /></label>
          </section>
          <section className={card}>
            <div><span className="mb-1 block text-label-lg text-on-surface">{t('postEditor.message')}</span><span className="mb-2 block text-body-sm text-on-surface-variant">{t('postEditor.messageHelp')}</span><RichTextEditor compact content={body} onChange={setBody} maxChars={1000} minHeight={140} label={t('postEditor.message')} placeholder={t('postEditor.messagePlaceholder')} /></div>
          </section>
          <section className={card}>
            <div className="mb-2 text-label-lg text-on-surface">{t.rich('postEditor.photo', { opt: c => <span className="text-label-sm font-normal text-on-surface-variant">{c}</span> })}</div>
            <input ref={input} type="file" accept="image/*" hidden onChange={e => { void pick(e.target.files?.[0]); e.target.value = '' }} />
            {imageUrl ? (
              <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2">
                <img src={imageUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 text-body-sm text-tertiary"><Icon name="check_circle" size={15} /> {t('postEditor.photoAdded')}</span>
                <button type="button" onClick={() => input.current?.click()} className="flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-lowest px-3 text-label-md text-on-surface"><Icon name="swap_horiz" size={16} /> {t('postEditor.replace')}</button>
                <button type="button" onClick={() => setImageUrl('')} aria-label={t('postEditor.removePhoto')} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-on-surface-variant"><Icon name="delete" size={17} /></button>
              </div>
            ) : (
              <button type="button" disabled={busy} onClick={() => input.current?.click()} className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-outline-variant bg-transparent text-on-surface-variant"><Icon name={busy ? 'progress_activity' : 'add_photo_alternate'} size={24} className={busy ? 'animate-spin' : ''} /><span className="text-label-md">{busy ? t('sending') : t('postEditor.addPhoto')}</span></button>
            )}
          </section>
          <section className={card}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><span className="text-label-lg text-on-surface">{t('postEditor.items')}</span><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${ids.length ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{t('postEditor.itemsCount', { n: ids.length })}</span></div>
            <p className="m-0 mb-2 text-body-sm text-on-surface-variant">{t('postEditor.itemsHelp')}</p>
            <label className="flex h-11 items-center gap-2 rounded-xl bg-surface-container-low px-3"><Icon name="search" size={18} className="text-outline" /><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('postEditor.itemsSearch')} className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" /></label>
            <div className="mt-2 flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
              {rows.map(l => {
                const on = ids.includes(l.id)
                return (
                  <label key={l.id} className={`flex cursor-pointer items-center gap-2 rounded-xl p-2 ${on ? 'bg-primary-fixed/40' : 'bg-surface-container-low'}`}>
                    <input type="checkbox" checked={on} disabled={!on && ids.length >= 4} onChange={() => setIds(s => (on ? s.filter(x => x !== l.id) : [...s, l.id]))} className="h-5 w-5 shrink-0 accent-primary" />
                    <Thumb url={l.coverImageUrl} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-label-md text-on-surface">{l.title}</span><span className="text-body-sm text-on-surface-variant">{t.rich('postEditor.priceStock', { price: <Price amount={l.price} />, n: l.quantity })}</span></span>
                  </label>
                )
              })}
            </div>
          </section>
        </div>
        <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-4">
          <div className="flex items-center gap-1.5 text-label-md text-on-surface"><span className="h-2 w-2 rounded-full bg-tertiary" /> {t('postEditor.livePreview')}</div>
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-label-sm uppercase text-on-surface-variant"><Icon name="notifications" size={15} /> {t('postEditor.phoneNotif')}</div>
            <div className="flex gap-3 rounded-2xl bg-inverse-surface p-3 text-surface">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-label-lg font-bold text-white">D</span>
              <div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-label-sm opacity-80"><span className="truncate">{/* i18n-ignore */}Dilchap</span><span className="shrink-0">{t('postEditor.now')}</span></div><div className="truncate text-label-md">{t('postEditor.notifTitle', { shop: shopName, title: title || t('postEditor.titleLabel') })}</div><div className="line-clamp-2 text-body-sm opacity-80">{plainText(body) || t('postEditor.bodyFallback')}</div></div>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-label-sm uppercase text-on-surface-variant"><Icon name="feed" size={15} /> {t('postEditor.news')}</div>
            <article className="overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
              {imageUrl && <img src={imageUrl} alt="" className="max-h-48 w-full object-cover" />}
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="campaign" size={15} className="text-primary" /> {t('postEditor.newsMeta', { shop: shopName })}</div>
                <h3 className="m-0 mt-1 break-words text-headline-sm text-on-surface">{title || t('postEditor.titleLabel')}</h3>
                {plainText(body) ? <div className="rich-text mt-1 line-clamp-6 break-words text-body-sm text-on-surface" dangerouslySetInnerHTML={{ __html: richHtml(body) }} /> : <p className="m-0 mt-1 text-body-sm text-on-surface">{t('postEditor.bodyEmpty')}</p>}
                {chosen.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {chosen.map(l => (
                      <div key={l.id} className="flex items-center gap-2 rounded-xl bg-surface-container-low p-2">
                        <Thumb url={l.coverImageUrl} />
                        <div className="min-w-0 flex-1"><div className="truncate text-label-md text-on-surface">{l.title}</div><div className="text-label-lg text-primary"><Price amount={l.price} /></div></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          </div>
        </aside>
      </div>
      {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
      <div className="mt-4 flex flex-col gap-2 lg:items-end">
        <div className="flex w-full gap-3 lg:w-auto">
          <button onClick={onCancel} className="flex h-12 shrink-0 cursor-pointer items-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">{tc('cancel')}</button>
          <button disabled={!ok || loading || busy || quota.used >= quota.limit} onClick={() => void send({ variables: { input: { title: title.trim(), body, imageUrl: imageUrl || undefined, listingIds: ids } } }).then(onDone).catch((e: Error) => setError(e.message))} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white disabled:opacity-45 lg:flex-none"><Icon name="send" size={19} /> <span className="truncate">{loading ? t('sending') : t('postEditor.submit', { count: quota.followers, n: formatNumber(quota.followers) })}</span></button>
        </div>
        <p className="m-0 flex items-start gap-1.5 text-body-sm text-on-surface-variant"><Icon name="info" size={15} className="mt-0.5 shrink-0 text-primary" /> {t('postEditor.usage', { limit: quota.limit })}</p>
      </div>
    </>
  )
}
