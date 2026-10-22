import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../Icon'
import Price from '../Price'
import Credits from '../Credits'
import OfferCredits from '../OfferCredits'
import PromoPill from '../PromoPill'
import HelpLink from '../HelpLink'
import { useCreditValue } from '../../lib/creditValue'
import { useMarketCode } from '../../lib/countries'
import { packOperation, useOfferPrice } from '../../lib/priceOffers'
import type { BoostPackInfo } from '../../graphql/promotions'
import type { PromoBadge } from '../../graphql/listings'
import { LISTING_BADGE_SETTINGS_QUERY, type BadgeSetting } from '../../graphql/visibility'

// The pieces every boost / credits screen shares, so that a formula reads
// the same everywhere: its name (server `label`), one line of what it does
// (`summary`), its duration, its price in credits AND in F CFA, the pill it
// puts on the card. The detail (`promises`, worded by the server from the
// BO settings) stays behind « Comment ça marche ? ».

// « 20 crédits ≈ 2 000 F » (the F CFA value from BO › Tarifs).
export function CreditsF({ n, value, className = '' }: { n: number; value?: number; className?: string }) {
  const v = useCreditValue()
  const each = value ?? v
  return (
    <span className={`whitespace-nowrap ${className}`}>
      <Credits n={n} />{each > 0 && n > 0 && <span className="font-normal text-on-surface-variant"> ≈ <Price amount={n * each} /></span>}
    </span>
  )
}

