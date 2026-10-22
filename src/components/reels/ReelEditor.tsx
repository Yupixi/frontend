import { useEffect, useMemo, useRef } from 'react'
import Icon from '../Icon'
import { formatDuration } from '../../lib/reels'
import { blockedBySize, keptSeconds, willShrink, type ReelDraft } from '../../lib/reelDrafts'

const MB = 1024 * 1024

const isVideo = (f: File) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|3gp|webm|mkv)$/i.test(f.name)

/** « Filmer » / « Choisir une vidéo »: a new draft, or an error message. */
export function ReelPickButtons({ onPick, onError, compact }: { onPick: (d: ReelDraft) => void; onError: (m: string | null) => void; compact?: boolean }) {
  const pickInput = useRef<HTMLInputElement>(null)
  const filmInput = useRef<HTMLInputElement>(null)
  const choose = (f: File | undefined) => {
    onError(null)
    if (!f) return
    if (!isVideo(f)) { onError('Choisissez une vidéo (MP4, MOV ou WebM).'); return }
    onPick({ file: f, duration: 0, range: [0, 0], caption: null })
  }
  const h = compact ? 'h-12' : 'h-14'
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={() => filmInput.current?.click()} className={`flex ${h} min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-2 text-label-lg text-white`}><Icon name="videocam" size={20} className="shrink-0" /> <span className="truncate">Filmer</span></button>
      <button type="button" onClick={() => pickInput.current?.click()} className={`flex ${h} min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container-high px-2 text-label-lg text-on-surface`}><Icon name="video_call" size={20} className="shrink-0" /> <span className="truncate">Choisir une vidéo</span></button>
      <input ref={filmInput} type="file" accept="video/*" capture="environment" className="hidden" onChange={ev => { choose(ev.target.files?.[0]); ev.target.value = '' }} />
      <input ref={pickInput} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" className="hidden" onChange={ev => { choose(ev.target.files?.[0]); ev.target.value = '' }} />
    </div>
  )
}

