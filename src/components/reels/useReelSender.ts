import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { DELETE_REEL_MUTATION, FINISH_REEL_MUTATION, MY_REELS_QUERY, START_REEL_MUTATION, type MyReel } from '../../graphql/reels'
import { dropPendingReel, keepPendingReel, pendingReel, sendReelDraft, type PendingReel, type ReelDraft, type SendPhase } from '../../lib/reelDrafts'

type Listing = PendingReel['listing']
export type SenderState = 'idle' | 'sending' | 'failed' | 'done'

// Sends one Reel of a listing with its progress. A try that fails (or is
// put off with « Plus tard ») keeps the video and the server upload in the
// session's memory (lib/reelDrafts): the next try — here, in « Mes Reels »
// or on the listing's edit page — resumes where it stopped.
export function useReelSender(listing: Listing, maxSizeMb: number) {
  const [startReel] = useMutation<{ startReel: { chunkBytes: number; uploadPath: string; reel: { id: string } } }>(START_REEL_MUTATION)
  const [finishReel] = useMutation<{ finishReel: MyReel }>(FINISH_REEL_MUTATION, { refetchQueries: [{ query: MY_REELS_QUERY }] })
  const [deleteReel] = useMutation(DELETE_REEL_MUTATION)
  const [state, setState] = useState<SenderState>('idle')
  const [phase, setPhase] = useState<SendPhase>('send')
  const [progress, setProgress] = useState(0)
  const [bytes, setBytes] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])

  const send = async (draft: ReelDraft) => {
    const before = pendingReel(listing.id)
    // Same video and choices as the kept one: resume its upload. Changed
    // since (other passage, caption): the half-sent one is dropped.
    const started = before?.draft === draft ? before.started ?? null : null
    if (before?.started && !started) void deleteReel({ variables: { id: before.started.id } }).catch(() => undefined)
    const kept: PendingReel = { listing, draft, started, error: null }
    keepPendingReel(kept)
    setError(null)
    setState('sending')
    setProgress(0)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      await sendReelDraft({
        listingId: listing.id,
        draft,
        caption: draft.caption ?? listing.title,
        maxSizeMb,
        started,
        onStarted: s => { kept.started = s; keepPendingReel(kept) },
        onPhase: (p, b) => { setPhase(p); if (b) setBytes(b) },
        onProgress: setProgress,
        signal: ctrl.signal,
        start: async input => {
          const r = await startReel({ variables: { input } })
          const d = r.data?.startReel
          return d ? { id: d.reel.id, uploadPath: d.uploadPath, chunkBytes: d.chunkBytes } : null
        },
        finish: id => finishReel({ variables: { id } }),
      })
      dropPendingReel(listing.id)
      setState('done')
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return
      const message = (e as Error).message || 'L’envoi a échoué.'
      // The upload is gone on the server (dropped after a day): start over.
      if (/introuvable/i.test(message)) kept.started = null
      keepPendingReel({ ...kept, error: message })
      setError(message)
      setState('failed')
    } finally {
      if (abort.current === ctrl) abort.current = null
    }
  }

  /** Stops the upload in progress; `discard`: forget the video too. */
  const cancel = (discard: boolean) => {
    abort.current?.abort()
    abort.current = null
    const p = pendingReel(listing.id)
    if (discard) {
      if (p?.started) void deleteReel({ variables: { id: p.started.id } }).catch(() => undefined)
      dropPendingReel(listing.id)
    }
    setState('idle')
    setError(null)
    setProgress(0)
  }

  return { state, phase, progress, bytes, error, send, cancel }
}
