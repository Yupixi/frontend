import { useRef, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../Icon'
import CampaignMedia from './CampaignMedia'
import { thumbnailUrl } from '../../lib/media'
import { endsInLabel, useCountdown } from '../../lib/useCountdown'
import { requestOpenCampaign, requestOpenLink } from '../../lib/navigation'
import { CAMPAIGN_TYPE_LABEL, LIVE_CAMPAIGNS_QUERY, isLive, type CampaignVisual, type LiveCampaign } from '../../graphql/campaigns'
import { LISTINGS_QUERY, type RemoteListing } from '../../graphql/listings'
import { plainText } from '../../lib/format'
import { useMarketVars } from '../../lib/countries'

const DEFAULT_TINT = '#EB1100'
const tintOf = (c: LiveCampaign) => c.themeColor || DEFAULT_TINT
const photosOf = (c: LiveCampaign, n: number) =>
  [...new Set(c.listings.map(e => e.listing.coverImageUrl).filter((u): u is string => !!u))].slice(0, n).map(u => thumbnailUrl(u))
// A photo that doesn't load (removed upload) leaves no empty frame.
export const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none' }
const open = (c: LiveCampaign) => () => requestOpenCampaign(c.slug)
const bestLabel = (c: LiveCampaign) => (c.maxDiscountPercent ? `Jusqu’à -${c.maxDiscountPercent} %` : 'Prix doux')

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

// Desktop home: the main live campaign.
export function CampaignFeatured({ c }: { c: LiveCampaign }) {
  const card = c.visuals?.homeCard
  return (
    <article onClick={open(c)} className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface-lowest shadow-sm transition-shadow hover:shadow-card-hover" style={{ '--camp': tintOf(c) } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-3 p-6 pb-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><TypeBadge c={c} /><span className="rounded-full px-2.5 py-0.5 text-label-sm font-bold text-primary" style={{ background: `color-mix(in oklab, ${tintOf(c)} 12%, white)` }}>{bestLabel(c)}</span></div>
          <h3 className="m-0 text-headline-lg font-extrabold leading-tight text-on-surface">{c.name}</h3>
          {c.description && <p className="m-0 mt-1 line-clamp-2 text-body-sm text-on-surface-variant">{plainText(c.description)}</p>}
        </div>
        <EndsIn endsAt={c.endsAt} className="shrink-0 rounded-full bg-surface-container-low px-3 py-1 text-label-sm text-on-surface-variant" />
      </div>
      <div className="relative mx-6 aspect-[16/7] max-h-[300px] overflow-hidden rounded-xl">
        <Visual c={c} visual={card} />
      </div>
      <div className="mt-auto p-6 pt-4">
        <button onClick={open(c)} className="flex cursor-pointer items-center gap-2 rounded-xl border-none px-5 py-3 text-label-lg font-bold text-white shadow-sm" style={{ background: tintOf(c) }}>
          Explorer la sélection{c.listingsCount ? ` (${c.listingsCount})` : ''} <Icon name="arrow_forward" size={18} />
        </button>
      </div>
    </article>
  )
}

// Desktop home side column, and "Autres campagnes en cours".
export function CampaignCompact({ c }: { c: LiveCampaign }) {
  return (
    <article onClick={open(c)} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm transition-shadow hover:shadow-card-hover">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2"><TypeBadge c={c} /><EndsIn endsAt={c.endsAt} className="text-label-sm text-on-surface-variant" /></div>
        <h3 className="m-0 truncate text-label-lg font-bold text-on-surface">{c.name}</h3>
        <p className="m-0 text-body-sm text-on-surface-variant"><b className="text-primary">{bestLabel(c)}</b>{c.listingsCount ? ` · ${c.listingsCount} articles` : ''}</p>
        <span className="mt-1 inline-flex items-center gap-1 text-label-md text-primary">Voir l’offre <Icon name="arrow_forward" size={15} /></span>
      </div>
      <Thumbs c={c} />
    </article>
  )
}

// Phone home carousel.
export function CampaignSlide({ c }: { c: LiveCampaign }) {
  const card = c.visuals?.homeCard
  return (
    <article onClick={open(c)} className="relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl p-4 shadow-sm" style={{ background: `color-mix(in oklab, ${tintOf(c)} 9%, var(--bg-card))` }}>
      <div className="mb-2 flex items-center justify-between gap-2"><TypeBadge c={c} /><EndsIn endsAt={c.endsAt} className="rounded-full bg-surface-lowest/80 px-2 py-0.5 text-label-sm text-on-surface-variant" /></div>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-headline-sm font-extrabold leading-tight text-on-surface">{c.name}</h3>
          {c.description && <p className="m-0 mt-1 line-clamp-2 text-body-sm text-on-surface-variant">{plainText(c.description)}</p>}
        </div>
        {!card && <Thumbs c={c} size={40} />}
      </div>
      {card && <div className="mt-3 aspect-[16/7] overflow-hidden rounded-xl"><CampaignMedia visual={card} /></div>}
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span className="min-w-0 text-label-md text-on-surface-variant">Remises <b className="block whitespace-nowrap text-label-lg font-extrabold text-primary min-[380px]:text-headline-sm">{c.maxDiscountPercent ? `Jusqu’à -${c.maxDiscountPercent} %` : 'Prix doux'}</b></span>
        <span className="flex shrink-0 items-center gap-1 rounded-xl px-3.5 py-2.5 text-label-md font-bold text-white" style={{ background: tintOf(c) }}>Voir les offres <Icon name="arrow_forward" size={16} /></span>
      </div>
    </article>
  )
}

// The team's wide banner (page and home), linking where they chose.
export function CampaignBanner({ c }: { c: LiveCampaign }) {
  const b = c.visuals?.banner
  if (!b) return null
  const go = () => {
    if (!b.link) return requestOpenCampaign(c.slug)
    if (b.link.startsWith('#')) return document.getElementById(b.link.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    requestOpenLink(b.link)
  }
  return (
    <button type="button" onClick={go} aria-label={b.alt || c.name} className="block aspect-[39/20] w-full cursor-pointer overflow-hidden rounded-2xl border-none bg-surface-container p-0 md:aspect-[9/2]">
      <CampaignMedia visual={b} />
    </button>
  )
}

function useLiveCampaigns() {
  const { data } = useQuery<{ activeCampaigns: LiveCampaign[] }>(LIVE_CAMPAIGNS_QUERY, { variables: useMarketVars(), fetchPolicy: 'cache-and-network' })
  return (data?.activeCampaigns ?? []).filter(isLive)
}

// Best deals of the main campaign ("Les pépites de la …").
function DealsRail({ c, renderCard }: { c: LiveCampaign; renderCard: (l: RemoteListing) => React.ReactNode }) {
  const { data } = useQuery<{ listings: { items: RemoteListing[] } }>(LISTINGS_QUERY, {
    variables: { filter: { campaignId: c.id }, sort: 'DISCOUNT_DESC', page: 1, pageSize: 10 },
  })
  const items = data?.listings.items ?? []
  if (!items.length) return null
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="m-0 flex items-center gap-2 text-headline-sm font-bold text-on-surface md:text-headline-md"><span className="h-2.5 w-2.5 rounded-full" style={{ background: tintOf(c) }} /> Les meilleures affaires · {c.name}</h2>
        <button onClick={open(c)} className="flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary">Tout voir <Icon name="chevron_right" size={18} /></button>
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
        {items.slice(0, 10).map((l, i) => <div key={l.id} className={`w-[46%] shrink-0 snap-start md:w-auto ${i >= 5 ? 'md:hidden' : ''}`}>{renderCard(l)}</div>)}
      </div>
    </section>
  )
}

// Home « Promotions en cours »: phone carousel / desktop featured card +
// the others, then the main campaign's best deals and its banner.
export function HomePromotions({ desktop, renderCard }: { desktop: boolean; renderCard: (l: RemoteListing) => React.ReactNode }) {
  const campaigns = useLiveCampaigns().filter(c => c.featuredOnHome !== false)
  const [active, setActive] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  if (!campaigns.length) return null
  const [main, ...others] = campaigns
  const heading = (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="m-0 text-label-sm font-bold uppercase tracking-wider text-primary">Offres limitées</p>
        <h2 className="m-0 text-headline-md font-bold text-on-surface md:text-headline-lg">Promotions en cours</h2>
      </div>
      {campaigns.length > 1 && <span className="text-label-md text-on-surface-variant">{campaigns.length} campagnes</span>}
    </div>
  )

  if (desktop) return (
    <section className="mt-12">
      {heading}
      <div className={`grid gap-6 ${others.length ? 'grid-cols-12' : ''}`}>
        <div className={others.length ? 'col-span-8' : ''}><CampaignFeatured c={main} /></div>
        {others.length > 0 && <div className="col-span-4 flex flex-col gap-4">{others.slice(0, 3).map(c => <CampaignCompact key={c.id} c={c} />)}</div>}
      </div>
      {main.visuals?.banner && <div className="mt-6"><CampaignBanner c={main} /></div>}
      <DealsRail c={main} renderCard={renderCard} />
    </section>
  )

  return (
    <section className="mb-8">
      {heading}
      <div
        ref={track}
        onScroll={e => { const el = e.currentTarget; setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth * 0.88))) }}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 [scrollbar-width:none]"
      >
        {campaigns.map(c => <div key={c.id} className="w-[88%] shrink-0 snap-center">{<CampaignSlide c={c} />}</div>)}
      </div>
      {campaigns.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
          {campaigns.map((c, i) => <span key={c.id} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-primary' : 'w-1.5 bg-outline-variant'}`} />)}
        </div>
      )}
      {campaigns[active]?.visuals?.banner && <div className="mt-4"><CampaignBanner c={campaigns[active]} /></div>}
      <DealsRail c={campaigns[Math.min(active, campaigns.length - 1)]} renderCard={renderCard} />
    </section>
  )
}
