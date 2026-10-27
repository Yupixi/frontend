import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { formatNumber } from '../../lib/format'
import { formatResponseTime } from '../../graphql/reviews'
import type { IntentType, SellerDealStats } from '../../graphql/sellerTools'
import { useT } from '../../i18n'
import statsNs from '../../i18n/ns/stats'

// Labels: stats « deals.intent.<TYPE> ».
const INTENT_ICONS: Record<IntentType, string> = {
  CONTACT: 'chat_bubble',
  CALL: 'call',
  FAVORITE: 'favorite',
  OFFER: 'local_offer',
  MEETUP: 'event',
  SHARE: 'share',
}

const pct = (n: number | null | undefined) => (n == null ? '—' : statsNs.t('pctSpaced', { n: formatNumber(n) }))

function Tile({ label, value, foot }: { label: string; value: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-container-low p-3">
      <div className="text-label-sm uppercase text-on-surface-variant">{label}</div>
      <div className="mt-1 text-headline-sm font-extrabold text-on-surface">{value}</div>
      {foot && <div className="mt-0.5 text-body-sm text-on-surface-variant">{foot}</div>}
    </div>
  )
}

// « Mises en relation » of « Statistiques »: the seller's contacts,
// conversations en cours, first reply, sales by source (never the team's
// estimates) and the purchase intents on their listings.
export default function DealStatsPanel({ d, loading }: { d: SellerDealStats | undefined; loading: boolean }) {
  const t = useT(statsNs)
  const v = (x: React.ReactNode) => (loading || !d ? '—' : x)
  const max = Math.max(1, ...(d?.intentsByType ?? []).map(i => i.count))
  const sources = d ? [
    { k: 'code', label: t('deals.salesCode', { n: d.salesCode }), n: d.salesCode },
    { k: 'both', label: t('deals.salesBoth', { n: d.salesBoth }), n: d.salesBoth },
  ].filter(x => x.n > 0) : []
  return (
    <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5" aria-labelledby="deal-stats-title">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="handshake" size={19} /></span>
        <div className="min-w-0">
          <h2 id="deal-stats-title" className="m-0 text-headline-sm text-on-surface">{t('deals.title')}</h2>
          <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">{t('deals.sub')}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Tile label={t('deals.contacts')} value={v(formatNumber(d?.contacts ?? 0))} foot={t('deals.contactsFoot')} />
        <Tile label={t('deals.active')} value={v(formatNumber(d?.activeConversations ?? 0))} foot={t('deals.activeFoot')} />
        <Tile label={t('deals.response')} value={v(formatResponseTime(d?.responseTimeMinutes) ?? '—')} foot={d?.within24hPct != null ? t('deals.within24h', { pct: pct(d.within24hPct) }) : t('deals.medianDelay')} />
        <Tile label={t('deals.sales')} value={v(formatNumber(d?.sales ?? 0))} foot={d && d.salesAmount ? <Price amount={d.salesAmount} /> : t('deals.onDilchap')} />
        <div className="col-span-2 lg:col-span-1">
          <Tile label={t('deals.conversion')} value={v(pct(d?.conversionRate))} foot={t('deals.conversionFoot')} />
        </div>
      </div>
      {d && (sources.length > 0 || d.salesDeclared > 0 || d.salesOffsite > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-label-sm">
          {sources.map(s => <span key={s.k} className="rounded-full bg-tertiary-soft px-2.5 py-1 text-tertiary">{s.label}</span>)}
          {d.salesDeclared > 0 && <span className="rounded-full bg-surface-container px-2.5 py-1 text-on-surface-variant">{t('deals.declared', { count: d.salesDeclared })}</span>}
          {d.salesOffsite > 0 && <span className="rounded-full bg-surface-container px-2.5 py-1 text-on-surface-variant">{t('deals.offsite', { n: d.salesOffsite })}</span>}
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-label-lg text-on-surface">{t('deals.intentsTitle')}</h3>
        <span className="text-body-sm text-on-surface-variant">{v(t.rich('deals.intentsLine', { intents: formatNumber(d?.intents ?? 0), views: formatNumber(d?.views ?? 0), rate: pct(d?.intentRate), b: c => <b className="text-on-surface">{c}</b> }))}</span>
      </div>
      <ul className="m-0 mt-2 grid list-none grid-cols-1 gap-x-6 gap-y-2 p-0 sm:grid-cols-2">
        {(d?.intentsByType ?? []).map(i => (
          <li key={i.type} className="min-w-0">
            <div className="flex items-center justify-between gap-2 text-body-sm">
              <span className="flex min-w-0 items-center gap-1.5 text-on-surface"><Icon name={INTENT_ICONS[i.type]} size={16} className="shrink-0 text-on-surface-variant" /><span className="truncate">{t(`deals.intent.${i.type}`)}</span></span>
              <span className="shrink-0 font-semibold tabular-nums text-on-surface">{formatNumber(i.count)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container">
              <div className="h-full rounded-full bg-primary" style={{ width: i.count ? `${Math.max(3, (i.count / max) * 100)}%` : 0 }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
