import { useQuery } from '@apollo/client/react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { formatNumber } from '../../lib/format'
import { MY_REPUTATION_QUERY } from '../../graphql/sellerHub'
import type { SellerStats } from '../../graphql/sellerTools'
import Select from '../../components/Select'

type Props = {
  s?: SellerStats
  period: string
  periods: { key: string; label: string }[]
  onPeriod: (key: string) => void
  verified?: boolean
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
}

const growth = (now: number | null | undefined, prev: number | null | undefined) =>
  now == null || prev == null || prev === 0 ? null : Math.round(((now - prev) / prev) * 100)

function Delta({ v }: { v: number | null }) {
  if (v == null) return null
  return <span className={`flex items-center rounded px-1.5 text-label-sm ${v >= 0 ? 'bg-tertiary-soft text-tertiary' : 'bg-primary-fixed text-primary'}`}><Icon name={v >= 0 ? 'arrow_upward' : 'arrow_downward'} size={12} />{Math.abs(v)}%</span>
}

// "Statistiques Vendeur" (Stitch mobile): revenue hero, 4 KPIs, views vs
// contacts curve, recent listings and the boost comparison.
export default function StatsMobile({ s, period, periods, onPeriod, verified, onNavigate, onSelectListing }: Props) {
  const { data: repData } = useQuery<{ myReputation: { averageRating: number; reviewsCount: number } }>(MY_REPUTATION_QUERY)
  const rep = repData?.myReputation
  const chart = (s?.series ?? []).map(d => ({ day: new Date(d.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), Vues: d.views, Contacts: d.contacts }))
  const boosted = (s?.listings ?? []).filter(l => l.boosted || l.boostedViews > 0)
  const organic = (s?.listings ?? []).filter(l => !l.boosted && l.boostedViews === 0)
  const perWeek = (rows: typeof boosted) => (rows.length && s ? Math.round((rows.reduce((n, r) => n + r.views, 0) / rows.length) * (7 / s.days)) : 0)
  const withBoost = perWeek(boosted)
  const without = perWeek(organic)
  const lift = without ? Math.round(((withBoost - without) / without) * 100) : null
  const maxBar = Math.max(1, withBoost, without)

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          {verified && <div className="flex items-center gap-1 text-label-sm uppercase text-tertiary"><Icon name="verified" size={14} /> Vendeur certifié</div>}
          <h1 className="m-0 text-headline-lg-mobile text-on-surface">Statistiques Vendeur</h1>
        </div>
        <label className="flex items-center gap-1.5 rounded-xl bg-surface-container-high px-2.5 py-2 text-label-md text-on-surface">
          <Icon name="calendar_month" size={17} />
          <Select value={period} onChange={e => onPeriod(e.target.value)} className="border-none bg-transparent text-label-md text-on-surface outline-none">
            {periods.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </Select>
        </label>
      </div>

      <section className="rounded-2xl bg-primary p-4 text-white">
        <div className="flex items-center justify-between"><span className="text-label-md text-white/85">Chiffre d'affaires de la période</span><Delta v={growth(s?.revenue, s?.revenuePrev)} /></div>
        <div className="mt-1 text-headline-lg font-extrabold"><Price amount={s?.revenue ?? 0} /></div>
        <div className="mt-2 flex items-center justify-between text-label-sm text-white/85">
          <span className="flex items-center gap-1"><Icon name="verified_user" size={15} /> 0% de commission Dilchap</span>
          <button onClick={() => onNavigate('seller-wallet')} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-white underline">Détails</button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { icon: 'visibility', value: formatNumber(s?.views ?? 0), label: "Vues d'annonces", side: <Delta v={growth(s?.views, s?.viewsPrev)} /> },
          { icon: 'forum', value: formatNumber(s?.contacts ?? 0), label: 'Contacts initiés', side: <Delta v={growth(s?.contacts, s?.contactsPrev)} /> },
          { icon: 'shopping_bag', value: formatNumber(s?.funnel.sales ?? 0), label: 'Ventes conclues', side: <span className="text-label-sm text-on-surface-variant">Tx conv. {s?.conversionRate != null ? `${Math.round(s.conversionRate)}%` : '—'}</span> },
          { icon: 'star', value: rep?.reviewsCount ? <>{rep.averageRating.toFixed(1)}<span className="text-body-sm font-normal text-on-surface-variant"> / 5</span></> : '—', label: `${rep?.reviewsCount ?? 0} avis`, side: rep && rep.averageRating >= 4.5 && rep.reviewsCount ? <span className="rounded bg-tertiary-soft px-1.5 text-label-sm text-tertiary">Excellent</span> : null },
        ].map(k => (
          <div key={k.label} className="rounded-2xl bg-surface-lowest p-3 shadow-sm">
            <div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed/60 text-primary"><Icon name={k.icon} size={18} /></span>{k.side}</div>
            <div className="mt-2 text-headline-md font-extrabold text-on-surface">{k.value}</div>
            <div className="text-body-sm text-on-surface-variant">{k.label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div><h2 className="m-0 text-headline-sm text-on-surface">Évolution de l'attractivité</h2><p className="m-0 text-body-sm text-on-surface-variant">Fréquentation &amp; négociations sur la période</p></div>
          <div className="flex flex-col gap-0.5 text-label-sm"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Vues</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-tertiary" /> Contacts</span></div>
        </div>
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={30} />
              <Tooltip contentStyle={{ background: 'var(--color-surface-lowest)', border: '1px solid var(--color-outline-variant)', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="Vues" stroke="#FE0000" strokeWidth={2.5} fill="#FE0000" fillOpacity={0.12} />
              <Area type="monotone" dataKey="Contacts" stroke="#006947" strokeWidth={2.5} fill="#006947" fillOpacity={0.08} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="m-0 text-headline-sm text-on-surface">Annonces actives &amp; récentes</h2><button onClick={() => onNavigate('seller-listings')} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">Voir tout ({s?.listings.length ?? 0})</button></div>
        <div className="flex flex-col gap-2">
          {(s?.listings ?? []).slice(0, 4).map(p => (
            <button key={p.listing.id} onClick={() => onSelectListing(p.listing.id)} className="flex cursor-pointer flex-col gap-2 rounded-2xl border-none bg-surface-lowest p-3 text-left shadow-sm">
              <span className="flex w-full items-center gap-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-container">{p.listing.coverImageUrl && <img src={p.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2"><span className="truncate text-label-lg text-on-surface">{p.listing.title}</span><span className={`shrink-0 rounded px-1.5 text-label-sm uppercase ${p.listing.status === 'SOLD' ? 'bg-surface-container text-on-surface-variant' : p.pendingOffer ? 'bg-amber-100 text-amber-800' : 'bg-tertiary-soft text-tertiary'}`}>{p.listing.status === 'SOLD' ? 'Vendu' : p.pendingOffer ? 'Offre reçue' : 'Actif'}</span></span>
                  <span className="block text-headline-sm font-extrabold text-on-surface"><Price amount={p.listing.price} currency={p.listing.currency} /></span>
                  <span className="flex gap-3 text-label-sm text-on-surface-variant"><span className="flex items-center gap-0.5"><Icon name="visibility" size={13} /> {formatNumber(p.views)}</span><span className="flex items-center gap-0.5"><Icon name="chat" size={13} /> {p.messages} messages</span></span>
                </span>
              </span>
              {!p.boosted && p.listing.status !== 'SOLD' && (
                <span onClick={e => { e.stopPropagation(); onNavigate('seller-premium') }} className="flex items-center justify-between rounded-lg bg-primary-fixed/60 px-3 py-2 text-label-md text-primary"><span className="flex items-center gap-1"><Icon name="bolt" size={16} /> Booster la visibilité</span><span className="rounded bg-primary px-1.5 text-label-sm text-white">dès 500 F</span></span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="rocket_launch" size={20} /></span>
          <div><div className="text-headline-sm text-on-surface">Multipliez vos ventes</div><div className="text-body-sm text-on-surface-variant">Accélérez la conclusion de vos négociations</div></div>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-label-md text-on-surface"><span className="flex items-center gap-1"><Icon name="bolt" size={15} className="text-primary" /> Annonces avec boost</span>{lift != null && lift > 0 && <span className="text-primary">+{lift}%</span>}</div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-primary" style={{ width: `${(withBoost / maxBar) * 100}%` }} /></div>
            <div className="mt-0.5 text-right text-label-sm text-on-surface-variant">~{formatNumber(withBoost)} vues / semaine</div>
          </div>
          <div>
            <div className="flex justify-between text-label-md text-on-surface-variant"><span>Annonces sans boost</span><span>Standard</span></div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-outline-variant" style={{ width: `${(without / maxBar) * 100}%` }} /></div>
            <div className="mt-0.5 text-right text-label-sm text-on-surface-variant">~{formatNumber(without)} vues / semaine</div>
          </div>
        </div>
        {s?.avgSaleDaysBoosted != null && <p className="m-0 mt-3 flex gap-2 rounded-xl bg-surface-lowest p-3 text-body-sm text-on-surface"><Icon name="lightbulb" size={18} className="shrink-0 text-tertiary" /> Vos annonces boostées se vendent en moyenne en {formatNumber(s.avgSaleDaysBoosted)} jours.</p>}
        <button onClick={() => onNavigate('seller-premium')} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3 text-label-lg text-white"><Icon name="bolt" size={19} /> Booster une annonce maintenant</button>
      </section>
    </div>
  )
}
