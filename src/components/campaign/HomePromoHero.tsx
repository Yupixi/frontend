import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../Icon'
import CampaignMedia from './CampaignMedia'
import { amountText, currencySymbol } from '../Price'
import { thumbnailUrl } from '../../lib/media'
import { plainText } from '../../lib/format'
import { pad2, useCountdown } from '../../lib/useCountdown'
import { requestOpenCampaign } from '../../lib/navigation'
import { useMarketCode, useMarketVars } from '../../lib/countries'
import {
  CAMPAIGN_HERO_BADGE, HERO_DEALS_QUERY, LIVE_CAMPAIGNS_QUERY, isLive, type HeroDeal, type LiveCampaign,
} from '../../graphql/campaigns'

// The home hero taken over by the live campaigns the team put there (BO
// « Visibilité » › « Prendre tout le hero de l'accueil »): the campaign's
// visual or a generated animated backdrop, its best discount, a countdown,
// its best deals with their prices animated, and the way to its page.
//
// Performance rules (see the perf pass): nothing ticks at page level — the
// rotation lives here, the countdown in its own component, the prices are
// written by requestAnimationFrame into a ref; every animation is CSS on
// transform/opacity (.ph-* in index.css), paused off screen, off for
// « reduce motion » and when the campaign has its animations off. The text
// is there on the first paint (the title only slides, it never fades in).

const DEFAULT_TINT = '#EB1100'
const MEMORY_KEY = 'dilchap:promo-hero'

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Whether the last visit had a campaign in the hero: the hero then keeps
// its room while the campaigns load, instead of flashing the usual slider.
export function expectPromoHero() {
  try { return localStorage.getItem(MEMORY_KEY) === '1' } catch { return false }
}

// The live campaigns that take the home hero, in the BO's home order.
export function useHeroCampaigns() {
  const { data } = useQuery<{ activeCampaigns: LiveCampaign[] }>(LIVE_CAMPAIGNS_QUERY, { variables: useMarketVars(), fetchPolicy: 'cache-and-network' })
  const campaigns = (data?.activeCampaigns ?? []).filter(c => isLive(c) && c.featuredOnHome !== false && c.homeHero !== false)
  const ready = !!data
  const has = campaigns.length > 0
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(MEMORY_KEY, has ? '1' : '0') } catch { /* private mode */ }
  }, [ready, has])
  return { campaigns, ready }
}

// Counts an element's text from `from` to `to` (ease-out), then calls
// `done`. Returns the cancel function.
function countText(el: HTMLElement, from: number, to: number, ms: number, format: (n: number) => string, done?: () => void) {
  let raf = 0
  const t0 = performance.now()
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms)
    const eased = 1 - Math.pow(1 - k, 3)
    el.textContent = format(k < 1 ? from + (to - from) * eased : to)
    if (k < 1) raf = requestAnimationFrame(step)
    else done?.()
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

// Runs `start` once the element is well on screen, after the first paint
// (an idle slice, so nothing competes with it).
type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
function whenSeen(el: Element, start: () => (() => void) | void, threshold = 0.5) {
  let stop: (() => void) | void
  let io: IntersectionObserver | null = null
  const arm = () => {
    io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return
      io?.disconnect()
      stop = start()
    }, { threshold })
    io.observe(el)
  }
  const w = window as IdleWindow
  const idle = w.requestIdleCallback ? w.requestIdleCallback(arm, { timeout: 800 }) : window.setTimeout(arm, 200)
  return () => {
    if (w.cancelIdleCallback) w.cancelIdleCallback(idle)
    else clearTimeout(idle)
    io?.disconnect()
    stop?.()
  }
}

const saleOf = (d: HeroDeal) => {
  const disc = d.activeCampaignDiscount
  if (!disc || d.price == null) return null
  if (disc.salePrice != null) return disc.salePrice
  if (disc.discountPercent != null) return Math.round(d.price * (1 - disc.discountPercent / 100))
  return null
}

