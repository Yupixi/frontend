import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import BottomSheet from '../BottomSheet'
import Icon from '../Icon'
import { creditsLabel } from '../Credits'
import HelpLink from '../HelpLink'
import { REEL_ELIGIBILITY_QUERY } from '../../graphql/reels'
import { useReelSettings } from '../../lib/reels'
import { blockedBySize, dropPendingReel, keptSeconds, pendingReel, type ReelDraft } from '../../lib/reelDrafts'
import ReelEditor, { ReelPickButtons, ReelSendProgress } from './ReelEditor'
import { useReelSender } from './useReelSender'
import { useT } from '../../i18n'
import reels from '../../i18n/ns/reels'

type Listing = { id: string; title: string; coverImageUrl?: string | null; countryCode?: string | null }
type Step = 'pick' | 'edit' | 'sending' | 'done'

// « Ajouter un Reel » to one listing: film or pick a video, keep the part
// that fits the maximum length, a caption, then the upload (resumable,
// lib/reelUpload) with its progress. The server converts the video and the
// moderation checks it before it goes online. A video not sent yet in this
// session (lib/reelDrafts: publication of the listing, « Plus tard ») comes
// back ready to resume.
export default function ReelComposer({ listing, open, onClose, onOpenReels }: { listing: Listing; open: boolean; onClose: () => void; onOpenReels?: () => void }) {
  const t = useT(reels)
  const settings = useReelSettings(listing.countryCode)
  const { data: elig, loading: checking } = useQuery<{ reelEligibility: { allowed: boolean; reason: string | null; price: number; balance: number } }>(REEL_ELIGIBILITY_QUERY, {
    variables: { listingId: listing.id }, skip: !open, fetchPolicy: 'network-only',
  })
  const sender = useReelSender(listing, settings.maxSizeMb)
  const kept = pendingReel(listing.id)
  const [draft, setDraft] = useState<ReelDraft | null>(() => kept?.draft ?? null)
  const resuming = !!kept && kept.draft === draft && !!kept.started
  const [error, setError] = useState<string | null>(null)
  const step: Step = sender.state === 'done' ? 'done' : sender.state !== 'idle' ? 'sending' : draft ? 'edit' : 'pick'

  const max = settings.maxDurationSec
  const reset = (discard: boolean) => {
    sender.cancel(discard)
    if (discard) dropPendingReel(listing.id)
    setDraft(null)
    setError(null)
  }
  const close = () => {
    // Closed while sending: the upload is dropped (nothing kept on the
    // server); a video that failed stays for a later try this session.
    if (sender.state === 'sending') reset(true)
    else if (sender.state === 'done') reset(false)
    else sender.cancel(false)
    onClose()
  }

  const e = elig?.reelEligibility
  // A resumed upload was already allowed (and is counted in the limits).
  const allowed = resuming || !e || e.allowed
  const price = e?.price ?? settings.publishPrice
  const title = step === 'done' ? t('composer.sent') : t('edit.add')
  const canSend = !!draft && keptSeconds(draft) > 0 && !blockedBySize(draft, settings.maxSizeMb) && allowed

  const footer = step === 'edit' ? (
    <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
      <button onClick={() => reset(true)} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">{t('composer.change')}</button>
      <button onClick={() => draft && void sender.send(draft)} disabled={!canSend} className="h-12 flex-[1.4] cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-50">
        {resuming ? t('edit.resume') : price > 0 ? t('composer.publishPrice', { credits: creditsLabel(price) }) : t('composer.publish')}
      </button>
    </div>
  ) : step === 'sending' ? (
    <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
      {sender.state === 'failed' ? (
        <>
          <button onClick={close} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">{t('composer.later')}</button>
          <button onClick={() => draft && void sender.send(draft)} className="h-12 flex-[1.4] cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white">{t('upload.retry')}</button>
        </>
      ) : (
        <button onClick={close} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">{t('composer.cancelUpload')}</button>
      )}
    </div>
  ) : undefined

  return (
    <BottomSheet open={open} onClose={close} title={title} maxHeight="92vh" footer={footer}>
      <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5">
        {listing.coverImageUrl && <img src={listing.coverImageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />}
        <div className="min-w-0">
          <p className="m-0 text-label-sm uppercase text-on-surface-variant">{t('composer.listingReel')}</p>
          <p className="m-0 truncate text-label-lg text-on-surface">{listing.title}</p>
        </div>
      </div>

      {step === 'pick' && (
        <div className="mt-4">
          {checking && !e ? <p className="m-0 text-body-md text-on-surface-variant">{t('post.checking')}</p> : e && !e.allowed ? (
            <p className="m-0 flex items-start gap-2 rounded-xl bg-primary-fixed/50 p-3 text-body-md text-on-surface"><Icon name="info" size={20} className="mt-0.5 shrink-0 text-primary" /> {e.reason}</p>
          ) : (
            <>
              <p className="m-0 text-body-md text-on-surface">{t('composer.intro')}</p>
              <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-body-sm text-on-surface-variant">
                <li className="flex gap-2"><Icon name="videocam" size={17} className="shrink-0 text-primary" /> {t('composer.tipVertical')}</li>
                <li className="flex gap-2"><Icon name="timer" size={17} className="shrink-0 text-primary" /> {t('composer.tipLimits', { sec: String(max), mb: String(settings.maxSizeMb) })}</li>
                <li className="flex gap-2"><Icon name="block" size={17} className="shrink-0 text-primary" /> {t('composer.tipNoContact')}</li>
                <li className="flex gap-2"><Icon name="verified_user" size={17} className="shrink-0 text-primary" /> {t('composer.tipChecked')}</li>
              </ul>
              {price > 0 && <p className="m-0 mt-3 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface">{t.rich('composer.cost', { price: creditsLabel(price), balance: creditsLabel(e?.balance ?? 0), b: c => <strong>{c}</strong> })}</p>}
              <div className="mt-4"><ReelPickButtons onPick={d => setDraft({ ...d, caption: null })} onError={setError} /></div>
              <div className="mt-3"><HelpLink article="publier-un-reel" label={t('post.howTo')} /></div>
            </>
          )}
          {error && <p className="m-0 mt-3 text-body-sm text-primary">{error}</p>}
        </div>
      )}

      {step === 'edit' && draft && (
        <div className="mt-4">
          {kept && kept.draft === draft && (
            <p className="m-0 mb-3 flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-body-sm text-amber-900"><Icon name="upload" size={18} className="mt-0.5 shrink-0" /> {kept.error ? t('composer.notSentError', { error: kept.error.replace(/\.$/, '') }) : t('composer.notSent')} {resuming ? t('composer.resumeNote') : ''}</p>
          )}
          {e && !e.allowed && !resuming && <p className="m-0 mb-3 flex items-start gap-2 rounded-xl bg-primary-fixed/50 p-3 text-body-sm text-on-surface"><Icon name="info" size={18} className="mt-0.5 shrink-0 text-primary" /> {e.reason}</p>}
          <ReelEditor draft={draft} onChange={setDraft} maxDurationSec={max} maxSizeMb={settings.maxSizeMb} defaultCaption={listing.title} />
        </div>
      )}

      {step === 'sending' && (
        <div className="mt-5"><ReelSendProgress phase={sender.phase} progress={sender.progress} bytes={sender.bytes} error={sender.error} /></div>
      )}

      {step === 'done' && (
        <div className="mt-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="check_circle" size={32} /></span>
          <p className="m-0 mt-3 text-headline-sm text-on-surface">{t('composer.doneTitle')}</p>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('composer.doneText')}</p>
          <div className="mt-4 flex flex-col gap-2">
            {onOpenReels && <button onClick={() => { reset(false); onOpenReels() }} className="h-12 cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white">{t('composer.seeMine')}</button>}
            <button onClick={close} className="h-12 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">{t('composer.close')}</button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
