import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import BottomSheet from '../BottomSheet'
import Icon from '../Icon'
import { creditsLabel } from '../Credits'
import HelpLink from '../HelpLink'
import {
  DELETE_REEL_MUTATION, FINISH_REEL_MUTATION, MY_REELS_QUERY, REEL_ELIGIBILITY_QUERY, START_REEL_MUTATION, type MyReel,
} from '../../graphql/reels'
import { formatDuration, useReelSettings } from '../../lib/reels'
import { ReelUploadError, canCompress, compressVideo, sendReelFile } from '../../lib/reelUpload'

const MB = 1024 * 1024
// Above this rate (phones film at 10-20 Mb/s) the browser shrinks the
// video first when it can: far fewer bytes on a mobile network.
const SHRINK_ABOVE_BPS = 3_000_000
const SHRINK_ABOVE_BYTES = 12 * MB

type Listing = { id: string; title: string; coverImageUrl?: string | null; countryCode?: string | null }
type Step = 'pick' | 'edit' | 'sending' | 'done'

// « Ajouter un Reel » to one listing: film or pick a video, keep the part
// that fits the maximum length, a caption, then the upload (resumable,
// lib/reelUpload) with its progress. The server converts the video and the
// moderation checks it before it goes online.
export default function ReelComposer({ listing, open, onClose, onOpenReels }: { listing: Listing; open: boolean; onClose: () => void; onOpenReels?: () => void }) {
  const settings = useReelSettings(listing.countryCode)
  const { data: elig, loading: checking } = useQuery<{ reelEligibility: { allowed: boolean; reason: string | null; price: number; balance: number } }>(REEL_ELIGIBILITY_QUERY, {
    variables: { listingId: listing.id }, skip: !open, fetchPolicy: 'network-only',
  })
  const [startReel] = useMutation<{ startReel: { chunkBytes: number; uploadPath: string; reel: { id: string } } }>(START_REEL_MUTATION)
  const [finishReel] = useMutation<{ finishReel: MyReel }>(FINISH_REEL_MUTATION, { refetchQueries: [{ query: MY_REELS_QUERY }] })
  const [deleteReel] = useMutation(DELETE_REEL_MUTATION)

  const [step, setStep] = useState<Step>('pick')
  const [file, setFile] = useState<File | null>(null)
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  const [duration, setDuration] = useState(0)
  const [range, setRange] = useState<[number, number]>([0, 0])
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'shrink' | 'send' | 'finish'>('send')
  const [progress, setProgress] = useState(0)
  const [sentSize, setSentSize] = useState(0)
  const preview = useRef<HTMLVideoElement>(null)
  const abort = useRef<AbortController | null>(null)
  // The Reel started on the server (resumed by « Réessayer »).
  const started = useRef<{ id: string; uploadPath: string; chunkBytes: number; blob: Blob } | null>(null)
  const pickInput = useRef<HTMLInputElement>(null)
  const filmInput = useRef<HTMLInputElement>(null)

  const max = settings.maxDurationSec
  const reset = () => {
    abort.current?.abort()
    abort.current = null
    started.current = null
    setStep('pick'); setFile(null); setDuration(0); setRange([0, 0]); setCaption(''); setError(null); setProgress(0)
  }
  const close = () => {
    // An upload cut by closing: nothing kept on the server.
    if (step === 'sending' && started.current) void deleteReel({ variables: { id: started.current.id } }).catch(() => undefined)
    reset()
    onClose()
  }

  const choose = (f: File | undefined) => {
    setError(null)
    if (!f) return
    if (!f.type.startsWith('video/') && !/\.(mp4|mov|m4v|3gp|webm|mkv)$/i.test(f.name)) { setError('Choisissez une vidéo (MP4, MOV ou WebM).'); return }
    setFile(f)
    setStep('edit')
  }

  const onMeta = () => {
    const v = preview.current
    if (!v) return
    const d = Number.isFinite(v.duration) ? v.duration : 0
    setDuration(d)
    setRange([0, d ? Math.min(d, max) : max])
  }
  // « Lire le passage »: from the start of the kept part, stops at its end.
  const onTime = () => {
    const v = preview.current
    if (v && duration > max && v.currentTime >= range[1]) { v.pause(); v.currentTime = range[0] }
  }
  const setStart = (s: number) => {
    const start = Math.min(s, Math.max(0, duration - 1))
    const end = Math.min(duration, Math.max(start + 1, Math.min(range[1], start + max)))
    setRange([start, end])
    if (preview.current) preview.current.currentTime = start
  }
  const setEnd = (e: number) => {
    const end = Math.max(range[0] + 1, Math.min(duration, e))
    setRange([Math.max(0, Math.min(range[0], end - 1), end - max), end])
    if (preview.current) preview.current.currentTime = Math.max(0, end - 2)
  }
  const kept = duration ? range[1] - range[0] : 0
  const trimmed = duration > 0 && (range[0] > 0.05 || range[1] < duration - 0.05)
  const tooHeavy = !!file && file.size > settings.maxSizeMb * MB
  const willShrink = !!file && canCompress() && kept > 0 && (tooHeavy || (file.size > SHRINK_ABOVE_BYTES && (file.size * 8) / Math.max(1, duration) > SHRINK_ABOVE_BPS))
  const blocked = tooHeavy && !canCompress()

  const send = async () => {
    if (!file || !kept) return
    setError(null)
    setStep('sending')
    setProgress(0)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      let s = started.current
      if (!s) {
        let blob: Blob = file
        let trim: { trimStart: number | null; trimEnd: number | null } = { trimStart: trimmed ? range[0] : null, trimEnd: trimmed ? range[1] : null }
        if (willShrink) {
          setPhase('shrink')
          const small = await compressVideo(file, { start: range[0], end: range[1], onProgress: setProgress, signal: ctrl.signal })
          if (small) { blob = small; trim = { trimStart: null, trimEnd: null } }
        }
        if (blob.size > settings.maxSizeMb * MB) throw new ReelUploadError(`Vidéo trop lourde (${Math.ceil(blob.size / MB)} Mo, ${settings.maxSizeMb} Mo au maximum) : raccourcissez-la ou filmez en qualité normale.`)
        const r = await startReel({ variables: { input: { listingId: listing.id, caption: caption.trim() || null, size: blob.size, durationSec: Math.round(kept * 10) / 10, ...trim } } })
        if (!r.data) throw new ReelUploadError('L’envoi n’a pas pu commencer.')
        s = { id: r.data.startReel.reel.id, uploadPath: r.data.startReel.uploadPath, chunkBytes: r.data.startReel.chunkBytes, blob }
        started.current = s
      }
      setPhase('send')
      setSentSize(s.blob.size)
      await sendReelFile(s.blob, { uploadPath: s.uploadPath, chunkBytes: s.chunkBytes, onProgress: setProgress, signal: ctrl.signal })
      setPhase('finish')
      await finishReel({ variables: { id: s.id } })
      started.current = null
      setStep('done')
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return
      setError((e as Error).message || 'L’envoi a échoué.')
    } finally {
      abort.current = null
    }
  }

  const e = elig?.reelEligibility
  const price = e?.price ?? settings.publishPrice
  const title = step === 'done' ? 'Reel envoyé' : 'Ajouter un Reel'

  const footer = step === 'edit' ? (
    <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
      <button onClick={reset} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Changer de vidéo</button>
      <button onClick={() => void send()} disabled={!kept || blocked} className="h-12 flex-[1.4] cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-50">
        {price > 0 ? `Publier · ${creditsLabel(price)}` : 'Publier le Reel'}
      </button>
    </div>
  ) : step === 'sending' ? (
    <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
      {error ? (
        <>
          <button onClick={close} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Abandonner</button>
          <button onClick={() => void send()} className="h-12 flex-[1.4] cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white">Réessayer</button>
        </>
      ) : (
        <button onClick={close} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Annuler l’envoi</button>
      )}
    </div>
  ) : undefined

  return (
    <BottomSheet open={open} onClose={close} title={title} maxHeight="92vh" footer={footer}>
      <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5">
        {listing.coverImageUrl && <img src={listing.coverImageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />}
        <div className="min-w-0">
          <p className="m-0 text-label-sm uppercase text-on-surface-variant">Reel de l’annonce</p>
          <p className="m-0 truncate text-label-lg text-on-surface">{listing.title}</p>
        </div>
      </div>

      {step === 'pick' && (
        <div className="mt-4">
          {checking && !e ? <p className="m-0 text-body-md text-on-surface-variant">Vérification…</p> : e && !e.allowed ? (
            <p className="m-0 flex items-start gap-2 rounded-xl bg-primary-fixed/50 p-3 text-body-md text-on-surface"><Icon name="info" size={20} className="mt-0.5 shrink-0 text-primary" /> {e.reason}</p>
          ) : (
            <>
              <p className="m-0 text-body-md text-on-surface">Montrez votre article en vidéo : les acheteurs le voient dans les Reels de Dilchap, sur l’annonce et sur votre profil, puis vous contactent.</p>
              <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-body-sm text-on-surface-variant">
                <li className="flex gap-2"><Icon name="videocam" size={17} className="shrink-0 text-primary" /> Filmez à la verticale, en pleine lumière, l’article sous tous ses angles.</li>
                <li className="flex gap-2"><Icon name="timer" size={17} className="shrink-0 text-primary" /> {max} secondes au maximum (vous choisirez le passage à garder), {settings.maxSizeMb} Mo au plus.</li>
                <li className="flex gap-2"><Icon name="block" size={17} className="shrink-0 text-primary" /> Pas de numéro de téléphone ni de lien à l’écran : les acheteurs vous contactent sur Dilchap.</li>
                <li className="flex gap-2"><Icon name="verified_user" size={17} className="shrink-0 text-primary" /> Chaque Reel est vérifié avant d’être mis en ligne.</li>
              </ul>
              {price > 0 && <p className="m-0 mt-3 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface">Publier un Reel coûte <strong>{creditsLabel(price)}</strong> (votre solde : {creditsLabel(e?.balance ?? 0)}). Ils vous sont rendus si le Reel est refusé.</p>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => filmInput.current?.click()} className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="videocam" size={20} /> Filmer</button>
                <button onClick={() => pickInput.current?.click()} className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface"><Icon name="video_call" size={20} /> Choisir une vidéo</button>
              </div>
              <input ref={filmInput} type="file" accept="video/*" capture="environment" className="hidden" onChange={ev => choose(ev.target.files?.[0])} />
              <input ref={pickInput} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" className="hidden" onChange={ev => choose(ev.target.files?.[0])} />
              <div className="mt-3"><HelpLink article="publier-un-reel" label="Comment publier un Reel ?" /></div>
            </>
          )}
          {error && <p className="m-0 mt-3 text-body-sm text-primary">{error}</p>}
        </div>
      )}

      {step === 'edit' && url && (
        <div className="mt-4">
          <div className="mx-auto aspect-[9/16] max-h-[46vh] overflow-hidden rounded-2xl bg-black">
            <video ref={preview} src={url} playsInline muted controls preload="metadata" onLoadedMetadata={onMeta} onTimeUpdate={onTime} className="h-full w-full object-contain" />
          </div>
          {duration > max && (
            <div className="mt-3 rounded-xl bg-surface-container-low p-3">
              <p className="m-0 flex items-center gap-1.5 text-label-md text-on-surface"><Icon name="content_cut" size={17} /> Passage à garder : {formatDuration(range[0])} → {formatDuration(range[1])} ({Math.round(kept)} s sur {max} s max)</p>
              <label className="mt-2 block text-body-sm text-on-surface-variant">Début
                <input type="range" min={0} max={Math.max(0, duration - 1)} step={0.1} value={range[0]} onChange={ev => setStart(Number(ev.target.value))} className="block w-full accent-[var(--primary)]" />
              </label>
              <label className="mt-1 block text-body-sm text-on-surface-variant">Fin
                <input type="range" min={1} max={duration} step={0.1} value={range[1]} onChange={ev => setEnd(Number(ev.target.value))} className="block w-full accent-[var(--primary)]" />
              </label>
              <button onClick={() => { const v = preview.current; if (v) { v.currentTime = range[0]; void v.play() } }} className="mt-1 flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-lowest px-3 text-label-md text-on-surface"><Icon name="play_arrow" size={18} /> Lire le passage</button>
            </div>
          )}
          <label className="mt-3 block text-label-md text-on-surface">Légende (facultatif)
            <textarea value={caption} onChange={ev => setCaption(ev.target.value)} maxLength={300} rows={2} placeholder="Ex. : état neuf, livré avec sa boîte, à voir à Cocody" className="input mt-1" />
          </label>
          <p className="m-0 mt-1 text-right text-body-sm text-on-surface-variant">{caption.length} / 300</p>
          {file && (
            <p className="m-0 mt-2 text-body-sm text-on-surface-variant">
              Vidéo de {Math.ceil(file.size / MB)} Mo{duration ? ` · ${formatDuration(duration)}` : ''}.{' '}
              {blocked ? <span className="text-primary">Trop lourde ({settings.maxSizeMb} Mo maximum) : raccourcissez-la ou filmez en qualité normale.</span>
                : willShrink ? 'Elle sera d’abord allégée sur votre téléphone (gardez cette page ouverte), puis envoyée.' : 'Dilchap la convertit pour qu’elle se charge vite chez les acheteurs.'}
            </p>
          )}
          {error && <p className="m-0 mt-2 text-body-sm text-primary">{error}</p>}
        </div>
      )}

      {step === 'sending' && (
        <div className="mt-5">
          <p className="m-0 text-label-lg text-on-surface">
            {phase === 'shrink' ? 'Allègement de la vidéo…' : phase === 'finish' ? 'Finalisation…' : 'Envoi de la vidéo…'}
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="m-0 mt-1.5 text-body-sm text-on-surface-variant">
            {Math.round(progress * 100)} %{phase === 'send' && sentSize ? ` · ${(progress * sentSize / MB).toFixed(1)} / ${(sentSize / MB).toFixed(1)} Mo` : ''}
            {phase === 'shrink' ? ' · gardez cette page ouverte' : ''}
          </p>
          {error ? <p className="m-0 mt-3 flex items-start gap-2 rounded-xl bg-primary-fixed/50 p-3 text-body-sm text-on-surface"><Icon name="error" size={18} className="mt-0.5 shrink-0 text-primary" /> {error}</p>
            : <p className="m-0 mt-3 text-body-sm text-on-surface-variant">Réseau coupé ? L’envoi reprend tout seul là où il en était.</p>}
        </div>
      )}

      {step === 'done' && (
        <div className="mt-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="check_circle" size={32} /></span>
          <p className="m-0 mt-3 text-headline-sm text-on-surface">Votre Reel est envoyé</p>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">Dilchap prépare la vidéo puis la vérifie. Vous serez prévenu dès qu’elle est en ligne.</p>
          <div className="mt-4 flex flex-col gap-2">
            {onOpenReels && <button onClick={() => { reset(); onOpenReels() }} className="h-12 cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white">Voir mes Reels</button>}
            <button onClick={close} className="h-12 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Fermer</button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
