import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { useApolloClient, useSubscription } from '@apollo/client/react'
import Icon from '../Icon'
import ConfirmSheet from '../ConfirmSheet'
import BottomSheet from '../BottomSheet'
import { project, tilesFor, unproject } from '../../lib/maps'
import { useClarityHold } from '../../lib/clarity'
import {
  DEFAULT_THROTTLE, agoLabel, distanceLabel, distanceM, hasPos, hhmm, liveStore, mySharingUntil, shouldSend, staleIn,
  type LatLng, type LiveShare, type LiveSnapshot, type LiveState,
} from '../../lib/liveLocation'
import {
  LIVE_LOCATION_QUERY, LIVE_LOCATION_SUBSCRIPTION, START_LIVE_LOCATION_MUTATION, STOP_LIVE_LOCATION_MUTATION, UPDATE_LIVE_LOCATION_MUTATION,
  type LiveEvent,
} from '../../graphql/liveLocation'
import type { RemoteMeetup } from '../../graphql/messaging'
import { StaticMap } from './MeetupPoint'

export const LIVE_SAFETY_HINT = 'Ne partagez votre position qu’avec une personne avec qui vous avez confirmé un rendez-vous dans un lieu public.'
export const LIVE_FOREGROUND_HINT = 'Le partage fonctionne tant que Dilchap reste ouvert sur votre téléphone : une application web ne peut pas envoyer votre position en arrière-plan, en particulier sur iPhone.'

const useLive = () => useSyncExternalStore(liveStore.subscribe, liveStore.get, liveStore.get)

const errorText = (e: unknown) => (e instanceof Error && e.message.length < 160 ? e.message : 'Une erreur est survenue. Réessayez.')

// Geolocation of the browser, asked only when the member chose to share.
const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 }
const geoError = (e: GeolocationPositionError) =>
  e.code === e.PERMISSION_DENIED
    ? 'Dilchap n’a pas accès à votre position. Autorisez-la dans les réglages du navigateur pour partager votre position.'
    : 'Position introuvable pour l’instant. Vérifiez que la localisation de votre téléphone est activée.'

// The meet-up whose live position can be shared: the latest confirmed one
// with a point, not yet handed over.
export function activeLiveMeetup(meetups: RemoteMeetup[]) {
  const confirmed = meetups.filter(m => m.status === 'CONFIRMED')
  const last = confirmed[confirmed.length - 1]
  return last && !last.handedOverAt && typeof last.lat === 'number' && typeof last.lng === 'number' ? last : null
}

// ---- Controller (renders nothing) ------------------------------------------

