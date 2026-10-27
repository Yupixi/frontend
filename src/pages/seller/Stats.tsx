import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import Icon from '../../components/Icon'
import { formatNumber } from '../../lib/format'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import StatsMobile from './StatsMobile'
import DealStatsPanel from './DealStatsPanel'
import CertifiedLock from '../../components/CertifiedLock'
import { MY_MARKET_POSITIONS_QUERY, SELLER_STATS_QUERY, type ListingPerformance, type MarketPosition, type SellerStats } from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'
import Select from '../../components/Select'
import Credits from '../../components/Credits'
import { PaymentLogos } from '../../components/PaymentLogo'
import { Claim } from '../../lib/site'
import VisibilityPanel from '../../components/VisibilityPanel'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { useT, useLocale, fmtDate } from '../../i18n'
import statsNs from '../../i18n/ns/stats'

type Props = { onNavigate: (p: any) => void; onSelectListing: (id: string) => void; currentUser?: AuthUser | null; onLogout: () => void }

// Day name of a 0 (Sunday) – 6 weekday, in the page's language (7 Jan 2024 was a Sunday).
const weekdayName = (weekday: number) => fmtDate(new Date(2024, 0, 7 + weekday), { weekday: 'long' })
const PERIODS = [
  { key: '7', get label() { return statsNs.t('period.7') }, days: () => 7 },
  { key: '30', get label() { return statsNs.t('period.30') }, days: () => 30 },
  { key: 'month', get label() { return statsNs.t('period.month') }, days: () => new Date().getDate() },
  { key: '90', get label() { return statsNs.t('period.90') }, days: () => 90 },
]

const nf = (n: number) => formatNumber(n)
const pct = (n: number | null | undefined) => (n == null ? '—' : `${formatNumber(n)}%`)
const ago = (iso: string | null) => {
  if (!iso) return '—'
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
  return d === 0 ? statsNs.t('today') : statsNs.t('agoDays', { d })
}

