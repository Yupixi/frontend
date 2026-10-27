import { GRAPHQL_URL, refreshAccessToken } from './apollo'
import { getAccessToken } from './auth'
import { localeHeaders } from '../i18n/headers'
import reels from '../i18n/ns/reels'

// Sending a Reel's video: 1 Mo pieces in order, each one retried, so a cut
// mobile connection (very common on 3G) never starts the whole file over —
// after a failure the server says how much it has (GET), and the upload
// resumes from there. The server converts the video afterwards (sizes,
// poster), the storefront only sends the file, after an optional shrink in
// the browser (compressVideo) when the phone can do it.

const API = GRAPHQL_URL.replace(/\/graphql\/?$/, '')
const RETRIES = 8

export class ReelUploadError extends Error {}

const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const t = window.setTimeout(resolve, ms)
  signal?.addEventListener('abort', () => { window.clearTimeout(t); reject(new DOMException('Annulé', 'AbortError') /* i18n-ignore: never shown */) }, { once: true })
})

// Back online (or a while later): next attempt.
const online = (ms: number, signal?: AbortSignal) => navigator.onLine
  ? wait(ms, signal)
  : new Promise<void>((resolve, reject) => {
    const go = () => { window.removeEventListener('online', go); resolve() }
    window.addEventListener('online', go)
    signal?.addEventListener('abort', () => { window.removeEventListener('online', go); reject(new DOMException('Annulé', 'AbortError') /* i18n-ignore: never shown */) }, { once: true })
  })

type Answer = { status: number; body: { received?: number; message?: string | string[] } | null }

function sendChunk(url: string, chunk: Blob, token: string | null, onProgress: (loaded: number) => void, signal?: AbortSignal) {
  return new Promise<Answer>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    for (const [k, v] of Object.entries(localeHeaders())) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = e => onProgress(e.loaded)
    xhr.onload = () => {
      let body: Answer['body'] = null
      try { body = JSON.parse(xhr.responseText) as Answer['body'] } catch { /* not JSON */ }
      resolve({ status: xhr.status, body })
    }
    xhr.onerror = () => reject(new TypeError('network'))
    xhr.ontimeout = () => reject(new TypeError('timeout'))
    xhr.timeout = 120_000
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.onabort = () => reject(new DOMException('Annulé', 'AbortError') /* i18n-ignore: never shown */)
    const form = new FormData()
    form.append('chunk', chunk, 'chunk')
    xhr.send(form)
  })
}

async function receivedBytes(path: string, signal?: AbortSignal): Promise<number | null> {
  try {
    const token = getAccessToken()
    const res = await fetch(`${API}${path}`, { headers: { ...localeHeaders(), ...(token ? { authorization: `Bearer ${token}` } : {}) }, signal })
    if (!res.ok) return null
    return ((await res.json()) as { received: number }).received
  } catch { return null }
}

const messageOf = (b: Answer['body'], fallback: string) => {
  const m = b?.message
  return (Array.isArray(m) ? m[0] : m) || fallback
}

/** Sends `file` to the Reel started with startReel; `onProgress` gets 0..1. */
export async function sendReelFile(file: Blob, o: { uploadPath: string; chunkBytes: number; onProgress: (f: number) => void; signal?: AbortSignal }) {
  let offset = 0
  let failures = 0
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + o.chunkBytes)
    let answer: Answer
    try {
      answer = await sendChunk(`${API}${o.uploadPath}/chunk?offset=${offset}`, chunk, getAccessToken(), loaded => o.onProgress(Math.min(1, (offset + loaded) / file.size)), o.signal)
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') throw e
      if (++failures > RETRIES) throw new ReelUploadError(reels.t('upload.unstable'))
      await online(Math.min(30_000, 1500 * 2 ** failures), o.signal)
      const have = await receivedBytes(o.uploadPath, o.signal)
      if (have != null) offset = have
      continue
    }
    if (answer.status === 201 || answer.status === 200) {
      failures = 0
      offset = answer.body?.received ?? offset + chunk.size
      o.onProgress(offset / file.size)
      continue
    }
    // Already received (the answer was lost) or out of order: resume there.
    if (answer.status === 409 && typeof answer.body?.received === 'number') { offset = answer.body.received; continue }
    if (answer.status === 401 && failures++ < RETRIES) { await refreshAccessToken().catch(() => null); continue }
    if (answer.status === 429) throw new ReelUploadError(reels.t('upload.tooMany'))
    if (answer.status === 413) throw new ReelUploadError(messageOf(answer.body, reels.t('upload.tooHeavyShort')))
    if (answer.status >= 500 && ++failures <= RETRIES) { await wait(Math.min(30_000, 2000 * 2 ** failures), o.signal); continue }
    throw new ReelUploadError(messageOf(answer.body, reels.t('upload.failed')))
  }
  o.onProgress(1)
}

