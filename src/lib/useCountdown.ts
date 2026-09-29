import { useEffect, useState } from 'react'

export type Countdown = { days: number; hours: number; minutes: number; seconds: number; ended: boolean }

// Time left until `endsAt`, re-rendered every `tickMs` — keep it in the
// small component that shows it (never tick a whole page).
export function useCountdown(endsAt: string | undefined, tickMs = 1000): Countdown | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const t = setInterval(() => { if (!document.hidden) setNow(Date.now()) }, tickMs)
    return () => clearInterval(t)
  }, [endsAt, tickMs])
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
  if (!c || c.ended) return 'Terminée'
  return c.days ? `Fin dans ${c.days}j ${pad2(c.hours)}h` : `Fin dans ${pad2(c.hours)}h ${pad2(c.minutes)}min`
}
