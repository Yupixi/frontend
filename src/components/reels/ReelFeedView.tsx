import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from '../Icon'
import Price from '../Price'
import BottomSheet from '../BottomSheet'
import QuickNegotiation from '../QuickNegotiation'
import { useLists } from '../../lib/lists'
import { REPORT_REEL_MUTATION, type Reel } from '../../graphql/reels'
import { ReelBoostSheet, ReelStatsSheet } from './ReelOwnerSheets'
import { requestNavigate } from '../../lib/navigation'
import {
  requestManageReel, reelEvent, reelPath, reelSource, reelThumb, setDataSaver, setReelsAutoNext, setReelsMuted, useDataSaver, useReelsAutoNext, useReelSettings, useReelsMuted,
} from '../../lib/reels'
import { useT } from '../../i18n'
import reels from '../../i18n/ns/reels'

// The vertical Reels pager (feed, a listing's or a seller's Reels): one Reel
// per screen, snapped. Only the Reel on screen plays (muted until the
// visitor turns the sound on), the next one only loads its first bytes
// (« metadata », never in data-saving mode), the others are posters. A Reel
// off screen, or the tab hidden, pauses. Progress and the « vue » timer are
// written to the DOM / module memory: nothing re-renders while it plays.

export type ReelActions = {
  onOpenListing: (listingId: string) => void
  onOpenSeller: (sellerId: string, shopSlug?: string | null) => void
  onContactSeller: (sellerId: string, listingId: string) => void
  onToggleFavorite: (listingId: string) => void
  favorites: string[]
  currentUserId?: string | null
  isLoggedIn: boolean
  onRequireAuth: () => void
}

type Props = ReelActions & {
  items: Reel[]
  hasMore: boolean
  loading?: boolean
  onLoadMore: () => void
  onClose: () => void
  // Index shown first (a Reel tapped in a rail or a grid).
  startIndex?: number
  // Remembered position (back from a listing): index of the Reel on screen.
  onIndexChange?: (i: number) => void
  title?: string
  emptyText?: string
  // Over the whole screen, bottom navigation included (a listing's or a
  // seller's Reels); otherwise the « Reels » tab keeps the bottom bar.
  overlay?: boolean
  // A seller: « Publier un Reel » in the top bar.
  onPublish?: () => void
}

