import { useState } from 'react'
import { useApolloClient, useQuery } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import Icon from './Icon'
import HelpLink from './HelpLink'
import { creditsLabel } from './Credits'
import { LISTING_BUMP_STATUS_QUERY, MY_LISTING_BUMPS_QUERY, type BumpEntry, type BumpStatus } from '../graphql/bumps'
import { agoLabel, bumpCostLabel, clock, ordinal, placeLabel, whenLabel } from '../lib/bumps'
import { requestOpenLink } from '../lib/navigation'
import { ReportLine } from './VisibilityReport'
import { useT } from '../i18n'
import boost from '../i18n/ns/boost'

// The proof of a bump, everywhere the seller looks: right after it (BumpDone),
// on the listing's management (BumpStatusPanel) and in the history
// (BumpHistory). Everything comes from the server journal (listing_bumps).

// « Voir dans la liste »: the category page, where the bump puts it first
// (after the listings « En vedette »).
export const seeInList = (slug?: string | null) => { if (slug) requestOpenLink(`/categorie/${encodeURIComponent(slug)}`) }

function AutoLine({ s }: { s: Pick<BumpStatus, 'nextAutoBumpAt' | 'autoBumpsLeft'> }) {
  if (!s.nextAutoBumpAt) return null
  const t = useT(boost)
  const left = s.autoBumpsLeft ?? 0
  return (
    <li className="flex items-start gap-2">
      <Icon name="autorenew" size={16} className="mt-0.5 shrink-0" />
      <span>{t.rich('proof.nextAuto', { when: whenLabel(s.nextAutoBumpAt), b: c => <b>{c}</b> })}{left > 0 && t('proof.autoLeft', { count: left })}</span>
    </li>
  )
}

// Right after « Remonter » or a formula: « Annonce remontée en tête de
// « Mode » à 14 h 32 », what it cost, its place, the next automatic bump.
export function BumpDone({ status, className = '' }: { status: BumpStatus; className?: string }) {
  const at = status.lastBumpedAt
  const p = status.bumpPosition
  const cat = status.category?.name ?? p?.categoryName
  const last = status.lastBump
  const t = useT(boost)
  return (
    <div role="status" className={`rounded-2xl border border-solid border-tertiary/30 bg-tertiary-soft p-4 text-tertiary ${className}`}>
      <p className="m-0 flex items-start gap-2 text-label-lg">
        <Icon name="check_circle" size={20} fill className="mt-0.5 shrink-0" />
        <span>{cat
          ? (at ? t('proof.done.catAt', { cat, time: clock(at) }) : t('proof.done.cat', { cat }))
          : (at ? t('proof.done.at', { time: clock(at) }) : t('proof.done.plain'))}</span>
      </p>
      <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 pl-7 text-body-sm text-on-surface">
        <li className="truncate">« {status.title} »</li>
        {last && <li className="flex items-start gap-2"><Icon name="toll" size={16} className="mt-0.5 shrink-0" /><span>{last.credits > 0
          ? <>{t.rich('proof.debited', { count: last.credits, credits: creditsLabel(last.credits), b: c => <b>{c}</b> })}{last.source === 'PACK' && last.packLabel ? t('proof.debitedPack', { pack: last.packLabel }) : ''}{last.offerPercent ? t('proof.debitedOffer', { percent: String(last.offerPercent) }) : ''}</>
          : t('proof.notDebited', { cost: bumpCostLabel(last) })}</span></li>}
        {p && <li className="flex items-start gap-2"><Icon name="leaderboard" size={16} className="mt-0.5 shrink-0" /><span>{t.rich('proof.placeSorted', { place: placeLabel(p), b: c => <b>{c}</b> })}</span></li>}
        <AutoLine s={status} />
      </ul>
      {status.category?.slug && (
        <button type="button" onClick={() => seeInList(status.category?.slug)} className="mt-3 ml-7 flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-surface-lowest px-3 text-label-md text-primary hover:bg-surface-container-low">
          <Icon name="visibility" size={16} /> {t('proof.seeInList')}
        </button>
      )}
    </div>
  )
}

// One line for a card of « Mes annonces »: « Remontée il y a 12 min ·
// Prochaine auto : demain à 18 h (2 restantes) ». Nothing when never bumped.
export function BumpLine({ s, className = '' }: { s: Partial<Pick<BumpStatus, 'lastBumpedAt' | 'nextAutoBumpAt' | 'autoBumpsLeft'>>; className?: string }) {
  if (!s.lastBumpedAt && !s.nextAutoBumpAt) return null
  const t = useT(boost)
  const left = s.autoBumpsLeft ?? 0
  return (
    <p className={`m-0 flex min-w-0 items-start gap-1 text-body-sm text-tertiary ${className}`}>
      <Icon name="arrow_upward" size={14} className="mt-0.5 shrink-0" />
      <span className="line-clamp-2">
        {s.lastBumpedAt ? t('proof.line.bumped', { ago: agoLabel(s.lastBumpedAt) }) : t('proof.line.autoActive')}
        {s.nextAutoBumpAt ? (left > 1 ? t('proof.line.nextAutoLeft', { when: whenLabel(s.nextAutoBumpAt), left: String(left) }) : t('proof.line.nextAuto', { when: whenLabel(s.nextAutoBumpAt) })) : ''}
      </span>
    </p>
  )
}

const SOURCE_ICON: Record<BumpEntry['source'], string> = {
  MANUAL: 'arrow_upward',
  PACK: 'rocket_launch',
  AUTO: 'autorenew',
  STAFF: 'workspace_premium',
  REPUBLISH: 'history',
}

