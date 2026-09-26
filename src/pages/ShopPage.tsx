import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import Select from '../components/Select'
import ConfirmSheet from '../components/ConfirmSheet'
import { ListingCard } from '../components/ListingCard'
import { LISTINGS_QUERY, type ListingSort, type RemoteListing } from '../graphql/listings'
import { FOLLOW_SELLER_MUTATION, SELLER_REVIEWS_QUERY, UNFOLLOW_SELLER_MUTATION, formatResponseTime, type RemoteReview } from '../graphql/reviews'
import { CREATE_REPORT_MUTATION } from '../graphql/reports'
import { DAYS, SHOP_QUERY, TRACK_SHOP_VISIT_MUTATION, openNow, shopUrl, type Shop } from '../graphql/shops'
import { formatNumber, formatRelativeDate } from '../lib/format'
import { ShopLogo } from '../components/ShopCard'
import { setAuthReason, type AuthReason } from '../lib/authReason'

type Props = {
  shopKey: string
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  onContactSeller: (sellerId: string, listingId?: string) => void
  isLoggedIn: boolean
  favorites?: string[]
  onToggleFavorite?: (id: string) => void
  currentUserId?: string | null
  // Already loaded by the caller (seller profile of a shop owner).
  preloaded?: Shop
}

type Tab = 'home' | 'all' | 'reviews' | 'infos'
const REPORT_REASONS = ['Contrefaçon', 'Tentative d’arnaque', 'Informations trompeuses', 'Comportement inapproprié', 'Autre']
const since = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : null)
const socialUrl = (kind: 'facebook' | 'instagram' | 'tiktok', v: string) => {
  if (/^https?:\/\//.test(v)) return v
  const handle = v.replace(/^@/, '').replace(/^(www\.)?(facebook|instagram|tiktok)\.com\/@?/, '')
  return kind === 'tiktok' ? `https://www.tiktok.com/@${handle}` : `https://www.${kind}.com/${handle}`
}
const tel = (v: string) => v.replace(/[^\d+]/g, '')

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 text-[#F59E0B]">
      {[1, 2, 3, 4, 5].map(s => <Icon key={s} name="star" size={14} fill={s <= Math.round(rating)} className={s <= Math.round(rating) ? '' : 'text-outline-variant'} />)}
    </span>
  )
}

