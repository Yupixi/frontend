import { useSyncExternalStore } from 'react'
import { ReelUploadError, canCompress, compressVideo, sendReelFile } from './reelUpload'
import reels from '../i18n/ns/reels'

// A Reel chosen before its listing exists (« Déposer une annonce ») or not
// sent yet (upload failed, « Plus tard »): the video stays in this tab's
// memory for the session — never written to the device — so « Mes Reels »
// or the listing's edit page can resume it. Lost on reload.

const MB = 1024 * 1024
// Above this rate (phones film at 10-20 Mb/s) the browser shrinks the
// video first when it can: far fewer bytes on a mobile network.
const SHRINK_ABOVE_BPS = 3_000_000
const SHRINK_ABOVE_BYTES = 12 * MB

/** The video and the choices made on it (trim, caption). */
export type ReelDraft = {
  file: File
  // Whole video length (seconds), 0 until the browser read it.
  duration: number
  // Kept part (seconds).
  range: [number, number]
  // null: the listing's title.
  caption: string | null
}

/** The Reel started on the server (resumed where it stopped). */
export type StartedReel = { id: string; uploadPath: string; chunkBytes: number; blob: Blob }

export type PendingReel = {
  listing: { id: string; title: string; coverImageUrl?: string | null; countryCode?: string | null }
  draft: ReelDraft
  started?: StartedReel | null
  error?: string | null
}

const pending = new Map<string, PendingReel>()
let snapshot: PendingReel[] = []
const listeners = new Set<() => void>()
const emit = () => { snapshot = [...pending.values()]; listeners.forEach(f => f()) }

export function keepPendingReel(p: PendingReel) { pending.set(p.listing.id, p); emit() }
export function pendingReel(listingId: string) { return pending.get(listingId) ?? null }
export function dropPendingReel(listingId: string) { if (pending.delete(listingId)) emit() }
export function usePendingReels() {
  return useSyncExternalStore(f => { listeners.add(f); return () => listeners.delete(f) }, () => snapshot, () => snapshot)
}

export const keptSeconds = (d: ReelDraft) => (d.duration ? d.range[1] - d.range[0] : 0)
export const isTrimmed = (d: ReelDraft) => d.duration > 0 && (d.range[0] > 0.05 || d.range[1] < d.duration - 0.05)
export const tooHeavy = (d: ReelDraft, maxSizeMb: number) => d.file.size > maxSizeMb * MB
/** Shrunk in the browser before sending (heavy video, and the browser can). */
export const willShrink = (d: ReelDraft, maxSizeMb: number) => canCompress() && keptSeconds(d) > 0
  && (tooHeavy(d, maxSizeMb) || (d.file.size > SHRINK_ABOVE_BYTES && (d.file.size * 8) / Math.max(1, d.duration) > SHRINK_ABOVE_BPS))
/** Too heavy and the browser can't shrink it: refused. */
export const blockedBySize = (d: ReelDraft, maxSizeMb: number) => tooHeavy(d, maxSizeMb) && !canCompress()

export type SendPhase = 'shrink' | 'send' | 'finish'

/**
 * Shrinks (when worth it), starts the Reel on the server, sends the file by
 * resumable chunks and finishes it. `started`: a previous try to resume;
 * `onStarted` keeps the new one (for « Réessayer »).
 */
export async function sendReelDraft(o: {
  listingId: string
  draft: ReelDraft
  caption: string | null
  maxSizeMb: number
  started?: StartedReel | null
  onStarted: (s: StartedReel) => void
  onPhase: (p: SendPhase, bytes?: number) => void
  onProgress: (f: number) => void
  signal: AbortSignal
  start: (input: { listingId: string; caption: string | null; size: number; durationSec: number; trimStart: number | null; trimEnd: number | null }) => Promise<{ id: string; uploadPath: string; chunkBytes: number } | null>
  finish: (id: string) => Promise<unknown>
}) {
  const d = o.draft
  const kept = keptSeconds(d)
  let s = o.started ?? null
  if (!s) {
    let blob: Blob = d.file
    const trimmed = isTrimmed(d)
    let trim = { trimStart: trimmed ? d.range[0] : null, trimEnd: trimmed ? d.range[1] : null }
    if (willShrink(d, o.maxSizeMb)) {
      o.onPhase('shrink')
      const small = await compressVideo(d.file, { start: d.range[0], end: d.range[1], onProgress: o.onProgress, signal: o.signal })
      if (small) { blob = small; trim = { trimStart: null, trimEnd: null } }
    }
    if (blob.size > o.maxSizeMb * MB) throw new ReelUploadError(reels.t('upload.tooHeavy', { size: String(Math.ceil(blob.size / MB)), max: String(o.maxSizeMb) }))
    const r = await o.start({ listingId: o.listingId, caption: o.caption?.trim().slice(0, 300) || null, size: blob.size, durationSec: Math.round(kept * 10) / 10, ...trim })
    if (!r) throw new ReelUploadError(reels.t('upload.couldNotStart'))
    s = { ...r, blob }
    o.onStarted(s)
  }
  o.onPhase('send', s.blob.size)
  await sendReelFile(s.blob, { uploadPath: s.uploadPath, chunkBytes: s.chunkBytes, onProgress: o.onProgress, signal: o.signal })
  o.onPhase('finish')
  await o.finish(s.id)
}

// The video chosen in « Déposer une annonce » before the listing exists:
// kept for the session when the seller leaves the form and comes back.
let newListingDraft: ReelDraft | null = null
export const newListingReel = () => newListingDraft
export function keepNewListingReel(d: ReelDraft | null) { newListingDraft = d }