// One deal: the old price gets struck, the new one counts down to its
// value, the -X % badge pops then beats.
function DealCard({ d, index, animate, desktop, onSelect }: { d: HeroDeal; index: number; animate: boolean; desktop: boolean; onSelect: (id: string) => void }) {
  const card = useRef<HTMLButtonElement>(null)
  const figure = useRef<HTMLSpanElement>(null)
  const sale = saleOf(d)!
  const price = d.price!
  const pct = d.activeCampaignDiscount?.discountPercent ?? Math.max(1, Math.round((1 - sale / price) * 100))
  const fmt = (n: number) => amountText(Math.round(n), d.currency)
  const finalText = fmt(sale)
  const oldText = fmt(price)
  useEffect(() => {
    const el = card.current
    if (!animate || !el) return
    let cancelCount: (() => void) | undefined
    let timer = 0
    const stop = whenSeen(el, () => {
      timer = window.setTimeout(() => {
        el.dataset.on = ''
        if (figure.current) cancelCount = countText(figure.current, price, sale, 1100, fmt, () => { el.dataset.done = '' })
      }, 250 + index * 180)
    }, 0.6)
    return () => { stop(); clearTimeout(timer); cancelCount?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, d.id, price, sale, index])
  const photo = d.coverImageUrl ? thumbnailUrl(d.coverImageUrl) : null
  return (
    <button
      ref={card}
      type="button"
      onClick={() => onSelect(d.id)}
      data-wait={animate ? '' : undefined}
      aria-label={`${d.title} : ${finalText} ${currencySymbol(d.currency)} au lieu de ${oldText} ${currencySymbol(d.currency)}, -${pct} %`}
      className={`ph-deal flex shrink-0 cursor-pointer snap-start flex-col overflow-hidden rounded-xl border-none bg-surface-lowest p-1.5 text-left text-on-surface shadow-lg ${desktop ? 'w-[168px]' : 'w-[136px]'}`}
    >
      <span className={`relative block w-full overflow-hidden rounded-lg bg-surface-container ${desktop ? 'aspect-[4/3]' : 'aspect-square'}`}>
        {photo && <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />}
        <span className="ph-deal-badge absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-label-sm font-extrabold text-white shadow">-{pct} %</span>
      </span>
      <span aria-hidden className="block px-1 pb-1 pt-1.5">
        <span className="block truncate text-label-sm text-on-surface-variant">{d.title}</span>
        <span className="ph-deal-new mt-0.5 block whitespace-nowrap text-label-lg font-extrabold leading-tight text-primary">
          <span ref={figure} className="inline-block tabular-nums">{animate ? oldText : finalText}</span>
          <span className="price-unit">{currencySymbol(d.currency)}</span>
        </span>
        <span className="ph-deal-old relative inline-block whitespace-nowrap text-body-sm tabular-nums text-on-surface-variant">
          {oldText}<span className="price-unit">{currencySymbol(d.currency)}</span>
          <span className="ph-deal-strike" />
        </span>
      </span>
    </button>
  )
}

function Deals({ c, desktop, animate, dark, onSelect }: { c: LiveCampaign; desktop: boolean; animate: boolean; dark: boolean; onSelect: (id: string) => void }) {
  const market = useMarketCode()
  const n = c.homeHeroListings ?? 6
  const { data } = useQuery<{ listings: { items: HeroDeal[] } }>(HERO_DEALS_QUERY, {
    variables: { filter: { campaignId: c.id, ...(market ? { countryCode: market } : {}) }, pageSize: n },
    skip: n <= 0,
  })
  const deals = (data?.listings.items ?? []).filter(d => d.price != null && saleOf(d) != null && saleOf(d)! < d.price).slice(0, n)
  if (n <= 0 || (data && !deals.length)) return null
  return (
    <div className={desktop ? 'relative z-10 px-10 pb-8' : 'relative z-10 pb-4'}>
      <p className={`m-0 mb-2 flex items-center gap-1.5 text-label-sm font-bold uppercase tracking-wider ${desktop ? '' : 'px-4'} ${dark ? 'text-on-surface-variant' : 'text-white/80'}`}>
        <Icon name="trending_down" size={16} /> Les plus fortes remises
      </p>
      {/* Room kept while the deals load (no jump under the hero). */}
      <div className={`flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] ${desktop ? 'min-h-[196px]' : 'min-h-[200px] scroll-px-4 px-4'}`}>
        {deals.map((d, i) => <DealCard key={d.id} d={d} index={i} animate={animate} desktop={desktop} onSelect={onSelect} />)}
      </div>
    </div>
  )
}

// Days / hours / minutes / seconds; a digit that changes drops in.
function Countdown({ endsAt, paused, animate, dark, compact }: { endsAt: string; paused: boolean; animate: boolean; dark: boolean; compact: boolean }) {
  const c = useCountdown(endsAt, 1000, paused)
  if (!c || c.ended) return null
  const cells: [string, number][] = [['j', c.days], ['h', c.hours], ['min', c.minutes], ['s', c.seconds]]
  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label={`Fin dans ${c.days} jours ${c.hours} heures ${c.minutes} minutes`}>
      {cells.map(([unit, v]) => (
        <span key={unit} aria-hidden className={`flex items-baseline gap-0.5 overflow-hidden rounded-lg px-2 py-1 ${compact ? 'min-w-[48px]' : 'min-w-[58px] py-1.5'} justify-center ${dark ? 'bg-white/75 text-on-surface' : 'bg-black/25 text-white'}`}>
          <span key={animate ? v : undefined} className={`${compact ? 'text-headline-sm' : 'text-headline-md'} font-extrabold tabular-nums ${animate ? 'ph-flip' : ''}`}>{pad2(v)}</span>
          <span className={`text-label-sm font-bold ${dark ? 'text-on-surface-variant' : 'text-white/75'}`}>{unit}</span>
        </span>
      ))}
    </div>
  )
}