// « Historique des remontées »: date, type, credits, place obtained.
export function BumpHistory({ entries, showListing = false, empty }: { entries: BumpEntry[]; showListing?: boolean; empty?: string }) {
  const t = useT(boost)
  if (!entries.length) return <p className="m-0 rounded-xl bg-surface-container-low p-4 text-center text-body-sm text-on-surface-variant">{empty ?? t('proof.historyEmpty')}</p>
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {entries.map(b => (
        <li key={b.id} className="flex min-w-0 items-start gap-3 rounded-xl bg-surface-container-low p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icon name={SOURCE_ICON[b.source] ?? 'arrow_upward'} size={18} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-label-md text-on-surface">{b.sourceLabel}{b.packLabel ? ` · ${b.packLabel}` : ''}</span>
              <span className="whitespace-nowrap text-label-md text-on-surface">{bumpCostLabel(b)}</span>
            </div>
            {showListing && b.listingTitle && <div className="truncate text-body-sm text-on-surface">« {b.listingTitle} »</div>}
            <div className="text-body-sm text-on-surface-variant">
              {whenLabel(b.createdAt).replace(/^./, c => c.toUpperCase())}
              {b.rank != null && b.peers != null && <> · {t('bump.place', { rank: ordinal(b.rank), peers: String(b.peers), category: b.categoryName ?? t('bump.categoryFallback'), city: b.city })}</>}
            </div>
            {b.source !== 'REPUBLISH' && <ReportLine report={b.report} className="mt-0.5" />}
          </div>
        </li>
      ))}
    </ul>
  )
}

// The listing's bumps on its management (Booster, listing page): last bump,
// place now, automatic bumps to come, history.
export function BumpStatusPanel({ listingId, take = 10, className = '' }: { listingId: string; take?: number; className?: string }) {
  const { data } = useQuery<{ myListing: BumpStatus | null }>(LISTING_BUMP_STATUS_QUERY, { variables: { id: listingId }, fetchPolicy: 'cache-and-network' })
  const { data: hist } = useQuery<{ myListingBumps: BumpEntry[] }>(MY_LISTING_BUMPS_QUERY, { variables: { listingId, take }, fetchPolicy: 'cache-and-network' })
  const t = useT(boost)
  const s = data?.myListing
  if (!s) return null
  const p = s.bumpPosition
  return (
    <section className={`rounded-2xl border border-outline-variant bg-surface-lowest p-4 ${className}`} aria-labelledby={`bumps-${listingId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`bumps-${listingId}`} className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><Icon name="arrow_upward" size={18} className="text-primary" /> {t('proof.panel.title')}</h3>
        {s.category?.slug && s.status === 'APPROVED' && <button type="button" onClick={() => seeInList(s.category?.slug)} className="flex h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-transparent px-2 text-label-md text-primary hover:bg-surface-container-low"><Icon name="visibility" size={16} /> {t('proof.seeInList')}</button>}
      </div>
      <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-body-sm text-on-surface">
        <li className="flex items-start gap-2"><Icon name="schedule" size={16} className="mt-0.5 shrink-0 text-on-surface-variant" />
          <span>{s.lastBumpedAt ? t.rich('proof.panel.last', { when: whenLabel(s.lastBumpedAt), ago: agoLabel(s.lastBumpedAt), b: c => <b>{c}</b> }) : t('proof.panel.never')}</span>
        </li>
        {p && <li className="flex items-start gap-2"><Icon name="leaderboard" size={16} className="mt-0.5 shrink-0 text-on-surface-variant" />
          <span>{t.rich('proof.panel.place', { place: placeLabel(p), b: c => <b>{c}</b> })}{p.rank === 1 && s.lastBumpedAt ? t('proof.panel.leadingSince', { when: whenLabel(s.lastBumpedAt) }) : ''} <span className="text-on-surface-variant">{t('proof.sortRecent')}</span></span>
        </li>}
        <AutoLine s={s} />
      </ul>
      <h4 className="m-0 mt-4 mb-2 text-label-md text-on-surface-variant">{t('proof.panel.history')}</h4>
      <BumpHistory entries={hist?.myListingBumps ?? []} />
      <HelpLink article="booster-une-annonce" label={t('proof.panel.helpLink')} className="mt-3" />
    </section>
  )
}

// The proof in a sheet, wherever the bump was made (Mes annonces, Booster):
// seen at once, whatever the scroll. `show(status)` with the mutation's
// answer, or `showFor(listingId)` after a formula paid in WalletPaySheet.
export function useBumpProof(onClosed?: () => void) {
  const client = useApolloClient()
  const t = useT(boost)
  const [proof, setProof] = useState<BumpStatus | null>(null)
  const show = (status: BumpStatus) => {
    setProof(status)
    void client.refetchQueries({ include: [MY_LISTING_BUMPS_QUERY] })
  }
  const showFor = (listingId: string) => {
    void client.query<{ myListing: BumpStatus | null }>({ query: LISTING_BUMP_STATUS_QUERY, variables: { id: listingId }, fetchPolicy: 'network-only' })
      .then(r => { if (r.data?.myListing?.lastBumpedAt) show(r.data.myListing) })
      .catch(() => {})
  }
  const sheet = (
    <BottomSheet open={!!proof} onClose={() => { setProof(null); onClosed?.() }} title={t('proof.sheet.title')}
      footer={<div className="border-0 border-t border-solid border-outline-variant px-4 py-3"><button type="button" onClick={() => { setProof(null); onClosed?.() }} className="h-12 w-full cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">{t('proof.sheet.done')}</button></div>}>
      {proof && <BumpDone status={proof} />}
    </BottomSheet>
  )
  return { show, showFor, sheet, visible: !!proof }
}
