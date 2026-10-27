import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from './AccountLayout'
import { MY_SHOP_QUERY, MY_SHOP_STATS_QUERY, type MyShopData, type ShopStats as Stats } from '../../graphql/shops'
import { formatNumber } from '../../lib/format'
import type { AuthUser } from '../../graphql/auth'
import { usePriceVars } from '../../lib/countries'
import { fmtDate, useT } from '../../i18n'
import common from '../../i18n/ns/common'
import shopStats from '../../i18n/ns/shopStats'

type Props = {
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

function Delta({ now, before }: { now: number, before: number }) {
  const t = useT(shopStats)
  if (!before) return now ? <span className="whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary">{t('new')}</span> : null
  const pct = Math.round(((now - before) / before) * 100)
  const up = pct >= 0
  return (
    <span className={`flex items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${up ? 'bg-tertiary-soft text-tertiary' : 'bg-primary-fixed text-primary'}`}>
      <Icon name={up ? 'trending_up' : 'trending_down'} size={14} /> {t('delta', { pct: `${up ? '+' : ''}${pct}` })}
    </span>
  )
}

const csv = (s: Stats) => {
  const t = shopStats.t
  const rows = [[t('csv.day'), t('visits'), t('csv.follows'), t('listingViews')], ...s.series.map(d => [d.day, d.visits, d.follows, d.listingViews])]
  const blob = new Blob([`﻿${rows.map(r => r.join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = t('csv.file', { days: String(s.days) })
  a.click()
  URL.revokeObjectURL(a.href)
}

// "Statistiques & Performances Boutique" — real counters only.
export default function ShopStats({ onNavigate, onSelectListing, currentUser, onLogout }: Props) {
  const t = useT(shopStats)
  const tc = useT(common)
  const [days, setDays] = useState(30)
  const { data: shopData } = useQuery<MyShopData>(MY_SHOP_QUERY, { variables: usePriceVars() })
  const { data, loading } = useQuery<{ myShopStats: Stats }>(MY_SHOP_STATS_QUERY, { variables: { days } })
  const s = data?.myShopStats
  const shop = shopData?.myShop.shop

  const layout = (children: React.ReactNode) => (
    <AccountLayout active="seller-shop-stats" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title={t('title')} onBack={() => onNavigate('seller-shop')}>
      <div className="mx-auto max-w-[1200px] pb-24 lg:pb-8">{children}</div>
    </AccountLayout>
  )
  if (!shopData) return layout(<p className="text-body-md text-on-surface-variant">{tc('loading')}</p>)
  if (!shop) return layout(
    <div className="rounded-2xl bg-surface-lowest p-6 text-center shadow-sm">
      <p className="m-0 text-body-md text-on-surface-variant">{t('noShop')}</p>
      <button onClick={() => onNavigate('seller-shop')} className="mt-3 inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="storefront" size={18} /> {t('openShop')}</button>
    </div>,
  )

  const cards = s ? [
    { icon: 'storefront', label: t('card.visits'), value: formatNumber(s.visits), now: s.visits, before: s.visitsPrevious, sub: t('card.visitsSub') },
    { icon: 'person_add', label: t('card.follows'), value: `+${formatNumber(s.followsGained)}`, now: s.followsGained, before: s.followsPrevious, sub: t('card.followsSub', { n: formatNumber(s.followersCount) }) },
    { icon: 'visibility', label: t('listingViews'), value: formatNumber(s.listingViews), now: s.listingViews, before: s.listingViewsPrevious, sub: t('card.viewsSub') },
    { icon: 'handshake', label: t('card.sales'), value: formatNumber(s.periodSales), now: s.periodSales, before: s.periodSalesPrevious, sub: t.rich('card.salesSub', { price: <Price amount={s.periodSalesVolume} /> }) },
  ] : []
  const chart = (s?.series ?? []).map(d => ({ ...d, label: fmtDate(`${d.day}T00:00:00Z`, { day: 'numeric', month: 'short', timeZone: 'UTC' }) }))

  return layout(<>
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary"><Icon name="verified" size={14} fill /> {shop.name}</span>
        <h1 className="m-0 mt-1 text-headline-lg text-on-surface">{t('title')}</h1>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('intro')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-surface-container p-1">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`h-9 cursor-pointer whitespace-nowrap rounded-lg border-none px-3 text-label-md ${days === d ? 'bg-surface-lowest text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>{t('days', { n: d })}</button>
          ))}
        </div>
        {s && <button onClick={() => csv(s)} className="flex h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-surface-lowest px-3 text-label-md text-on-surface shadow-sm"><Icon name="download" size={18} /> {t('export')}</button>}
      </div>
    </div>

    {loading && !s ? <p className="mt-6 text-body-md text-on-surface-variant">{tc('loading')}</p> : s && <>
      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name={c.icon} size={20} /></span>
              <Delta now={c.now} before={c.before} />
            </div>
            <div className="mt-3 text-label-sm uppercase text-on-surface-variant">{c.label}</div>
            <div className="text-headline-lg font-extrabold text-on-surface">{c.value}</div>
            <div className="truncate text-body-sm text-on-surface-variant">{c.sub}</div>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-headline-sm text-on-surface">{t('daily', { n: days })}</h2>
          <div className="flex items-center gap-4 text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> {t('visits')}</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-2.5 w-2.5 rounded-sm bg-surface-container-highest" /> {t('listingViews')}</span>
          </div>
        </div>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} />
              <Tooltip formatter={(v, n) => [v, n === 'visits' ? t('visits') : t('listingViews')]} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }} />
              <Bar dataKey="listingViews" fill="var(--surface-container-highest)" radius={[4, 4, 0, 0]} />
              <Line dataKey="visits" type="monotone" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5">
          <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="leaderboard" size={20} className="text-primary" /> {t('top')}</h2>
          {s.topListings.length === 0 ? <p className="m-0 mt-3 text-body-sm text-on-surface-variant">{t('topEmpty')}</p> : (
            <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {s.topListings.map((l, i) => (
                <li key={l.id}>
                  <button onClick={() => onSelectListing(l.id)} className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border-none bg-surface-container-low p-2.5 text-left">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-md ${i === 0 ? 'bg-primary text-white' : 'bg-surface-lowest text-on-surface-variant'}`}>{i + 1}</span>
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">{l.coverUrl && <img src={l.coverUrl} alt="" className="h-full w-full object-cover" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label-md text-on-surface">{l.title}</span>
                      <span className="block truncate text-body-sm text-on-surface-variant">{l.aisleName ? t('aisle', { name: l.aisleName }) : t('noAisle')}</span>
                      <span className="block text-body-sm text-tertiary sm:hidden">{t('viewsN', { n: formatNumber(l.views) })} • {t('chats', { count: l.chats })} • {t('sales', { count: l.sales })}</span>
                    </span>
                    <span className="hidden shrink-0 text-right sm:block"><span className="block whitespace-nowrap text-label-md text-on-surface">{t('viewsN', { n: formatNumber(l.views) })}</span><span className="block whitespace-nowrap text-body-sm text-tertiary">{t('chats', { count: l.chats })} • {t('sales', { count: l.sales })}</span></span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="warning" size={20} className="text-primary" /> {t('low.title')}</h2>
            {s.lowStock.length > 0 && <span className="whitespace-nowrap rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">{t('low.items', { count: s.lowStock.length })}</span>}
          </div>
          <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('low.text')}</p>
          {s.lowStock.length === 0 ? <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><Icon name="check_circle" size={17} /> {t('low.none')}</p> : (
            <div className="mt-3 flex flex-col gap-2">
              {s.lowStock.map(l => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5">
                  <div className="min-w-0 flex-1"><div className="truncate text-label-md text-on-surface">{l.title}</div><div className={`text-body-sm ${l.quantity <= 1 ? 'text-primary' : 'text-on-surface-variant'}`}>{l.quantity <= 1 ? t('low.last') : t('low.left', { n: l.quantity })}</div></div>
                  <button onClick={() => onNavigate('seller-shop')} className="flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-lg border-none bg-surface-lowest px-3 text-label-md text-on-surface">{t('low.adjust')}</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <p className="m-0 mt-3 text-body-sm text-on-surface-variant">{t('footnote', { count: s.salesCount })}</p>
    </>}
  </>)
}
