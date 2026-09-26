import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

// Animated icons (Iconsax, Lottie JSON) dropped in src/assets/lottie/<name>.json.
// Until a file is there — or when the user asks for reduced motion — the
// regular Material Symbol is shown instead, so wiring a call site never
// depends on the asset being present.
const FILES = import.meta.glob('../assets/lottie/*.json', { import: 'default' }) as Record<string, () => Promise<unknown>>
const fileFor = (name: string) => FILES[`../assets/lottie/${name}.json`]
export const hasAnimatedIcon = (name: string) => !!fileFor(name)

// The player (~150 KB, SVG-only light build) is fetched the first time an
// animated icon actually has a file to play.
let playerPromise: Promise<typeof import('lottie-web').default> | null = null
const loadPlayer = () => (playerPromise ??= import('lottie-web/build/player/lottie_light').then(m => m.default as unknown as typeof import('lottie-web').default))

// Building a Lottie instance (JSON parse + SVG tree) is main-thread work:
// dozens of icons doing it during the first render cost over a second on a
// mid-range phone and pushed the page's first paint back by seconds. Icons
// are armed only once on screen, after the page has loaded, one per idle
// slice — the static Material Symbol stands in until then.
const armQueue: Array<() => void> = []
let pageLoaded = typeof document !== 'undefined' && document.readyState === 'complete'
if (!pageLoaded && typeof window !== 'undefined') {
  window.addEventListener('load', () => { pageLoaded = true; scheduleArming() }, { once: true })
}
let armingScheduled = false
// Never while the page is being scrolled: building an SVG tree mid-scroll
// drops frames. Arming resumes once scrolling has been quiet for a moment.
const SCROLL_QUIET_MS = 400
let lastScroll = 0
if (typeof window !== 'undefined') window.addEventListener('scroll', () => { lastScroll = performance.now() }, { passive: true, capture: true })
const idle = (cb: (deadline?: IdleDeadline) => void) => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(cb, { timeout: 1500 })
  else setTimeout(cb, 200)
}
function scheduleArming() {
  if (armingScheduled || !pageLoaded || !armQueue.length) return
  armingScheduled = true
  const sinceScroll = performance.now() - lastScroll
  if (sinceScroll < SCROLL_QUIET_MS) {
    setTimeout(() => { armingScheduled = false; scheduleArming() }, SCROLL_QUIET_MS - sinceScroll)
    return
  }
  idle(deadline => {
    armingScheduled = false
    if (performance.now() - lastScroll < SCROLL_QUIET_MS) return scheduleArming()
    do armQueue.shift()?.()
    while (armQueue.length && deadline && !deadline.didTimeout && deadline.timeRemaining() > 8)
    scheduleArming()
  })
}
function whenIdle(cb: () => void) {
  armQueue.push(cb)
  scheduleArming()
  return () => { const i = armQueue.indexOf(cb); if (i >= 0) armQueue.splice(i, 1) }
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type Props = {
  /** Lottie file name in src/assets/lottie (without .json). */
  name: string
  /** Material Symbol shown until the animation is available. */
  fallback: string
  size?: number
  fill?: boolean
  className?: string
  /** Change this value to replay the animation once (e.g. a counter). */
  trigger?: unknown
  /** Loop instead of playing once per trigger. */
  loop?: boolean
  /** Play once as soon as it's loaded (success screens). */
  playOnMount?: boolean
  /** Play once when first scrolled into view, after this delay in ms (stagger a row). */
  playOnView?: number
  /** Replay when the surrounding button/link is hovered or pressed. */
  playOnInteract?: boolean
  /** Idle replay every N ms while on screen (empty states). */
  replayEvery?: number
}

// A counter that only moves when `value` goes up (a new notification, not
// one being read) — handy as an AnimatedIcon trigger.
export function useIncreaseCounter(value: number) {
  const prev = useRef(value)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (value > prev.current) setN(c => c + 1)
    prev.current = value
  }, [value])
  return n
}

