import { useEffect, useMemo, useState } from 'react'
import Icon from '../Icon'
import { useT } from '../../i18n'
import fetesNs from '../../i18n/ns/fetes'
import { requestOpenLink } from '../../lib/navigation'
import { useFetes, type Fetes } from '../../lib/fetes'
import { useHunt, useMyHunt } from '../../lib/treasureHunt'

// « Thème des fêtes » (Backoffice › CMS › Fêtes). Everything here is CSS
// animation (index.css « .fetes-* »): no React state ticks, no timers, and
// « reduce motion » freezes it all.

const PALETTES: Record<Fetes['palette'], [string, string, string]> = {
  classic: ['#E11D2E', '#15924B', '#F5B301'],
  gold: ['#F5B301', '#FFF3C4', '#C98A00'],
  brand: ['#FE0000', '#F5B301', '#FFFFFF'],
}

// Palette and intensity on <html>, read by the CSS (and by components that
// opt in, e.g. the card ribbon).
export function FetesRoot() {
  const f = useFetes()
  useEffect(() => {
    const root = document.documentElement
    if (!f) return
    const [a, b, c] = PALETTES[f.palette]
    root.dataset.fetes = f.intensity
    root.style.setProperty('--fetes-a', a)
    root.style.setProperty('--fetes-b', b)
    root.style.setProperty('--fetes-c', c)
    return () => {
      delete root.dataset.fetes
      for (const v of ['--fetes-a', '--fetes-b', '--fetes-c']) root.style.removeProperty(v)
    }
  }, [f])
  if (!f?.snow) return null
  return <Snow intensity={f.intensity} />
}

const FLAKES = { soft: 14, normal: 28, strong: 48 }

