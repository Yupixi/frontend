import { useState } from 'react'
import Icon from './Icon'
import BottomSheet from './BottomSheet'
import HelpLink from './HelpLink'
import { formatNumber } from '../lib/format'
import { dateFormat } from '../lib/intl'
import type { VisibilityReport } from '../graphql/visibility'

// The bilan of a boost or a bump, as the API measured it: cards really seen
// (any place, and in the place the formula pays for), views of the listing,
// contacts and favourites, over the days it ran — next to the same number of
// days just before, or an average listing of its category when there is no
// « before ». Nothing is estimated on the device.

const n = (v: number) => formatNumber(v, 0)
const day = (iso: string) => dateFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso))

export function periodLabel(r: VisibilityReport) {
  const from = day(r.from)
  const to = day(r.ongoing ? new Date().toISOString() : r.to)
  return `${from === to ? `le ${from}` : `du ${from} au ${to}`}${r.ongoing ? ' (en cours)' : ''}`
}

function lift(r: VisibilityReport) {
  if (r.liftPercent == null) return null
  const up = r.liftPercent >= 0
  return <span className={`whitespace-nowrap rounded-full px-1.5 text-label-sm font-bold ${up ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>{up ? '+' : '−'}{n(Math.abs(r.liftPercent))} %</span>
}

/** One line: « +320 % d’affichages (1 240), 14 vues, 2 contacts ». */
export function ReportLine({ report, className = '' }: { report?: VisibilityReport | null; className?: string }) {
  const [open, setOpen] = useState(false)
  if (!report) return null
  return (
    <>
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(true) }} className={`flex min-w-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left text-body-sm text-tertiary hover:underline ${className}`}>
        <Icon name="trending_up" size={14} className="shrink-0" /> <span className="min-w-0">Bilan : {report.summary}</span>
      </button>
      <div onClick={e => e.stopPropagation()}>
        <BottomSheet open={open} onClose={() => setOpen(false)} title="Bilan de visibilité">
          <ReportCard report={report} />
        </BottomSheet>
      </div>
    </>
  )
}

function Stat({ icon, label, value, before }: { icon: string; label: string; value: number; before?: number | null }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-container-low p-3">
      <div className="flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name={icon} size={14} /> {label}</div>
      <div className="text-headline-sm text-on-surface">{n(value)}</div>
      {before != null && <div className="text-label-sm text-on-surface-variant">avant : {n(before)}</div>}
    </div>
  )
}

/** The detail (sheet, Booster history, Statistiques). */
export function ReportCard({ report: r }: { report: VisibilityReport }) {
  return (
    <div className="flex flex-col gap-3 text-body-sm text-on-surface">
      <p className="m-0 flex flex-wrap items-center gap-2 text-on-surface-variant">
        <Icon name="calendar_month" size={15} /> {periodLabel(r)} · {r.days} jour{r.days > 1 ? 's' : ''} mesuré{r.days > 1 ? 's' : ''}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon="visibility" label="Affichages" value={r.impressions} before={r.baseline === 'BEFORE' ? r.impressionsBefore : null} />
        {r.boostedImpressions != null && <Stat icon="star" label="En position boostée" value={r.boostedImpressions} />}
        <Stat icon="ads_click" label="Vues de l’annonce" value={r.views} before={r.baseline === 'BEFORE' ? r.viewsBefore : null} />
        <Stat icon="chat" label="Contacts" value={r.contacts} before={r.baseline === 'BEFORE' ? r.contactsBefore : null} />
      </div>
      <p className="m-0 flex flex-wrap items-center gap-2">
        {lift(r)}
        <span>
          {r.baseline === 'BEFORE' && r.impressionsBefore != null && <>Affichages comparés aux {r.days} jour{r.days > 1 ? 's' : ''} juste avant ({n(r.impressionsBefore)}).</>}
          {r.baseline === 'CATEGORY' && r.categoryAverage != null && <>Comparé à une annonce moyenne de la même catégorie sur les mêmes jours ({n(r.categoryAverage)} affichages) : votre annonce n’était pas encore en ligne ou pas encore mesurée avant.</>}
          {r.baseline === 'NONE' && <>Pas encore de point de comparaison.</>}
        </span>
      </p>
      {r.boostedImpressions != null && r.boostedPlace && <p className="m-0 text-on-surface-variant">Dont <b className="text-on-surface">{n(r.boostedImpressions)}</b> affichage{r.boostedImpressions > 1 ? 's' : ''} {r.boostedPlace}.</p>}
      {r.boostedImpressions == null && <p className="m-0 text-on-surface-variant">Cette formule ajoute un badge : la place de l’annonce dans les résultats ne change pas.</p>}
      {r.favorites > 0 && <p className="m-0 text-on-surface-variant">{n(r.favorites)} ajout{r.favorites > 1 ? 's' : ''} en favori.</p>}
      <p className="m-0 text-label-sm text-on-surface-variant">Un affichage = la carte de l’annonce vue au moins à moitié pendant une seconde par un visiteur (pas par vous, ni par un robot), une fois par page. Les compteurs sont journaliers, mis à jour toutes les quelques minutes.</p>
      <HelpLink article="statistiques-de-vente" label="Comment c’est mesuré" />
    </div>
  )
}
