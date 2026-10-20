import { useQuery } from '@apollo/client/react'
import Icon from './Icon'
import HelpLink from './HelpLink'
import { formatNumber } from '../lib/format'
import { MY_VISIBILITY_QUERY, type SellerVisibility } from '../graphql/visibility'
import { MY_BOOSTS_QUERY, type RemoteBoost } from '../graphql/promotions'
import { ReportLine } from './VisibilityReport'

// « Statistiques › Affichages »: how often buyers really saw your cards
// (half on screen for a second), in a paid place or not, where, and the
// bilan of your last boosts. Plain bars (no chart library on this panel).

const n = (v: number) => formatNumber(v, 0)

export default function VisibilityPanel({ days, className = '' }: { days: number; className?: string }) {
  const { data, loading } = useQuery<{ myVisibility: SellerVisibility }>(MY_VISIBILITY_QUERY, { variables: { days }, fetchPolicy: 'cache-and-network' })
  const { data: boosts } = useQuery<{ myBoosts: RemoteBoost[] }>(MY_BOOSTS_QUERY, { fetchPolicy: 'cache-and-network' })
  const v = data?.myVisibility
  const recent = (boosts?.myBoosts ?? []).filter(b => b.report).slice(0, 5)
  const max = Math.max(1, ...(v?.series ?? []).map(d => d.impressions))
  const trend = v && v.impressionsPrev ? Math.round(((v.impressions - v.impressionsPrev) / v.impressionsPrev) * 100) : null
  const share = v && v.impressions ? Math.round((v.boosted / v.impressions) * 100) : 0
  return (
    <section className={`rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5 ${className}`} aria-labelledby="vis-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="vis-title" className="m-0 text-headline-sm text-on-surface">Affichages de vos annonces</h2>
          <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Cartes vues par les acheteurs (au moins à moitié, une seconde), dont en position boostée : place réservée « En vedette » ou place en tête après une remontée.</p>
        </div>
        <HelpLink article="statistiques-de-vente" label="Comment c’est mesuré" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-surface-container-low p-3">
          <div className="text-label-sm text-on-surface-variant">Affichages</div>
          <div className="text-headline-sm text-on-surface">{loading && !v ? '—' : n(v?.impressions ?? 0)}</div>
          {trend != null && <div className={`text-label-sm ${trend >= 0 ? 'text-tertiary' : 'text-on-surface-variant'}`}>{trend >= 0 ? '+' : '−'}{n(Math.abs(trend))} % vs avant</div>}
        </div>
        <div className="rounded-xl bg-surface-container-low p-3">
          <div className="text-label-sm text-on-surface-variant">En position boostée</div>
          <div className="text-headline-sm text-on-surface">{loading && !v ? '—' : n(v?.boosted ?? 0)}</div>
          <div className="text-label-sm text-on-surface-variant">{share} %</div>
        </div>
        <div className="rounded-xl bg-surface-container-low p-3">
          <div className="text-label-sm text-on-surface-variant">Période précédente</div>
          <div className="text-headline-sm text-on-surface">{loading && !v ? '—' : n(v?.impressionsPrev ?? 0)}</div>
          <div className="text-label-sm text-on-surface-variant">{days} jours</div>
        </div>
      </div>
      {v && v.impressions > 0 && (
        <div className="mt-4">
          <div className="flex h-24 items-end gap-[2px]" role="img" aria-label={`Affichages par jour sur ${days} jours`}>
            {v.series.map(d => (
              <div key={d.day} title={`${new Date(d.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} : ${n(d.impressions)} affichages, dont ${n(d.boosted)} en position boostée`} className="flex min-w-0 flex-1 flex-col justify-end" style={{ height: '100%' }}>
                <div className="w-full rounded-t-sm bg-primary" style={{ height: `${(d.boosted / max) * 100}%` }} />
                <div className="w-full bg-outline-variant" style={{ height: `${((d.impressions - d.boosted) / max) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-3 text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> En position boostée</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-outline-variant" /> Place habituelle</span>
          </div>
        </div>
      )}
      {!!v?.placements.length && (
        <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 p-0 text-body-sm">
          {v.placements.map(p => (
            <li key={p.placement} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-on-surface">{p.label}</span>
              <span className="shrink-0 whitespace-nowrap text-on-surface-variant"><b className="text-on-surface">{n(p.impressions)}</b>{p.boosted ? ` · ${n(p.boosted)} boostés` : ''}</span>
            </li>
          ))}
        </ul>
      )}
      {v && v.impressions === 0 && <p className="m-0 mt-3 text-body-sm text-on-surface-variant">Aucun affichage mesuré sur la période.</p>}
      {recent.length > 0 && (
        <>
          <h3 className="m-0 mt-5 flex items-center gap-1.5 text-label-lg text-on-surface"><Icon name="rocket_launch" size={17} className="text-primary" /> Bilan de vos derniers boosts</h3>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            {recent.map(b => (
              <li key={b.id} className="rounded-xl bg-surface-container-low p-3">
                <div className="truncate text-label-md text-on-surface">{b.listing?.title ?? '—'}</div>
                <ReportLine report={b.report} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
