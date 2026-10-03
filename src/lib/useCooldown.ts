import { useEffect, useState } from 'react'

// Seconds left before `until` (ms timestamp), e.g. before another SMS code
// can be asked. Ticks once a second only while waiting, inside the
// component that uses it.
export function useCooldown(until: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until <= Date.now()) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [until])
  return Math.max(0, Math.ceil((until - now) / 1000))
}
