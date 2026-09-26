import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import Icon from '../../components/Icon'
import { formatNumber } from '../../lib/format'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import StatsMobile from './StatsMobile'
import { SELLER_STATS_QUERY, type ListingPerformance, type SellerStats } from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'
import Select from '../../components/Select'
import { PaymentLogos } from '../../components/PaymentLogo'

type Props = { onNavigate: (p: any) => void; onSelectListing: (id: string) => void; currentUser?: AuthUser | null; onLogout: () => void }

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const PERIODS = [
  { key: '7', label: '7 derniers jours', days: () => 7 },
  { key: '30', label: '30 derniers jours', days: () => 30 },
  { key: 'month', label: 'Ce mois-ci', days: () => new Date().getDate() },
  { key: '90', label: '90 jours', days: () => 90 },
]

const nf = (n: number) => formatNumber(n)
const pct = (n: number | null | undefined) => (n == null ? '—' : `${formatNumber(n)}%`)
const ago = (iso: string | null) => {
  if (!iso) return '—'
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
  return d === 0 ? "Aujourd'hui" : `Il y a ${d}j`
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
  const rows = [
    ['Article', 'Catégorie', 'Prix', 'Mise en ligne', 'Vues', 'dont boost', 'Clics', 'Messages', 'Statut'],
    ...stats.listings.map(p => [
      p.listing.title, p.listing.category.name, p.listing.price ?? '', (p.listing.publishedAt ?? p.listing.createdAt).slice(0, 10),
      p.views, p.boostedViews, p.clicks, p.messages, p.listing.status === 'SOLD' ? 'Vendu' : p.boosted ? 'Boost actif' : 'En ligne',
    ]),
  ]
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `dilchap-statistiques-${stats.days}j.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function StatusChip({ p }: { p: ListingPerformance }) {
  if (p.listing.status === 'SOLD') return <span className="inline-flex items-center gap-1 rounded-lg bg-tertiary-soft px-2 py-1 text-label-sm text-tertiary"><Icon name="done_all" size={14} /> Vendu{p.soldInHours ? ` en ${p.soldInHours < 72 ? `${p.soldInHours}h` : `${Math.round(p.soldInHours / 24)}j`}` : ''}</span>
  if (p.boosted) return <span className="inline-flex items-center gap-1 rounded-lg bg-primary-fixed px-2 py-1 text-label-sm text-primary"><Icon name="bolt" size={14} /> Boost actif</span>
  if (p.pendingOffer) return <span className="inline-flex items-center gap-1 rounded-lg bg-tertiary-soft px-2 py-1 text-label-sm text-tertiary"><Icon name="local_offer" size={14} /> Offre reçue</span>
  return <span className="rounded-lg bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant">En ligne</span>
}

function RowAction({ p, onNavigate }: { p: ListingPerformance; onNavigate: (x: any) => void }) {
  if (p.listing.status === 'SOLD') return <span className="text-body-sm text-on-surface-variant">Clôturé</span>
  if (p.boosted) return <button onClick={() => onNavigate('seller-premium')} className="cursor-pointer rounded-lg border border-outline-variant bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface hover:bg-surface-container-low">Optimiser</button>
  return <button onClick={() => onNavigate('seller-premium')} className="cursor-pointer whitespace-nowrap rounded-lg border-none bg-primary px-3 py-1.5 text-label-md text-white hover:bg-primary-dark">Booster dès 500 F</button>
}

// "Statistiques de vente & Visibilité" mockup — every figure comes from
// sellerStats (daily listing counters, chats, concluded deals, wallet).
export default function Stats({ onNavigate, onSelectListing, currentUser, onLogout }: Props) {
  const [period, setPeriod] = useState('30')
  const [exportOpen, setExportOpen] = useState(false)
  const [search, setSearch] = useState('')
  const days = PERIODS.find(p => p.key === period)!.days()
  const { data, loading } = useQuery<{ sellerStats: SellerStats }>(SELLER_STATS_QUERY, { variables: { days } })
  const s = data?.sellerStats

  const chart = useMemo(() => (s?.series ?? []).map(d => ({
    day: new Date(d.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    boost: d.boostedViews,
    organique: d.views - d.boostedViews,
    total: d.views,
  })), [s])
  const peak = chart.reduce<(typeof chart)[number] | null>((best, d) => (!best || d.total > best.total ? d : best), null)
  const boostedShare = s && s.views ? Math.round((s.series.reduce((n, d) => n + d.boostedViews, 0) / s.views) * 100) : 0
  const rows = (s?.listings ?? []).filter(p => p.listing.title.toLowerCase().includes(search.trim().toLowerCase()))
  const f = s?.funnel
  const ratio = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null)

  return (
    <AccountLayout active="seller-stats" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="md:hidden">
        <StatsMobile s={s} period={period} periods={PERIODS} onPeriod={setPeriod} badge={currentUser?.badge} onNavigate={onNavigate} onSelectListing={onSelectListing} />
      </div>
      <div className="mx-auto hidden max-w-[1180px] pb-8 md:block">
        <nav className="mb-2 hidden items-center gap-1 text-label-sm text-on-surface-variant md:flex">
          <span>Dilchap Seller</span><Icon name="chevron_right" size={14} />
          <button onClick={() => onNavigate('buyer-dashboard')} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-primary">Tableau de bord</button>
          <Icon name="chevron_right" size={14} /><span className="text-on-surface">Statistiques &amp; Performances</span>
        </nav>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">Statistiques de vente &amp; Visibilité</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Analysez le trafic de vos pépites, la conversion de vos discussions chat et le retour sur investissement de vos boosts.</p>
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
            <label className="flex items-center gap-2 rounded-xl bg-surface-lowest px-3 py-2 text-label-md text-on-surface shadow-sm">
              <Icon name="calendar_month" size={18} className="text-primary" />
              <Select value={period} onChange={e => setPeriod(e.target.value)} className="cursor-pointer border-none bg-transparent text-label-md text-on-surface outline-none">
                {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </Select>
            </label>
            <div className="relative">
              <button onClick={() => setExportOpen(o => !o)} disabled={!s} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-lowest px-3 py-2 text-label-md text-on-surface shadow-sm hover:bg-surface-container-low">
                <Icon name="download" size={18} /> Exporter (.PDF / .CSV)
              </button>
              {exportOpen && s && (
                <div className="absolute right-0 top-full z-50 mt-1 w-full min-w-[180px] rounded-xl border border-outline-variant bg-surface-lowest p-1 shadow-float">
                  <button onClick={() => { setExportOpen(false); exportCsv(s) }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low"><Icon name="table_view" size={18} /> Tableau (.CSV)</button>
                  <button onClick={() => { setExportOpen(false); window.print() }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low"><Icon name="picture_as_pdf" size={18} /> Rapport (.PDF)</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Vues catalogue" icon="visibility" iconCls="bg-primary-fixed text-primary" value={loading ? '—' : nf(s?.views ?? 0)} foot={<><Trend now={s?.views ?? null} prev={s?.viewsPrev ?? null} /> vs période précédente</>} />
          <Kpi label="Contacts chat" icon="chat_bubble" iconCls="bg-surface-container text-tertiary" value={loading ? '—' : nf(s?.contacts ?? 0)} foot={<><Trend now={s?.contacts ?? null} prev={s?.contactsPrev ?? null} /> échanges initiés</>} />
          <Kpi label="Conversion chat" icon="price_check" iconCls="bg-surface-container text-primary" value={loading ? '—' : pct(s?.conversionRate)} foot={<><Trend now={s?.conversionRate ?? null} prev={s?.conversionRatePrev ?? null} /> conclus en deal</>} />
          <Kpi label="Volume d'affaires" icon="payments" iconCls="bg-tertiary-soft text-tertiary" value={loading ? '—' : <Price amount={s?.revenue ?? 0} />} foot={<span className="flex items-center gap-1 text-label-sm text-tertiary"><Icon name="savings" size={14} /> Économisé : <Price amount={s?.savedCommission ?? 0} /></span>} />
          <div className="col-span-2 lg:col-span-1">
            <Kpi label="Délai moyen vente" icon="bolt" iconCls="bg-surface-container text-primary" value={loading ? '—' : s?.avgSaleDays != null ? <>{formatNumber(s.avgSaleDays)} <span className="text-headline-sm font-semibold">jours</span></> : '—'} foot={s?.avgSaleDaysBoosted != null ? <span className="rounded bg-primary-fixed px-1.5 text-label-sm text-primary">{formatNumber(s.avgSaleDaysBoosted)} j si boosté</span> : 'publication → vente conclue'} />
          </div>
        </section>

        {/* Traffic + origin */}
        <section className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <div className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-headline-sm text-on-surface">Évolution du trafic d'annonces</h2>
                <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Comparaison journalière entre visites directes et remises en tête payantes</p>
              </div>
              <div className="flex gap-3 text-label-sm text-on-surface">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Trafic boosté ({boostedShare}%)</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#9c6b6b]" /> Organique ({100 - boostedShare}%)</span>
              </div>
            </div>
            {peak && peak.total > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-body-sm">
                <Icon name="rocket_launch" size={15} className="text-primary" /> <span className="text-primary">Pic du {peak.day}</span>
                <b className="text-on-surface">{nf(peak.total)} vues</b>{peak.boost > 0 && <span className="text-on-surface-variant">({Math.round((peak.boost / peak.total) * 100)}% boost)</span>}
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
                  <Area type="monotone" dataKey="organique" name="Organique" stackId="1" stroke="#9c6b6b" strokeWidth={2} fill="url(#gOrg)" />
                  <Area type="monotone" dataKey="boost" name="Boosté" stackId="1" stroke="#FE0000" strokeWidth={2.5} fill="url(#gBoost)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h2 className="m-0 text-headline-sm text-on-surface">Origine du trafic</h2>
              <Icon name="location_on" size={20} className="text-primary" />
            </div>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Communes des acheteurs connectés qui ont consulté vos annonces</p>
            <div className="mt-4 flex flex-col gap-3">
              {(s?.origins ?? []).length === 0 && <p className="m-0 text-body-sm text-on-surface-variant">Pas encore assez de visites d'acheteurs connectés.</p>}
              {(s?.origins ?? []).map((o, i) => {
                const topSales = Math.max(...(s?.origins ?? []).map(x => x.sales))
                return (
                  <div key={o.city}>
                    <div className="mb-1 flex justify-between text-label-md text-on-surface">
                      <span>{o.city}{topSales > 0 && o.sales === topSales && <span className="ml-1 text-label-sm text-primary">(Top conversion)</span>}</span>
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
                <span><b className="text-on-surface">Point de retrait favori :</b> {pct(s.favoritePlaceShare)} de vos ventes conclues se font en main propre à {s.favoritePlace}.</span>
              </div>
            )}
          </div>
        </section>

        {/* Funnel */}
        <section className="mt-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="m-0 text-headline-sm text-on-surface">Entonnoir de Conversion Dilchap</h2>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Découvrez à quelle étape vos visiteurs se transforment en acheteurs engagés</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-3 py-1 text-label-sm text-tertiary"><Icon name="trending_up" size={15} /> Taux global de finalisation : {pct(f ? ratio(f.sales, f.views) : null)}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { n: 1, icon: 'storefront', value: f?.impressions, title: 'Impressions Catalogue', sub: 'Annonces apparues dans le flux & recherche', foot: '100% de base' },
              { n: 2, icon: 'ads_click', value: f?.views, title: 'Clics & Fiches lues', sub: "Visiteurs ayant examiné l'état et photos", foot: `${pct(f ? ratio(f.views, f.impressions) : null)} de taux de clic`, accent: true },
              { n: 3, icon: 'favorite', value: f?.favorites, title: 'Favoris enregistrés', sub: 'Acheteurs en phase de réflexion ou veille', foot: `${pct(f ? ratio(f.favorites, f.views) : null)} des vues` },
              { n: 4, icon: 'forum', value: f?.contacts, title: 'Chats déclenchés', sub: 'Négociations, questions et offres envoyées', foot: `${pct(f ? ratio(f.contacts, f.views) : null)} engagement` },
              { n: 5, icon: 'task_alt', value: f?.sales, title: 'Ventes Conclues', sub: 'Rendez-vous honorés et paiement remis', foot: `${pct(f ? ratio(f.sales, f.contacts) : null)} conv. chat`, done: true },
            ].map(st => (
              <div key={st.n} className={`flex flex-col rounded-xl p-4 ${st.done ? 'border border-tertiary/40 bg-tertiary-soft' : 'bg-surface-container-low'}`}>
                <div className={`flex items-center justify-between text-label-sm ${st.done ? 'text-tertiary' : 'text-on-surface-variant'}`}>Étape {st.n} <Icon name={st.icon} size={17} /></div>
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
              <h2 className="m-0 text-headline-sm text-on-surface">Performances détaillées par annonce</h2>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Identifiez vos articles les plus demandés et appliquez un boost pour accélérer la vente</p>
            </div>
            <label className="flex w-full items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 sm:w-64">
              <Icon name="search" size={18} className="text-on-surface-variant" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer une annonce..." className="w-full border-none bg-transparent text-body-md text-on-surface outline-none" />
            </label>
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
                  {['Article', 'Prix net', 'Mise en ligne', 'Vues (boost)', 'Clics', 'Messages', 'Statut', 'Action'].map((h, i) => (
                    <th key={h} className={`px-3 py-3 font-semibold ${i === 0 ? 'rounded-l-xl' : ''} ${i === 7 ? 'rounded-r-xl text-right' : ''}`}>{h}</th>
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
                    <td className="whitespace-nowrap px-3 py-3 text-label-md text-on-surface">{nf(p.views)} <span className={`text-label-sm ${p.boostedViews ? 'text-primary' : 'text-on-surface-variant'}`}>{p.boostedViews ? `(+${nf(p.boostedViews)} boost)` : '(organique)'}</span></td>
                    <td className="px-3 py-3 text-label-md text-on-surface">{nf(p.clicks)}</td>
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
                  {[['Vues', `${nf(p.views)}${p.boostedViews ? ` (+${p.boostedViews})` : ''}`], ['Clics', nf(p.clicks)], ['Messages', String(p.messages)]].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-surface-lowest py-1.5"><div className="text-label-md text-on-surface">{v}</div><div className="text-label-sm text-on-surface-variant">{k}</div></div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end"><RowAction p={p} onNavigate={onNavigate} /></div>
              </div>
            ))}
          </div>
          {!loading && rows.length === 0 && <p className="m-0 mt-4 text-body-sm text-on-surface-variant">Aucune annonce en ligne sur la période.</p>}
        </section>

        {/* Boost ROI + advice */}
        <section className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="rocket_launch" size={19} /></span>
              <h2 className="m-0 flex-1 text-headline-sm text-on-surface">Rentabilité des Boosts Visibilité</h2>
              {s?.boost.roi != null && s.boost.roi > 0 && <span className="rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary">ROI x{formatNumber(s.boost.roi)} constaté</span>}
            </div>
            <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Impact direct de vos remontées en tête de catalogue sur la période.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-surface-container-low p-3">
                <div className="text-label-sm text-on-surface-variant">Accélération</div>
                <div className="text-headline-md font-extrabold text-primary">{s?.boost.acceleration != null ? `${formatNumber(s.boost.acceleration)}x` : '—'}</div>
                <div className="text-body-sm text-on-surface-variant">{s?.boost.acceleration != null ? `Vente conclue ${Math.round(s.boost.acceleration)}x plus vite` : 'Pas encore de vente boostée comparable'}</div>
              </div>
              <div className="rounded-xl bg-surface-container-low p-3">
                <div className="text-label-sm text-on-surface-variant">Investissement</div>
                <div className="text-headline-md font-extrabold text-on-surface"><Price amount={s?.boost.investment ?? 0} /></div>
                <div className="text-body-sm text-on-surface-variant">{s?.boost.boostActions ?? 0} remise{(s?.boost.boostActions ?? 0) > 1 ? 's' : ''} en tête</div>
              </div>
              <div className="rounded-xl bg-surface-container-low p-3">
                <div className="text-label-sm text-on-surface-variant">Ventes débloquées</div>
                <div className="text-headline-md font-extrabold text-tertiary"><Price amount={s?.boost.unlockedSales ?? 0} /></div>
                <div className="text-body-sm text-on-surface-variant">Encaissés directement</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 flex max-w-xs flex-wrap items-center gap-1.5 text-body-sm text-on-surface-variant">Paiement direct sécurisé <PaymentLogos size={18} /> ou Porte-monnaie</p>
              <button onClick={() => onNavigate('seller-premium')} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-5 py-3 text-label-md text-white hover:bg-primary-dark"><Icon name="bolt" size={18} /> Booster une nouvelle annonce</button>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-container-high p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 rounded-md bg-inverse-surface px-2 py-1 text-label-sm text-white"><Icon name="auto_awesome" size={14} className="text-primary-fixed" /> Conseil Dilchap</span>
              <span className="text-label-sm text-on-surface-variant">Marché de votre catégorie</span>
            </div>
            <h3 className="m-0 mt-4 text-headline-sm text-on-surface">Optimisez vos horaires de publication</h3>
            {s?.advice ? (
              <>
                <p className="m-0 mt-2 text-body-md text-on-surface-variant">
                  « Les annonces de catégorie <b className="text-on-surface">{s.advice.categoryName}</b> reçoivent{' '}
                  <b className="text-tertiary">+{s.advice.lift}% de contacts</b> le <b className="text-on-surface">{WEEKDAYS[s.advice.weekday]} entre {s.advice.startHour}h et {s.advice.endHour}h</b>
                  {s.advice.topCities.length > 0 && <> auprès des acheteurs de {s.advice.topCities.join(' & ')}</>}. »
                </p>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-lowest p-3">
                  <Icon name="schedule" size={20} className="text-primary" />
                  <div className="flex-1">
                    <div className="text-label-md text-on-surface">Prochain créneau optimal</div>
                    <div className="text-body-sm capitalize text-on-surface-variant">{new Date(s.advice.nextSlot).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <button onClick={() => onNavigate('seller-premium')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary">Programmer <Icon name="arrow_forward" size={16} /></button>
                </div>
              </>
            ) : (
              <p className="m-0 mt-2 text-body-md text-on-surface-variant">Pas encore assez de discussions dans votre catégorie pour dégager un créneau optimal. Revenez après quelques ventes.</p>
            )}
          </div>
        </section>
      </div>
    </AccountLayout>
  )
}
