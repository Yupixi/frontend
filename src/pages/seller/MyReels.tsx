import { lazy, Suspense, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { AccountLayout } from '../account/AccountLayout'
import Icon from '../../components/Icon'
import BottomSheet from '../../components/BottomSheet'
import ConfirmSheet from '../../components/ConfirmSheet'
import HelpLink from '../../components/HelpLink'
import type { AuthUser } from '../../graphql/auth'
import { MY_LISTINGS_QUERY } from '../../graphql/listings'
import { DELETE_REEL_MUTATION, MY_REELS_QUERY, REEL_STATUS_LABEL, type MyReel, type ReelStatus } from '../../graphql/reels'
import { formatNumber } from '../../lib/format'
import { formatDuration, reelThumb, takeManagedReel, takeNewReelRequest, useReelSettings } from '../../lib/reels'
import { usePendingReels } from '../../lib/reelDrafts'
import { ReelBoostSheet, ReelStatsSheet } from '../../components/reels/ReelOwnerSheets'

const ReelComposer = lazy(() => import('../../components/reels/ReelComposer'))

type Props = { onNavigate: (p: any) => void; onSelectListing: (id: string) => void; currentUser?: AuthUser | null; onLogout: () => void }
type Row = { id: string; title: string; status: string; coverImageUrl: string | null; countryCode?: string | null }

const TONE: Record<ReelStatus, string> = {
  UPLOADING: 'bg-surface-container-high text-on-surface',
  PROCESSING: 'bg-surface-container-high text-on-surface',
  PENDING_REVIEW: 'bg-amber-100 text-amber-900',
  APPROVED: 'bg-tertiary-soft text-tertiary',
  FAILED: 'bg-primary-fixed text-primary',
  REJECTED: 'bg-primary-fixed text-primary',
  REMOVED: 'bg-primary-fixed text-primary',
  ARCHIVED: 'bg-surface-container-high text-on-surface-variant',
}
const WAITING: ReelStatus[] = ['UPLOADING', 'PROCESSING', 'PENDING_REVIEW']
const MB = 1024 * 1024

// « Mes Reels »: the seller's videos, their status (preparation, check,
// online, refused with the reason), their statistics and boosts.
export default function MyReels({ onNavigate, onSelectListing, currentUser, onLogout }: Props) {
  const settings = useReelSettings(currentUser?.countryCode)
  const { data, loading, refetch } = useQuery<{ myReels: MyReel[] }>(MY_REELS_QUERY, { fetchPolicy: 'cache-and-network' })
  const reels = data?.myReels ?? []
  const waiting = reels.some(r => WAITING.includes(r.status))
  // While a video is being prepared or checked: its status follows.
  useQuery<{ myReels: MyReel[] }>(MY_REELS_QUERY, { skip: !waiting, pollInterval: 15_000, fetchPolicy: 'network-only' })
  const { data: listingsData } = useQuery<{ myListings: { items: Row[] } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 100 } })
  // A Reel goes with a listing online or awaiting its moderation.
  const live = (listingsData?.myListings.items ?? []).filter(l => l.status === 'APPROVED' || l.status === 'PENDING_REVIEW')
  // Videos not sent yet this session (publication of a listing, « Plus tard »).
  const unsent = usePendingReels()
  // « Gérer » on one's own Reel in the feed: opened on it.
  const [focus] = useState(takeManagedReel)
  useEffect(() => {
    if (!focus || !reels.some(r => r.id === focus)) return
    document.getElementById(`reel-${focus}`)?.scrollIntoView({ block: 'center' })
  }, [focus, reels])
  // « Publier un Reel » from the Reels tab: straight to the listing picker.
  const [pick, setPick] = useState(takeNewReelRequest)
  const [composeFor, setComposeFor] = useState<Row | null>(null)
  const [statsFor, setStatsFor] = useState<MyReel | null>(null)
  const [watch, setWatch] = useState<MyReel | null>(null)
  const [boostFor, setBoostFor] = useState<MyReel | null>(null)
  const [deleteFor, setDeleteFor] = useState<MyReel | null>(null)
  const [remove, { loading: removing }] = useMutation(DELETE_REEL_MUTATION)

  const totals = reels.reduce((t, r) => ({
    views: t.views + r.viewsCount, clicks: t.clicks + (r.clicksCount ?? 0), contacts: t.contacts + (r.contactsCount ?? 0), live: t.live + (r.status === 'APPROVED' ? 1 : 0),
  }), { views: 0, clicks: 0, contacts: 0, live: 0 })

  return (
    <AccountLayout active="seller-reels" title="Mes Reels" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-5xl px-4 py-4 lg:px-0 lg:py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="m-0 hidden text-headline-lg text-on-surface lg:block">Mes Reels</h1>
            <p className="m-0 mt-1 max-w-2xl text-body-md text-on-surface-variant">Des vidéos courtes de vos articles, montrées dans les Reels de Dilchap, sur l’annonce et sur votre profil.</p>
          </div>
          {settings.enabled && (
            <button onClick={() => setPick(true)} className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-4 text-label-lg text-white max-sm:w-full max-sm:justify-center">
              <Icon name="video_call" size={20} /> Nouveau Reel
            </button>
          )}
        </div>
        {!settings.enabled && <p className="m-0 mt-4 rounded-xl bg-surface-container-low p-3 text-body-md text-on-surface">Les Reels ne sont pas disponibles dans votre pays pour le moment.</p>}

        {unsent.length > 0 && (
          <ul data-testid="unsent-reels" className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {unsent.map(p => (
              <li key={p.listing.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-100 p-3 text-amber-900">
                <Icon name="upload" size={22} className="shrink-0" />
                <span className="min-w-0 flex-1 basis-48 text-body-sm"><b>Vidéo pas encore envoyée</b> pour « {p.listing.title} »{p.error ? ` : ${p.error}` : '.'} Elle est gardée jusqu’à la fermeture de Dilchap.</span>
                <button onClick={() => setComposeFor({ id: p.listing.id, title: p.listing.title, status: 'APPROVED', coverImageUrl: p.listing.coverImageUrl ?? null, countryCode: p.listing.countryCode })} className="h-11 cursor-pointer rounded-xl border-none bg-primary px-4 text-label-lg text-white max-sm:w-full">Reprendre l’envoi</button>
              </li>
            ))}
          </ul>
        )}

        {reels.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[['En ligne', totals.live], ['Vues', totals.views], ['Clics vers l’annonce', totals.clicks], ['Contacts', totals.contacts]].map(([label, n]) => (
              <div key={label} className="rounded-xl bg-surface-lowest p-3 shadow-sm">
                <p className="m-0 text-body-sm text-on-surface-variant">{label}</p>
                <p className="m-0 mt-0.5 text-headline-md text-on-surface">{formatNumber(Number(n))}</p>
              </div>
            ))}
          </div>
        )}

        {loading && !reels.length ? (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">{[0, 1].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-container" />)}</div>
        ) : !reels.length && settings.enabled ? (
          <div className="mt-6 rounded-2xl bg-surface-lowest p-6 text-center shadow-sm">
            <Icon name="smart_display" size={40} className="text-primary" />
            <p className="m-0 mt-2 text-headline-sm text-on-surface">Aucun Reel pour l’instant</p>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Une vidéo de 20 à 30 secondes suffit : l’article en main, sous tous ses angles.</p>
            <div className="mt-3 flex justify-center"><HelpLink article="publier-un-reel" label="Comment publier un Reel ?" /></div>
          </div>
        ) : (
          <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
            {reels.map(r => (
              <li key={r.id} id={`reel-${r.id}`} className={`flex gap-3 rounded-2xl bg-surface-lowest p-3 shadow-sm ${focus === r.id ? 'ring-2 ring-primary' : ''}`}>
                <button onClick={() => r.videoUrl && setWatch(r)} disabled={!r.videoUrl} aria-label="Regarder" className="relative h-36 w-[81px] shrink-0 cursor-pointer overflow-hidden rounded-xl border-none bg-neutral-900 p-0 disabled:cursor-default">
                  {r.posterUrl ? <img src={reelThumb(r.posterUrl) ?? undefined} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-white/60"><Icon name={r.status === 'FAILED' ? 'error' : 'smart_display'} size={26} /></span>}
                  {r.durationSec > 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">{formatDuration(r.durationSec)}</span>}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-label-sm ${TONE[r.status]}`}>{REEL_STATUS_LABEL[r.status]}</span>
                    {r.boost?.active && <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-label-sm text-white"><Icon name="rocket_launch" size={13} /> Boosté</span>}
                  </div>
                  <button onClick={() => r.listingId && onSelectListing(r.listingId)} className="mt-1.5 line-clamp-2 cursor-pointer border-none bg-transparent p-0 text-left text-label-lg text-on-surface hover:text-primary">{r.listing?.title ?? 'Annonce supprimée'}</button>
                  {r.statusReason && ['REJECTED', 'REMOVED', 'FAILED'].includes(r.status) && <p className="m-0 mt-1 text-body-sm text-primary">{r.statusReason}</p>}
                  {r.status === 'PROCESSING' && <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Préparation de la vidéo pour les petits réseaux…</p>}
                  {r.status === 'PENDING_REVIEW' && <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Vérification par l’équipe Dilchap, en général dans la journée.{r.listing?.status === 'PENDING_REVIEW' ? ' Visible dès que l’annonce et le Reel sont validés.' : ''}</p>}
                  {r.status === 'APPROVED' && r.listing?.status !== 'APPROVED' && <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{r.listing?.status === 'PENDING_REVIEW' ? 'Validé : visible dès que l’annonce est validée.' : 'Masqué tant que l’annonce n’est pas en ligne.'}</p>}
                  {r.status === 'APPROVED' && (
                    <p className="m-0 mt-1.5 text-body-sm text-on-surface-variant">
                      {formatNumber(r.viewsCount)} vue{r.viewsCount > 1 ? 's' : ''} · {formatNumber(r.clicksCount ?? 0)} clic{(r.clicksCount ?? 0) > 1 ? 's' : ''} · {formatNumber(r.contactsCount ?? 0)} contact{(r.contactsCount ?? 0) > 1 ? 's' : ''}
                    </p>
                  )}
                  {r.boost?.active && <p className="m-0 mt-1 text-body-sm text-on-surface">Boost : {formatNumber(r.boost.views)} / {formatNumber(r.boost.viewsGoal)} vues · jusqu’au {new Date(r.boost.expiresAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                  {!r.boost?.active && r.listingBoost?.active && <p className="m-0 mt-1 flex items-start gap-1 text-body-sm text-tertiary"><Icon name="star" size={15} fill className="mt-0.5 shrink-0" /> <span>Mis en avant grâce au boost « {r.listingBoost.formula} » de l’annonce, jusqu’au {new Date(r.listingBoost.expiresAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {formatNumber(r.listingBoost.views)} / {formatNumber(r.listingBoost.viewsGoal)} vues</span></p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.status === 'APPROVED' && <button onClick={() => setStatsFor(r)} className="flex h-9 cursor-pointer items-center gap-1 rounded-lg border-none bg-surface-container-low px-2.5 text-label-md text-on-surface"><Icon name="bar_chart" size={16} /> Statistiques</button>}
                    {r.canBoost && settings.boostEnabled && <button onClick={() => setBoostFor(r)} className="flex h-9 cursor-pointer items-center gap-1 rounded-lg border-none bg-primary px-2.5 text-label-md text-white"><Icon name="rocket_launch" size={16} /> Booster</button>}
                    {r.status !== 'ARCHIVED' && <button onClick={() => setDeleteFor(r)} className="flex h-9 cursor-pointer items-center gap-1 rounded-lg border-none bg-transparent px-2 text-label-md text-on-surface-variant hover:text-primary"><Icon name="delete" size={16} /> Supprimer</button>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Which listing */}
      <BottomSheet open={pick} onClose={() => setPick(false)} title="Pour quelle annonce ?">
        {!live.length ? (
          <p className="m-0 text-body-md text-on-surface-variant">Un Reel accompagne une annonce en ligne ou en vérification. Publiez d’abord une annonce (vous pouvez joindre la vidéo en la déposant), puis ajoutez-lui une vidéo.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {live.map(l => (
              <li key={l.id}>
                <button onClick={() => { setPick(false); setComposeFor(l) }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-solid border-outline-variant bg-surface-lowest p-2.5 text-left hover:bg-surface-container-low">
                  {l.coverImageUrl ? <img src={l.coverImageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-lg bg-surface-container" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label-lg text-on-surface">{l.title}</span>
                    {l.status === 'PENDING_REVIEW' && <span className="block text-body-sm text-on-surface-variant">En vérification</span>}
                  </span>
                  <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>

      {composeFor && (
        <Suspense fallback={null}>
          <ReelComposer listing={composeFor} open onClose={() => { setComposeFor(null); void refetch() }} />
        </Suspense>
      )}

      {/* Watch one's own Reel (any status) */}
      <BottomSheet open={!!watch} onClose={() => setWatch(null)} title="Aperçu" maxHeight="92vh">
        {watch?.videoUrl && (
          <div className="mx-auto aspect-[9/16] max-h-[70vh] overflow-hidden rounded-2xl bg-black">
            <video src={watch.videoUrl} poster={watch.posterUrl ?? undefined} controls playsInline autoPlay muted className="h-full w-full object-contain" />
          </div>
        )}
        {watch && (watch.videoBytes ?? 0) > 0 && <p className="m-0 mt-2 text-center text-body-sm text-on-surface-variant">Vidéo servie : {((watch.videoBytes ?? 0) / MB).toFixed(1)} Mo ({((watch.videoLowBytes ?? 0) / MB).toFixed(1)} Mo en économie de données)</p>}
      </BottomSheet>

      {statsFor && <ReelStatsSheet reelId={statsFor.id} onClose={() => setStatsFor(null)} />}
      {boostFor && <ReelBoostSheet reelId={boostFor.id} countryCode={currentUser?.countryCode} onClose={() => { setBoostFor(null); void refetch() }} />}

      <ConfirmSheet
        open={!!deleteFor}
        title="Supprimer ce Reel ?"
        confirmLabel="Supprimer"
        tone="danger"
        loading={removing}
        onClose={() => setDeleteFor(null)}
        onConfirm={() => { if (deleteFor) void remove({ variables: { id: deleteFor.id } }).then(() => { setDeleteFor(null); void refetch() }) }}
      >
        <p className="m-0 text-body-md text-on-surface">La vidéo disparaît du fil, de l’annonce et de votre profil. Ses statistiques restent dans votre historique.</p>
      </ConfirmSheet>
    </AccountLayout>
  )
}
