import { lazy, Suspense, useEffect, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../Icon'
import { creditsLabel } from '../Credits'
import HelpLink from '../HelpLink'
import { MY_REELS_QUERY, REEL_DRAFT_ELIGIBILITY_QUERY, REEL_STATUS_LABEL, type MyReel } from '../../graphql/reels'
import { useReelSettings } from '../../lib/reels'
import { pendingReel, usePendingReels, type PendingReel, type ReelDraft } from '../../lib/reelDrafts'
import ReelEditor, { ReelPickButtons, ReelSendProgress } from './ReelEditor'
import { useReelSender } from './useReelSender'

const ReelComposer = lazy(() => import('./ReelComposer'))

type Elig = { allowed: boolean; reason: string | null; price: number; balance: number }

/** Reels offered for a listing of this country (and of the Section Adultes only if the rule allows it). */
export function useReelsOffered(countryCode: string | null | undefined, adult: boolean) {
  const s = useReelSettings(countryCode)
  return { offered: s.enabled && (!adult || s.adultAllowed), settings: s }
}

// « Reel (facultatif) » of « Déposer une annonce »: the video is chosen,
// trimmed and captioned here, kept with the form, and sent once the listing
// is created (ReelPostUpload on the confirmation screen). `extraCredits`:
// what the publication already spends (campaign), to warn when the balance
// can't pay both.
export function ReelPostCard({ countryCode, adult, title, value, onChange, extraCredits = 0, onNavigate, render }: {
  countryCode: string
  adult: boolean
  title: string
  value: ReelDraft | null
  onChange: (d: ReelDraft | null) => void
  extraCredits?: number
  onNavigate?: (page: string) => void
  render: (body: React.ReactNode) => React.ReactNode
}) {
  const { offered, settings } = useReelsOffered(countryCode, adult)
  const { data, loading } = useQuery<{ reelDraftEligibility: Elig }>(REEL_DRAFT_ELIGIBILITY_QUERY, {
    variables: { countryCode, adult }, skip: !offered, fetchPolicy: 'cache-and-network',
  })
  const [error, setError] = useState<string | null>(null)
  if (!offered) return null
  const e = data?.reelDraftEligibility
  const price = e?.price ?? settings.publishPrice
  const short = !!e && price > 0 && e.balance - extraCredits < price

  const body = (
    <div data-testid="post-reel">
      {loading && !e ? <p className="m-0 text-body-md text-on-surface-variant">Vérification…</p> : e && !e.allowed ? (
        <div className="flex flex-wrap items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 basis-48">{e.reason}</span>
          {price > e.balance && onNavigate && <button type="button" onClick={() => onNavigate('seller-wallet')} className="h-10 cursor-pointer rounded-lg border-none bg-surface-lowest px-3 text-label-md text-primary">Acheter des crédits</button>}
        </div>
      ) : !value ? (
        <>
          <ul className="m-0 mb-3 flex list-none flex-col gap-1.5 p-0 text-body-sm text-on-surface-variant">
            <li className="flex gap-2"><Icon name="videocam" size={17} className="shrink-0 text-primary" /> À la verticale, en pleine lumière, l’article sous tous ses angles.</li>
            <li className="flex gap-2"><Icon name="timer" size={17} className="shrink-0 text-primary" /> {settings.maxDurationSec} secondes au maximum (vous choisirez le passage), {settings.maxSizeMb} Mo au plus.</li>
            <li className="flex gap-2"><Icon name="block" size={17} className="shrink-0 text-primary" /> Ni numéro ni lien à l’écran : les acheteurs vous contactent sur Dilchap.</li>
          </ul>
          <ReelPickButtons compact onPick={d => { setError(null); onChange(d) }} onError={setError} />
        </>
      ) : (
        <>
          <ReelEditor draft={value} onChange={onChange} maxDurationSec={settings.maxDurationSec} maxSizeMb={settings.maxSizeMb} defaultCaption={title.trim()} previewClassName="max-h-[52vh] max-w-[300px]" />
          <button type="button" onClick={() => onChange(null)} className="mt-3 flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-container-high px-3 text-label-md text-on-surface"><Icon name="delete" size={18} /> Retirer la vidéo</button>
        </>
      )}
      {e?.allowed && price > 0 && (
        <p className={`m-0 mt-3 rounded-xl p-3 text-body-sm ${short ? 'bg-primary-fixed/50 text-on-surface' : 'bg-surface-container-low text-on-surface'}`}>
          Publier le Reel coûte <strong>{creditsLabel(price)}</strong>, débités à l’envoi de la vidéo et rendus s’il est refusé (votre solde : {creditsLabel(e.balance)}).
          {short && <> Avec la campagne choisie, votre solde ne suffit pas pour les deux : l’annonce sera publiée, et vous pourrez envoyer le Reel après avoir rechargé.</>}
        </p>
      )}
      {value && e?.allowed && <p className="m-0 mt-2 text-body-sm text-on-surface-variant">La vidéo est envoyée juste après la publication de l’annonce, puis vérifiée : elle apparaît dès que l’annonce et le Reel sont validés.</p>}
      {error && <p className="m-0 mt-2 text-body-sm text-primary">{error}</p>}
      <div className="mt-3"><HelpLink article="publier-un-reel" label="Comment publier un Reel ?" /></div>
    </div>
  )
  return <>{render(body)}</>
}

// Confirmation screen: the Reel chosen in the form is sent to the listing
// just created, with its progress. A failure leaves the listing published:
// « Réessayer », or « Plus tard » (the video stays for the session, « Mes
// Reels » resumes it).
export function ReelPostUpload({ listing, draft, live, onNavigate }: { listing: PendingReel['listing']; draft: ReelDraft; live: boolean; onNavigate: (page: string) => void }) {
  const settings = useReelSettings(listing.countryCode)
  const sender = useReelSender(listing, settings.maxSizeMb)
  const [later, setLater] = useState(false)
  // Started after the mount settles (React's strict mode mounts twice:
  // never two uploads).
  useEffect(() => {
    const t = window.setTimeout(() => void sender.send(draft), 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Leaving while it sends: the browser asks first.
  useEffect(() => {
    if (sender.state !== 'sending') return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [sender.state])

  return (
    <div data-testid="post-reel-upload" className="mt-6 rounded-2xl border border-outline-variant bg-surface-lowest p-5 text-left">
      <div className="mb-3 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="smart_display" size={22} className="text-primary" /> Votre Reel</div>
      {sender.state === 'done' ? (
        <p className="m-0 flex items-start gap-2 text-body-md text-on-surface"><Icon name="check_circle" size={20} className="mt-0.5 shrink-0 text-tertiary" /> Vidéo envoyée. Dilchap la prépare puis la vérifie : {live ? 'elle apparaît sur l’annonce et dans les Reels dès sa validation.' : 'elle apparaît dès que l’annonce et le Reel sont validés.'} Suivez-la dans « Mes Reels ».</p>
      ) : later ? (
        <p className="m-0 text-body-md text-on-surface">La vidéo est gardée jusqu’à la fermeture de Dilchap : reprenez l’envoi depuis <button type="button" onClick={() => onNavigate('seller-reels')} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary underline">Mes Reels</button>.</p>
      ) : sender.state === 'failed' ? (
        <>
          <p className="m-0 flex items-start gap-2 rounded-xl bg-primary-fixed p-3 text-body-sm text-primary"><Icon name="error" size={20} className="shrink-0" /> <span>Votre annonce est bien publiée, mais l’envoi de la vidéo n’a pas abouti : {sender.error}</span></p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void sender.send(draft)} className="h-12 min-w-[9rem] flex-1 cursor-pointer rounded-xl border-none bg-primary px-4 text-label-lg text-white">Réessayer</button>
            <button type="button" onClick={() => { sender.cancel(false); setLater(true) }} className="h-12 min-w-[9rem] flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high px-4 text-label-lg text-on-surface">Plus tard depuis Mes Reels</button>
          </div>
        </>
      ) : (
        <>
          <ReelSendProgress phase={sender.phase} progress={sender.progress} bytes={sender.bytes} />
          <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Gardez cette page ouverte jusqu’à la fin de l’envoi.</p>
        </>
      )}
    </div>
  )
}

// « Modifier l'annonce »: the listing's Reels (status) and « Ajouter un
// Reel », or resuming a video not sent yet; the rest is in « Mes Reels ».
export function ReelEditLink({ listing, adult, onNavigate, render }: {
  listing: PendingReel['listing'] & { status: string }
  adult: boolean
  onNavigate: (page: string) => void
  render: (body: React.ReactNode) => React.ReactNode
}) {
  const { offered, settings } = useReelsOffered(listing.countryCode, adult)
  const canHave = listing.status === 'APPROVED' || listing.status === 'PENDING_REVIEW'
  const { data, refetch } = useQuery<{ myReels: MyReel[] }>(MY_REELS_QUERY, { variables: { listingId: listing.id }, skip: !offered, fetchPolicy: 'cache-and-network' })
  usePendingReels()
  const kept = pendingReel(listing.id)
  const [open, setOpen] = useState(false)
  if (!offered) return null
  const reels = (data?.myReels ?? []).filter(r => r.status !== 'ARCHIVED')
  const live = reels.filter(r => ['UPLOADING', 'PROCESSING', 'PENDING_REVIEW', 'APPROVED'].includes(r.status)).length
  const full = live >= settings.perListing
  const body = (
    <div data-testid="edit-reel">
      {reels.length > 0 ? (
        <ul className="m-0 mb-3 flex list-none flex-col gap-1.5 p-0">
          {reels.map(r => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low p-2.5 text-body-sm text-on-surface">
              <Icon name="smart_display" size={18} className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate">{r.caption || 'Reel'}</span>
              <span className="shrink-0 rounded-full bg-surface-lowest px-2 py-0.5 text-label-sm">{REEL_STATUS_LABEL[r.status]}</span>
            </li>
          ))}
        </ul>
      ) : <p className="m-0 mb-3 text-body-sm text-on-surface-variant">Pas encore de vidéo pour cette annonce.</p>}
      {kept && <p className="m-0 mb-3 flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-body-sm text-amber-900"><Icon name="upload" size={18} className="mt-0.5 shrink-0" /> Une vidéo de cette annonce n’a pas encore été envoyée.</p>}
      <div className="flex flex-wrap gap-2">
        {canHave && (kept || !full) && (
          <button type="button" onClick={() => setOpen(true)} className="flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-4 text-label-md text-white"><Icon name={kept ? 'upload' : 'video_call'} size={18} /> {kept ? 'Reprendre l’envoi' : 'Ajouter un Reel'}</button>
        )}
        {reels.length > 0 && <button type="button" onClick={() => onNavigate('seller-reels')} className="flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-container-high px-4 text-label-md text-on-surface"><Icon name="smart_display" size={18} /> Mes Reels</button>}
      </div>
      {!canHave && <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Un Reel s’ajoute à une annonce en ligne ou en vérification.</p>}
      {canHave && full && !kept && <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Maximum de {settings.perListing} Reel{settings.perListing > 1 ? 's' : ''} atteint pour cette annonce.</p>}
      {open && (
        <Suspense fallback={null}>
          <ReelComposer listing={listing} open onClose={() => { setOpen(false); void refetch() }} onOpenReels={() => onNavigate('seller-reels')} />
        </Suspense>
      )}
    </div>
  )
  return <>{render(body)}</>
}
