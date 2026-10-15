import { rotationSeed } from '../../lib/rotationSeed'
import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../Icon'
import CampaignMedia from './CampaignMedia'
import { thumbnailUrl } from '../../lib/media'
import { endsInLabel, useCountdown } from '../../lib/useCountdown'
import { requestOpenCampaign, requestOpenLink } from '../../lib/navigation'
import { CAMPAIGN_HERO_BADGE, CAMPAIGN_TYPE_LABEL, LIVE_CAMPAIGNS_QUERY, isLive, type CampaignVisual, type LiveCampaign } from '../../graphql/campaigns'
import { upToLabel } from '../../lib/campaignDiscount'
import { LISTINGS_QUERY, type RemoteListing } from '../../graphql/listings'
import { plainText } from '../../lib/format'
import { useMarketCode, useMarketVars } from '../../lib/countries'
import { RailSkeleton } from '../Skeleton'

const DEFAULT_TINT = '#EB1100'
const tintOf = (c: LiveCampaign) => c.themeColor || DEFAULT_TINT
const photosOf = (c: LiveCampaign, n: number) =>
  [...new Set(c.listings.map(e => e.listing.coverImageUrl).filter((u): u is string => !!u))].slice(0, n).map(u => thumbnailUrl(u))
// A photo that doesn't load (removed upload) leaves no empty frame.
export const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none' }
const open = (c: LiveCampaign) => () => requestOpenCampaign(c.slug)

// "Fin dans 3j 08h" — minute precision, its own tiny ticking component.
export function EndsIn({ endsAt, className = '' }: { endsAt: string; className?: string }) {
  const c = useCountdown(endsAt, 60_000)
  return <span className={`inline-flex items-center gap-1 tabular-nums ${className}`}><Icon name="timer" size={14} /> {endsInLabel(c)}</span>
}

function TypeBadge({ c, inverse }: { c: LiveCampaign; inverse?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-label-sm font-extrabold uppercase tracking-wide ${inverse ? 'bg-white text-on-surface' : 'text-white'}`} style={inverse ? { color: tintOf(c) } : { background: tintOf(c) }}>
      {CAMPAIGN_TYPE_LABEL[c.type]}
    </span>
  )
}

function Thumbs({ c, size = 36 }: { c: LiveCampaign; size?: number }) {
  const ph = photosOf(c, 3)
  if (!ph.length) return null
  return (
    <span className="flex -space-x-2">
      {ph.map(u => <img key={u} src={u} alt="" loading="lazy" onError={hideBroken} className="rounded-full border-2 border-solid border-surface-lowest object-cover" style={{ width: size, height: size }} />)}
    </span>
  )
}

// A campaign's picture: the team's visual for this placement when there
// is one, else a mosaic of its items' photos.
function Visual({ c, visual, cols = 4 }: { c: LiveCampaign; visual?: CampaignVisual; cols?: number }) {
  if (visual) return <CampaignMedia visual={visual} />
  const ph = photosOf(c, cols)
  if (!ph.length) return <div className="camp-bg h-full w-full" style={{ '--camp': tintOf(c) } as React.CSSProperties} />
  return (
    <div className="grid h-full w-full gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(cols, ph.length)}, minmax(0, 1fr))` }}>
      {ph.map(u => <img key={u} src={u} alt="" loading="lazy" decoding="async" onError={hideBroken} className="h-full w-full rounded-xl object-cover" />)}
    </div>
  )
}

// The CTA's words: what a tap opens.
const ctaLabel = (c: LiveCampaign) =>
  c.listingsCount > 1 ? `Voir les ${c.listingsCount.toLocaleString('fr-FR')} offres` : c.listingsCount === 1 ? 'Voir l’offre' : 'Découvrir la campagne'

// The campaign's picture in a card: the team's « Carte » visual (else its
// banner) shown whole — never cropped, so the text drawn in it stays
// readable — on the campaign's colour; else a mosaic of its items' photos.
// CampaignMedia picks the mobile variant on phones.
function CardVisual({ c, cols = 4 }: { c: LiveCampaign; cols?: number }) {
  const v = c.visuals?.homeCard ?? c.visuals?.banner
  if (v) return <CampaignMedia visual={v} fit="contain" />
  return <div className="h-full w-full p-3"><Visual c={c} cols={cols} /></div>
}

// The best discount, when something really comes off (no « -0 % »).
function UpTo({ c }: { c: LiveCampaign }) {
  const label = upToLabel(c)
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-md font-extrabold" style={{ background: `color-mix(in oklab, ${tintOf(c)} 12%, var(--bg-card))`, color: tintOf(c) }}>
      <Icon name="trending_down" size={16} /> {label}
    </span>
  )
}

