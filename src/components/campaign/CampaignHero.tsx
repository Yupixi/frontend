import Icon from '../Icon'
import CampaignMedia from './CampaignMedia'
import { thumbnailUrl } from '../../lib/media'
import { pad2, useCountdown } from '../../lib/useCountdown'
import { type CampaignType, type LiveCampaign } from '../../graphql/campaigns'

const DEFAULT_TINT = '#0d4a3a'
const HERO_BADGE: Record<CampaignType, string> = {
  SALE: 'Soldes officielles', FLASH: 'Vente flash officielle', SEASONAL: 'Campagne saisonnière', CUSTOM: 'Campagne officielle Dilchap',
}
const dateFr = (iso: string, year = false) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', ...(year ? { year: 'numeric' } : {}) })

// Its own component: the only thing on the page that ticks every second.
function HeroCountdown({ endsAt, dark }: { endsAt: string; dark: boolean }) {
  const c = useCountdown(endsAt)
  if (!c || c.ended) return null
  const cells: [string, number][] = [['Jours', c.days], ['Heures', c.hours], ['Min', c.minutes], ['Sec', c.seconds]]
  return (
    <div className="flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-2.5">
      {cells.map(([label, v], i) => (
        <div key={label} className="flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-2.5">
          {i > 0 && <span className={`text-headline-sm font-bold ${dark ? 'text-on-surface-variant' : 'text-white/60'}`}>:</span>}
          <div className={`flex min-w-[48px] flex-col items-center rounded-xl px-1.5 py-1.5 backdrop-blur-md min-[360px]:min-w-[58px] min-[360px]:px-2.5 sm:min-w-[70px] sm:px-3.5 sm:py-2 ${dark ? 'bg-white/70' : 'bg-white/10'}`}>
            <span className={`text-headline-md font-extrabold tabular-nums ${i === 3 ? `camp-tick ${dark ? 'text-primary' : 'text-[#ffb4ab]'}` : ''}`}>{pad2(v)}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${dark ? 'text-on-surface-variant' : 'text-white/70'}`}>{label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// A card whose photo doesn't load (removed upload) disappears.
const hideCard = (e: React.SyntheticEvent<HTMLImageElement>) => { const card = e.currentTarget.closest('.camp-card') as HTMLElement | null; if (card) card.style.display = 'none' }

type Photo = { src: string; title: string }

// Two photos per card cross-fading (Ken Burns), each with its own caption,
// each card floating.
function PhotoCard({ a, b, captions, delay, stagger, tilt, className }: { a: Photo; b?: Photo; captions?: boolean; delay: number; stagger: number; tilt: number; className: string }) {
  const style = { '--tilt': `${tilt}deg`, animationDelay: `${delay * 0.7}s` } as React.CSSProperties
  const fade = !!b && b.src !== a.src
  const layer = (ph: Photo, kb: string, first: boolean) => (
    <div className={`${kb} absolute inset-0`} style={{ animationDelay: `${delay * stagger}s` }}>
      <img src={ph.src} alt="" decoding="async" loading={first ? undefined : 'lazy'} onError={first ? hideCard : e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} className="h-full w-full object-cover" />
      {captions && <span className="absolute bottom-2 left-2 z-10 max-w-[85%] truncate rounded bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">{ph.title}</span>}
    </div>
  )
  return (
    <div className={`camp-card absolute overflow-hidden rounded-2xl bg-surface-lowest shadow-2xl ${className}`} style={style}>
      {layer(a, fade ? 'camp-kb-a' : '', true)}
      {fade && layer(b!, 'camp-kb-b', false)}
    </div>
  )
}

// The generated backdrop: the campaign colour drifting, soft blobs and
// sparkles (all CSS, see .camp-* in index.css).
function AnimatedBackdrop() {
  const blobs = [
    '-top-12 left-10 h-52 w-52 bg-white opacity-[0.14]',
    'top-1/3 left-1/4 h-48 w-64 camp-blob-light opacity-[0.18]',
    '-bottom-16 left-6 h-56 w-56 camp-blob-light opacity-[0.2]',
    'top-10 right-1/3 h-60 w-60 camp-blob-light opacity-[0.15]',
    'bottom-4 right-10 h-44 w-44 bg-white opacity-[0.12]',
    '-top-14 right-4 h-48 w-48 camp-blob-light opacity-[0.22]',
  ]
  const sparkles = ['top-12 left-[18%] h-2 w-2', 'top-28 left-[45%] h-1.5 w-1.5', 'bottom-16 left-[32%] h-2 w-2', 'top-16 right-[24%] h-1.5 w-1.5', 'bottom-24 right-[12%] h-2 w-2']
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {blobs.map((c, i) => <div key={i} className={`camp-blob camp-blob-${i + 1} ${c}`} />)}
      {sparkles.map((c, i) => <div key={i} className={`camp-sparkle ${c}`} style={{ animationDelay: `${i * 0.55}s`, animationDuration: `${2.6 + (i % 3) * 0.6}s` }} />)}
    </div>
  )
}

// Campaign page header. Driven by the BO: the team's visual (background or
// artwork, image / video / Lottie) when there is one, the generated look
// otherwise — the campaign colour animated, the items' photos floating.
export default function CampaignHero({ campaign }: { campaign: LiveCampaign }) {
  const v = campaign.visuals ?? {}
  const hero = v.hero
  const bgVisual = hero && (v.heroMode ?? 'background') === 'background'
  const artVisual = hero && v.heroMode === 'artwork'
  const animated = v.heroAnimated !== false && !bgVisual
  const dark = v.heroTone === 'dark'
  const tint = campaign.themeColor || DEFAULT_TINT
  const photos: Photo[] = []
  for (const e of campaign.listings) {
    const src = e.listing.coverImageUrl && thumbnailUrl(e.listing.coverImageUrl)
    if (src && !photos.some(p => p.src === src)) photos.push({ src, title: e.listing.title })
  }
  const photo = (i: number) => photos[i % photos.length]
  // The photo a card cross-fades to: the set shown rotates as a whole (the
  // next four, or the next one with fewer than eight), so two cards don't
  // show the same photo at once; none when there is only one — a card never
  // fades to itself, which would leave it blank half of the time.
  const next = (i: number) => photos.length > 1 ? photos[(i + (photos.length >= 8 ? 4 : 1)) % photos.length] : undefined
  // With eight photos or more each card has two of its own, so the cards
  // can change well apart; with fewer they share the set, so they change
  // almost together (a longer offset would show the same photo twice).
  const stagger = photos.length >= 8 ? 1.75 : 0.15
  const best = campaign.maxDiscountPercent
  const chip = `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md backdrop-blur-sm ${dark ? 'bg-white/70 text-on-surface' : 'bg-white/10 text-white'}`

  return (
    <section
      className={`relative overflow-hidden rounded-2xl shadow-xl ${animated ? 'camp-bg' : ''} ${dark ? 'text-on-surface' : 'text-white'}`}
      style={{ '--camp': tint, ...(animated ? {} : { background: bgVisual ? '#111' : tint }) } as React.CSSProperties}
    >
      {bgVisual && (
        <div aria-hidden className="absolute inset-0">
          <CampaignMedia visual={hero!} />
          <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-r from-white/85 via-white/55 to-transparent' : 'bg-gradient-to-r from-black/75 via-black/45 to-transparent'}`} />
        </div>
      )}
      {animated && <AnimatedBackdrop />}

      <div className="relative z-10 grid grid-cols-1 items-center gap-6 p-5 md:p-8 lg:grid-cols-12 lg:gap-10 lg:p-10">
        <div className="flex flex-col items-start gap-3 lg:col-span-7 lg:gap-4">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-sm uppercase tracking-wider backdrop-blur-md ${dark ? 'bg-white/70 text-tertiary' : 'bg-white/10 text-white'}`}>
              <Icon name="verified" size={15} /> {HERO_BADGE[campaign.type]}
            </span>
            <span className={`text-label-md lg:hidden ${dark ? 'text-on-surface-variant' : 'text-white/85'}`}>{dateFr(campaign.startsAt)} – {dateFr(campaign.endsAt)}</span>
          </div>
          <h1 className="m-0 text-[32px] font-extrabold leading-[1.1] tracking-tight md:text-[44px] lg:text-[48px]">{campaign.name}</h1>
          {campaign.description && <p className={`m-0 line-clamp-4 max-w-xl text-body-md md:text-body-lg lg:line-clamp-none ${dark ? 'text-on-surface-variant' : 'text-white/85'}`}>{campaign.description}</p>}
          <div className={`hidden items-center gap-2 text-label-md lg:flex ${dark ? 'text-on-surface-variant' : 'text-white/85'}`}>
            <Icon name="calendar_month" size={18} className={dark ? 'text-tertiary' : 'text-white'} />
            Du {dateFr(campaign.startsAt)} au {dateFr(campaign.endsAt, true)}
          </div>
          <div className="w-full lg:w-auto">
            <p className={`m-0 mb-1.5 text-label-sm uppercase tracking-wider lg:hidden ${dark ? 'text-on-surface-variant' : 'text-white/70'}`}>Fin des offres dans</p>
            <HeroCountdown endsAt={campaign.endsAt} dark={dark} />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {campaign.listingsCount > 0 && <span className={chip}><Icon name="inventory_2" size={17} /> {campaign.listingsCount} article{campaign.listingsCount > 1 ? 's' : ''}</span>}
            {best ? <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md backdrop-blur-sm ${dark ? 'bg-primary/15 text-primary' : 'bg-primary/25 text-[#ffb4ab]'}`}><Icon name="trending_down" size={17} /> Jusqu’à -{best} %</span> : null}
            {campaign.sellersCount > 0 && <span className={chip}><Icon name="workspace_premium" size={17} /> {campaign.sellersCount} vendeur{campaign.sellersCount > 1 ? 's' : ''}</span>}
          </div>
        </div>

        {/* Right: the team's artwork, or the items' photos floating. */}
        {artVisual ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl lg:col-span-5">
            <CampaignMedia visual={hero!} />
          </div>
        ) : !bgVisual && photos.length > 0 && (
          <>
            {/* Desktop mosaic */}
            <div className="relative hidden min-h-[360px] items-center justify-center lg:col-span-5 lg:flex">
              <div className="relative aspect-square w-full max-w-[420px]">
                <PhotoCard a={photo(0)} b={next(0)} captions stagger={stagger} delay={0} tilt={-3} className="left-2 top-0 h-48 w-48" />
                <PhotoCard a={photo(1)} b={next(1)} captions stagger={stagger} delay={1} tilt={6} className="right-0 top-4 h-40 w-44" />
                <PhotoCard a={photo(2)} b={next(2)} captions stagger={stagger} delay={2} tilt={2} className="bottom-2 left-6 h-40 w-40" />
                <PhotoCard a={photo(3)} b={next(3)} captions stagger={stagger} delay={3} tilt={-6} className="bottom-0 right-4 h-44 w-44" />
                {best ? <span className="camp-pulse absolute -top-3 right-6 z-20 rounded-full bg-primary px-3 py-1.5 text-headline-sm font-extrabold text-white">-{best}%</span> : null}
              </div>
            </div>
            {/* Phone: a row of three */}
            <div className="relative -mt-1 grid h-28 grid-cols-3 gap-2 lg:hidden">
              {[0, 1, 2].map(i => (
                <div key={i} className="relative">
                  <PhotoCard a={photo(i)} b={next(i)} stagger={stagger} delay={i} tilt={0} className="inset-0" />
                </div>
              ))}
              {best ? <span className="camp-pulse absolute -bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-label-md font-extrabold text-white">-{best}%</span> : null}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
