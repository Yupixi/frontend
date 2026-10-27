import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import { formatDuration } from '../../lib/reels'
import { blockedBySize, keptSeconds, willShrink, type ReelDraft } from '../../lib/reelDrafts'
import { useT } from '../../i18n'
import reels from '../../i18n/ns/reels'

const MB = 1024 * 1024

const isVideo = (f: File) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|3gp|webm|mkv)$/i.test(f.name)

/** « Filmer » / « Choisir une vidéo »: a new draft, or an error message. */
export function ReelPickButtons({ onPick, onError, compact }: { onPick: (d: ReelDraft) => void; onError: (m: string | null) => void; compact?: boolean }) {
  const t = useT(reels)
  const pickInput = useRef<HTMLInputElement>(null)
  const filmInput = useRef<HTMLInputElement>(null)
  const choose = (f: File | undefined) => {
    onError(null)
    if (!f) return
    if (!isVideo(f)) { onError(t('pick.notVideo')); return }
    onPick({ file: f, duration: 0, range: [0, 0], caption: null })
  }
  const h = compact ? 'h-12' : 'h-14'
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={() => filmInput.current?.click()} className={`flex ${h} min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-2 text-label-lg text-white`}><Icon name="videocam" size={20} className="shrink-0" /> <span className="truncate">{t('pick.film')}</span></button>
      <button type="button" onClick={() => pickInput.current?.click()} className={`flex ${h} min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container-high px-2 text-label-lg text-on-surface`}><Icon name="video_call" size={20} className="shrink-0" /> <span className="min-w-0 text-center leading-tight">{t('pick.choose')}</span></button>
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
  // Created and revoked by the same effect: a memo + cleanup pair revoked
  // the URL still in use when React re-runs effects (StrictMode, dev).
  const t = useT(reels)
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(draft.file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [draft.file])
  const preview = useRef<HTMLVideoElement>(null)
  const max = maxDurationSec
  const { duration, range } = draft
  const set = (p: Partial<ReelDraft>) => onChange({ ...draft, ...p })

  const onMeta = () => {
    const v = preview.current
    if (!v) return
    // A WebM recorded in a browser (MediaRecorder) has no duration in its
    // header: Chrome says Infinity until the end is reached. Seeking far
    // makes it read the real one (else the upload fails: « Vidéo trop courte »).
    if (v.duration === Infinity) {
      const known = () => {
        if (!Number.isFinite(v.duration)) return
        v.removeEventListener('durationchange', known)
        v.currentTime = 0
        onMeta()
      }
      v.addEventListener('durationchange', known)
      v.currentTime = 1e101
      return
    }
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
        <video ref={preview} src={url ?? undefined} playsInline muted controls preload="metadata" onLoadedMetadata={onMeta} onTimeUpdate={onTime} className="h-full w-full object-contain" aria-label={t('editor.previewAria')} />
      </div>
      {duration > max && (
        <div className="mt-3 rounded-xl bg-surface-container-low p-3">
          <p className="m-0 flex items-center gap-1.5 text-label-md text-on-surface"><Icon name="content_cut" size={17} className="shrink-0" /> {t('editor.keep', { from: formatDuration(range[0]), to: formatDuration(range[1]), kept: String(Math.round(kept)), max: String(max) })}</p>
          <label className="mt-2 block text-body-sm text-on-surface-variant">{t('editor.start')}
            <input type="range" min={0} max={Math.max(0, duration - 1)} step={0.1} value={range[0]} onChange={ev => setStart(Number(ev.target.value))} className="block w-full accent-[var(--primary)]" />
          </label>
          <label className="mt-1 block text-body-sm text-on-surface-variant">{t('editor.end')}
            <input type="range" min={1} max={duration} step={0.1} value={range[1]} onChange={ev => setEnd(Number(ev.target.value))} className="block w-full accent-[var(--primary)]" />
          </label>
          <button type="button" onClick={() => { const v = preview.current; if (v) { v.currentTime = range[0]; void v.play() } }} className="mt-1 flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-lowest px-3 text-label-md text-on-surface"><Icon name="play_arrow" size={18} /> {t('editor.playPart')}</button>
        </div>
      )}
      <label className="mt-3 block text-label-md text-on-surface">{t('editor.caption')}
        <textarea value={caption} onChange={ev => set({ caption: ev.target.value })} maxLength={300} rows={2} placeholder={t('editor.captionPlaceholder')} className="input mt-1" />
      </label>
      <p className="m-0 mt-1 text-right text-body-sm text-on-surface-variant">{caption.length} / 300</p>
      <p className="m-0 mt-2 text-body-sm text-on-surface-variant">
        {duration ? t('editor.sizeDuration', { mb: String(Math.ceil(draft.file.size / MB)), duration: formatDuration(duration) }) : t('editor.size', { mb: String(Math.ceil(draft.file.size / MB)) })}{' '}
        {blocked ? <span className="text-primary">{t('editor.tooHeavy', { max: String(maxSizeMb) })}</span>
          : shrink ? t('editor.willShrink') : t('editor.willConvert')}
      </p>
    </div>
  )
}

/** Progress of an upload (shrink, send, finish), or why it stopped. */
export function ReelSendProgress({ phase, progress, bytes, error }: { phase: 'shrink' | 'send' | 'finish'; progress: number; bytes: number; error?: string | null }) {
  const t = useT(reels)
  return (
    <div>
      <p className="m-0 text-label-lg text-on-surface">
        {phase === 'shrink' ? t('progress.shrink') : phase === 'finish' ? t('progress.finish') : t('progress.send')}
      </p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-label={t('progress.aria')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <p className="m-0 mt-1.5 text-body-sm text-on-surface-variant">
        {phase === 'send' && bytes ? t('progress.pctBytes', { n: Math.round(progress * 100), done: (progress * bytes / MB).toFixed(1), total: (bytes / MB).toFixed(1) })
          : phase === 'shrink' ? t('progress.pctShrink', { n: Math.round(progress * 100) }) : t('progress.pct', { n: Math.round(progress * 100) })}
      </p>
      {error ? <p className="m-0 mt-3 flex items-start gap-2 rounded-xl bg-primary-fixed/50 p-3 text-body-sm text-on-surface"><Icon name="error" size={18} className="mt-0.5 shrink-0 text-primary" /> {error}</p>
        : <p className="m-0 mt-3 text-body-sm text-on-surface-variant">{t('progress.network')}</p>}
    </div>
  )
}