export function OfficialPill({ className = '' }: { className?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary ${className}`}><Icon name="verified" size={14} fill /> Boutique officielle</span>
}

// Opening hours, contacts, legal transparency: the side column on desktop,
// the "Infos" tab on phones.
function ShopInfos({ shop, onReport, canReport }: { shop: Shop, onReport: () => void, canReport: boolean }) {
  const now = openNow(shop.openingHours)
  const today = (new Date().getUTCDay() + 6) % 7
  const place = [shop.address, shop.commune, shop.city].filter(Boolean).join(', ')
  const socials = ([['instagram', 'photo_camera', 'Instagram'], ['facebook', 'public', 'Facebook'], ['tiktok', 'music_note', 'TikTok']] as const)
    .filter(([k]) => shop[k])
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="storefront" size={20} className="text-primary" /> Établissement</h3>
          {shop.openingHours.length > 0 && (
            <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${now.open ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>{now.open ? 'Ouvert' : 'Fermé'}</span>
          )}
        </div>
        {place && (
          <>
            <p className="m-0 mt-4 text-label-sm uppercase text-on-surface-variant">Adresse</p>
            <p className="m-0 mt-1 text-body-md text-on-surface">{place}</p>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Côte d’Ivoire`)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-label-md text-primary no-underline">
              <Icon name="directions" size={16} /> Itinéraire
            </a>
          </>
        )}
        <p className="m-0 mt-4 text-label-sm uppercase text-on-surface-variant">Horaires</p>
        {shop.openingHours.length ? (
          <ul className="m-0 mt-1 list-none p-0">
            {DAYS.map((d, i) => {
              const h = shop.openingHours.find(x => x.day === i)
              return (
                <li key={d} className={`flex justify-between gap-3 py-1 text-body-sm ${i === today ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
                  <span>{d}</span>
                  <span className={h ? '' : 'text-primary'}>{h ? `${h.open.replace(':', 'h')} – ${h.close.replace(':', 'h')}` : 'Fermé'}</span>
                </li>
              )
            })}
          </ul>
        ) : <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Non communiqués.</p>}
        {(shop.phone || shop.whatsapp || shop.email || shop.website || socials.length > 0) && (
          <>
            <p className="m-0 mt-4 text-label-sm uppercase text-on-surface-variant">Contacts directs</p>
            <div className="mt-2 flex flex-col gap-2">
              {shop.phone && <ContactRow href={`tel:${tel(shop.phone)}`} icon="call" label="Téléphone" value={shop.phone} />}
              {shop.whatsapp && <ContactRow href={`https://wa.me/${tel(shop.whatsapp).replace(/^\+/, '')}`} icon="chat" label="WhatsApp" value={shop.whatsapp} />}
              {shop.email && <ContactRow href={`mailto:${shop.email}`} icon="mail" label="E-mail" value={shop.email} />}
              {shop.website && <ContactRow href={/^https?:/.test(shop.website) ? shop.website : `https://${shop.website}`} icon="language" label="Site web" value={shop.website.replace(/^https?:\/\//, '')} />}
              {socials.map(([k, icon, label]) => <ContactRow key={k} href={socialUrl(k, shop[k]!)} icon={icon} label={label} value={shop[k]!.replace(/^https?:\/\/(www\.)?/, '')} />)}
            </div>
          </>
        )}
      </section>
      <section className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
        <h3 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="gavel" size={20} className="text-primary" /> Transparence légale</h3>
        <div className="mt-3 rounded-xl bg-surface-container-low p-3">
          <p className="m-0 flex items-center gap-1.5 text-label-md text-on-surface"><Icon name="verified" size={16} className="text-tertiary" fill /> Entreprise vérifiée par Dilchap</p>
          <p className="m-0 mt-1 break-all text-body-sm text-on-surface-variant">{shop.legalIdType} : {shop.legalIdMasked}</p>
          {shop.approvedAt && <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">Boutique officielle depuis {since(shop.approvedAt)}</p>}
        </div>
        <p className="m-0 mt-3 text-body-sm text-on-surface-variant">Ventes en direct, sans commission Dilchap : vérifiez l’article et réglez sur place (espèces ou Mobile Money).</p>
        {canReport && (
          <button onClick={onReport} className="mt-3 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Icon name="flag" size={16} /> Signaler un problème</button>
        )}
      </section>
    </div>
  )
}

function ContactRow({ href, icon, label, value }: { href: string, icon: string, label: string, value: string }) {
  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex min-w-0 items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2 no-underline hover:bg-surface-container">
      <Icon name={icon} size={18} className="shrink-0 text-primary" />
      <span className="min-w-0 flex-1"><span className="block text-label-sm text-on-surface-variant">{label}</span><span className="block truncate text-label-md text-on-surface">{value}</span></span>
      <Icon name="arrow_outward" size={16} className="shrink-0 text-on-surface-variant" />
    </a>
  )
}

export default function ShopPage({ shopKey, onNavigate, onSelectListing, onContactSeller, isLoggedIn, favorites = [], onToggleFavorite, currentUserId, preloaded }: Props) {
  const [tab, setTab] = useState<Tab>('home')
  const [aisle, setAisle] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<ListingSort>('RECENT')
  const [copied, setCopied] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0])
  const [reportMessage, setReportMessage] = useState('')
  const [reportDone, setReportDone] = useState(false)

  const { data, loading, refetch } = useQuery<{ shop: Shop }>(SHOP_QUERY, { variables: { key: shopKey }, skip: !!preloaded })
  const shop = data?.shop ?? preloaded
  const ownerId = shop?.owner.id
  const { data: all } = useQuery<{ listings: { items: RemoteListing[], totalCount: number } }>(LISTINGS_QUERY, {
    variables: { filter: { sellerId: ownerId }, sort, pageSize: 100 }, skip: !ownerId,
  })
  const { data: featured } = useQuery<{ listings: { items: RemoteListing[] } }>(LISTINGS_QUERY, {
    variables: { filter: { sellerId: ownerId, featuredOnly: true }, pageSize: 8 }, skip: !ownerId,
  })
  const { data: reviewsData } = useQuery<{ sellerReviews: RemoteReview[] }>(SELLER_REVIEWS_QUERY, { variables: { sellerId: ownerId }, skip: !ownerId || tab !== 'reviews' })
  const [follow] = useMutation(FOLLOW_SELLER_MUTATION)
  const [unfollow] = useMutation(UNFOLLOW_SELLER_MUTATION)
  const [track] = useMutation(TRACK_SHOP_VISIT_MUTATION)
  const [createReport, { loading: reporting }] = useMutation(CREATE_REPORT_MUTATION)

  // One visit per shop and browser session.
  useEffect(() => {
    if (!shop?.id) return
    const k = `dilchap_shop_visit_${shop.id}`
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1') } catch { /* private mode */ }
    void track({ variables: { key: shop.id } }).catch(() => undefined)
  }, [shop?.id, track])

  const items = useMemo(() => all?.listings.items ?? [], [all])
  const filtered = items.filter(l => (!aisle || l.aisleId === aisle) && (!q || l.title.toLowerCase().includes(q.toLowerCase())))

  if (loading && !shop) return <div className="p-12 text-center text-on-surface-variant">Chargement…</div>
  if (!shop) {
    return (
      <div className="p-12 text-center">
        <p className="mb-4 text-on-surface-variant">Cette boutique n’existe pas ou n’est plus en ligne.</p>
        <button onClick={() => onNavigate('shops')} className="cursor-pointer rounded-lg border-none bg-primary px-5 py-2.5 text-label-lg text-white">Voir les boutiques officielles</button>
      </div>
    )
  }

  const isOwner = currentUserId === shop.owner.id
  const now = openNow(shop.openingHours)
  const responseTime = formatResponseTime(shop.responseTimeMinutes)
  const requireAuth = (fn: () => void, reason: AuthReason) => () => {
    if (isLoggedIn) return fn()
    setAuthReason(reason)
    onNavigate('auth')
  }
  const contact = requireAuth(() => onContactSeller(shop.owner.id), 'contact')
  const toggleFollow = requireAuth(async () => {
    await (shop.isFollowedByMe ? unfollow : follow)({ variables: { sellerId: shop.owner.id } })
    void refetch()
  }, 'follow')
  const share = async () => {
    const url = shopUrl(shop.slug)
    if (navigator.share) { try { await navigator.share({ title: shop.name, url }) } catch { /* cancelled */ } return }
    await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const sendReport = () => {
    void createReport({ variables: { targetType: 'USER', targetUserId: shop.owner.id, reason: reportReason, message: reportMessage.trim() || undefined } })
      .then(() => { setReportDone(true); setReportOpen(false) })
      .catch(() => undefined)
  }
  const card = (l: RemoteListing) => (
    <ListingCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite?.(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUserId} onContact={requireAuth(() => onContactSeller(shop.owner.id, l.id), 'contact')} />
  )
  const aisleChips = shop.aisles.filter(a => a.listingsCount > 0)
  const stats = [
    { icon: 'inventory_2', value: formatNumber(shop.listingsCount), label: 'Articles en ligne' },
    { icon: 'handshake', value: formatNumber(shop.salesCount), label: 'Ventes conclues' },
    { icon: 'group', value: formatNumber(shop.followersCount), label: 'Abonnés' },
    { icon: 'star', value: shop.reviewsCount ? shop.averageRating.toFixed(1) : '—', label: `${shop.reviewsCount} avis` },
  ]
  const tabs: [Tab, string, number | null][] = [['home', 'Accueil', null], ['all', 'Tous les articles', shop.listingsCount], ['reviews', 'Avis', shop.reviewsCount], ['infos', 'Infos & horaires', null]]
  const featuredItems = featured?.listings.items ?? []
  const infos = <ShopInfos shop={shop} canReport={!isOwner && !reportDone} onReport={requireAuth(() => setReportOpen(true), 'report')} />

  // Next to the info column (home tab) the grid stays at 3 columns.
  const grid = (list: RemoteListing[], wide = false) => (
    list.length
      ? <div className={`grid grid-cols-2 items-start gap-3 md:grid-cols-3 md:gap-4 ${wide ? 'xl:grid-cols-4' : ''}`}>{list.map(card)}</div>
      : <EmptyState icon="empty-search" fallback="search" tone="neutral" title="Aucun article ici pour le moment" />
  )
  const aisleBar = aisleChips.length > 0 && (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-1 pr-8 [scrollbar-width:none] md:flex-wrap md:pr-0">
        {[{ id: null, name: 'Tous les rayons', listingsCount: shop.listingsCount }, ...aisleChips].map(a => (
          <button key={a.id ?? 'all'} onClick={() => setAisle(a.id)} className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border-none px-3.5 py-1.5 text-label-md ${aisle === a.id ? 'bg-inverse-surface text-white' : 'bg-surface-lowest text-on-surface shadow-sm hover:bg-surface-container-low'}`}>
            {a.name} ({a.listingsCount})
          </button>
        ))}
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent md:hidden" />
    </div>
  )

  return (
    <div className="pb-8">
      {/* Banner */}
      <div className="relative h-40 bg-surface-container md:h-64">
        {shop.bannerUrl ? <img src={shop.bannerUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-primary-fixed to-surface-container" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute right-3 top-3 flex items-center gap-2 md:right-8">
          {shop.openingHours.length > 0 && (
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-lowest/95 px-3 py-1.5 text-label-sm text-on-surface">
              <span className={`h-2 w-2 rounded-full ${now.open ? 'bg-tertiary' : 'bg-outline'}`} />
              {now.open ? `Ouvert · jusqu’à ${now.until!.replace(':', 'h')}` : 'Fermé actuellement'}
            </span>
          )}
          <button onClick={() => void share()} className="flex h-9 cursor-pointer items-center gap-1 rounded-full border-none bg-surface-lowest/95 px-3 text-label-md text-on-surface" aria-label="Partager">
            <Icon name="share" size={17} /> {copied && 'Lien copié'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12">
        {/* Identity card */}
        <section className="relative -mt-12 rounded-2xl bg-surface-lowest p-4 shadow-sm md:-mt-20 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="relative -mt-14 w-fit shrink-0 sm:-mt-12 md:mt-0">
                <ShopLogo shop={shop} size="lg" />
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-solid border-surface-lowest bg-tertiary text-white"><Icon name="verified" size={15} fill /></span>
              </div>
              <div className="min-w-0 sm:pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="m-0 break-words text-headline-md text-on-surface md:text-headline-lg">{shop.name}</h1>
                  {shop.isOfficial ? <OfficialPill /> : <span className="whitespace-nowrap rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">Aperçu — non publiée</span>}
                </div>
                {shop.category && <p className="m-0 mt-1 text-body-md text-on-surface-variant">{shop.category.name}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
                  <span className="flex items-center gap-1"><Icon name="location_on" size={15} /> {[shop.commune, shop.city].filter(Boolean).join(', ')}</span>
                  {shop.reviewsCount > 0 && <span className="flex items-center gap-1"><Icon name="star" size={15} fill className="text-[#F59E0B]" /> {shop.averageRating.toFixed(1)} ({shop.reviewsCount} avis)</span>}
                  {shop.approvedAt && <span className="flex items-center gap-1"><Icon name="calendar_month" size={15} /> Boutique officielle depuis {since(shop.approvedAt)}</span>}
                </div>
              </div>
            </div>
            {!isOwner ? (
              <div className="flex flex-col gap-1.5 lg:items-end">
                <div className="flex gap-2">
                  <button onClick={toggleFollow} className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none px-4 text-label-lg lg:flex-none ${shop.isFollowedByMe ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}>
                    <Icon name={shop.isFollowedByMe ? 'how_to_reg' : 'person_add'} size={18} /> {shop.isFollowedByMe ? 'Suivie' : 'Suivre'}
                    <span className="text-label-sm text-on-surface-variant">{formatNumber(shop.followersCount)}</span>
                  </button>
                  <button onClick={contact} className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-lg text-white hover:bg-primary-dark lg:flex-none">
                    <Icon name="chat" size={18} /> Contacter
                  </button>
                </div>
                {responseTime && <span className="text-body-sm text-on-surface-variant">Répond généralement en {responseTime}</span>}
              </div>
            ) : (
              <button onClick={() => onNavigate('seller-shop')} className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-inverse-surface px-4 text-label-lg text-white">
                <Icon name="tune" size={18} /> Gérer ma boutique
              </button>
            )}
          </div>
          {shop.description && <p className="m-0 mt-4 max-w-3xl whitespace-pre-line text-body-md text-on-surface">{shop.description}</p>}
        </section>

        {/* Figures */}
        <section className="mt-3 grid grid-cols-2 gap-2 md:mt-4 md:grid-cols-4 md:gap-3">
          {stats.map(s => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl bg-surface-lowest p-3 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icon name={s.icon} size={20} /></span>
              <div className="min-w-0"><div className="text-headline-sm font-extrabold text-on-surface">{s.value}</div><div className="text-body-sm leading-tight text-on-surface-variant">{s.label}</div></div>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <div className="relative mt-5 border-0 border-b border-solid border-outline-variant">
          <div className="flex items-end gap-5 overflow-x-auto pr-8 [scrollbar-width:none] md:pr-0">
            {tabs.map(([key, label, count]) => (
              <button key={key} onClick={() => setTab(key)} className={`-mb-px flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-0 border-b-2 border-solid bg-transparent px-0 pb-2.5 pt-1 text-label-lg ${tab === key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
                {label}{count != null && <span className="rounded-full bg-surface-container px-1.5 text-label-sm text-on-surface-variant">{count}</span>}
              </button>
            ))}
            {tab === 'all' && (
              <label className="mb-1.5 ml-auto hidden min-w-[240px] items-center gap-2 rounded-lg bg-surface-lowest px-3 py-2 shadow-sm lg:flex">
                <Icon name="search" size={18} className="text-outline" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Rechercher chez ${shop.name}…`} className="w-full border-none bg-transparent text-body-sm text-on-surface outline-none" />
              </label>
            )}
          </div>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent md:hidden" />
        </div>

        {tab === 'home' && (
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-7">
              {featuredItems.length > 0 && (
                <section>
                  <h2 className="m-0 mb-3 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="push_pin" size={20} className="text-primary" /> Articles phares</h2>
                  <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 md:gap-4">{featuredItems.slice(0, 6).map(card)}</div>
                </section>
              )}
              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="m-0 text-headline-sm text-on-surface">{aisleChips.length ? 'Explorer les rayons' : 'Articles récents'}</h2>
                  <span className="whitespace-nowrap text-body-sm text-on-surface-variant">{shop.listingsCount} article{shop.listingsCount > 1 ? 's' : ''}</span>
                </div>
                {aisleBar && <div className="mb-3">{aisleBar}</div>}
                {grid(filtered.slice(0, 8))}
                {filtered.length > 8 && (
                  <button onClick={() => setTab('all')} className="mx-auto mt-4 flex cursor-pointer items-center gap-1 rounded-full border-none bg-surface-lowest px-5 py-2.5 text-label-md text-on-surface shadow-sm">
                    Voir les {filtered.length} articles <Icon name="expand_more" size={18} />
                  </button>
                )}
              </section>
            </div>
            <aside className="hidden lg:block">{infos}</aside>
          </div>
        )}

        {tab === 'all' && (
          <section className="mt-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
              <label className="flex items-center gap-2 rounded-lg bg-surface-lowest px-3 py-2 shadow-sm lg:hidden">
                <Icon name="search" size={18} className="text-outline" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Rechercher chez ${shop.name}…`} className="w-full border-none bg-transparent text-body-sm text-on-surface outline-none" />
              </label>
              <div className="min-w-0 flex-1">{aisleBar}</div>
              <Select value={sort} onChange={e => setSort(e.target.value as ListingSort)} className="shrink-0 cursor-pointer rounded-lg border-none bg-surface-lowest px-3 py-2 text-label-md text-on-surface shadow-sm outline-none">
                <option value="RECENT">Plus récents</option>
                <option value="PRICE_ASC">Prix croissant</option>
                <option value="PRICE_DESC">Prix décroissant</option>
                <option value="POPULAR">Plus populaires</option>
              </Select>
            </div>
            {grid(filtered, true)}
          </section>
        )}

        {tab === 'reviews' && (
          <section className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="h-fit rounded-2xl bg-surface-lowest p-5 text-center shadow-sm">
              <div className="text-display font-extrabold text-on-surface">{shop.reviewsCount ? shop.averageRating.toFixed(1) : '—'}</div>
              <div className="flex justify-center"><Stars rating={shop.averageRating} /></div>
              <div className="mt-1 text-body-sm text-on-surface-variant">{shop.reviewsCount} avis vérifié{shop.reviewsCount > 1 ? 's' : ''}</div>
              <p className="m-0 mt-3 text-body-sm text-on-surface-variant">Seuls les acheteurs ayant conclu une vente peuvent laisser un avis.</p>
            </div>
            <div className="flex flex-col gap-3">
              {(reviewsData?.sellerReviews ?? []).length === 0 && <EmptyState icon="empty-star" fallback="star" title="Aucun avis pour le moment" />}
              {(reviewsData?.sellerReviews ?? []).map(r => (
                <div key={r.id} className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-bold text-on-surface-variant">
                      {r.author.avatarUrl ? <img loading="lazy" src={r.author.avatarUrl} alt="" className="h-full w-full object-cover" /> : r.author.fullName.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1"><div className="truncate text-label-md text-on-surface">{r.author.fullName}</div><Stars rating={r.rating} /></div>
                    <span className="shrink-0 text-body-sm text-outline">{formatRelativeDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="m-0 mt-2 text-body-md text-on-surface">« {r.comment} »</p>}
                  {r.reply && (
                    <div className="mt-2 rounded-xl bg-surface-container-low p-3 text-body-sm">
                      <div className="font-semibold text-on-surface">Réponse de {shop.name}</div>
                      <p className="m-0 mt-0.5 text-on-surface-variant">« {r.reply} »</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'infos' && <div className="mt-5 grid gap-4 lg:grid-cols-2">{infos}</div>}

        {/* Phones: practical info under the home tab too */}
        {tab === 'home' && <div className="mt-6 lg:hidden">{infos}</div>}

        {reportDone && <p className="m-0 mt-4 flex items-center gap-1.5 text-label-md text-tertiary"><Icon name="check_circle" size={16} /> Signalement envoyé à l’équipe de modération.</p>}
      </div>

      <ConfirmSheet open={reportOpen} title={`Signaler ${shop.name}`} confirmLabel={reporting ? 'Envoi…' : 'Envoyer le signalement'} onConfirm={sendReport} onClose={() => setReportOpen(false)} loading={reporting}>
        <p className="m-0 mb-3 text-body-sm text-on-surface-variant">L’équipe de modération examine chaque signalement. La boutique ne voit pas qui l’a signalée.</p>
        <label className="text-label-md text-on-surface">Motif
          <Select value={reportReason} onChange={e => setReportReason(e.target.value)} className="input mt-1.5 cursor-pointer">
            {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
        </label>
        <label className="mt-3 block text-label-md text-on-surface">Détails (facultatif)
          <textarea className="input mt-1.5" rows={3} value={reportMessage} onChange={e => setReportMessage(e.target.value)} placeholder="Que s’est-il passé ?" />
        </label>
      </ConfirmSheet>
    </div>
  )
}