// The chosen video: preview, the part to keep when it is longer than the
// maximum, the caption (the listing's title until the seller writes one),
// and what will happen to the file (shrunk first, too heavy).
export default function ReelEditor({ draft, onChange, maxDurationSec, maxSizeMb, defaultCaption, previewClassName = 'max-h-[46vh]' }: {
  draft: ReelDraft
  onChange: (d: ReelDraft) => void
  maxDurationSec: number
  maxSizeMb: number
  defaultCaption?: string
  previewClassName?: string
}) {
  const url = useMemo(() => URL.createObjectURL(draft.file), [draft.file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const preview = useRef<HTMLVideoElement>(null)
  const max = maxDurationSec
  const { duration, range } = draft
  const set = (p: Partial<ReelDraft>) => onChange({ ...draft, ...p })

  const onMeta = () => {
    const v = preview.current
    if (!v) return
    const d = Number.isFinite(v.duration) ? v.duration : 0
    // Already read (back to this step): keep the seller's choice.
    if (draft.duration && Math.abs(draft.duration - d) < 0.2) { v.currentTime = draft.range[0]; return }
    set({ duration: d, range: [0, d ? Math.min(d, max) : max] })
  }
  // « Lire le passage »: from the start of the kept part, stops at its end.
  const onTime = () => {
    const v = preview.current
    if (v && duration > max && v.currentTime >= range[1]) { v.pause(); v.currentTime = range[0] }
  }
  const setStart = (s: number) => {
    const start = Math.min(s, Math.max(0, duration - 1))
    const end = Math.min(duration, Math.max(start + 1, Math.min(range[1], start + max)))
    set({ range: [start, end] })
    if (preview.current) preview.current.currentTime = start
  }
  const setEnd = (e: number) => {
    const end = Math.max(range[0] + 1, Math.min(duration, e))
    set({ range: [Math.max(0, Math.min(range[0], end - 1), end - max), end] })
    if (preview.current) preview.current.currentTime = Math.max(0, end - 2)
  }
  const kept = keptSeconds(draft)
  const blocked = blockedBySize(draft, maxSizeMb)
  const shrink = willShrink(draft, maxSizeMb)
  const caption = draft.caption ?? defaultCaption ?? ''

  return (
    <div>
      <div className={`mx-auto aspect-[9/16] overflow-hidden rounded-2xl bg-black ${previewClassName}`}>
        <video ref={preview} src={url} playsInline muted controls preload="metadata" onLoadedMetadata={onMeta} onTimeUpdate={onTime} className="h-full w-full object-contain" aria-label="Aperçu du Reel" />
      </div>
      {duration > max && (
        <div className="mt-3 rounded-xl bg-surface-container-low p-3">
          <p className="m-0 flex items-center gap-1.5 text-label-md text-on-surface"><Icon name="content_cut" size={17} className="shrink-0" /> Passage à garder : {formatDuration(range[0])} → {formatDuration(range[1])} ({Math.round(kept)} s sur {max} s max)</p>
          <label className="mt-2 block text-body-sm text-on-surface-variant">Début
            <input type="range" min={0} max={Math.max(0, duration - 1)} step={0.1} value={range[0]} onChange={ev => setStart(Number(ev.target.value))} className="block w-full accent-[var(--primary)]" />
          </label>
          <label className="mt-1 block text-body-sm text-on-surface-variant">Fin
            <input type="range" min={1} max={duration} step={0.1} value={range[1]} onChange={ev => setEnd(Number(ev.target.value))} className="block w-full accent-[var(--primary)]" />
          </label>
          <button type="button" onClick={() => { const v = preview.current; if (v) { v.currentTime = range[0]; void v.play() } }} className="mt-1 flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-lowest px-3 text-label-md text-on-surface"><Icon name="play_arrow" size={18} /> Lire le passage</button>
        </div>
      )}
      <label className="mt-3 block text-label-md text-on-surface">Légende (facultatif)
        <textarea value={caption} onChange={ev => set({ caption: ev.target.value })} maxLength={300} rows={2} placeholder="Ex. : état neuf, livré avec sa boîte, à voir à Cocody" className="input mt-1" />
      </label>
      <p className="m-0 mt-1 text-right text-body-sm text-on-surface-variant">{caption.length} / 300</p>
      <p className="m-0 mt-2 text-body-sm text-on-surface-variant">
        Vidéo de {Math.ceil(draft.file.size / MB)} Mo{duration ? ` · ${formatDuration(duration)}` : ''}.{' '}
        {blocked ? <span className="text-primary">Trop lourde ({maxSizeMb} Mo maximum) : raccourcissez-la ou filmez en qualité normale.</span>
          : shrink ? 'Elle sera d’abord allégée sur votre téléphone (gardez cette page ouverte), puis envoyée.' : 'Dilchap la convertit pour qu’elle se charge vite chez les acheteurs.'}
      </p>
    </div>
  )
}

/** Progress of an upload (shrink, send, finish), or why it stopped. */
export function ReelSendProgress({ phase, progress, bytes, error }: { phase: 'shrink' | 'send' | 'finish'; progress: number; bytes: number; error?: string | null }) {
  return (
    <div>
      <p className="m-0 text-label-lg text-on-surface">
        {phase === 'shrink' ? 'Allègement de la vidéo…' : phase === 'finish' ? 'Finalisation…' : 'Envoi de la vidéo…'}
      </p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-label="Envoi du Reel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <p className="m-0 mt-1.5 text-body-sm text-on-surface-variant">
        {Math.round(progress * 100)} %{phase === 'send' && bytes ? ` · ${(progress * bytes / MB).toFixed(1)} / ${(bytes / MB).toFixed(1)} Mo` : ''}
        {phase === 'shrink' ? ' · gardez cette page ouverte' : ''}
      </p>
      {error ? <p className="m-0 mt-3 flex items-start gap-2 rounded-xl bg-primary-fixed/50 p-3 text-body-sm text-on-surface"><Icon name="error" size={18} className="mt-0.5 shrink-0 text-primary" /> {error}</p>
        : <p className="m-0 mt-3 text-body-sm text-on-surface-variant">Réseau coupé ? L’envoi reprend tout seul là où il en était.</p>}
    </div>
  )
}