// ── Réduction dans le navigateur ────────────────────────────────────────
// A heavy video (phones film at 15-20 Mb/s) is re-recorded at ~720 p and
// 1.5 Mb/s before sending, the kept part only: real-time (a 30 s clip
// takes 30 s) but 5 to 10 times fewer bytes on the network. Only where the
// browser can (canvas + MediaRecorder + Web Audio); otherwise, or on any
// error, the original file is sent and the server does the work.
export function canCompress() {
  return typeof MediaRecorder !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype && typeof AudioContext !== 'undefined'
}

const RECORDER_TYPES = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm']

export async function compressVideo(file: File, o: { start: number; end: number; maxEdge?: number; onProgress: (f: number) => void; signal?: AbortSignal }): Promise<Blob | null> {
  if (!canCompress()) return null
  const type = RECORDER_TYPES.find(t => MediaRecorder.isTypeSupported(t))
  if (!type) return null
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.src = url
  video.playsInline = true
  video.preload = 'auto'
  let audio: AudioContext | null = null
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('illisible'))
    })
    const edge = o.maxEdge ?? 720
    const scale = Math.min(1, edge / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round((video.videoWidth * scale) / 2) * 2
    canvas.height = Math.round((video.videoHeight * scale) / 2) * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const stream = canvas.captureStream(30)
    // The sound goes to the recording only, never to the speakers.
    audio = new AudioContext()
    const dest = audio.createMediaStreamDestination()
    try { audio.createMediaElementSource(video).connect(dest) } catch { /* no audio track */ }
    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t))
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 64_000 })
    const parts: Blob[] = []
    recorder.ondataavailable = e => { if (e.data.size) parts.push(e.data) }
    const done = new Promise<void>(resolve => { recorder.onstop = () => resolve() })
    video.currentTime = o.start
    await new Promise<void>(resolve => { video.onseeked = () => resolve() })
    let raf = 0
    const draw = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const f = (video.currentTime - o.start) / Math.max(0.1, o.end - o.start)
      o.onProgress(Math.min(1, Math.max(0, f)))
      if (video.currentTime >= o.end || video.ended) { recorder.state !== 'inactive' && recorder.stop(); video.pause(); return }
      raf = requestAnimationFrame(draw)
    }
    o.signal?.addEventListener('abort', () => { cancelAnimationFrame(raf); video.pause(); if (recorder.state !== 'inactive') recorder.stop() }, { once: true })
    recorder.start(1000)
    await audio.resume().catch(() => undefined)
    await video.play()
    raf = requestAnimationFrame(draw)
    video.onended = () => { if (recorder.state !== 'inactive') recorder.stop() }
    await done
    cancelAnimationFrame(raf)
    if (o.signal?.aborted) throw new DOMException('Annulé', 'AbortError') /* i18n-ignore: never shown */
    const blob = new Blob(parts, { type: type.split(';')[0] })
    // Not worth it (already light), or nothing recorded.
    return blob.size > 50_000 && blob.size < file.size * 0.8 ? blob : null
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') throw e
    return null
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
    void audio?.close().catch(() => undefined)
  }
}