// Loads the sharing state of the active meet-up, listens to the other
// member's positions (WebSocket) and, while I share and the chat is open,
// follows my position with watchPosition and sends it, throttled. No timer
// and no polling: the GPS callbacks and the server's pushes (positions,
// end of sharing, expiry) drive everything. Lives in its own component so
// that the Messages page never re-renders on a position.
export function LiveLocationController({ conversationId, meetup, otherName }: { conversationId: string; meetup: RemoteMeetup | null; otherName: string }) {
  const client = useApolloClient()
  const meetupId = meetup?.id ?? null
  const watchId = useRef<number | null>(null)
  const lastSent = useRef<(LatLng & { at: number }) | null>(null)
  const sending = useRef(false)
  const live = useLive()
  // Positions on screen: Microsoft Clarity stops recording meanwhile.
  useClarityHold(!!live.state?.mine || !!live.state?.other)

  const stopWatch = () => {
    if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current)
    watchId.current = null
  }

  const apply = (state: LiveState) => {
    if (liveStore.get().conversationId !== conversationId) return
    liveStore.set({ state })
    if (state.mine && Date.parse(state.mine.expiresAt) > Date.now()) startWatch()
    else stopWatch()
  }

  const load = () => {
    if (!meetupId) return
    void client.query<{ liveLocation: LiveState }>({ query: LIVE_LOCATION_QUERY, variables: { meetupId }, fetchPolicy: 'network-only' })
      .then(({ data }) => { if (data?.liveLocation) apply(data.liveLocation) })
      .catch(() => undefined)
  }

  const onFix = (p: GeolocationPosition) => {
    const s = liveStore.get().state
    const now = Date.now()
    if (!s?.mine) { stopWatch(); return }
    // Past the end: stop at once (the server deletes it too).
    if (now >= Date.parse(s.mine.expiresAt)) { stopWatch(); liveStore.set({ state: { ...s, mine: null }, myFix: null }); return }
    const fix = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? null, at: now }
    const prev = liveStore.get().myFix
    // My own pin: refreshed when it moved or every 10 s (not on every fix).
    if (!prev || now - prev.at > 10_000 || distanceM(prev, fix) > 5) liveStore.set({ myFix: fix, error: null })
    if (sending.current || !shouldSend(lastSent.current, fix, s.throttle ?? DEFAULT_THROTTLE)) return
    sending.current = true
    void client.mutate<{ updateLiveLocation: { expiresAt: string; positionAt: string } }>({
      mutation: UPDATE_LIVE_LOCATION_MUTATION,
      variables: { meetupId: s.meetupId, position: { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy } },
    }).then(({ data }) => {
      lastSent.current = fix
      const cur = liveStore.get().state
      if (cur?.mine && data?.updateLiveLocation)
        liveStore.set({ state: { ...cur, mine: { ...cur.mine, lat: Math.round(fix.lat * 1e4) / 1e4, lng: Math.round(fix.lng * 1e4) / 1e4, positionAt: data.updateLiveLocation.positionAt } } })
    }).catch((e: unknown) => {
      // « trop souvent »: the next fix will do. Otherwise the sharing ended.
      if (!/trop souvent/i.test(errorText(e))) { stopWatch(); load() }
    }).finally(() => { sending.current = false })
  }

  const onGeoError = (e: GeolocationPositionError) => {
    liveStore.set({ error: geoError(e) })
    if (e.code === e.PERMISSION_DENIED) {
      stopWatch()
      const id = liveStore.get().state?.meetupId
      if (id) void client.mutate<{ stopLiveLocation: LiveState }>({ mutation: STOP_LIVE_LOCATION_MUTATION, variables: { meetupId: id } }).then(({ data }) => data && apply(data.stopLiveLocation)).catch(() => undefined)
    }
  }

  function startWatch() {
    if (watchId.current != null || !navigator.geolocation) return
    watchId.current = navigator.geolocation.watchPosition(onFix, onGeoError, GEO_OPTIONS)
  }

  // Actions used by the sheets and the card.
  useEffect(() => {
    actions.start = (minutes: number) => {
      const s = liveStore.get().state
      if (!s) return
      if (!navigator.geolocation) { liveStore.set({ error: 'Ce navigateur ne sait pas partager votre position.' }); return }
      liveStore.set({ busy: true, error: null })
      // The browser asks for the permission now, after the member's choice.
      navigator.geolocation.getCurrentPosition(p => {
        const fix = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? null, at: Date.now() }
        void client.mutate<{ startLiveLocation: LiveState }>({
          mutation: START_LIVE_LOCATION_MUTATION,
          variables: { meetupId: s.meetupId, minutes, position: { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy } },
        }).then(({ data }) => {
          lastSent.current = fix
          liveStore.set({ myFix: fix, busy: false })
          if (data) apply(data.startLiveLocation)
        }).catch((e: unknown) => liveStore.set({ busy: false, error: errorText(e) }))
      }, e => liveStore.set({ busy: false, error: geoError(e) }), GEO_OPTIONS)
    }
    actions.stop = () => {
      const s = liveStore.get().state
      stopWatch()
      if (!s) return
      liveStore.set({ busy: true, myFix: null })
      void client.mutate<{ stopLiveLocation: LiveState }>({ mutation: STOP_LIVE_LOCATION_MUTATION, variables: { meetupId: s.meetupId } })
        .then(({ data }) => { liveStore.set({ busy: false }); if (data) apply(data.stopLiveLocation) })
        .catch((e: unknown) => liveStore.set({ busy: false, error: errorText(e) }))
    }
    return () => { actions.start = noop; actions.stop = noop }
  })

  // A new conversation or meet-up: start from scratch. Leaving the chat
  // stops following my position (sharing resumes when it is reopened,
  // until its end).
  useEffect(() => {
    liveStore.reset(conversationId)
    lastSent.current = null
    load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      stopWatch()
      liveStore.reset()
    }
  }, [conversationId, meetupId, meetup?.status, meetup?.handedOverAt]) // eslint-disable-line react-hooks/exhaustive-deps

  useSubscription<{ liveLocationChanged: LiveEvent }>(LIVE_LOCATION_SUBSCRIPTION, {
    variables: { conversationId },
    skip: !meetupId,
    onData: ({ data }) => {
      const ev = data.data?.liveLocationChanged
      const s = liveStore.get().state
      if (!ev || !s) return
      if (ev.meetupId !== s.meetupId) { load(); return }
      const isOther = ev.userId === s.otherId
      if (ev.kind === 'STOP') {
        if (isOther) liveStore.set({ state: { ...s, other: null } })
        else { stopWatch(); liveStore.set({ state: { ...s, mine: null }, myFix: null }) }
        return
      }
      const share: LiveShare = { userId: ev.userId, lat: ev.lat, lng: ev.lng, accuracy: ev.accuracy, positionAt: ev.positionAt, startedAt: ev.startedAt, expiresAt: ev.expiresAt }
      if (isOther) liveStore.set({ state: { ...s, other: { ...share, name: s.other?.name ?? otherName } } })
      else { liveStore.set({ state: { ...s, mine: share } }); startWatch() }
    },
  })
  return null
}