// The price of a formula on a listing: the member's live offer applied
// (struck usual price), with its F CFA value.
export function PackPrice({ info, listingId, className = '' }: { info: BoostPackInfo; listingId?: string | null; className?: string }) {
  const value = useCreditValue()
  const q = useOfferPrice(packOperation(info.pack), info.price, null, listingId)
  const n = q?.price ?? info.price
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1 ${className}`}>
      <b className="whitespace-nowrap text-on-surface"><OfferCredits op={packOperation(info.pack)} n={info.price} listingId={listingId} tag={false} /></b>
      {value > 0 && n > 0 && <span className="whitespace-nowrap text-body-sm font-normal text-on-surface-variant">≈ <Price amount={n * value} /></span>}
    </span>
  )
}

// « 1 · Achetez des crédits → 2 · Choisissez un boost → 3 · Votre annonce
// passe devant », with « 1 crédit = 100 F » of the payer's country.
export function BoostSteps({ className = '' }: { className?: string }) {
  const value = useCreditValue()
  const steps: { icon: string; title: string; sub: ReactNode }[] = [
    { icon: 'add_card', title: 'Achetez des crédits', sub: value > 0 ? <><span className="hidden sm:inline">Mobile Money · </span>1 crédit = <Price amount={value} /></> : 'Par Mobile Money' },
    { icon: 'rocket_launch', title: 'Choisissez un boost', sub: 'Sur l’annonce de votre choix' },
    { icon: 'trending_up', title: 'Votre annonce passe devant', sub: 'Puis son bilan s’affiche' },
  ]
  return (
    <ol className={`m-0 grid list-none grid-cols-3 gap-2 p-0 ${className}`} aria-label="Comment booster">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-surface-container-low p-2 text-center sm:flex-row sm:gap-3 sm:p-3 sm:text-left">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary sm:h-10 sm:w-10">
            <Icon name={s.icon} size={19} />
            <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{i + 1}</span>
          </span>
          <span className="min-w-0">
            <span className="block text-label-sm text-on-surface sm:text-label-md">{s.title}</span>
            <span className={`text-[11px] leading-4 text-on-surface-variant sm:text-body-sm ${i === 0 ? 'block' : 'hidden sm:block'}`}>{s.sub}</span>
          </span>
          {i < steps.length - 1 && <span className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-surface-lowest text-outline lg:flex"><Icon name="arrow_forward" size={16} /></span>}
        </li>
      ))}
    </ol>
  )
}

// The « Badges des annonces » of the market (wording of each pill).
export function useBadgeSettings() {
  const market = useMarketCode()
  return useQuery<{ listingBadgeSettings: BadgeSetting[] }>(LISTING_BADGE_SETTINGS_QUERY, { variables: { country: market ?? undefined }, fetchPolicy: 'cache-first' }).data?.listingBadgeSettings ?? []
}

// The pill a formula puts on the card (none when hidden in the country).
export function pillFor(info: BoostPackInfo | undefined, badges: BadgeSetting[]): PromoBadge | null {
  if (!info) return null
  if (info.family === 'BUMP') {
    const s = badges.find(b => b.kind === 'BUMP')
    return s?.show ? { kind: 'BUMP', label: s.label } : null
  }
  if (!info.badgeLabel) return null
  return { kind: info.family === 'TURBO' ? 'TURBO' : info.family === 'URGENT' ? 'URGENT' : 'FEATURED', label: info.badgeLabel }
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// What a formula does, shown: four cards of a list, « yours » rising to the
// top (bump, en vedette, Turbo) or staying put while its pill appears
// (Urgent). Pure CSS, mounted on demand only (never on the first render of
// a page), paused off screen, static under « reduce motion ».
export function BoostDemo({ info, pill, coverUrl, className = '' }: { info: BoostPackInfo; pill: PromoBadge | null; coverUrl?: string | null; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const still = reducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || still || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [still])
  const moves = info.family !== 'URGENT'
  // Final layout: yours first (or second for Urgent); the animation starts
  // it from the bottom.
  const slot = moves ? 0 : 1
  const others = [0, 1, 2, 3].filter(i => i !== slot)
  const caption = info.family === 'URGENT' ? 'Même place, avec la pastille'
    : info.family === 'BUMP' ? (info.autoBump ? 'Revient en tête chaque jour' : 'Revient en tête de la liste')
      : 'Passe devant, à une place réservée'
  return (
    <figure ref={ref} className={`boostdemo m-0 ${still ? 'boostdemo-still' : ''} ${moves ? 'boostdemo-moves' : 'boostdemo-pop'} ${className}`} data-paused={paused || undefined} aria-label={`Aperçu : ${caption}`}>
      <div className="relative mx-auto h-[138px] w-full max-w-[240px]" aria-hidden>
        {others.map((s, i) => (
          <div key={s} className="boostdemo-row boostdemo-other absolute inset-x-0 flex h-[30px] items-center gap-2 rounded-lg bg-surface-container-low px-1.5" style={{ top: s * 36 }}>
            <span className="h-5 w-5 shrink-0 rounded bg-surface-container-high" />
            <span className="h-2 rounded-full bg-surface-container-high" style={{ width: `${55 - i * 10}%` }} />
          </div>
        ))}
        <div className="boostdemo-row boostdemo-yours absolute inset-x-0 z-10 flex h-[30px] items-center gap-2 rounded-lg bg-surface-lowest px-1.5 shadow-sm ring-2 ring-primary" style={{ top: slot * 36 }}>
          <span className="h-5 w-5 shrink-0 overflow-hidden rounded bg-primary-fixed">{coverUrl && <img src={coverUrl} alt="" className="h-full w-full object-cover" />}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-on-surface">Votre annonce</span>
          {pill && <span className="boostdemo-pill flex min-w-0 max-w-[55%]"><PromoPill badge={pill} /></span>}
        </div>
      </div>
      <figcaption className="mt-1.5 text-center text-label-sm text-on-surface-variant">{caption}</figcaption>
    </figure>
  )
}

// One line of the comparison: label, its (i) detail, the value per formula.
type Row = { key: string; label: string; info: string; value: (p: BoostPackInfo, pill: PromoBadge | null) => ReactNode | boolean }
const ROWS: Row[] = [
  {
    key: 'bump', label: 'Revient en tête',
    info: 'L’annonce repasse en tête des annonces les plus récentes, comme si elle venait d’être publiée (après les annonces en vedette).',
    value: p => p.autoBump ? (p.autoBumpHour != null ? `Chaque jour à ${p.autoBumpHour}\u00a0h` : 'Chaque jour') : p.bumpNow ? '1 fois' : false,
  },
  {
    key: 'pinned', label: 'Place réservée en tête',
    info: 'En tête des recherches et de sa catégorie, quel que soit le tri. Les annonces en vedette se partagent ces places à tour de rôle.',
    value: p => p.pinned,
  },
  {
    key: 'home', label: 'Sur l’accueil',
    info: 'Une place dans « Pépites à la Une » sur l’accueil de votre pays, partagée à tour de rôle avec les autres annonces en vedette.',
    value: p => p.onHome,
  },
  {
    key: 'pill', label: 'Pastille sur la photo',
    info: 'Visible partout où l’annonce apparaît, pendant la durée de la formule. Son nom est réglé par Dilchap pour votre pays.',
    value: (_, pill) => pill ? <PromoPill badge={pill} /> : false,
  },
]

function Cell({ v }: { v: ReactNode | boolean }) {
  if (v === true) return <Icon name="check_circle" size={20} fill className="text-tertiary" title="Oui" />
  if (v === false || v == null) return <Icon name="remove" size={18} className="text-outline" title="Non" />
  return <span className="text-label-md text-on-surface">{v}</span>
}

function InfoButton({ row, open, onToggle }: { row: Row; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${row.label} : détail`} className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-none ${open ? 'bg-primary text-white' : 'bg-transparent text-on-surface-variant hover:bg-surface-container'}`}>
      <Icon name="info" size={16} />
    </button>
  )
}

// « Les formules » side by side: a ✓ / ✗ table on wide screens, one short
// card per formula on phones. `onPick` adds a « Choisir » button.
export function BoostCompare({ packs, listing, onPick, className = '' }: {
  packs: BoostPackInfo[]
  listing?: { id: string; coverImageUrl: string | null } | null
  onPick?: (p: BoostPackInfo) => void
  className?: string
}) {
  const badges = useBadgeSettings()
  const [info, setInfo] = useState<string | null>(null)
  const [demo, setDemo] = useState<string | null>(null)
  const row = ROWS.find(r => r.key === info)
  const demoPack = packs.find(p => p.pack === demo)
  if (!packs.length) return null
  return (
    <div className={className}>
      {/* Wide screens: the comparison table. */}
      <div className="hidden overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest xl:block">
        <table className="w-full table-fixed border-collapse text-center text-body-sm">
          <caption className="sr-only">Comparaison des formules de boost</caption>
          <thead>
            <tr className="bg-surface-container-low align-top">
              <th scope="col" className="w-[19%] p-3 text-left text-label-md text-on-surface-variant">Formule</th>
              {packs.map(p => (
                <th key={p.pack} scope="col" className="p-3 font-normal">
                  {p.mostChosen && <span className="mb-1 inline-block rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold uppercase text-white">Le plus choisi</span>}
                  <span className="block text-label-lg text-on-surface">{p.name}</span>
                  <span className="block text-label-sm text-on-surface-variant">{p.durationLabel ?? 'Immédiat'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-0 border-t border-solid border-outline-variant">
              <th scope="row" className="p-3 text-left text-label-md font-normal text-on-surface-variant">Ce que ça fait</th>
              {packs.map(p => <td key={p.pack} className="p-3 text-body-sm text-on-surface">{p.summary}</td>)}
            </tr>
            {ROWS.map(r => (
              <tr key={r.key} className="border-0 border-t border-solid border-outline-variant">
                <th scope="row" className="p-3 text-left font-normal">
                  <span className="flex items-center gap-1 text-label-md text-on-surface">{r.label} <InfoButton row={r} open={info === r.key} onToggle={() => setInfo(info === r.key ? null : r.key)} /></span>
                  {info === r.key && <span className="mt-1 block text-body-sm text-on-surface-variant">{r.info}</span>}
                </th>
                {packs.map(p => <td key={p.pack} className="p-3"><span className="inline-flex max-w-full justify-center"><Cell v={r.value(p, pillFor(p, badges))} /></span></td>)}
              </tr>
            ))}
            <tr className="border-0 border-t border-solid border-outline-variant bg-surface-container-low/60">
              <th scope="row" className="p-3 text-left text-label-md text-on-surface">Prix</th>
              {packs.map(p => <td key={p.pack} className="p-3"><PackPrice info={p} listingId={listing?.id} className="justify-center text-label-lg" /></td>)}
            </tr>
            <tr className="border-0 border-t border-solid border-outline-variant">
              <th scope="row" className="p-3 text-left text-label-md font-normal text-on-surface-variant">Aperçu</th>
              {packs.map(p => (
                <td key={p.pack} className="p-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <button type="button" onClick={() => setDemo(demo === p.pack ? null : p.pack)} aria-pressed={demo === p.pack} className={`flex h-9 cursor-pointer items-center gap-1 rounded-full border border-solid px-3 text-label-md ${demo === p.pack ? 'border-primary bg-primary-fixed text-primary' : 'border-outline-variant bg-transparent text-on-surface'}`}>
                      <Icon name="play_circle" size={16} /> Voir
                    </button>
                    {onPick && <button type="button" onClick={() => onPick(p)} className="h-9 cursor-pointer rounded-full border-none bg-primary px-3 text-label-md text-white">Choisir</button>}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {demoPack && (
          <div className="flex flex-col items-center gap-2 border-0 border-t border-solid border-outline-variant p-4 sm:flex-row sm:justify-center sm:gap-6">
            <BoostDemo info={demoPack} pill={pillFor(demoPack, badges)} coverUrl={listing?.coverImageUrl} className="w-[240px]" />
            <p className="m-0 max-w-sm text-body-sm text-on-surface"><b>{demoPack.label}</b> : {demoPack.summary}</p>
          </div>
        )}
      </div>

      {/* Below 1280 px: one short card per formula. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:hidden">
        {packs.map(p => (
          <BoostCard key={p.pack} info={p} pill={pillFor(p, badges)} listing={listing} onPick={onPick ? () => onPick(p) : undefined} />
        ))}
      </div>
      {row && <p className="sr-only" aria-live="polite">{row.info}</p>}
    </div>
  )
}

// One formula, short: name, duration, one line, its pill, price in credits
// and F CFA, « Voir » (the animation) and « Choisir ».
export function BoostCard({ info: p, pill, listing, onPick, busy }: {
  info: BoostPackInfo
  pill: PromoBadge | null
  listing?: { id: string; coverImageUrl: string | null } | null
  onPick?: () => void
  busy?: boolean
}) {
  const [demo, setDemo] = useState(false)
  return (
    <article className={`relative flex flex-col rounded-2xl bg-surface-lowest p-3.5 ${p.mostChosen ? 'border-2 border-solid border-primary' : 'border border-solid border-outline-variant'}`}>
      {p.mostChosen && <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold uppercase text-white">Le plus choisi</span>}
      <div className="flex items-start justify-between gap-2">
        <h3 className="m-0 min-w-0 text-label-lg text-on-surface">{p.name} {p.durationLabel && <span className="font-normal text-on-surface-variant">· {p.durationLabel}</span>}</h3>
        {pill && <span className="flex min-w-0 max-w-[45%] shrink-0"><PromoPill badge={pill} /></span>}
      </div>
      <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{p.summary}</p>
      {demo && <BoostDemo info={p} pill={pill} coverUrl={listing?.coverImageUrl} className="mt-3" />}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
        <PackPrice info={p} listingId={listing?.id} className="text-label-lg" />
        <span className="flex gap-1.5">
          <button type="button" onClick={() => setDemo(!demo)} aria-pressed={demo} aria-label={`Voir l’effet : ${p.label}`} className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-none ${demo ? 'bg-primary-fixed text-primary' : 'bg-surface-container-low text-on-surface'}`}>
            <Icon name="play_circle" size={20} />
          </button>
          {onPick && <button type="button" disabled={busy} onClick={onPick} className="h-10 cursor-pointer rounded-xl border-none bg-primary px-4 text-label-md text-white disabled:opacity-50">Choisir</button>}
        </span>
      </div>
    </article>
  )
}