export default function ReelFeedView({ items, hasMore, loading, onLoadMore, onClose, startIndex = 0, onIndexChange, title = 'Reels' /* i18n-ignore */, emptyText, overlay, onPublish, ...actions }: Props) {
  const t = useT(reels)
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(startIndex)
  const activeRef = useRef(startIndex)
  const muted = useReelsMuted()
  const saver = useDataSaver()
  const autoNext = useReelsAutoNext()
  const [menu, setMenu] = useState(false)
  const settings = useReelSettings()

  // The Reel on screen: the slide at least 60 % visible.
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          const i = Number((e.target as HTMLElement).dataset.index)
          if (i !== activeRef.current) {
            activeRef.current = i
            setActive(i)
            onIndexChange?.(i)
          }
        }
      }
    }, { root, threshold: [0.6] })
    root.querySelectorAll('[data-reel-slide]').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [items.length, onIndexChange])

  // Opened on a given Reel.
  useEffect(() => {
    const root = scroller.current
    if (!root || !startIndex) return
    root.scrollTo({ top: startIndex * root.clientHeight, behavior: 'instant' as ScrollBehavior })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The next page before reaching the end.
  useEffect(() => {
    if (hasMore && !loading && active >= items.length - 3) onLoadMore()
  }, [active, items.length, hasMore, loading, onLoadMore])

  const go = useCallback((delta: number) => {
    const root = scroller.current
    if (!root) return
    const i = Math.max(0, Math.min(items.length - 1, activeRef.current + delta))
    root.scrollTo({ top: i * root.clientHeight, behavior: 'smooth' })
  }, [items.length])
  // End of a Reel with « Défilement automatique »: the next one; false on the
  // last (it plays again).
  const onEnded = useCallback(() => {
    if (activeRef.current >= items.length - 1) return false
    go(1)
    return true
  }, [go, items.length])

  // Keyboard (desktop): ↑ ↓ / j k, espace (lecture), m (son), Échap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (document.querySelector('[aria-modal="true"]')) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j') { e.preventDefault(); go(1) }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') { e.preventDefault(); go(-1) }
      else if (e.key === 'm' || e.key === 'M') setReelsMuted(!muted)
      else if (e.key === 'Escape') onClose()
      else if (e.key === ' ') {
        e.preventDefault()
        const v = scroller.current?.querySelector<HTMLVideoElement>(`[data-index="${activeRef.current}"] video`)
        if (v) void (v.paused ? v.play().catch(() => undefined) : v.pause())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, muted, onClose])

  // Mouse wheel / trackpad: one Reel per gesture.
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    let lock = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 8) return
      e.preventDefault()
      const now = Date.now()
      if (now < lock) return
      lock = now + 550
      go(e.deltaY > 0 ? 1 : -1)
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [go])

  return (
    <div className={`fixed inset-x-0 top-0 bg-black text-white ${overlay ? 'bottom-0 z-[400]' : 'bottom-[calc(57px+env(safe-area-inset-bottom))] z-[250] md:bottom-0'}`} role={overlay ? 'dialog' : 'region'} aria-label={title}>
      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent px-3 pb-6 pt-[max(12px,env(safe-area-inset-top))]">
        <button onClick={onClose} aria-label={t('feed.closeAria')} className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white">
          <Icon name="arrow_back" size={22} />
        </button>
        <h1 className="m-0 flex-1 text-headline-sm text-white">{title}</h1>
        {onPublish && (
          <button onClick={onPublish} className="pointer-events-auto flex h-10 cursor-pointer items-center gap-1.5 rounded-full border-none bg-primary px-3.5 text-label-md text-white">
            <Icon name="video_call" size={19} /> <span>{t('feed.publish')}</span>
          </button>
        )}
        <button onClick={() => setReelsMuted(!muted)} aria-label={muted ? t('feed.unmute') : t('feed.mute')} aria-pressed={!muted} className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white">
          <Icon name={muted ? 'volume_off' : 'volume_up'} size={21} />
        </button>
        <button onClick={() => setMenu(true)} aria-label={t('feed.options')} className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white">
          <Icon name="more_vert" size={21} />
        </button>
      </div>

      <div
        ref={scroller}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((r, i) => (
          <div key={r.id} data-reel-slide data-index={i} className="relative h-full w-full snap-start snap-always">
            <ReelSlide reel={r} state={i === active ? 'active' : i === active + 1 ? 'next' : 'idle'} muted={muted} saver={saver} viewSeconds={settings.viewSeconds} boostEnabled={settings.boostEnabled} autoNext={autoNext} onEnded={onEnded} {...actions} />
          </div>
        ))}
        {!items.length && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            {loading ? <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/20 border-t-white" role="status" aria-label={t('feed.loading')} /> : (
              <>
                <Icon name="smart_display" size={44} />
                <p className="m-0 text-body-lg text-white/85">{emptyText ?? t('feed.empty')}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Desktop: previous / next */}
      {items.length > 1 && (
        <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
          <button onClick={() => go(-1)} disabled={active === 0} aria-label={t('feed.prev')} className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white disabled:opacity-30"><Icon name="arrow_upward" size={22} /></button>
          <button onClick={() => go(1)} disabled={active >= items.length - 1} aria-label={t('feed.next')} className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white disabled:opacity-30"><Icon name="arrow_downward" size={22} /></button>
        </div>
      )}

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={t('feed.options')}>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-container-low p-3 text-on-surface">
          <input type="checkbox" checked={saver} onChange={e => setDataSaver(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--primary)]" />
          <span>
            <span className="block text-label-lg">{t('feed.dataSaver')}</span>
            <span className="block text-body-sm text-on-surface-variant">{t('feed.dataSaverHint')}</span>
          </span>
        </label>
        <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl bg-surface-container-low p-3 text-on-surface">
          <input type="checkbox" checked={autoNext} onChange={e => setReelsAutoNext(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--primary)]" />
          <span>
            <span className="block text-label-lg">{t('feed.autoNext')}</span>
            <span className="block text-body-sm text-on-surface-variant">{t('feed.autoNextHint')}</span>
          </span>
        </label>
        <p className="mb-0 mt-3 text-body-sm text-on-surface-variant">{t('feed.keyboard')}</p>
      </BottomSheet>
    </div>
  )
}

