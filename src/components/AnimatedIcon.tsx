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

export default function AnimatedIcon({ name, fallback, size = 24, fill, className = '', trigger, loop = false, playOnMount = false, playOnView, playOnInteract = false }: Props) {
  const box = useRef<HTMLSpanElement>(null)
  const anim = useRef<{ goToAndPlay: (v: number, f?: boolean) => void; goToAndStop: (v: number, f?: boolean) => void; destroy: () => void; totalFrames: number } | null>(null)
  const [ready, setReady] = useState(false)
  const file = fileFor(name)

  useEffect(() => {
    if (!file || reducedMotion() || !box.current) return
    let cancelled = false
    void Promise.all([loadPlayer(), file()]).then(([lottie, data]) => {
      if (cancelled || !box.current) return
      anim.current = lottie.loadAnimation({ container: box.current, renderer: 'svg', loop, autoplay: loop, animationData: data })
      // Rest on the last frame (the icon's final pose) until triggered.
      if (playOnMount) anim.current.goToAndPlay(0, true)
      else if (!loop) anim.current.goToAndStop(anim.current.totalFrames - 1, true)
      setReady(true)
    })
    return () => { cancelled = true; anim.current?.destroy(); anim.current = null }
  }, [file, loop, playOnMount])

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
    if (trigger) anim.current?.goToAndPlay(0, true)
  }, [trigger])

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }} aria-hidden>
      {/* Lottie colours are baked in: tint the rendered SVG with currentColor */}
      <span ref={box} className={`lottie-tint absolute inset-0 ${ready ? '' : 'invisible'}`} />
      {!ready && <Icon name={fallback} size={size} fill={fill} />}
    </span>
  )
}
