import { useEffect, useState } from 'react'
import boost from '../i18n/ns/boost'

export type Countdown = { days: number; hours: number; minutes: number; seconds: number; ended: boolean }

// Time left until `endsAt`, re-rendered every `tickMs` — keep it in the
// small component that shows it (never tick a whole page).
// `paused` (e.g. off screen): no tick until it resumes.
export function useCountdown(endsAt: string | undefined, tickMs = 1000, paused = false): Countdown | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt || paused) return
    setNow(Date.now())
    const t = setInterval(() => { if (!document.hidden) setNow(Date.now()) }, tickMs)
    return () => clearInterval(t)
  }, [endsAt, tickMs, paused])
  if (!endsAt) return null
  const ms = Math.max(0, new Date(endsAt).getTime() - now)
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
    ended: ms <= 0,
  }
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

// "Fin dans 3j 08h" / "Fin dans 04h 12min".
export function endsInLabel(c: Countdown | null) {
  if (!c || c.ended) return boost.t('countdown.ended')
  return c.days
    ? boost.t('countdown.days', { d: String(c.days), h: pad2(c.hours) })
    : boost.t('countdown.hours', { h: pad2(c.hours), m: pad2(c.minutes) })
}
