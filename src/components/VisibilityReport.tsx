import { useState } from 'react'
import Icon from './Icon'
import BottomSheet from './BottomSheet'
import HelpLink from './HelpLink'
import { formatNumber } from '../lib/format'
import { fmtDate, useT } from '../i18n'
import visibility from '../i18n/ns/visibility'
import type { VisibilityReport } from '../graphql/visibility'

// The bilan of a boost or a bump, as the API measured it: cards really seen
// (any place, and in the place the formula pays for), views of the listing,
// contacts and favourites, over the days it ran — next to the same number of
// days just before, or an average listing of its category when there is no
// « before ». Nothing is estimated on the device.

const n = (v: number) => formatNumber(v, 0)
const day = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'short' })

export function periodLabel(r: VisibilityReport) {
  const from = day(r.from)
  const to = day(r.ongoing ? new Date().toISOString() : r.to)
  const t = visibility.t
  return `${from === to ? t('period.day', { day: from }) : t('period.range', { from, to })}${r.ongoing ? t('period.ongoing') : ''}`
}

function lift(r: VisibilityReport) {
  if (r.liftPercent == null) return null
  const up = r.liftPercent >= 0
  return <span className={`whitespace-nowrap rounded-full px-1.5 text-label-sm font-bold ${up ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>{visibility.t('percentSigned', { sign: up ? '+' : '−', n: n(Math.abs(r.liftPercent)) })}</span>
}

/** One line: « +320 % d’affichages (1 240), 14 vues, 2 contacts ». */
export function ReportLine({ report, className = '' }: { report?: VisibilityReport | null; className?: string }) {
  const t = useT(visibility)
  const [open, setOpen] = useState(false)
  if (!report) return null
  return (
    <>
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(true) }} className={`flex min-w-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left text-body-sm text-tertiary hover:underline ${className}`}>
        <Icon name="trending_up" size={14} className="shrink-0" /> <span className="min-w-0">{t('report.line', { summary: report.summary })}</span>
      </button>
      <div onClick={e => e.stopPropagation()}>
        <BottomSheet open={open} onClose={() => setOpen(false)} title={t('report.sheetTitle')}>
          <ReportCard report={report} />
        </BottomSheet>
      </div>
    </>
  )
}

function Stat({ icon, label, value, before }: { icon: string; label: string; value: number; before?: number | null }) {
  const t = useT(visibility)
  return (
    <div className="min-w-0 rounded-xl bg-surface-container-low p-3">
      <div className="flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name={icon} size={14} /> {label}</div>
      <div className="text-headline-sm text-on-surface">{n(value)}</div>
      {before != null && <div className="text-label-sm text-on-surface-variant">{t('report.before', { n: n(before) })}</div>}
    </div>
  )
}

/** The detail (sheet, Booster history, Statistiques). */
export function ReportCard({ report: r }: { report: VisibilityReport }) {
  const t = useT(visibility)
  return (
    <div className="flex flex-col gap-3 text-body-sm text-on-surface">
      <p className="m-0 flex flex-wrap items-center gap-2 text-on-surface-variant">
        <Icon name="calendar_month" size={15} /> {t('report.periodDays', { period: periodLabel(r), count: r.days })}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon="visibility" label={t('impressions')} value={r.impressions} before={r.baseline === 'BEFORE' ? r.impressionsBefore : null} />
        {r.boostedImpressions != null && <Stat icon="star" label={t('boostedPosition')} value={r.boostedImpressions} />}
        <Stat icon="ads_click" label={t('report.views')} value={r.views} before={r.baseline === 'BEFORE' ? r.viewsBefore : null} />
        <Stat icon="chat" label={t('report.contacts')} value={r.contacts} before={r.baseline === 'BEFORE' ? r.contactsBefore : null} />
      </div>
      <p className="m-0 flex flex-wrap items-center gap-2">
        {lift(r)}
        <span>
          {r.baseline === 'BEFORE' && r.impressionsBefore != null && t('report.vsBefore', { count: r.days, n: n(r.impressionsBefore) })}
          {r.baseline === 'CATEGORY' && r.categoryAverage != null && t('report.vsCategory', { n: n(r.categoryAverage) })}
          {r.baseline === 'NONE' && t('report.noBaseline')}
        </span>
      </p>
      {r.boostedImpressions != null && r.boostedPlace && <p className="m-0 text-on-surface-variant">{t.rich('report.boostedOf', { count: r.boostedImpressions, place: r.boostedPlace, b: c => <b className="text-on-surface">{c}</b> })}</p>}
      {r.boostedImpressions == null && <p className="m-0 text-on-surface-variant">{t('report.badgeOnly')}</p>}
      {r.favorites > 0 && <p className="m-0 text-on-surface-variant">{t('report.favorites', { count: r.favorites })}</p>}
      {r.reelViews != null && r.reelViews > 0 && <p className="m-0 flex items-center gap-1.5 text-on-surface-variant"><Icon name="smart_display" size={15} className="shrink-0 text-tertiary" /> <span>{t.rich('report.reelViews', { count: r.reelViews, b: c => <b className="text-on-surface">{c}</b> })}</span></p>}
      <p className="m-0 text-label-sm text-on-surface-variant">{t('report.definition')}</p>
      <HelpLink article="statistiques-de-vente" label={t('howMeasured')} />
    </div>
  )
}
