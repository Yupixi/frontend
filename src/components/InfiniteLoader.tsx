import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { Loader2 } from './icons'
import { useT } from '../i18n'
import common from '../i18n/ns/common'
import layout from '../i18n/ns/layout'

// How many items load on their own as the visitor scrolls, before a
// « Charger plus » button takes over (and again after each click): what
// sits under a list — the page's next sections, the alert box, the footer —
// stays within reach instead of running away forever. A UI behaviour, not
// a business rule: a constant, not a back-office setting.
export const AUTO_LOAD_ITEMS = 60
// The next page is asked this far before the end of the list comes into
// view, so it is usually there before the visitor gets to it — or just
// after it went by (a page landing while the visitor reads what's below
// the list is kept in place by the browser's scroll anchoring).
const AHEAD = '700px 0px'

// What lib/useLoadMore returns (or a list revealed on the client).
export type LoadMoreState = { hasMore: boolean, loading: boolean, error: boolean, loadMore: () => void }

type Props = {
  list: LoadMoreState
  // Items per page: sets how many pages load on their own (AUTO_LOAD_ITEMS).
  pageSize: number
  label?: string
  // Shown at the very end of a list the visitor scrolled through (nothing
  // for a list that fits in its first page).
  endLabel?: string | null
  className?: string
}

// The end of a list read page after page: watches its own position and
// loads the next page as it nears the screen — a spinner while it comes, a
// « Réessayer » button if it failed (never a loop of failing requests),
// the « Charger plus » button once AUTO_LOAD_ITEMS have loaded on their own.
// Keyboard and screen-reader users get the same button while loading is
// automatic (hidden until focused: the scroll isn't theirs to rely on).
export default function InfiniteLoader({ list: { hasMore, loading, error, loadMore: onLoadMore }, pageSize, label: labelProp, endLabel = null, className = '' }: Props) {
  const t = useT(layout)
  const tc = useT(common)
  const label = labelProp ?? t('loader.more')
  const autoPages = Math.max(1, Math.ceil(AUTO_LOAD_ITEMS / Math.max(1, pageSize)))
  const [autoLeft, setAutoLeft] = useState(autoPages)
  const auto = hasMore && !loading && !error && autoLeft > 0
  const sentinel = useRef<HTMLDivElement>(null)
  const load = useRef(onLoadMore)
  useEffect(() => { load.current = onLoadMore })

  // A fresh observer whenever loading may start again (after each page):
  // its first report says whether the end is still near — a short page
  // chains the next one without waiting for a scroll.
  useEffect(() => {
    const el = sentinel.current
    if (!auto || !el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      io.disconnect()
      setAutoLeft(n => n - 1)
      load.current()
    }, { rootMargin: AHEAD })
    io.observe(el)
    return () => io.disconnect()
  }, [auto, autoLeft])

  const more = () => { setAutoLeft(autoPages); onLoadMore() }
  const button = 'mx-auto flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border-none bg-surface-container-low px-6 py-3.5 text-label-lg font-bold text-on-surface hover:bg-surface-container md:px-10'

  if (!hasMore && !loading && !error) {
    return endLabel ? <p className={`m-0 mt-6 text-center text-body-sm text-outline ${className}`}>{endLabel}</p> : null
  }
  return (
    <div className={`mt-6 flex min-h-14 flex-col items-center justify-center ${className}`}>
      <div ref={sentinel} aria-hidden="true" className="h-px w-full" />
      {loading ? (
        <span role="status" className="flex h-12 items-center gap-2 text-body-sm text-on-surface-variant">
          <Loader2 size={20} className="animate-spin text-outline" /><span className="sr-only">{t('loader.loading')}</span>
        </span>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-2 text-center">
          <p className="m-0 text-body-sm text-on-surface-variant">{t('loader.error')}</p>
          <button type="button" onClick={onLoadMore} className={button}><Icon name="refresh" size={18} /> {tc('retry')}</button>
        </div>
      ) : autoLeft > 0 ? (
        <button type="button" onClick={more} className={`sr-only focus:not-sr-only ${button}`}>{label}</button>
      ) : (
        <button type="button" onClick={more} className={`w-full lg:w-auto ${button}`}>{label} <Icon name="arrow_downward" size={20} /></button>
      )}
    </div>
  )
}