const noop = () => undefined
const actions: { start: (minutes: number) => void; stop: () => void } = { start: noop, stop: noop }

// ---- Header pill ------------------------------------------------------------

// « Partage en cours » in the chat header while I share.
export function LiveHeaderPill({ onOpen }: { onOpen: () => void }) {
  const live = useLive()
  const until = mySharingUntil(live)
  if (!until) return null
  return (
    <button type="button" onClick={onOpen} aria-label={`Partage de votre position en cours jusqu’à ${hhmm(until)}`} title="Partage de votre position en cours" className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-none bg-tertiary-soft px-2.5 py-1.5 text-label-sm font-semibold text-tertiary">
      <span className="live-dot h-2 w-2 shrink-0 rounded-full bg-tertiary" aria-hidden /> <span className="max-[339px]:hidden md:max-xl:hidden">Partage en cours</span><span className="hidden md:max-xl:inline">En direct</span>
    </button>
  )
}

// ---- Map ----------------------------------------------------------------------

const FIT_PAD = 34

// The meet-up point and the live pins on OpenStreetMap tiles (lazy, no
// API key), framed to show them all.
export function LiveMap({ point, label, height = 150, onOpen }: { point: LatLng; label: string; height?: number; onOpen?: () => void }) {
  const live = useLive()
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  useEffect(() => {
    const el = box.current
    if (!el) return
    setW(el.clientWidth || 320)
    const ro = new ResizeObserver(() => setW(el.clientWidth || 320))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const s = live.state
  const other = s?.other && hasPos(s.other) ? s.other : null
  const mine = s?.mine ? (live.myFix ?? (hasPos(s.mine) ? s.mine : null)) : null
  const pts: LatLng[] = [point, ...(other ? [other] : []), ...(mine ? [mine] : [])]
  // Highest zoom (max 17) where every point fits.
  let z = 17
  for (; z > 3; z--) {
    const ps = pts.map(p => project(p, z))
    const dx = Math.max(...ps.map(p => p.x)) - Math.min(...ps.map(p => p.x))
    const dy = Math.max(...ps.map(p => p.y)) - Math.min(...ps.map(p => p.y))
    if (dx <= w - 2 * FIT_PAD && dy <= height - 2 * FIT_PAD - 24) break
  }
  const ps = pts.map(p => project(p, z))
  const cx = (Math.max(...ps.map(p => p.x)) + Math.min(...ps.map(p => p.x))) / 2
  const cy = (Math.max(...ps.map(p => p.y)) + Math.min(...ps.map(p => p.y))) / 2 - 10
  const center = unproject(cx, cy, z)
  const at = (p: LatLng) => { const q = project(p, z); return { left: q.x - cx + w / 2, top: q.y - cy + height / 2 } }
  const stale = (sh: LiveShare | null): CSSProperties => {
    if (!sh || !s) return {}
    const ms = staleIn(sh.positionAt, s.throttle ?? DEFAULT_THROTTLE)
    return { animationDelay: `${Math.max(0, ms)}ms` }
  }
  const Wrapper = onOpen ? 'button' : 'div'
  return (
    <Wrapper
      ref={box as never}
      type={onOpen ? 'button' : undefined}
      onClick={onOpen}
      aria-label={onOpen ? `Agrandir la carte : ${label}` : `Carte : ${label}`}
      data-clarity-mask="True"
      className={`relative block w-full overflow-hidden rounded-xl border-none bg-surface-container p-0 ${onOpen ? 'cursor-pointer' : ''}`}
      style={{ height }}
    >
      {tilesFor(center, z, w, height).map(t => (
        <img key={t.key} src={t.src} alt="" loading="lazy" decoding="async" draggable={false} className="pointer-events-none absolute h-64 w-64 max-w-none select-none" style={{ left: t.left, top: t.top }} />
      ))}
      <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]" style={at(point)} aria-hidden>
        <Icon name="location_on" size={32} fill />
      </span>
      {other && (
        <span key={other.positionAt ?? ''} className="live-stale pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-solid border-white bg-on-surface text-[12px] font-bold text-surface shadow-md" style={{ ...at(other), ...stale(other) }} aria-hidden>
          {(other.name ?? '?').charAt(0).toUpperCase()}
        </span>
      )}
      {mine && (
        <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-solid border-white bg-sky-500 shadow-md" style={at(mine)} aria-hidden />
      )}
      {onOpen && <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface-lowest/90 text-on-surface shadow" aria-hidden><Icon name="fullscreen" size={15} /></span>}
      <span className="pointer-events-none absolute bottom-0 right-0 rounded-tl-md bg-white/85 px-1 text-[9px] leading-4 text-neutral-700">© OpenStreetMap</span>
    </Wrapper>
  )
}

// ---- Card panel ---------------------------------------------------------------

function ShareLine({ share, who, point, mine, fix, throttle }: { share: LiveShare; who: string; point: LatLng; mine?: boolean; fix?: LiveSnapshot['myFix']; throttle: LiveState['throttle'] }) {
  const pos = mine && fix ? fix : hasPos(share) ? share : null
  const updated = mine && fix ? new Date(fix.at).toISOString() : share.positionAt
  const delay = Math.max(0, staleIn(updated, throttle ?? DEFAULT_THROTTLE))
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${mine ? 'bg-sky-500' : 'bg-on-surface'}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-label-md text-on-surface">{mine ? `Vous partagez votre position jusqu’à ${hhmm(share.expiresAt)}` : `${who} partage sa position jusqu’à ${hhmm(share.expiresAt)}`}</div>
        {pos ? (
          // Remounted on each new position: the stale animation restarts.
          <div key={updated ?? ''} className="live-stale relative text-body-sm text-on-surface-variant" style={{ animationDelay: `${delay}ms` }}>
            <span className="live-fresh-text" style={{ animationDelay: `${delay}ms` }}>{distanceLabel(distanceM(pos, point))} · position mise à jour {updated ? agoLabel(updated) : ''}</span>
            <span className="live-stale-text" style={{ animationDelay: `${delay}ms` }}>{distanceLabel(distanceM(pos, point))} · position non mise à jour</span>
          </div>
        ) : (
          <div className="text-body-sm text-on-surface-variant">En attente de la position…</div>
        )}
      </div>
    </div>
  )
}

// Under the active meet-up card: who shares, distances, the button to
// share and to stop, and the honest « while Dilchap stays open » note.
export function LivePanel({ point, otherName, onShare, onOpenMap }: { point: LatLng; otherName: string; onShare: () => void; onOpenMap?: () => void }) {
  const live = useLive()
  const s = live.state
  if (!s) return null
  if (!s.available) {
    if (s.reason === 'TOO_EARLY' && Date.parse(s.window.from) - Date.now() < 86_400_000)
      return <p className="m-0 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="my_location" size={15} /> Position en direct possible à partir de {hhmm(s.window.from)}</p>
    return null
  }
  const mine = s.mine && Date.parse(s.mine.expiresAt) > Date.now() ? s.mine : null
  const other = s.other && Date.parse(s.other.expiresAt) > Date.now() ? s.other : null
  return (
    <div className="flex flex-col gap-2" data-clarity-mask="True">
      {mine && (
        <div className="flex items-center gap-2 rounded-lg bg-tertiary-soft px-3 py-2 text-tertiary" role="status">
          <span className="live-dot h-2 w-2 shrink-0 rounded-full bg-tertiary" aria-hidden />
          <span className="min-w-0 flex-1 text-label-md">Partage en cours jusqu’à {hhmm(mine.expiresAt)}</span>
          <button type="button" disabled={live.busy} onClick={() => actions.stop()} className="shrink-0 cursor-pointer rounded-md border-none bg-surface-lowest px-2.5 py-1 text-label-sm font-semibold text-on-surface disabled:opacity-60">Arrêter</button>
        </div>
      )}
      {other && <ShareLine share={other} who={other.name ?? otherName} point={point} throttle={s.throttle} />}
      {mine && <ShareLine share={mine} who="Vous" point={point} mine fix={live.myFix} throttle={s.throttle} />}
      {(mine || other) && onOpenMap && (
        <button type="button" onClick={onOpenMap} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-surface-container py-2 text-label-md text-on-surface"><Icon name="map" size={16} /> Voir la carte en direct</button>
      )}
      {!mine && (
        <button type="button" disabled={live.busy} onClick={onShare} className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-tertiary py-2 text-label-md text-white disabled:opacity-60">
          <Icon name="my_location" size={16} /> {live.busy ? 'Un instant…' : 'Partager ma position en direct'}
        </button>
      )}
      {live.error && <p className="m-0 text-body-sm text-primary" role="alert">{live.error}</p>}
      {mine && <p className="m-0 text-[11px] leading-4 text-on-surface-variant">Gardez Dilchap ouvert sur votre téléphone pour que votre position reste à jour.</p>}
    </div>
  )
}

// Whether the card shows the live map (someone shares).
export function useLiveOn(meetupId: string) {
  const live = useLive()
  const s = live.state
  return !!s && s.meetupId === meetupId && s.available && !!(s.mine || s.other)
}

// ---- Sheets -------------------------------------------------------------------

// Consent: the duration, the safety hint, what is shared and the limits.
export function LiveConsentSheet({ open, onClose, otherName }: { open: boolean; onClose: () => void; otherName: string }) {
  const live = useLive()
  const durations = live.state?.durations ?? [15, 30, 60]
  const [minutes, setMinutes] = useState<number | null>(null)
  const chosen = minutes && durations.includes(minutes) ? minutes : durations[Math.min(1, durations.length - 1)]
  const until = live.state ? Math.min(Date.now() + chosen * 60_000, Date.parse(live.state.window.to)) : Date.now()
  // Closes once the sharing has started.
  const startedRef = useRef(false)
  useEffect(() => { if (open && startedRef.current && live.state?.mine) { startedRef.current = false; onClose() } }, [open, live.state?.mine, onClose])
  return (
    <ConfirmSheet open={open} onClose={onClose} title="Partager ma position en direct" confirmLabel="Partager" loading={live.busy} onConfirm={() => { startedRef.current = true; actions.start(chosen) }}>
      <span className="block">{otherName} verra votre position sur la carte du rendez-vous, mise à jour pendant que vous vous déplacez, jusqu’à <b>{hhmm(new Date(until).toISOString())}</b>. Vous pouvez arrêter à tout moment.</span>
      <span className="mt-3 block text-label-md text-on-surface">Durée</span>
      <span role="radiogroup" aria-label="Durée du partage" className="mt-1.5 flex gap-2">
        {durations.map(d => (
          <button key={d} type="button" role="radio" aria-checked={chosen === d} onClick={() => setMinutes(d)} className={`h-11 flex-1 cursor-pointer rounded-xl border border-solid text-label-lg ${chosen === d ? 'border-tertiary bg-tertiary-soft text-tertiary' : 'border-outline-variant bg-surface-lowest text-on-surface'}`}>{d} min</button>
        ))}
      </span>
      <span className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-body-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100"><Icon name="shield" size={17} className="mt-0.5 shrink-0" /> {LIVE_SAFETY_HINT}</span>
      <span className="mt-2 flex items-start gap-2 text-body-sm text-on-surface-variant"><Icon name="info" size={16} className="mt-0.5 shrink-0" /> {LIVE_FOREGROUND_HINT}</span>
      <span className="mt-2 block text-body-sm text-on-surface-variant">Votre navigateur va vous demander l’accès à votre position. Seul {otherName} la voit, arrondie à une dizaine de mètres ; elle est effacée dès la fin du partage.</span>
      {live.error && <span className="mt-2 block text-body-sm text-primary" role="alert">{live.error}</span>}
    </ConfirmSheet>
  )
}

// The larger map (tap on the card's map or the header pill).
export function LiveMapSheet({ open, onClose, meetup, otherName, onShare }: { open: boolean; onClose: () => void; meetup: RemoteMeetup; otherName: string; onShare: () => void }) {
  const point = { lat: meetup.lat!, lng: meetup.lng! }
  return (
    <BottomSheet open={open} onClose={onClose} title="Position en direct" maxHeight="92dvh">
      <div className="flex flex-col gap-3 pb-2">
        <LiveMap point={point} label={meetup.place} height={340} />
        <div className="text-label-lg text-on-surface">{meetup.place}{meetup.address && <span className="block text-body-sm font-normal text-on-surface-variant">{meetup.address}</span>}</div>
        <LivePanel point={point} otherName={otherName} onShare={onShare} />
        <p className="m-0 text-body-sm text-on-surface-variant">{LIVE_FOREGROUND_HINT}</p>
      </div>
    </BottomSheet>
  )
}

// The active meet-up card's map: live (with the pins) while someone
// shares, else the usual static preview.
export function LiveCardMap({ meetup, onOpen }: { meetup: RemoteMeetup; onOpen: () => void }) {
  const on = useLiveOn(meetup.id)
  const point = { lat: meetup.lat!, lng: meetup.lng! }
  return on ? <LiveMap point={point} label={meetup.place} height={150} onOpen={onOpen} /> : <StaticMap point={point} label={meetup.place} height={112} />
}
