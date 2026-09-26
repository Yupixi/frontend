import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

export const MAX_VOICE_SECONDS = 300

// Opus/WebM on Chrome, Firefox and Android; AAC/MP4 on Safari and iOS.
const RECORDING_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']
const EXTENSION: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' }

export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export type VoiceRecording = { blob: Blob; filename: string; duration: number }

// Microphone recording for the chat: start / stop (→ file) / cancel, the
// elapsed time and a live input level for the meter.
export function useVoiceRecorder(onAutoStop: (rec: VoiceRecording) => void) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedAt = useRef(0)
  const timer = useRef<number | null>(null)
  const frame = useRef<number | null>(null)
  const audioCtx = useRef<AudioContext | null>(null)
  const settle = useRef<((rec: VoiceRecording | null) => void) | null>(null)
  const autoStop = useRef(onAutoStop)
  useEffect(() => { autoStop.current = onAutoStop }, [onAutoStop])

  const cleanup = () => {
    if (timer.current) window.clearInterval(timer.current)
    if (frame.current) cancelAnimationFrame(frame.current)
    recorder.current?.stream.getTracks().forEach(t => t.stop())
    void audioCtx.current?.close().catch(() => undefined)
    audioCtx.current = null
    recorder.current = null
    setRecording(false)
    setLevel(0)
  }
  useEffect(() => () => { settle.current = null; if (recorder.current?.state === 'recording') recorder.current.stop(); cleanup() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Votre navigateur ne permet pas d’enregistrer un message vocal.')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      setError('Autorisez l’accès au micro pour envoyer un message vocal.')
      return
    }
    const type = RECORDING_TYPES.find(t => MediaRecorder.isTypeSupported?.(t))
    const rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined)
    chunks.current = []
    rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
    rec.onstop = () => {
      const mime = (rec.mimeType || type || 'audio/webm').split(';')[0]
      const duration = Math.max(1, Math.min(MAX_VOICE_SECONDS, Math.round((Date.now() - startedAt.current) / 1000)))
      const result = chunks.current.length
        ? { blob: new Blob(chunks.current, { type: mime }), filename: `vocal.${EXTENSION[mime] ?? 'webm'}`, duration }
        : null
      const done = settle.current
      settle.current = null
      if (done) done(result)
      else if (result) autoStop.current(result)
    }
    recorder.current = rec
    rec.start(250)
    startedAt.current = Date.now()
    setElapsed(0)
    setRecording(true)
    navigator.vibrate?.(20)
    timer.current = window.setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000
      setElapsed(s)
      if (s >= MAX_VOICE_SECONDS && rec.state === 'recording') { rec.stop(); cleanup() }
    }, 200)
    // Input level for the meter.
    try {
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
      audioCtx.current = ctx
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let peak = 0
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128))
        setLevel(Math.min(1, peak / 64))
        frame.current = requestAnimationFrame(tick)
      }
      tick()
    } catch { /* meter is decorative */ }
  }

  // Resolves with the recording (null if nothing was captured).
  const stop = () => new Promise<VoiceRecording | null>(resolve => {
    const rec = recorder.current
    if (!rec || rec.state !== 'recording') { resolve(null); return }
    settle.current = resolve
    rec.stop()
    cleanup()
  })

  const cancel = () => {
    const rec = recorder.current
    settle.current = () => undefined
    if (rec?.state === 'recording') rec.stop()
    cleanup()
  }

  return { recording, elapsed, level, error, setError, start, stop, cancel }
}

// Fixed pseudo-random bar heights per message, so a voice note always
// shows the same "waveform".
const barsFor = (seed: string, n = 28) => {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1103515245 + 12345 + i) >>> 0
    return 0.25 + ((h >>> 16) % 1000) / 1333
  })
}

const PLAY_EVENT = 'yupixi:voice-play'
const SPEEDS = [1, 1.5, 2]

// Voice note player: play / pause, seek on the bars, elapsed time, speed.
// Starting one note pauses any other.
export function VoicePlayer({ src, duration, mine, seed }: { src: string; duration: number; mine: boolean; seed: string }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [failed, setFailed] = useState(false)
  const bars = useRef(barsFor(seed)).current
  const total = duration || audio.current?.duration || 0
  const progress = total ? Math.min(1, time / total) : 0

  useEffect(() => {
    const onOther = (e: Event) => { if ((e as CustomEvent).detail !== audio.current) audio.current?.pause() }
    window.addEventListener(PLAY_EVENT, onOther)
    return () => window.removeEventListener(PLAY_EVENT, onOther)
  }, [])

  const toggle = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) {
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: a }))
      a.playbackRate = speed
      void a.play().catch(() => setFailed(true))
    } else a.pause()
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current
    if (!a || !total) return
    const r = e.currentTarget.getBoundingClientRect()
    a.currentTime = Math.max(0, Math.min(total, ((e.clientX - r.left) / r.width) * total))
    setTime(a.currentTime)
  }
  const nextSpeed = () => {
    const s = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
    setSpeed(s)
    if (audio.current) audio.current.playbackRate = s
  }

  return (
    <div className="flex w-60 max-w-full items-center gap-2.5 py-0.5" onClick={e => e.stopPropagation()}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setTime(0) }}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        onError={() => setFailed(true)}
      />
      <button type="button" onClick={toggle} disabled={failed} aria-label={playing ? 'Pause' : 'Écouter le message vocal'} className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-none disabled:opacity-50 ${mine ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
        <Icon name={failed ? 'error' : playing ? 'pause' : 'play_arrow'} size={24} fill />
      </button>
      <div className="min-w-0 flex-1">
        <div role="slider" aria-label="Position de lecture" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(time)} onClick={seek} className="flex h-7 cursor-pointer items-center gap-[2px]">
          {bars.map((b, i) => (
            <span key={i} style={{ height: `${Math.round(b * 100)}%` }} className={`w-[3px] flex-1 rounded-full transition-colors ${i / bars.length < progress ? (mine ? 'bg-white' : 'bg-primary') : (mine ? 'bg-white/40' : 'bg-outline-variant')}`} />
          ))}
        </div>
        <div className={`mt-0.5 flex items-center justify-between text-label-sm normal-case tracking-normal ${mine ? 'text-white/80' : 'text-on-surface-variant'}`}>
          <span>{failed ? 'Lecture impossible' : formatSeconds(playing || time ? time : total)}</span>
          <button type="button" onClick={nextSpeed} className={`cursor-pointer rounded-full border-none px-1.5 py-0 text-label-sm ${mine ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface'}`}>{speed}×</button>
        </div>
      </div>
    </div>
  )
}
