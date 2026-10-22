import { useEffect, useState } from 'react'

// `value`, once it stopped changing for `ms` (a query asked again after the
// member stops typing, not on every key).
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}