export default function AnimatedIcon({ name, fallback, size = 24, fill, className = '', trigger, loop = false, playOnMount = false, playOnView, playOnInteract = false, replayEvery }: Props) {
  const box = useRef<HTMLSpanElement>(null)
  const anim = useRef<{ goToAndPlay: (v: number, f?: boolean) => void; goToAndStop: (v: number, f?: boolean) => void; destroy: () => void; totalFrames: number } | null>(null)
  const [ready, setReady] = useState(false)
  const [armed, setArmed] = useState(false)
  const file = fileFor(name)
  // Icons that only ever animate in response to the user (a card's heart,
  // the bell, the tab bar) have nothing to show until then: they build their
  // animation on first contact with their control, not ahead of time for
  // every card on the page.
  const onDemand = playOnView === undefined && !playOnMount && !loop && !replayEvery
  const pendingPlay = useRef(false)

  useEffect(() => {
    if (!onDemand || !file || reducedMotion() || !box.current || armed) return
    const host = box.current.closest('button, a, [role="button"]')
    if (!host) return
    const arm = () => { if (playOnInteract) pendingPlay.current = true; setArmed(true) }
    host.addEventListener('pointerenter', arm)
    host.addEventListener('pointerdown', arm)
    host.addEventListener('focusin', arm)
    return () => { host.removeEventListener('pointerenter', arm); host.removeEventListener('pointerdown', arm); host.removeEventListener('focusin', arm) }
  }, [onDemand, file, armed, playOnInteract])

  // Arm when (nearly) on screen and the browser is idle — see armQueue.
  useEffect(() => {
    if (onDemand || !file || reducedMotion() || !box.current || armed) return
    let cancelIdle: (() => void) | undefined
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      io.disconnect()
      cancelIdle = whenIdle(() => setArmed(true))
    }, { rootMargin: '150px' })
    io.observe(box.current)
    return () => { io.disconnect(); cancelIdle?.() }
  }, [onDemand, file, armed])

  useEffect(() => {
    if (!armed || !file || !box.current) return
    let cancelled = false
    void Promise.all([loadPlayer(), file()]).then(([lottie, data]) => {
      if (cancelled || !box.current) return
      anim.current = lottie.loadAnimation({ container: box.current, renderer: 'svg', loop, autoplay: loop, animationData: data })
      // Rest on the last frame (the icon's final pose) until triggered.
      if (playOnMount || pendingPlay.current) anim.current.goToAndPlay(0, true)
      else if (!loop) anim.current.goToAndStop(anim.current.totalFrames - 1, true)
      pendingPlay.current = false
      setReady(true)
    }).catch(() => undefined) // offline / missing chunk: the static icon stays
    return () => { cancelled = true; anim.current?.destroy(); anim.current = null }
  }, [armed, file, loop, playOnMount])

  // First time on screen: play once (optionally staggered).
  useEffect(() => {
    if (playOnView === undefined || !ready || !box.current) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      io.disconnect()
      timer = setTimeout(() => anim.current?.goToAndPlay(0, true), playOnView)
    }, { threshold: 0.6 })
    io.observe(box.current)
    return () => { io.disconnect(); clearTimeout(timer) }
  }, [playOnView, ready])

  // Gentle idle loop, only while visible — drives the Lottie instance
  // directly, no React state involved.
  useEffect(() => {
    if (!replayEvery || !ready || !box.current) return
    let visible = false
    const io = new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting) })
    io.observe(box.current)
    const t = setInterval(() => { if (visible && !document.hidden) anim.current?.goToAndPlay(0, true) }, replayEvery)
    return () => { io.disconnect(); clearInterval(t) }
  }, [replayEvery, ready])

  // Hover (desktop) or press (touch) on the enclosing control replays it.
  useEffect(() => {
    if (!playOnInteract || !ready || !box.current) return
    const host = box.current.closest('button, a, [role="button"]')
    if (!host) return
    let last = 0
    const replay = () => {
      // Hover then click on desktop would restart it twice in a row.
      if (Date.now() - last < 400) return
      last = Date.now()
      anim.current?.goToAndPlay(0, true)
    }
    host.addEventListener('pointerenter', replay)
    host.addEventListener('pointerdown', replay)
    return () => { host.removeEventListener('pointerenter', replay); host.removeEventListener('pointerdown', replay) }
  }, [playOnInteract, ready])

  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (!trigger) return
    if (anim.current) anim.current.goToAndPlay(0, true)
    else if (hasAnimatedIcon(name) && !reducedMotion()) { pendingPlay.current = true; setArmed(true) }
  }, [trigger])

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }} aria-hidden>
      {/* Lottie colours are baked in: tint the rendered SVG with currentColor */}
      <span ref={box} className={`lottie-tint absolute inset-0 ${ready ? '' : 'invisible'}`} />
      {!ready && <Icon name={fallback} size={size} fill={fill} />}
    </span>
  )
}
