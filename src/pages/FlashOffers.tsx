import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { Heart, MessageSquare, Tag, Timer, Handshake, Percent, ShieldCheck, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, Eye } from '../components/icons'
import Icon, { CategoryIcon } from '../components/Icon'
import Price from '../components/Price'
import { ACTIVE_CAMPAIGN_QUERY, type ActiveCampaign, type ActiveCampaignListing } from '../graphql/content'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'

type FlashOffersProps = {
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onContactSeller?: (sellerId: string, listingId?: string) => void
  isLoggedIn?: boolean
}

function useCountdown(endsAt?: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [endsAt])
  if (!endsAt) return null
  const ms = Math.max(0, new Date(endsAt).getTime() - now)
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
    ended: ms <= 0,
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

function salePrice(entry: ActiveCampaignListing): number | null {
  const { price } = entry.listing
  if (price == null) return null
  if (entry.salePrice != null) return entry.salePrice
  if (entry.discountPercent != null) return Math.round(price * (1 - entry.discountPercent / 100))
  return null
}
function discountOf(entry: ActiveCampaignListing): number {
  if (entry.discountPercent != null) return entry.discountPercent
  const sale = salePrice(entry)
  return sale != null && entry.listing.price ? Math.round((1 - sale / entry.listing.price) * 100) : 0
}
const imageOf = (e: ActiveCampaignListing) => e.listing.coverImageUrl ?? e.listing.media[0]?.url ?? ''