function Trend({ now, prev }: { now: number | null; prev: number | null }) {
  if (now == null || prev == null || prev === 0) return null
  const delta = ((now - prev) / prev) * 100
  const up = delta >= 0
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-label-sm ${up ? 'bg-tertiary-soft text-tertiary' : 'bg-primary-fixed text-primary'}`}>
      <Icon name={up ? 'arrow_upward' : 'arrow_downward'} size={13} />{up ? '+' : ''}{delta.toFixed(1)}%
    </span>
  )
}

function Kpi({ label, icon, iconCls, value, foot }: { label: string; icon: string; iconCls: string; value: React.ReactNode; foot: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-surface-lowest p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-label-sm uppercase text-on-surface-variant">{label}</span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}><Icon name={icon} size={19} /></span>
      </div>
      <div className="mt-3 text-headline-lg font-extrabold text-on-surface">{value}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-body-sm text-on-surface-variant">{foot}</div>
    </div>
  )
}

function exportCsv(stats: SellerStats) {
  const t = statsNs.t
  const rows = [
    [t('csv.article'), t('csv.category'), t('csv.price'), t('csv.published'), t('csv.views'), t('csv.boosted'), t('csv.clicks'), t('csv.messages'), t('csv.status')],
    ...stats.listings.map(p => [
      p.listing.title, p.listing.category.name, p.listing.price ?? '', (p.listing.publishedAt ?? p.listing.createdAt).slice(0, 10),
      p.views, p.boostedViews, p.clicks, p.messages, p.listing.status === 'SOLD' ? t('status.sold') : p.boosted ? t('status.boostActive') : t('status.online'),
    ]),
  ]
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = t('csv.file', { days: String(stats.days) })
  a.click()
  URL.revokeObjectURL(a.href)
}

function StatusChip({ p }: { p: ListingPerformance }) {
  const t = useT(statsNs)
  if (p.listing.status === 'SOLD') return <span className="inline-flex items-center gap-1 rounded-lg bg-tertiary-soft px-2 py-1 text-label-sm text-tertiary"><Icon name="done_all" size={14} /> {!p.soldInHours ? t('status.sold') : p.soldInHours < 72 ? t('status.soldInHours', { n: p.soldInHours }) : t('status.soldInDays', { n: Math.round(p.soldInHours / 24) })}</span>
  if (p.boosted) return <span className="inline-flex items-center gap-1 rounded-lg bg-primary-fixed px-2 py-1 text-label-sm text-primary"><Icon name="bolt" size={14} /> {t('status.boostActive')}</span>
  if (p.pendingOffer) return <span className="inline-flex items-center gap-1 rounded-lg bg-tertiary-soft px-2 py-1 text-label-sm text-tertiary"><Icon name="local_offer" size={14} /> {t('status.offer')}</span>
  return <span className="rounded-lg bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant">{t('status.online')}</span>
}

function RowAction({ p, onNavigate }: { p: ListingPerformance; onNavigate: (x: any) => void }) {
  const t = useT(statsNs)
  if (p.listing.status === 'SOLD') return <span className="text-body-sm text-on-surface-variant">{t('action.closed')}</span>
  if (p.boosted) return <button onClick={() => onNavigate('seller-premium')} className="cursor-pointer rounded-lg border border-outline-variant bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface hover:bg-surface-container-low">{t('action.optimize')}</button>
  return <button onClick={() => onNavigate('seller-premium')} className="cursor-pointer whitespace-nowrap rounded-lg border-none bg-primary px-3 py-1.5 text-label-md text-white hover:bg-primary-dark">{t('action.boost')}</button>
}

// "Statistiques de vente & Visibilité" mockup — every figure comes from
// sellerStats (daily listing counters, chats, concluded deals, wallet).
export default function Stats({ onNavigate, onSelectListing, currentUser, onLogout }: Props) {
  const t = useT(statsNs)
  const locale = useLocale()
  const [period, setPeriod] = useState('30')
  const [exportOpen, setExportOpen] = useState(false)
  const [search, setSearch] = useState('')
  const days = PERIODS.find(p => p.key === period)!.days()
  const { data, loading } = useQuery<{ sellerStats: SellerStats }>(SELLER_STATS_QUERY, { variables: { days } })
  const s = data?.sellerStats
  // Advanced report and market prices: "Vendeur certifié" (the server
  // enforces it too).
  const advanced = currentUser?.badge === 'CERTIFIED'
  const market = useQuery<{ myMarketPositions: MarketPosition[] }>(MY_MARKET_POSITIONS_QUERY, { skip: !advanced }).data?.myMarketPositions
  const upgrade = () => onNavigate('seller-badge')

  const chart = useMemo(() => (s?.series ?? []).map(d => ({
    day: fmtDate(d.day, { day: 'numeric', month: 'short' }),
    boost: d.boostedViews,
    organique: d.views - d.boostedViews,
    total: d.views,
  })), [s, locale]) // day labels follow the language
  const peak = chart.reduce<(typeof chart)[number] | null>((best, d) => (!best || d.total > best.total ? d : best), null)
  const boostedShare = s && s.views ? Math.round((s.series.reduce((n, d) => n + d.boostedViews, 0) / s.views) * 100) : 0
  const rows = (s?.listings ?? []).filter(p => p.listing.title.toLowerCase().includes(search.trim().toLowerCase()))
  const f = s?.funnel
  const ratio = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null)

  // Only the layout on screen: a chart inside a hidden subtree measures
  // 0 × 0 (recharts warning) and the other layout's queries run for nothing.
  const wide = useMediaQuery('(min-width: 768px)')

  return (
    <AccountLayout active="seller-stats" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      {!wide && <div>
        <StatsMobile s={s} period={period} periods={PERIODS} onPeriod={setPeriod} badge={currentUser?.badge} onNavigate={onNavigate} onSelectListing={onSelectListing} advanced={advanced} />
        <VisibilityPanel days={days} className="mt-4" />
      </div>}
      {wide && <div className="mx-auto max-w-[1180px] pb-8">
        <nav className="mb-2 hidden items-center gap-1 text-label-sm text-on-surface-variant md:flex">
          <span>Dilchap Seller</span><Icon name="chevron_right" size={14} />{/* i18n-ignore */}
          <button onClick={() => onNavigate('buyer-dashboard')} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-primary">{t('crumb.dashboard')}</button>
          <Icon name="chevron_right" size={14} /><span className="text-on-surface">{t('crumb.stats')}</span>
        </nav>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">{t('title')}</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('intro')}</p>
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
            <label className="flex items-center gap-2 rounded-xl bg-surface-lowest px-3 py-2 text-label-md text-on-surface shadow-sm">
              <Icon name="calendar_month" size={18} className="text-primary" />
              <Select value={period} onChange={e => setPeriod(e.target.value)} className="cursor-pointer border-none bg-transparent text-label-md text-on-surface outline-none">
                {PERIODS.map(p => <option key={p.key} value={p.key} disabled={!advanced && p.key === '90'}>{!advanced && p.key === '90' ? t('periodCertified', { label: p.label }) : p.label}</option>)}
              </Select>
            </label>
            <div className="relative">
              <button onClick={() => (advanced ? setExportOpen(o => !o) : upgrade())} disabled={!s} title={advanced ? undefined : t('export.certifiedOnly')} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-lowest px-3 py-2 text-label-md text-on-surface shadow-sm hover:bg-surface-container-low">
                <Icon name={advanced ? 'download' : 'lock'} size={18} /> {t('export.button')}
              </button>
              {exportOpen && s && (
                <div className="absolute right-0 top-full z-50 mt-1 w-full min-w-[180px] rounded-xl border border-outline-variant bg-surface-lowest p-1 shadow-float">
                  <button onClick={() => { setExportOpen(false); exportCsv(s) }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low"><Icon name="table_view" size={18} /> {t('export.csv')}</button>
                  <button onClick={() => { setExportOpen(false); window.print() }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low"><Icon name="picture_as_pdf" size={18} /> {t('export.pdf')}</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label={t('kpi.views')} icon="visibility" iconCls="bg-primary-fixed text-primary" value={loading ? '—' : nf(s?.views ?? 0)} foot={<><Trend now={s?.views ?? null} prev={s?.viewsPrev ?? null} /> {t('kpi.vsPrevious')}</>} />
          <Kpi label={t('kpi.contacts')} icon="chat_bubble" iconCls="bg-surface-container text-tertiary" value={loading ? '—' : nf(s?.contacts ?? 0)} foot={<><Trend now={s?.contacts ?? null} prev={s?.contactsPrev ?? null} /> {t('kpi.contactsFoot')}</>} />
          <Kpi label={t('kpi.conversion')} icon="price_check" iconCls="bg-surface-container text-primary" value={loading ? '—' : pct(s?.conversionRate)} foot={<><Trend now={s?.conversionRate ?? null} prev={s?.conversionRatePrev ?? null} /> {t('kpi.conversionFoot')}</>} />
          <Kpi label={t('kpi.revenue')} icon="payments" iconCls="bg-tertiary-soft text-tertiary" value={loading ? '—' : <Price amount={s?.revenue ?? 0} />} foot={<Claim><span className="flex items-center gap-1 text-label-sm text-tertiary"><Icon name="savings" size={14} /> {t.rich('kpi.saved', { price: <Price amount={s?.savedCommission ?? 0} /> })}</span></Claim>} />
          <div className="col-span-2 lg:col-span-1">
            <Kpi label={t('kpi.saleDelay')} icon="bolt" iconCls="bg-surface-container text-primary" value={loading ? '—' : s?.avgSaleDays != null ? t.rich('kpi.days', { n: formatNumber(s.avgSaleDays), u: c => <span className="text-headline-sm font-semibold">{c}</span> }) : '—'} foot={s?.avgSaleDaysBoosted != null ? <span className="rounded bg-primary-fixed px-1.5 text-label-sm text-primary">{t('kpi.daysIfBoosted', { n: formatNumber(s.avgSaleDaysBoosted) })}</span> : t('kpi.saleDelayFoot')} />
          </div>
        </section>

        <VisibilityPanel days={days} className="mt-5" />

        <div className="mt-5"><DealStatsPanel d={s?.deals} loading={loading} /></div>

        {/* Traffic + origin */}
        <section className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <div className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-headline-sm text-on-surface">{t('traffic.title')}</h2>
                <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('traffic.sub')}</p>
              </div>
              <div className="flex gap-3 text-label-sm text-on-surface">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> {t('traffic.duringBoost', { pct: boostedShare })}</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#9c6b6b]" /> {t('traffic.outsideBoost', { pct: 100 - boostedShare })}</span>
              </div>
            </div>
            {peak && peak.total > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-body-sm">
                <Icon name="rocket_launch" size={15} className="text-primary" /> <span className="text-primary">{t('traffic.peak', { day: peak.day })}</span>
                <b className="text-on-surface">{t('traffic.peakViews', { n: nf(peak.total) })}</b>{peak.boost > 0 && <span className="text-on-surface-variant">{t('traffic.peakBoost', { pct: Math.round((peak.boost / peak.total) * 100) })}</span>}
              </div>
            )}
            <div className="mt-3 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gBoost" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FE0000" stopOpacity={0.35} /><stop offset="95%" stopColor="#FE0000" stopOpacity={0.02} /></linearGradient>
                    <linearGradient id="gOrg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#9c6b6b" stopOpacity={0.25} /><stop offset="95%" stopColor="#9c6b6b" stopOpacity={0.02} /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-outline-variant)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-lowest)', border: '1px solid var(--color-outline-variant)', borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="organique" name={t('traffic.organic')} stackId="1" stroke="#9c6b6b" strokeWidth={2} fill="url(#gOrg)" />
                  <Area type="monotone" dataKey="boost" name={t('traffic.boosted')} stackId="1" stroke="#FE0000" strokeWidth={2.5} fill="url(#gBoost)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {advanced ? (
          <div className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h2 className="m-0 text-headline-sm text-on-surface">{t('origin.title')}</h2>
              <Icon name="location_on" size={20} className="text-primary" />
            </div>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('origin.sub')}</p>
            <div className="mt-4 flex flex-col gap-3">
              {(s?.origins ?? []).length === 0 && <p className="m-0 text-body-sm text-on-surface-variant">{t('origin.empty')}</p>}
              {(s?.origins ?? []).map((o, i) => {
                const topSales = Math.max(...(s?.origins ?? []).map(x => x.sales))
                return (
                  <div key={o.city}>
                    <div className="mb-1 flex justify-between text-label-md text-on-surface">
                      <span>{o.city}{topSales > 0 && o.sales === topSales && <span className="ml-1 text-label-sm text-primary">{t('origin.top')}</span>}</span>
                      <span>{pct(o.share)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                      <div className={`h-full rounded-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-primary/80' : i === 2 ? 'bg-tertiary' : 'bg-outline-variant'}`} style={{ width: `${Math.max(2, o.share)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            {s?.favoritePlace && (
              <div className="mt-4 flex gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                <Icon name="verified" size={18} className="shrink-0 text-tertiary" />
                <span>{t.rich('origin.favorite', { pct: pct(s.favoritePlaceShare), place: s.favoritePlace, b: c => <b className="text-on-surface">{c}</b> })}</span>
              </div>
            )}
          </div>
          ) : <CertifiedLock title={t('origin.title')} text={t('origin.lockText')} onUpgrade={upgrade} />}
        </section>

        {advanced ? (<>
        {/* Funnel */}
        <section className="mt-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="m-0 text-headline-sm text-on-surface">{t('funnel.title')}</h2>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('funnel.sub')}</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-3 py-1 text-label-sm text-tertiary"><Icon name="trending_up" size={15} /> {t('funnel.globalRate', { pct: pct(f ? ratio(f.sales, f.views) : null) })}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { n: 1, icon: 'storefront', value: f?.impressions, title: t('funnel.impressions'), sub: t('funnel.impressionsSub'), foot: t('funnel.impressionsFoot') },
              { n: 2, icon: 'ads_click', value: f?.views, title: t('funnel.views'), sub: t('funnel.viewsSub'), foot: t('funnel.viewsFoot', { pct: pct(f ? ratio(f.views, f.impressions) : null) }), accent: true },
              { n: 3, icon: 'favorite', value: f?.favorites, title: t('funnel.favorites'), sub: t('funnel.favoritesSub'), foot: t('funnel.favoritesFoot', { pct: pct(f ? ratio(f.favorites, f.views) : null) }) },
              { n: 4, icon: 'forum', value: f?.contacts, title: t('funnel.contacts'), sub: t('funnel.contactsSub'), foot: t('funnel.contactsFoot', { pct: pct(f ? ratio(f.contacts, f.views) : null) }) },
              { n: 5, icon: 'task_alt', value: f?.sales, title: t('funnel.sales'), sub: t('funnel.salesSub'), foot: t('funnel.salesFoot', { pct: pct(f ? ratio(f.sales, f.contacts) : null) }), done: true },
            ].map(st => (
              <div key={st.n} className={`flex flex-col rounded-xl p-4 ${st.done ? 'border border-tertiary/40 bg-tertiary-soft' : 'bg-surface-container-low'}`}>
                <div className={`flex items-center justify-between text-label-sm ${st.done ? 'text-tertiary' : 'text-on-surface-variant'}`}>{t('funnel.step', { n: st.n })} <Icon name={st.icon} size={17} /></div>
                <div className={`mt-2 text-headline-md font-extrabold ${st.done ? 'text-tertiary' : 'text-on-surface'}`}>{st.value == null ? '—' : nf(st.value)}</div>
                <div className={`text-label-md ${st.done ? 'text-tertiary' : 'text-on-surface'}`}>{st.title}</div>
                <div className="flex-1 text-body-sm text-on-surface-variant">{st.sub}</div>
                <div className={`mt-3 text-label-sm ${st.accent ? 'text-primary' : st.done ? 'text-tertiary' : 'text-on-surface'}`}>{st.foot}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Per listing */}
        <section className="mt-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-headline-sm text-on-surface">{t('table.title')}</h2>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('table.sub')}</p>
            </div>
            <label className="flex w-full items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 sm:w-64">
              <Icon name="search" size={18} className="text-on-surface-variant" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('table.filter')} className="w-full border-none bg-transparent text-body-md text-on-surface outline-none" />
            </label>
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
                  {[t('table.article'), t('table.netPrice'), t('table.published'), t('table.views'), t('table.clicks'), t('table.intents'), t('table.messages'), t('table.status'), t('table.action')].map((h, i) => (
                    <th key={h} className={`px-3 py-3 font-semibold ${i === 0 ? 'rounded-l-xl' : ''} ${i === 8 ? 'rounded-r-xl text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.listing.id} className="border-0 border-b border-solid border-outline-variant/60">
                    <td className="px-3 py-3">
                      <button onClick={() => onSelectListing(p.listing.id)} className="flex cursor-pointer items-center gap-3 border-none bg-transparent p-0 text-left">
                        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">{p.listing.coverImageUrl && <img src={p.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                        <span className="min-w-0">
                          <span className="block max-w-[190px] truncate text-label-md text-on-surface">{p.listing.title}</span>
                          <span className="block text-body-sm text-primary">{p.listing.category.name}{p.listing.condition && p.listing.condition !== 'N/A' ? ` • ${p.listing.condition}` : ''}</span>
                        </span>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-label-md text-on-surface"><Price amount={p.listing.price} currency={p.listing.currency} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-body-sm text-on-surface-variant">{ago(p.listing.publishedAt ?? p.listing.createdAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-label-md text-on-surface">{nf(p.views)} <span className={`text-label-sm ${p.boostedViews ? 'text-primary' : 'text-on-surface-variant'}`}>{p.boostedViews ? t('table.boostViews', { n: nf(p.boostedViews) }) : t('table.organic')}</span></td>
                    <td className="px-3 py-3 text-label-md text-on-surface">{nf(p.clicks)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-label-md text-on-surface" title={t('table.intentsTitle')}>{nf(p.intents)} <span className="text-label-sm text-on-surface-variant">{p.intentRate != null ? `(${t('pctSpaced', { n: formatNumber(p.intentRate) })})` : ''}</span></td>
                    <td className="px-3 py-3"><span className="flex items-center gap-1 text-label-md text-tertiary"><Icon name="chat" size={15} /> {p.messages}</span></td>
                    <td className="px-3 py-3"><StatusChip p={p} /></td>
                    <td className="px-3 py-3 text-right"><RowAction p={p} onNavigate={onNavigate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-4 flex flex-col gap-3 md:hidden">
            {rows.map(p => (
              <div key={p.listing.id} className="rounded-xl bg-surface-container-low p-3">
                <button onClick={() => onSelectListing(p.listing.id)} className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-0 text-left">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-container">{p.listing.coverImageUrl && <img src={p.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label-md text-on-surface">{p.listing.title}</span>
                    <span className="block text-label-md font-extrabold text-primary"><Price amount={p.listing.price} currency={p.listing.currency} /></span>
                    <span className="block text-body-sm text-on-surface-variant">{ago(p.listing.publishedAt ?? p.listing.createdAt)}</span>
                  </span>
                  <StatusChip p={p} />
                </button>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[[t('table.viewsShort'), `${nf(p.views)}${p.boostedViews ? ` (+${p.boostedViews})` : ''}`], [t('table.clicks'), nf(p.clicks)], [t('table.messages'), String(p.messages)]].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-surface-lowest py-1.5"><div className="text-label-md text-on-surface">{v}</div><div className="text-label-sm text-on-surface-variant">{k}</div></div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end"><RowAction p={p} onNavigate={onNavigate} /></div>
              </div>
            ))}
          </div>
          {!loading && rows.length === 0 && <p className="m-0 mt-4 text-body-sm text-on-surface-variant">{t('table.empty')}</p>}
        </section>

        {/* Boost ROI + advice */}
        <section className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="rocket_launch" size={19} /></span>
              <h2 className="m-0 flex-1 text-headline-sm text-on-surface">{t('roi.title')}</h2>
              {s?.boost.roi != null && s.boost.roi > 0 && <span className="rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary">{t('roi.badge', { n: formatNumber(s.boost.roi) })}</span>}
            </div>
            <p className="m-0 mt-2 text-body-sm text-on-surface-variant">{t('roi.sub')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-surface-container-low p-3">
                <div className="text-label-sm text-on-surface-variant">{t('roi.acceleration')}</div>
                <div className="text-headline-md font-extrabold text-primary">{s?.boost.acceleration != null ? t('roi.times', { n: formatNumber(s.boost.acceleration) }) : '—'}</div>
                <div className="text-body-sm text-on-surface-variant">{s?.boost.acceleration != null ? t('roi.faster', { n: Math.round(s.boost.acceleration) }) : t('roi.noComparable')}</div>
              </div>
              <div className="rounded-xl bg-surface-container-low p-3">
                <div className="text-label-sm text-on-surface-variant">{t('roi.investment')}</div>
                <div className="whitespace-nowrap text-headline-md font-extrabold text-on-surface"><Credits n={s?.boost.investmentCredits ?? 0} /></div>
                <div className="text-body-sm text-on-surface-variant">{t.rich('roi.investmentFoot', { price: <Price amount={s?.boost.investment ?? 0} />, count: s?.boost.boostActions ?? 0 })}</div>
              </div>
              <div className="rounded-xl bg-surface-container-low p-3">
                <div className="text-label-sm text-on-surface-variant">{t('roi.unlocked')}</div>
                <div className="text-headline-md font-extrabold text-tertiary"><Price amount={s?.boost.unlockedSales ?? 0} /></div>
                <div className="text-body-sm text-on-surface-variant">{t('roi.collected')}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 flex max-w-xs flex-wrap items-center gap-1.5 text-body-sm text-on-surface-variant">{t.rich('roi.creditsBy', { logos: <PaymentLogos size={18} /> })}</p>
              <button onClick={() => onNavigate('seller-premium')} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-5 py-3 text-label-md text-white hover:bg-primary-dark"><Icon name="bolt" size={18} /> {t('roi.boostNew')}</button>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-container-high p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 rounded-md bg-inverse-surface px-2 py-1 text-label-sm text-white"><Icon name="auto_awesome" size={14} className="text-primary-fixed" /> {t('advice.badge')}</span>
              <span className="text-label-sm text-on-surface-variant">{t('advice.market')}</span>
            </div>
            <h3 className="m-0 mt-4 text-headline-sm text-on-surface">{t('advice.title')}</h3>
            {s?.advice ? (
              <>
                <p className="m-0 mt-2 text-body-md text-on-surface-variant">
                  {t.rich(s.advice.topCities.length > 0 ? 'advice.textCities' : 'advice.text', {
                    category: s.advice.categoryName, lift: s.advice.lift, weekday: weekdayName(s.advice.weekday), start: s.advice.startHour, end: s.advice.endHour,
                    cities: s.advice.topCities.join(' & '),
                    b: c => <b className="text-on-surface">{c}</b>, g: c => <b className="text-tertiary">{c}</b>,
                  })}
                </p>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-lowest p-3">
                  <Icon name="schedule" size={20} className="text-primary" />
                  <div className="flex-1">
                    <div className="text-label-md text-on-surface">{t('advice.nextSlot')}</div>
                    <div className="text-body-sm text-on-surface-variant first-letter:uppercase">{fmtDate(s.advice.nextSlot, { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <button onClick={() => onNavigate('seller-premium')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary">{t('advice.schedule')} <Icon name="arrow_forward" size={16} /></button>
                </div>
              </>
            ) : (
              <p className="m-0 mt-2 text-body-md text-on-surface-variant">{t('advice.none')}</p>
            )}
          </div>
        </section>

        {/* Market prices */}
        <section className="mt-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="m-0 text-headline-sm text-on-surface">{t('market.title')}</h2>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('market.sub')}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {(market ?? []).length === 0 && <p className="m-0 text-body-sm text-on-surface-variant">{t('market.empty')}</p>}
            {(market ?? []).map(m => {
              const gap = m.gapPct ?? 0
              const tone = gap > 15 ? 'bg-primary-fixed text-primary' : gap < -15 ? 'bg-verified-soft text-verified' : 'bg-tertiary-soft text-tertiary'
              const label = gap > 15 ? t('market.above') : gap < -15 ? t('market.below') : t('market.within')
              const compared = t('market.compared', { count: m.sampleSize })
              return (
                <button key={m.listing.id} onClick={() => onSelectListing(m.listing.id)} className="flex cursor-pointer flex-col gap-2 rounded-xl border-none bg-surface-container-low p-3 text-left sm:flex-row sm:items-center">
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">{m.listing.coverImageUrl && <img src={m.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                    <span className="min-w-0"><span className="block truncate text-label-md text-on-surface">{m.listing.title}</span><span className="block truncate text-body-sm text-on-surface-variant">{m.categoryName} • {compared}</span></span>
                  </span>
                  {m.insufficientSample || m.median == null || m.low == null || m.high == null ? (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">{t('market.insufficient')}</span>
                  ) : (
                    <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
                      <span className="whitespace-nowrap text-on-surface-variant">{t.rich('market.median', { price: <Price amount={m.median} />, b: c => <b className="text-on-surface">{c}</b> })}</span>
                      <span className="whitespace-nowrap text-on-surface-variant"><Price amount={m.low} /> – <Price amount={m.high} /></span>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${tone}`}>{t('market.gap', { label, gap: `${gap > 0 ? '+' : ''}${formatNumber(gap)}` })}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
        </>) : (
        <CertifiedLock
          className="mt-5"
          title={t('lock.title')}
          text={t('lock.text')}
          items={[t('lock.funnel'), t('lock.perListing'), t('lock.roi'), t('lock.advice'), t('lock.market'), t('lock.history')]}
          onUpgrade={upgrade}
        />
        )}
      </div>}
    </AccountLayout>
  )
}
