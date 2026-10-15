import { useCallback, useRef, useState } from 'react'

// The next page of a list read with Apollo (`listings`, `shops`): fetchMore
// appends it to the cached list (lib/apollo, pagedList). One load at a time;
// a failed load stays failed (no retry loop) until `loadMore` is called
// again — the « Réessayer » button of InfiniteLoader.
// `key`: the list's identity (its filters); a load started for another
// list doesn't report into this one.
export function useLoadMore({ fetchMore, page, totalPages, key }: {
  fetchMore: (options: { variables: { page: number } }) => Promise<{ error?: unknown }>
  // The last page loaded and the page count, from the query's (current, not
  // previous) data — undefined while the list loads.
  page: number | null | undefined
  totalPages: number | null | undefined
  key: string
}) {
  const [state, setState] = useState<{ key: string, status: 'idle' | 'loading' | 'error' }>({ key, status: 'idle' })
  const inFlight = useRef(false)
  const status = state.key === key ? state.status : 'idle'
  const hasMore = !!page && !!totalPages && page < totalPages
  const loadMore = useCallback(() => {
    if (inFlight.current || !page || !totalPages || page >= totalPages) return
    inFlight.current = true
    setState({ key, status: 'loading' })
    const done = (status: 'idle' | 'error') => {
      inFlight.current = false
      setState(s => (s.key === key ? { key, status } : s))
    }
    fetchMore({ variables: { page: page + 1 } }).then(r => done(r?.error ? 'error' : 'idle'), () => done('error'))
  }, [fetchMore, page, totalPages, key])
  return { hasMore, loading: status === 'loading', error: status === 'error', loadMore }
}