// "-60 %" counting up from 0 once seen, with a burst of sparks.
function BigDiscount({ pct, animate, size }: { pct: number; animate: boolean; size: 'lg' | 'sm' }) {
  const fig = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = fig.current
    if (!animate || !el) return
    return whenSeen(el, () => { el.style.opacity = '1'; return countText(el, 0, pct, 900, n => String(Math.round(n))) }, 0.3)
  }, [animate, pct])
  const sparks = animate ? Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2
    const r = size === 'lg' ? 150 : 90
    return { '--x': `${Math.round(Math.cos(a) * r)}px`, '--y': `${Math.round(Math.sin(a) * r)}px`, '--r': `${i * 47}deg`, '--d': `${650 + (i % 3) * 60}ms`, background: i % 3 ? '#ffd166' : '#ffffff' } as React.CSSProperties
  }) : []
  return (
    <span className="relative inline-flex items-baseline gap-1 tabular-nums">
      {sparks.map((s, i) => <span key={i} aria-hidden className="ph-spark" style={s} />)}
      {/* Hidden until it counts (no « -0 % » before the first frame of it). */}
      <span className="font-extrabold">-<span ref={fig} style={animate ? { opacity: 0 } : undefined}>{pct}</span> %</span>
    </span>
  )
}

function Slide({ c, desktop, animate, paused, onSelect, nav }: { c: LiveCampaign; desktop: boolean; animate: boolean; paused: boolean; onSelect: (id: string) => void; nav: React.ReactNode }) {
  const v = c.visuals ?? {}
  const hero = v.hero
  const bgVisual = hero && (v.heroMode ?? 'background') === 'background'
  const artVisual = hero && v.heroMode === 'artwork'
  const dark = !!bgVisual && v.heroTone === 'dark'
  const best = c.maxDiscountPercent
  const tagline = c.homeHeroTagline || CAMPAIGN_HERO_BADGE[c.type]
  const description = plainText(c.description)
  const a = (cls: string) => (animate ? cls : '')
  const delay = (ms: number) => (animate ? ({ '--d': `${ms}ms` } as React.CSSProperties) : undefined)
  const open = () => requestOpenCampaign(c.slug)
  const muted = dark ? 'text-on-surface-variant' : 'text-white/85'
  const chip = `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-md ${dark ? 'bg-white/75 text-on-surface' : 'bg-white/15 text-white'}`

  const backdrop = (
    <div aria-hidden className={`absolute inset-0 overflow-hidden ${a('ph-fade')}`}>
      {bgVisual ? (
        <>
          <CampaignMedia visual={hero!} />
          <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-r from-white/90 via-white/60 to-white/10' : 'bg-gradient-to-r from-black/80 via-black/55 to-black/10'}`} />
          {!desktop && <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-t from-white/90 to-transparent' : 'bg-gradient-to-t from-black/85 via-black/30 to-transparent'}`} />}
        </>
      ) : (
        <>
          <div className="ph-base absolute inset-0" />
          <div className={`ph-orb -left-24 -top-28 h-[420px] w-[420px] ${a('ph-orb-1')}`} />
          <div className={`ph-orb -bottom-40 right-[18%] h-[480px] w-[480px] ${a('ph-orb-2')}`} />
          <div className={`ph-orb right-[-120px] top-[-80px] h-[360px] w-[360px] ${a('ph-orb-3')}`} />
          {animate && <div className="ph-shine" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
        </>
      )}
    </div>
  )

  const head = (
    <div className={`flex flex-wrap items-center gap-2 ${a('ph-rise')}`} style={delay(0)}>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-sm font-extrabold uppercase tracking-wider ${dark ? 'bg-white/80 text-primary' : 'bg-white text-primary'}`}>
        <Icon name="bolt" size={15} fill /> {tagline}
      </span>
      {c.listingsCount > 0 && <span className={chip}><Icon name="inventory_2" size={16} /> {c.listingsCount.toLocaleString('fr-FR')} annonce{c.listingsCount > 1 ? 's' : ''}</span>}
      {desktop && c.sellersCount > 0 && <span className={chip}><Icon name="workspace_premium" size={16} /> {c.sellersCount} vendeur{c.sellersCount > 1 ? 's' : ''}</span>}
    </div>
  )

  const cta = (
    <button type="button" onClick={open} className={`ph-cta inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-6 py-3.5 text-label-lg font-bold shadow-lg ${dark ? 'bg-primary text-white' : 'bg-white text-primary'} ${desktop ? '' : 'w-full'}`}>
      Voir les offres <Icon name="arrow_forward" size={20} />
    </button>
  )

  if (desktop) return (
    <>
      {backdrop}
      <div className="relative z-10 grid grid-cols-12 items-center gap-8 px-10 pb-5 pt-9">
        <div className={`flex min-w-0 flex-col items-start gap-4 ${artVisual || !bgVisual ? 'col-span-7' : 'col-span-8'}`}>
          {head}
          <h1 className={`m-0 text-[52px] font-extrabold leading-[1.05] tracking-tight xl:text-[60px] ${a('ph-rise-solid')}`} style={delay(60)}>{c.name}</h1>
          {description && <p className={`m-0 line-clamp-2 max-w-xl text-body-lg ${muted} ${a('ph-rise')}`} style={delay(140)}>{description}</p>}
          <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 ${a('ph-rise')}`} style={delay(220)}>
            {best && bgVisual ? <span className="ph-beat rounded-2xl bg-primary px-4 py-2 text-headline-md text-white shadow-lg"><span className="mr-1 text-label-md font-bold uppercase">Jusqu’à</span><BigDiscount pct={best} animate={animate} size="sm" /></span> : null}
            <div>
              <p className={`m-0 mb-1 text-label-sm font-bold uppercase tracking-wider ${muted}`}>Fin des offres dans</p>
              <Countdown endsAt={c.endsAt} paused={paused} animate={animate} dark={dark} compact={false} />
            </div>
          </div>
          <div className={`mt-1 flex items-center gap-4 ${a('ph-rise')}`} style={delay(300)}>{cta}{nav}</div>
        </div>
        {artVisual ? (
          <div className={`relative col-span-5 aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-2xl ${a('ph-pop')}`} style={delay(200)}>
            <CampaignMedia visual={hero!} />
          </div>
        ) : !bgVisual && best ? (
          <div className="col-span-5 flex items-center justify-center">
            <div className={`relative flex h-[260px] w-[260px] items-center justify-center ${a('ph-pop')}`} style={delay(180)}>
              <span aria-hidden className={`absolute inset-0 rounded-full border-[3px] border-dashed border-white/40 ${a('ph-ring')}`} />
              <span className={`relative flex h-[218px] w-[218px] flex-col items-center justify-center rounded-full bg-white text-primary shadow-2xl ${a('ph-beat')}`}>
                <span className="text-label-md font-extrabold uppercase tracking-widest text-on-surface-variant">Jusqu’à</span>
                <span className="text-[64px] leading-none"><BigDiscount pct={best} animate={animate} size="lg" /></span>
                <span className="mt-1 text-label-md font-bold text-on-surface-variant">de remise</span>
              </span>
            </div>
          </div>
        ) : null}
      </div>
      <Deals c={c} desktop animate={animate} dark={dark} onSelect={onSelect} />
    </>
  )

  return (
    <>
      {backdrop}
      {artVisual && (
        <div className={`relative z-10 mx-4 mt-4 aspect-[16/9] overflow-hidden rounded-xl shadow-lg ${a('ph-pop')}`}>
          <CampaignMedia visual={hero!} />
        </div>
      )}
      <div className={`relative z-10 flex flex-col items-start gap-3 p-4 ${bgVisual ? 'pt-28' : ''}`}>
        {head}
        <h1 className={`m-0 text-[30px] font-extrabold leading-[1.08] tracking-tight min-[400px]:text-[34px] ${a('ph-rise-solid')}`} style={delay(60)}>{c.name}</h1>
        {description && <p className={`m-0 line-clamp-2 text-body-md ${muted} ${a('ph-rise')}`} style={delay(120)}>{description}</p>}
        <div className={`flex w-full flex-wrap items-end justify-between gap-3 ${a('ph-rise')}`} style={delay(180)}>
          {best ? (
            <span className={`rounded-2xl px-3 py-1.5 shadow-lg ${dark ? 'bg-primary text-white' : 'bg-white text-primary'} ${a('ph-beat')}`}>
              <span className="block text-[10px] font-extrabold uppercase tracking-widest opacity-80">Jusqu’à</span>
              <span className="text-[30px] leading-none"><BigDiscount pct={best} animate={animate} size="sm" /></span>
            </span>
          ) : <span />}
          <div>
            <p className={`m-0 mb-1 text-[10px] font-bold uppercase tracking-wider ${muted}`}>Fin des offres dans</p>
            <Countdown endsAt={c.endsAt} paused={paused} animate={animate} dark={dark} compact />
          </div>
        </div>
        <div className={`w-full ${a('ph-rise')}`} style={delay(240)}>{cta}</div>
        {nav}
      </div>
      <Deals c={c} desktop={false} animate={animate} dark={dark} onSelect={onSelect} />
    </>
  )
}

// The hero: one campaign at a time, the next one when the progress bar
// (CSS, BO « Page d'accueil » interval) ends; paused off screen, while the
// tab is hidden and while the pointer or focus is inside.
export default function HomePromoHero({ campaigns, desktop, intervalMs, onSelectListing }: { campaigns: LiveCampaign[]; desktop: boolean; intervalMs: number; onSelectListing: (id: string) => void }) {
  const root = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(0)
  const [onScreen, setOnScreen] = useState(true)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  const [hold, setHold] = useState(false)
  const [reduced] = useState(reducedMotion)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOnScreen(!!e?.isIntersecting))
    io.observe(el)
    const vis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', vis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis) }
  }, [])
  const count = campaigns.length
  const c = campaigns[index % count] ?? campaigns[0]
  if (!c) return null
  const paused = !onScreen || hidden
  const animate = c.homeHeroAnimated !== false && !reduced
  const go = (i: number) => setIndex((i + count) % count)
  const tint = c.themeColor || DEFAULT_TINT
  const dark = !!c.visuals?.hero && (c.visuals.heroMode ?? 'background') === 'background' && c.visuals.heroTone === 'dark'

  const nav = count > 1 && (
    <div className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 ${dark ? 'bg-white/75' : 'bg-black/30'}`}>
      <button type="button" onClick={() => go(index - 1)} aria-label="Campagne précédente" className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent ${dark ? 'text-on-surface' : 'text-white'}`}><Icon name="arrow_back" size={18} /></button>
      {campaigns.map((x, i) => (
        <button key={x.id} type="button" onClick={() => go(i)} aria-label={`Voir ${x.name}`} aria-current={i === index % count} className={`h-2 cursor-pointer rounded-full border-none p-0 transition-[width] duration-300 ${i === index % count ? `w-6 ${dark ? 'bg-primary' : 'bg-white'}` : `w-2 ${dark ? 'bg-on-surface/30' : 'bg-white/45'}`}`} />
      ))}
      <button type="button" onClick={() => go(index + 1)} aria-label="Campagne suivante" className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent ${dark ? 'text-on-surface' : 'text-white'}`}><Icon name="arrow_forward" size={18} /></button>
    </div>
  )

  return (
    <section
      ref={root}
      aria-roledescription="carrousel"
      aria-label="Promotions en cours"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false) }}
      className={`ph-hero relative isolate overflow-hidden rounded-2xl shadow-md ${dark ? 'text-on-surface' : 'text-white'} ${desktop ? 'mt-6 min-h-[460px]' : 'mb-6'} ${paused ? 'ph-paused' : ''}`}
      style={{ '--camp': tint, background: tint } as React.CSSProperties}
    >
      {count > 1 && (
        <div className="absolute left-0 top-0 z-30 h-1 w-full bg-white/20">
          <div
            key={`${c.id}-${index}`}
            onAnimationEnd={() => go(index + 1)}
            className="hero-progress h-full w-full bg-white"
            style={{ animationDuration: `${intervalMs}ms`, animationPlayState: paused || hold ? 'paused' : 'running' }}
          />
        </div>
      )}
      <div key={c.id} className="contents">
        <Slide c={c} desktop={desktop} animate={animate} paused={paused} onSelect={onSelectListing} nav={nav} />
      </div>
    </section>
  )
}