// « Comment ça marche ? »: the exact detail of each formula (server
// promises), its animation once opened, and how the bilan is measured.
export function HowItWorks({ packs, className = '' }: { packs: BoostPackInfo[]; className?: string }) {
  const badges = useBadgeSettings()
  const [open, setOpen] = useState(false)
  return (
    <details className={`group rounded-2xl bg-surface-container-low ${className}`} onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-label-lg text-on-surface [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2"><Icon name="help" size={20} className="text-primary" /> Comment ça marche ?</span>
        <Icon name="expand_more" size={22} className="transition-transform group-open:rotate-180" />
      </summary>
      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {packs.map(p => (
            <section key={p.pack} className="rounded-xl bg-surface-lowest p-3">
              <h3 className="m-0 text-label-lg text-on-surface">{p.label}</h3>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
                <BoostDemo info={p} pill={pillFor(p, badges)} className="sm:w-[220px] sm:shrink-0" />
                <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0 text-body-sm text-on-surface">
                  {p.promises.map(t => <li key={t} className="flex items-start gap-2"><Icon name="check_circle" size={15} className="mt-0.5 shrink-0 text-tertiary" /> <span>{t}</span></li>)}
                </ul>
              </div>
            </section>
          ))}
          <p className="m-0 text-body-sm text-on-surface-variant">Le bilan compte les affichages, vues et contacts pendant le boost, comparés à la même durée juste avant (ou à une annonce moyenne de sa catégorie).</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <HelpLink article="booster-une-annonce" label="Booster une annonce" />
            <HelpLink article="acheter-des-credits" label="Les crédits" />
          </div>
        </div>
      )}
    </details>
  )
}