// Falling snow over the page (never catches a click).
function Snow({ intensity }: { intensity: Fetes['intensity'] }) {
  // Fixed pseudo-random layout (same on every render).
  const flakes = useMemo(() => Array.from({ length: FLAKES[intensity] }, (_, i) => {
    const r = (n: number) => ((i * 9301 + n * 49297) % 233280) / 233280
    return { left: r(1) * 100, delay: -r(2) * 14, duration: 9 + r(3) * 9, size: 4 + r(4) * 7, drift: (r(5) - 0.5) * 60, opacity: 0.45 + r(6) * 0.5 }
  }), [intensity])
  return (
    <div aria-hidden className="fetes-snow pointer-events-none fixed inset-0 z-[95] overflow-hidden">
      {flakes.map((f, i) => (
        <span key={i} className="fetes-flake" style={{
          left: `${f.left}%`, width: f.size, height: f.size, opacity: f.opacity,
          animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s`,
          ['--drift' as string]: `${f.drift}px`,
        }} />
      ))}
    </div>
  )
}

const BULBS = 36

// Blinking light string along the bottom of the header.
export function FetesGarland() {
  const f = useFetes()
  if (!f?.garland) return null
  return (
    <div aria-hidden className="fetes-garland pointer-events-none absolute inset-x-0 -bottom-[9px] z-[1] flex h-[18px] justify-between overflow-hidden px-1">
      <svg className="absolute inset-x-0 top-0 h-[10px] w-full" preserveAspectRatio="none" viewBox="0 0 100 10">
        <path d="M0 1 Q 2.5 9 5 1 T 10 1 T 15 1 T 20 1 T 25 1 T 30 1 T 35 1 T 40 1 T 45 1 T 50 1 T 55 1 T 60 1 T 65 1 T 70 1 T 75 1 T 80 1 T 85 1 T 90 1 T 95 1 T 100 1" fill="none" stroke="#1f3b2a" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      {Array.from({ length: BULBS }, (_, i) => (
        <span key={i} className={`fetes-bulb fetes-bulb-${i % 3} ${i % 2 ? 'max-md:hidden' : ''}`} style={{ animationDelay: `${(i % 6) * 0.25}s` }} />
      ))}
    </div>
  )
}

// Santa hat on the logo.
export function FetesHat() {
  const f = useFetes()
  if (!f?.decorations) return null
  return (
    <svg aria-hidden viewBox="0 0 64 48" className="fetes-hat pointer-events-none absolute -left-3 -top-4 h-7 w-9 lg:-left-4 lg:-top-5 lg:h-9 lg:w-12">
      <path d="M6 38 C 14 12, 34 2, 52 10 C 46 16, 44 26, 46 36 Z" fill="var(--fetes-a, #E11D2E)" />
      <rect x="2" y="34" width="48" height="10" rx="5" fill="#fff" />
      <circle cx="54" cy="10" r="6" fill="#fff" />
    </svg>
  )
}

const DISMISSED_KEY = 'yupixi_fetes_banner_hidden'
const today = () => new Date().toISOString().slice(0, 10)

// Festive strip on top of every page (hidden for the day when closed).
export function FetesBanner() {
  const t = useT(fetesNs)
  const f = useFetes()
  const [hiddenOn, setHiddenOn] = useState<string | null>(() => {
    try { return localStorage.getItem(DISMISSED_KEY) } catch { return null }
  })
  const b = f?.banner
  if (!b || hiddenOn === today()) return null
  const close = () => {
    setHiddenOn(today())
    try { localStorage.setItem(DISMISSED_KEY, today()) } catch { /* private mode */ }
  }
  const open = () => b.link && requestOpenLink(b.link)
  return (
    <div role="status" className="fetes-banner relative flex w-full items-center gap-2 overflow-hidden px-3 py-2 text-white sm:px-4">
      <span aria-hidden className="fetes-sparkles pointer-events-none absolute inset-0" />
      <span aria-hidden className="fetes-gift relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Icon name="redeem" size={17} />
      </span>
      <button type="button" onClick={open} disabled={!b.link}
        className="fetes-shimmer relative min-w-0 flex-1 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap border-none bg-transparent p-0 text-left text-label-md font-bold text-white disabled:cursor-default sm:text-center">
        {b.text}
      </button>
      {b.cta && (
        <button type="button" onClick={open} className="fetes-cta relative shrink-0 cursor-pointer rounded-full border-none bg-white px-3 py-1 text-label-sm font-bold text-[var(--fetes-a,#E11D2E)] max-[360px]:hidden">
          {b.cta}
        </button>
      )}
      <button type="button" onClick={close} aria-label={t('banner.hide')} className="relative flex shrink-0 cursor-pointer border-none bg-transparent p-0.5 text-white/90">
        <Icon name="close" size={17} />
      </button>
    </div>
  )
}

// Blinking festive frame around the photo of a listing in a live campaign.
export function FetesFrame() {
  const f = useFetes()
  if (!f?.cardRibbons) return null
  return <span aria-hidden className="fetes-frame pointer-events-none absolute inset-0 z-[1]" />
}

// « Chasse au trésor » counter in the header (gift 3/10), while a hunt runs.
export function HuntPill({ loggedIn, onOpen }: { loggedIn: boolean; onOpen: () => void }) {
  const t = useT(fetesNs)
  const { hunt } = useHunt()
  const { mine } = useMyHunt(loggedIn && !!hunt)
  if (!hunt) return null
  const total = hunt.giftsToWin
  const found = mine?.found ?? 0
  return (
    <button type="button" onClick={onOpen} title={t('pill.label', { found, total })} aria-label={t('pill.label', { found, total })}
      className="hunt-pill flex shrink-0 cursor-pointer items-center gap-1 rounded-full border-none px-2.5 py-1.5 text-label-md font-bold text-white lg:px-3 lg:py-2">
      <Icon name="redeem" size={17} className="hunt-pill-icon" />
      <span>{loggedIn && mine ? `${found}/${total}` : t('pill.short')}</span>
    </button>
  )
}