type SlideProps = ReelActions & { reel: Reel; state: 'active' | 'next' | 'idle'; muted: boolean; saver: boolean; viewSeconds: number; boostEnabled: boolean; autoNext: boolean; onEnded: () => boolean }

const ReelSlide = memo(function ReelSlide({ reel, state, muted, saver, viewSeconds, boostEnabled, autoNext, onEnded, ...a }: SlideProps) {
  const t = useT(reels)
  const video = useRef<HTMLVideoElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [sheet, setSheet] = useState<'offer' | 'report' | 'stats' | 'boost' | null>(null)
  const [shared, setShared] = useState(false)
  const l = reel.listing
  const own = !!a.currentUserId && a.currentUserId === reel.sellerId
  const fav = !!l && a.favorites.includes(l.id)
  // Played time of this showing (the « vue »), last position (loop / end).
  const played = useRef(0)
  const last = useRef(0)
  const src = state === 'idle' || (state === 'next' && saver) ? null : reelSource(reel, saver)

  // Plays on screen, pauses off screen and when the tab is hidden.
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (state !== 'active') { v.pause(); return }
    last.current = v.currentTime
    const start = () => { if (document.visibilityState === 'visible') void v.play().then(() => setPaused(false)).catch(() => setPaused(true)) }
    start()
    const onVis = () => (document.visibilityState === 'hidden' ? v.pause() : start())
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); v.pause() }
  }, [state, src])

  useEffect(() => { if (video.current) video.current.muted = muted }, [muted])

  const onTime = () => {
    const v = video.current
    if (!v) return
    const d = v.duration || reel.durationSec || 1
    if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, v.currentTime / d)})`
    const delta = v.currentTime - last.current
    // Looped back to the start: watched to the end.
    if (delta < -1 && last.current > d - 1.5) reelEvent(reel.id, 'COMPLETE')
    else if (delta > 0 && delta < 1.5 && !v.paused) played.current += delta
    last.current = v.currentTime
    if (!own && played.current >= viewSeconds) reelEvent(reel.id, 'VIEW')
  }

  // Played to the end without looping (« Défilement automatique »): counted
  // as complete, then the next Reel — unless a sheet is open or it is the
  // last one, which plays again.
  const ended = () => {
    const v = video.current
    if (!v) return
    reelEvent(reel.id, 'COMPLETE')
    last.current = 0
    if (sheet || expanded || !onEnded()) { v.currentTime = 0; void v.play().catch(() => undefined) }
  }

  const toggle = () => {
    const v = video.current
    if (!v) return
    if (v.paused) void v.play().then(() => setPaused(false)).catch(() => undefined)
    else { v.pause(); setPaused(true) }
  }

  const openListing = () => { if (!l) return; if (!own) reelEvent(reel.id, 'CLICK'); a.onOpenListing(l.id) }
  const contact = () => {
    if (!l) return
    if (!a.isLoggedIn) return a.onRequireAuth()
    reelEvent(reel.id, 'CONTACT')
    a.onContactSeller(l.seller.id, l.id)
  }
  const offer = () => { if (!a.isLoggedIn) return a.onRequireAuth(); setSheet('offer') }
  const share = async () => {
    const url = `${window.location.origin}${reelPath(reel.id)}`
    reelEvent(reel.id, 'SHARE')
    if (navigator.share) {
      try { await navigator.share({ title: l?.title ?? t('feed.shareTitle'), text: l ? t('feed.shareText', { title: l.title }) : undefined, url }) } catch { /* cancelled */ }
      return
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined)
    setShared(true)
    window.setTimeout(() => setShared(false), 1800)
  }
  const seller = l?.seller
  const sellerName = seller?.shop?.name ?? seller?.fullName ?? ''
  const avatar = seller?.shop?.logoUrl ?? seller?.avatarUrl
  const canBuy = !own && l?.status === 'APPROVED'

  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-[min(100%,calc((100dvh)*9/16))] lg:py-4">
        <div className="relative h-full w-full overflow-hidden bg-neutral-900 lg:rounded-2xl">
          {src ? (
            <video
              ref={video}
              src={src}
              poster={reel.posterUrl ?? undefined}
              muted={muted}
              playsInline
              loop={!autoNext}
              onEnded={state === 'active' && autoNext ? ended : undefined}
              preload={state === 'active' ? 'auto' : 'metadata'}
              onTimeUpdate={state === 'active' ? onTime : undefined}
              onClick={toggle}
              className="h-full w-full cursor-pointer object-contain"
              aria-label={l ? t('feed.videoAria', { title: l.title }) : t('feed.videoAriaBare')}
            />
          ) : (
            <img src={reelThumb(reel.posterUrl) ?? undefined} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
          )}
          {paused && state === 'active' && (
            <button onClick={toggle} aria-label={t('feed.play')} className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-black/45 text-white">
              <Icon name="play_arrow" size={36} fill />
            </button>
          )}
          {/* Progress */}
          <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-white/20">
            <div ref={bar} className="h-full origin-left bg-white" style={{ transform: 'scaleX(0)' }} />
          </div>

          {/* Listing, seller, caption */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-5 pr-20 pt-16">
            {seller && (
              <button onClick={() => a.onOpenSeller(seller.id, seller.shop?.slug)} className="pointer-events-auto mb-2 flex max-w-full cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left text-white">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20">
                  {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon name="person" size={18} />}
                </span>
                <span className="truncate text-label-lg">{sellerName}</span>
                {seller.shop && <Icon name="verified" size={15} fill className="shrink-0 text-white" />}
              </button>
            )}
            {l && (
              <button onClick={openListing} className="pointer-events-auto block max-w-full cursor-pointer border-none bg-transparent p-0 text-left text-white">
                <span className="line-clamp-2 text-body-lg font-semibold">{l.title}</span>
                <span className="mt-0.5 block text-headline-sm"><Price amount={l.price} currency={l.currency} /></span>
              </button>
            )}
            {reel.caption && (
              <button onClick={() => setExpanded(e => !e)} className={`pointer-events-auto mt-1.5 block max-w-full cursor-pointer whitespace-pre-line border-none bg-transparent p-0 text-left text-body-sm text-white/90 ${expanded ? '' : 'line-clamp-2'}`}>
                {reel.caption}
              </button>
            )}
            {l && (
              <button onClick={openListing} className="pointer-events-auto mt-3 flex h-11 cursor-pointer items-center gap-2 rounded-full border-none bg-white px-4 text-label-lg text-black">
                <Icon name="sell" size={18} /> {t('feed.seeListing')}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="absolute bottom-24 right-2 z-10 flex flex-col items-center gap-4">
            {/* The seller's own Reel: their tools instead of a buyer's. */}
            {own && <ActionButton label={t('feed.stats')} icon="bar_chart" onClick={() => setSheet('stats')} aria={t('feed.statsAria')} />}
            {own && boostEnabled && reel.status === 'APPROVED' && <ActionButton label={t('feed.boost')} icon="rocket_launch" onClick={() => setSheet('boost')} aria={t('feed.boostAria')} />}
            {own && <ActionButton label={t('feed.manage')} icon="tune" onClick={() => { requestManageReel(reel.id); requestNavigate('seller-reels') }} aria={t('feed.manageAria')} />}
            {l && !own && (
              <ActionButton label={t('feed.favourite')} icon="favorite" filled={fav} onClick={() => a.onToggleFavorite(l.id)} pressed={fav} aria={fav ? t('feed.unfavAria') : t('feed.favAria')} />
            )}
            {canBuy && <ActionButton label={t('feed.contact')} icon="chat" onClick={contact} aria={t('feed.contactAria')} />}
            {canBuy && l?.price != null && <ActionButton label={t('feed.offer')} icon="sell" onClick={offer} aria={t('feed.offerAria')} />}
            <ActionButton label={shared ? t('feed.copied') : t('feed.share')} icon="share" onClick={() => void share()} aria={t('feed.shareAria')} />
            {!own && <ActionButton label={t('feed.report')} icon="flag" onClick={() => (a.isLoggedIn ? setSheet('report') : a.onRequireAuth())} aria={t('feed.reportAria')} />}
          </div>
        </div>
      </div>

      {sheet === 'offer' && l && (
        <BottomSheet open onClose={() => setSheet(null)} title={t('feed.offerAria')}>
          <QuickNegotiation
            listing={{ ...l, negotiable: l.negotiable, seller: { id: l.seller.id, fullName: sellerName, avatarUrl: avatar ?? null } }}
            onSent={(sellerId, listingId) => { setSheet(null); reelEvent(reel.id, 'CONTACT'); a.onContactSeller(sellerId, listingId) }}
          />
        </BottomSheet>
      )}
      {sheet === 'report' && <ReportSheet reelId={reel.id} onClose={() => setSheet(null)} />}
      {sheet === 'stats' && own && <ReelStatsSheet reelId={reel.id} onClose={() => setSheet(null)} />}
      {sheet === 'boost' && own && <ReelBoostSheet reelId={reel.id} onClose={() => setSheet(null)} />}
    </div>
  )
})

function ActionButton({ label, icon, onClick, filled, pressed, aria }: { label: string; icon: string; onClick: () => void; filled?: boolean; pressed?: boolean; aria: string }) {
  return (
    <button onClick={onClick} aria-label={aria} aria-pressed={pressed} className="flex w-16 cursor-pointer flex-col items-center gap-1 whitespace-nowrap border-none bg-transparent p-0 text-[11px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
      <span className={`flex h-11 w-11 items-center justify-center rounded-full bg-black/35 ${filled ? 'text-primary' : 'text-white'}`}>
        <Icon name={icon} size={23} fill={filled} />
      </span>
      {label}
    </button>
  )
}

function ReportSheet({ reelId, onClose }: { reelId: string; onClose: () => void }) {
  const t = useT(reels)
  const reasons = useLists().reportReasons.listing
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, { loading }] = useMutation(REPORT_REEL_MUTATION)
  const send = () => {
    setError(null)
    void report({ variables: { id: reelId, reason: reason || reasons[0], message: message.trim() || null } })
      .then(() => setDone(true))
      .catch((e: Error) => setError(e.message))
  }
  return (
    <BottomSheet
      open
      onClose={onClose}
      title={t('feed.reportAria')}
      footer={done ? undefined : (
        <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
          <button onClick={onClose} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">{t('report.cancel')}</button>
          <button onClick={send} disabled={loading} className="h-12 flex-[1.4] cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-60">{loading ? t('report.sending') : t('report.send')}</button>
        </div>
      )}
    >
      {done ? (
        <p className="m-0 flex items-start gap-2 rounded-xl bg-tertiary-soft p-3 text-body-md text-tertiary"><Icon name="check_circle" size={20} /> {t('report.done')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reasons.map(r => (
            <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-xl border border-solid px-3 py-3 text-body-md text-on-surface ${(reason || reasons[0]) === r ? 'border-primary bg-primary-fixed/40' : 'border-outline-variant'}`}>
              <input type="radio" name="reel-report" checked={(reason || reasons[0]) === r} onChange={() => setReason(r)} className="accent-[var(--primary)]" />
              {r}
            </label>
          ))}
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} maxLength={1000} placeholder={t('report.detailsPlaceholder')} className="input mt-1" />
          {error && <p className="m-0 text-body-sm text-primary">{error}</p>}
        </div>
      )}
    </BottomSheet>
  )
}