// A campaign that is not in the home hero, as one card: kicker, title,
// best discount and time left, one CTA; its visual beside (desktop) or
// above (phones), whole.
export function CampaignFeatured({ c, desktop }: { c: LiveCampaign; desktop: boolean }) {
  const tint = tintOf(c)
  const kicker = c.homeHeroTagline || CAMPAIGN_HERO_BADGE[c.type]
  const text = (
    <div className={`flex min-w-0 flex-col items-start ${desktop ? 'gap-3 p-8' : 'gap-2.5 p-4'}`}>
      <span className="text-label-sm font-extrabold uppercase tracking-wider" style={{ color: tint }}>{kicker}</span>
      <h3 className={`m-0 font-extrabold leading-tight text-on-surface ${desktop ? 'text-headline-lg' : 'text-headline-sm'}`}>{c.name.trim()}</h3>
      {c.description && <p className="m-0 line-clamp-2 text-body-sm text-on-surface-variant">{plainText(c.description)}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <UpTo c={c} />
        <EndsIn endsAt={c.endsAt} className="rounded-full bg-surface-container-low px-3 py-1 text-label-md text-on-surface-variant" />
      </div>
      <button type="button" onClick={e => { e.stopPropagation(); requestOpenCampaign(c.slug) }} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-5 py-3 text-label-lg font-bold text-white shadow-sm ${desktop ? 'mt-2' : 'mt-1 w-full'}`} style={{ background: tint }}>
        {ctaLabel(c)} <Icon name="arrow_forward" size={18} />
      </button>
    </div>
  )
  if (desktop) return (
    <article onClick={open(c)} className="grid cursor-pointer grid-cols-12 overflow-hidden rounded-2xl bg-surface-lowest shadow-sm transition-shadow hover:shadow-card-hover">
      <div className="col-span-5 flex items-center">{text}</div>
      <div className="relative col-span-7 min-h-[300px]" style={{ background: tint }}>
        <div className="absolute inset-0"><CardVisual c={c} /></div>
      </div>
    </article>
  )
  return (
    <article onClick={open(c)} className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
      <div className="relative aspect-[3/2] w-full shrink-0" style={{ background: tint }}><div className="absolute inset-0"><CardVisual c={c} cols={3} /></div></div>
      {text}
    </article>
  )
}

// Other campaigns next to the featured one (home), and « Autres campagnes
// en cours » (campaign page).
export function CampaignCompact({ c }: { c: LiveCampaign }) {
  const label = upToLabel(c)
  const count = c.listingsCount ? `${c.listingsCount} article${c.listingsCount > 1 ? 's' : ''}` : ''
  return (
    <article onClick={open(c)} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm transition-shadow hover:shadow-card-hover">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2"><TypeBadge c={c} /><EndsIn endsAt={c.endsAt} className="text-label-sm text-on-surface-variant" /></div>
        <h3 className="m-0 truncate text-label-lg font-bold text-on-surface">{c.name.trim()}</h3>
        {(label || count) && <p className="m-0 text-body-sm text-on-surface-variant">{label && <b className="text-primary">{label}</b>}{label && count ? ' · ' : ''}{count}</p>}
        <span className="mt-1 inline-flex items-center gap-1 text-label-md text-primary">Voir l’offre <Icon name="arrow_forward" size={15} /></span>
      </div>
      <Thumbs c={c} />
    </article>
  )
}

// The team's banner on the campaign page, linking where they chose: at its
// own ratio (capped in height, on the campaign's colour), never cropped.
export function CampaignBanner({ c }: { c: LiveCampaign }) {
  const b = c.visuals?.banner
  if (!b) return null
  const go = () => {
    if (!b.link) return requestOpenCampaign(c.slug)
    if (b.link.startsWith('#')) return document.getElementById(b.link.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    requestOpenLink(b.link)
  }
  // A Lottie has no size of its own: it gets a box.
  const boxed = b.kind === 'lottie' || b.mobileKind === 'lottie'
  return (
    <button type="button" onClick={go} aria-label={b.alt || c.name} className={`block w-full cursor-pointer overflow-hidden rounded-2xl border-none p-0 ${boxed ? 'aspect-[3/1]' : ''}`} style={{ background: tintOf(c) }}>
      <CampaignMedia visual={b} fit="contain" className={boxed ? 'h-full w-full' : 'mx-auto block h-auto max-h-[420px] w-full object-contain'} />
    </button>
  )
}

function useLiveCampaigns() {
  const { data } = useQuery<{ activeCampaigns: LiveCampaign[] }>(LIVE_CAMPAIGNS_QUERY, { variables: useMarketVars(), fetchPolicy: 'cache-and-network' })
  return (data?.activeCampaigns ?? []).filter(isLive)
}

// Whether the home's « Promotions en cours » knows what it shows (same
// query, shared cache): the home lays out the sections below it only then,
// so they never jump when it appears.
export function useLiveCampaignsSettled() {
  const { data, previousData, error } = useQuery<{ activeCampaigns: LiveCampaign[] }>(LIVE_CAMPAIGNS_QUERY, { variables: useMarketVars(), fetchPolicy: 'cache-and-network' })
  return !!(data ?? previousData) || !!error
}

// Best deals of a campaign (« Les meilleures affaires · … »); BO
// « Visibilité » › « Bande Les meilleures affaires sur l'accueil ».
function DealsRail({ c, desktop, renderCard }: { c: LiveCampaign; desktop: boolean; renderCard: (l: RemoteListing) => React.ReactNode }) {
  // Only the visitor's country (a campaign may run in several).
  const marketCode = useMarketCode()
  const { data } = useQuery<{ listings: { items: RemoteListing[] } }>(LISTINGS_QUERY, {
    variables: { filter: { campaignId: c.id, ...(marketCode ? { countryCode: marketCode } : {}) }, sort: 'DISCOUNT_DESC', page: 1, pageSize: 10, rotationSeed: rotationSeed() },
  })
  const items = data?.listings.items ?? []
  // Its room while it loads (the sections below don't jump when it lands).
  if (!data) return <RailSkeleton width={200} />
  if (!items.length) return null
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 flex items-center gap-1.5 text-label-sm font-bold uppercase tracking-wider" style={{ color: tintOf(c) }}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tintOf(c) }} /> Les meilleures affaires
          </p>
          <h3 className={`m-0 mt-1 truncate text-on-surface ${desktop ? 'text-headline-lg' : 'text-headline-sm font-bold'}`}>{c.name.trim()}</h3>
        </div>
        <button onClick={open(c)} className="flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-lg font-semibold text-primary hover:underline">Tout voir <Icon name="chevron_right" size={18} /></button>
      </div>
      {desktop
        // The same grid as the home's other rails (« Pépites à la Une »).
        ? <div className="grid grid-cols-4 items-start gap-6">{items.slice(0, 4).map(l => <div key={l.id} className="min-w-0">{renderCard(l)}</div>)}</div>
        : <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">{items.map(l => <div key={l.id} className="w-[46%] shrink-0 snap-start">{renderCard(l)}</div>)}</div>}
    </section>
  )
}

// Home « Promotions en cours ». It never repeats what the hero shows:
// - campaigns in the hero (`heroIds`): only the first one's best-deals
//   rail (BO order), then the OTHER live campaigns;
// - no campaign hero: one card per campaign (the first featured, the
//   others under it), then the first one's rail.
// Nothing at all when there is nothing new to show.
export function HomePromotions({ desktop, renderCard, heroIds }: { desktop: boolean; renderCard: (l: RemoteListing) => React.ReactNode; heroIds: string[] }) {
  const campaigns = useLiveCampaigns().filter(c => c.featuredOnHome !== false)
  const [active, setActive] = useState(0)
  const inHero = campaigns.filter(c => heroIds.includes(c.id))
  const rest = campaigns.filter(c => !heroIds.includes(c.id))
  // Phones: the rail follows the card on screen.
  const railOf = inHero[0] ?? rest[desktop ? 0 : Math.min(active, rest.length - 1)]
  const rail = railOf && railOf.homeDealsRail !== false ? railOf : null
  if (!rest.length && !rail) return null
  const railEl = rail && <DealsRail key={rail.id} c={rail} desktop={desktop} renderCard={renderCard} />

  const heading = (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="m-0 text-label-sm font-bold uppercase tracking-wider text-primary">Offres limitées</p>
        <h2 className={`m-0 text-on-surface ${desktop ? 'mt-1 text-headline-lg' : 'text-headline-sm font-bold'}`}>{inHero.length ? 'Autres promotions en cours' : 'Promotions en cours'}</h2>
      </div>
      {rest.length > 1 && <span className="shrink-0 whitespace-nowrap text-label-md text-on-surface-variant">{rest.length} campagnes</span>}
    </div>
  )

  if (desktop) {
    const [main, ...others] = rest
    return (
      <section className="mt-10 flex flex-col gap-10">
        {inHero.length > 0 && railEl}
        {main && (
          <div>
            {heading}
            <CampaignFeatured c={main} desktop />
            {/* As many columns as cards (up to 3): the row always fills the width. */}
            {others.length > 0 && <div className="mt-6 grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(3, others.length)}, minmax(0, 1fr))` }}>{others.slice(0, 3).map(c => <CampaignCompact key={c.id} c={c} />)}</div>}
          </div>
        )}
        {!inHero.length && railEl}
      </section>
    )
  }

  return (
    <section className="mb-8 flex flex-col gap-6">
      {inHero.length > 0 && railEl}
      {rest.length > 0 && (
        <div>
          {heading}
          {rest.length === 1 ? <CampaignFeatured c={rest[0]} desktop={false} /> : (
            <>
              <div
                onScroll={e => { const el = e.currentTarget; const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth * 0.88)); if (i !== active) setActive(i) }}
                className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none]"
              >
                {rest.map(c => <div key={c.id} className="w-[88%] shrink-0 snap-center"><CampaignFeatured c={c} desktop={false} /></div>)}
              </div>
              <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
                {rest.map((c, i) => <span key={c.id} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-primary' : 'w-1.5 bg-outline-variant'}`} />)}
              </div>
            </>
          )}
        </div>
      )}
      {!inHero.length && railEl}
    </section>
  )
}