// "Campagnes & Black Friday" mockup — everything is driven by the live
// campaign (name, colour, window, discounted listings) authored in the BO.
export default function FlashOffers({ onNavigate, onSelectListing, favorites, onToggleFavorite, onContactSeller, isLoggedIn }: FlashOffersProps) {
  const { data, loading } = useQuery<{ activeCampaign: ActiveCampaign | null }>(ACTIVE_CAMPAIGN_QUERY)
  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const campaign = data?.activeCampaign
  const countdown = useCountdown(campaign?.endsAt)
  const entries = campaign?.listings ?? []
  const color = campaign?.themeColor || 'var(--primary)'
  const [cat, setCat] = useState<string | null>(null)
  const [railStart, setRailStart] = useState(0)

  const groups = useMemo(() => {
    const m = new Map<string, { slug: string, name: string, entries: ActiveCampaignListing[] }>()
    entries.forEach(e => {
      const g = m.get(e.listing.category.slug) ?? { slug: e.listing.category.slug, name: e.listing.category.name, entries: [] }
      g.entries.push(e); m.set(g.slug, g)
    })
    return [...m.values()].sort((a, b) => b.entries.length - a.entries.length)
  }, [entries])
  const bestDiscount = Math.max(0, ...entries.map(discountOf))
  const flash = entries.filter(e => !cat || e.listing.category.slug === cat).sort((a, b) => discountOf(b) - discountOf(a))
  const latest = [...entries].sort((a, b) => new Date(b.listing.publishedAt ?? b.listing.createdAt).getTime() - new Date(a.listing.publishedAt ?? a.listing.createdAt).getTime())
  const iconFor = (slug: string) => categoriesData?.categories.find(c => c.slug === slug)?.icon ?? 'category'
  const contact = (e: ActiveCampaignListing) => () =>
    isLoggedIn && onContactSeller ? onContactSeller(e.listing.seller.id, e.listing.id) : onSelectListing(e.listing.id)
  const endsIn = countdown ? `${countdown.days ? `${countdown.days}j ` : ''}${pad(countdown.hours)}h ${pad(countdown.minutes)}m` : ''

  if (loading) return <p className="p-12 text-center text-on-surface-variant">Chargement…</p>

  if (!campaign) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed text-primary"><Icon name="local_fire_department" size={32} /></span>
        <h1 className="m-0 text-headline-lg text-on-surface">Pas de campagne en cours</h1>
        <p className="m-0 mt-2 text-body-md text-on-surface-variant">Les prochaines ventes flash et braderies arrivent bientôt. En attendant, découvrez les dernières pépites.</p>
        <button onClick={() => onNavigate('search')} className="mt-6 cursor-pointer rounded-lg border-none bg-primary px-6 py-3 text-label-lg text-white">Explorer le catalogue</button>
      </div>
    )
  }

  return (
    <div className="pb-4">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1c1b1b] via-[#2b2626] to-[#1c1b1b] px-4 py-12 text-center text-white md:py-16">
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: color }} />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm uppercase" style={{ background: color }}><Icon name="bolt" size={14} /> Événement exclusif marketplace</span>
          <h1 className="m-0 mt-4 text-[34px] font-extrabold uppercase leading-tight tracking-tight md:text-display">{campaign.name}</h1>
          <p className="m-0 mx-auto mt-3 max-w-xl text-body-lg text-white/85">
            {bestDiscount > 0 && <>Jusqu'à <b className="text-emerald-300 underline">-{bestDiscount}%</b> sur la seconde main. </>}
            {campaign.description || 'Des articles uniques à prix cassés, prêts pour une remise en main propre immédiate.'}
          </p>
          {countdown && !countdown.ended && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {[['Jours', countdown.days], ['Heures', countdown.hours], ['Minutes', countdown.minutes], ['Secondes', countdown.seconds]].map(([label, v], i) => (
                <div key={label as string} className="flex items-center gap-2">
                  {i > 0 && <span className="text-headline-md text-white/50">:</span>}
                  <div className="w-16 rounded-xl bg-white/10 py-2 backdrop-blur-sm md:w-20">
                    <div className={`text-headline-lg font-extrabold tabular-nums md:text-[40px] ${i === 3 ? 'text-primary-container' : ''}`}>{pad(v as number)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/60">{label as string}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {groups.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button onClick={() => setCat(null)} className={`cursor-pointer rounded-lg border-none px-3 py-1.5 text-label-md ${cat === null ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>Tout {campaign.name}</button>
              {groups.map(g => (
                <button key={g.slug} onClick={() => setCat(g.slug)} className={`cursor-pointer rounded-lg border-none px-3 py-1.5 text-label-md ${cat === g.slug ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>{g.name}</button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12">
        {/* Reassurance */}
        <section className="-mt-6 grid gap-3 md:grid-cols-3">
          {[
            { icon: <Percent size={19} />, box: 'bg-tertiary-soft text-tertiary', title: '0% frais marketplace', text: 'Zéro commission, même en période de rabais extrêmes.' },
            { icon: <MessageSquare size={19} />, box: 'bg-primary-fixed text-primary', title: 'Négociation en direct', text: 'Proposez une offre instantanée au vendeur par messagerie.' },
            { icon: <ShieldCheck size={19} />, box: 'bg-tertiary-soft text-tertiary', title: 'Prix barré réel', text: 'Le prix d’origine de l’annonce est affiché à côté du prix promo.' },
          ].map(t => (
            <div key={t.title} className="relative flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-lowest p-4 shadow-sm">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.box}`}>{t.icon}</span>
              <div><div className="text-label-lg text-on-surface">{t.title}</div><div className="text-body-sm text-on-surface-variant">{t.text}</div></div>
            </div>
          ))}
        </section>

        {/* Flash grid */}
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-1 text-label-sm uppercase text-primary"><Timer size={14} /> Chrono expiration imminente</div>
              <h2 className="m-0 mt-1 text-headline-md text-on-surface md:text-headline-lg">Ventes Flash &amp; Pépites Uniques</h2>
            </div>
            <span className="flex items-center gap-1.5 text-body-sm text-on-surface-variant"><span className="h-2 w-2 rounded-full bg-primary" /> {entries.length} article{entries.length > 1 ? 's' : ''} à prix cassé</span>
          </div>
          <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {flash.map(e => {
              const sale = salePrice(e)
              const d = discountOf(e)
              const fav = favorites.includes(e.listing.id)
              return (
                <div key={e.id} onClick={() => onSelectListing(e.listing.id)} className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                  <div className="relative aspect-square bg-surface-container-low">
                    {imageOf(e) ? <img src={imageOf(e)} alt={e.listing.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-outline"><Tag size={36} /></div>}
                    {d > 0 && <span className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-label-sm uppercase text-white" style={{ background: color }}>-{d}% Flash</span>}
                    <button onClick={ev => { ev.stopPropagation(); onToggleFavorite(e.listing.id) }} className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest/95 shadow-sm" aria-label="Favori">
                      <Heart size={17} fill={fav ? 'var(--primary)' : 'none'} color={fav ? 'var(--primary)' : 'var(--fg)'} />
                    </button>
                    {endsIn && (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-2 py-1 text-[11px] text-white">
                        <span className="flex items-center gap-1"><Timer size={12} className="text-primary-container" /> Fin dans {endsIn}</span>
                        <span>Pièce unique</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-on-surface-variant">
                      <span className="truncate">{e.listing.brand || e.listing.category.name}</span>
                      {e.listing.condition && e.listing.condition !== 'N/A' && <span className="flex shrink-0 items-center gap-0.5"><CheckCircle2 size={12} className="text-tertiary" /> {e.listing.condition}</span>}
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-label-lg text-on-surface">{e.listing.title}</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-headline-sm font-extrabold text-primary"><Price amount={sale ?? e.listing.price} currency={e.listing.currency} /></span>
                      {sale != null && <span className="text-body-sm text-outline line-through"><Price amount={e.listing.price} currency={e.listing.currency} /></span>}
                    </div>
                    {d > 0 && <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full" style={{ width: `${Math.min(100, d)}%`, background: color }} /></div>}
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-tertiary"><Handshake size={13} /> Remise en main propre gratuite</div>
                    <button onClick={ev => { ev.stopPropagation(); contact(e)() }} className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-surface-container-low py-2 text-label-md text-on-surface hover:bg-primary hover:text-white">
                      <MessageSquare size={15} /> Discuter avec le vendeur
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Thematic selections */}
        {groups.length > 0 && (
          <section className="mt-12">
            <div className="text-label-sm uppercase text-primary">Rayons ciblés</div>
            <h2 className="m-0 mb-4 mt-1 text-headline-md text-on-surface md:text-headline-lg">Les sélections thématiques de la campagne</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {groups.slice(0, 3).map((g, i) => {
                const min = Math.min(...g.entries.map(e => salePrice(e) ?? e.listing.price ?? Infinity))
                const best = Math.max(...g.entries.map(discountOf))
                const pics = g.entries.filter(imageOf).slice(0, 2)
                return (
                  <div key={g.slug} className={`flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-lowest p-5 ${i === 2 ? 'md:col-span-2 md:flex-row md:items-center' : ''}`}>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex items-center gap-1.5 rounded bg-surface-container px-2 py-0.5 text-label-sm uppercase text-on-surface"><CategoryIcon icon={iconFor(g.slug)} size={14} /> {g.name}</span>
                        {best > 0 && <span className="rounded-lg bg-primary-fixed px-2 py-1 text-center text-label-md text-primary">-{best}%<span className="block text-[10px] font-normal">sur {g.entries.length} article{g.entries.length > 1 ? 's' : ''}</span></span>}
                      </div>
                      <h3 className="m-0 mt-2 text-headline-sm text-on-surface">Sélection {g.name}</h3>
                      <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{g.entries.length} pièce{g.entries.length > 1 ? 's' : ''} à prix réduit, en remise directe entre particuliers.</p>
                      {Number.isFinite(min) && <div className="mt-3 text-headline-sm font-extrabold text-primary">Dès <Price amount={min} /></div>}
                      <button onClick={() => setCat(g.slug)} className="mt-3 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary hover:underline">Explorer {g.name} <ArrowRight size={15} /></button>
                    </div>
                    {pics.length > 0 && (
                      <div className={`grid gap-2 ${pics.length > 1 ? 'grid-cols-2' : 'max-w-[220px] grid-cols-1'} ${i === 2 ? 'md:w-80' : ''}`}>
                        {pics.map(e => (
                          <button key={e.id} onClick={() => onSelectListing(e.listing.id)} className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border-none bg-surface-container p-0">
                            <img src={imageOf(e)} alt="" className="h-full w-full object-cover" />
                            <span className="absolute bottom-1.5 left-1.5 rounded bg-surface-lowest/95 px-1.5 text-[10px] font-semibold text-on-surface"><Price amount={salePrice(e) ?? e.listing.price} /></span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Latest validated */}
        {latest.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-label-sm uppercase text-primary">Fraîchement ajoutées</div>
                <h2 className="m-0 mt-1 text-headline-md text-on-surface md:text-headline-lg">Dernières offres validées par l'équipe</h2>
              </div>
              <div className="hidden gap-2 md:flex">
                <button disabled={railStart === 0} onClick={() => setRailStart(s => Math.max(0, s - 6))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-outline-variant bg-surface-lowest disabled:opacity-40"><ChevronLeft size={18} /></button>
                <button disabled={railStart + 6 >= latest.length} onClick={() => setRailStart(s => s + 6)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-outline-variant bg-surface-lowest disabled:opacity-40"><ChevronRight size={18} /></button>
              </div>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0">
              {latest.slice(railStart, railStart + 6).map(e => (
                <button key={e.id} onClick={() => onSelectListing(e.listing.id)} className="w-36 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-outline-variant bg-surface-lowest p-0 text-left md:w-auto">
                  <div className="relative aspect-square bg-surface-container-low">
                    {imageOf(e) && <img src={imageOf(e)} alt="" className="h-full w-full object-cover" />}
                    {discountOf(e) > 0 && <span className="absolute left-1.5 top-1.5 rounded px-1.5 text-[10px] font-bold text-white" style={{ background: color }}>-{discountOf(e)}%</span>}
                  </div>
                  <div className="p-2">
                    <div className="truncate text-body-sm text-on-surface">{e.listing.title}</div>
                    <div className="text-label-md font-extrabold text-primary"><Price amount={salePrice(e) ?? e.listing.price} currency={e.listing.currency} /></div>
                    {salePrice(e) != null && <div className="text-[11px] text-outline line-through"><Price amount={e.listing.price} currency={e.listing.currency} /></div>}
                    <span className="mt-1 flex items-center justify-center gap-1 rounded-md bg-surface-container-low py-1 text-[11px] text-on-surface"><Eye size={12} /> Voir</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Seller CTA */}
        <section className="relative mt-12 overflow-hidden rounded-3xl p-6 text-white md:p-10" style={{ background: color }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-label-sm uppercase"><Icon name="trending_up" size={14} /> Trafic record {campaign.name}</span>
              <h2 className="m-0 mt-3 text-headline-lg text-white md:text-[36px] md:leading-[44px]">Vos placards regorgent de pépites ? Vendez-les aujourd'hui !</h2>
              <p className="m-0 mt-2 text-body-md text-white/90">Profitez du pic d'acheteurs : déposez votre annonce gratuitement en moins de 2 minutes, fixez votre prix et gardez 100% de vos gains.</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-white/90">
                <span className="flex items-center gap-1"><CheckCircle2 size={14} /> 0 F de frais de mise en vente</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={14} /> Paiement en direct sans intermédiaire</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button onClick={() => onNavigate('seller-post')} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-inverse-surface px-5 py-3 text-label-lg text-white hover:opacity-90"><Icon name="add_photo_alternate" size={19} /> Vendre pour {campaign.name}</button>
              <button onClick={() => onNavigate('seller-premium')} className="cursor-pointer rounded-lg border-none bg-white/15 px-5 py-2.5 text-label-md text-white hover:bg-white/25">Booster mes annonces</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
