import AnimatedIcon from '../components/AnimatedIcon'
import { useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { gql } from '@apollo/client'
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react'
import {
  Heart,
  Share2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Tag,
  Handshake,
  BadgeCheck,
  Star,
  Zap,
  Store,
  Home,
  Flag,
  ArrowRight,
  Rocket,
  Archive,
  CheckCircle2,
  Truck,
  X,
  UserPlus,
  UserCheck,
  Percent,
  ArrowLeft,
} from '../components/icons'
import Price from '../components/Price'
import BottomSheet from '../components/BottomSheet'
import BoostSheet from '../components/BoostSheet'
import ImageLightbox from '../components/ImageLightbox'
import InlineConversation from '../components/InlineConversation'
import QuickNegotiation from '../components/QuickNegotiation'
import { ListingCard } from '../components/ListingCard'
import { BUMP_LISTING_MUTATION, LISTING_QUERY, SIMILAR_LISTINGS_QUERY, type RemoteListing, type RemoteListingDetail } from '../graphql/listings'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'
import { SELLER_PROFILE_QUERY, FOLLOW_SELLER_MUTATION, UNFOLLOW_SELLER_MUTATION, formatResponseTime, type RemoteSellerProfile } from '../graphql/reviews'
import { CREATE_REPORT_MUTATION } from '../graphql/reports'
import type { AuthUser } from '../graphql/auth'
import { getAccessToken } from '../lib/auth'
import { setAuthReason, type AuthReason } from '../lib/authReason'
import { formatRelativeDate } from '../lib/format'
import { thumbnailUrl } from '../lib/media'
import Select from '../components/Select'
import Icon from '../components/Icon'
import PaymentLogo from '../components/PaymentLogo'

const LISTING_SELLER_ID_FRAGMENT = gql`
  fragment ListingSellerId on Listing {
    seller { id }
  }
`

type ListingDetailProps = {
  listingId: string
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  onSelectSeller: (id: string) => void
  onAuthenticated: () => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  currentUser?: AuthUser | null
  onContactSeller?: (sellerId: string, listingId?: string) => void
}

const REPORT_REASONS = ['Prix suspect', 'Annonce frauduleuse', 'Tentative d\'arnaque', 'Contenu inapproprié', 'Article déjà vendu', 'Autre']

export const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Espèces en main propre',
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  MOOV_MONEY: 'Moov Money',
}

const TABS = [
  { key: 'description', label: 'Description du vendeur' },
  { key: 'specs', label: 'Fiche technique & Détails' },
  { key: 'safety', label: 'Remise & Sécurité' },
] as const

// Small icon per spec row (mobile "Spécifications vérifiées").
const SPEC_ICONS: Record<string, string> = { Marque: 'sell', Modèle: 'devices', Taille: 'straighten', État: 'verified' }

function Avatar({ url, name, size = 48 }: { url?: string | null, name: string, size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-bold text-primary" style={{ width: size, height: size }}>
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  )
}

export default function ListingDetail({ listingId, onNavigate, onSelectListing, onSelectSeller, onAuthenticated, favorites, onToggleFavorite, currentUser, onContactSeller }: ListingDetailProps) {
  const [imgIdx, setImgIdx] = useState(0)
  const [brokenImgs, setBrokenImgs] = useState<number[]>([])
  const [viewer, setViewer] = useState<number | null>(null)
  const galleryTrack = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<typeof TABS[number]['key']>('description')
  const [chatOpen, setChatOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0])
  const [reportMessage, setReportMessage] = useState('')
  const [reportDone, setReportDone] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [renewed, setRenewed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile] = useState(() => window.innerWidth < 1024)

  const { data, loading } = useQuery<{ listing: RemoteListingDetail | null }>(LISTING_QUERY, { variables: { id: listingId } })
  const listing = data?.listing
  // Similar listings and the seller card load alongside the listing, not
  // after it: the seller id is usually already in the cache from the card
  // that was clicked.
  const { data: similarData } = useQuery<{ similarListings: RemoteListing[] }>(SIMILAR_LISTINGS_QUERY, { variables: { listingId, limit: 4 } })
  const similar = similarData?.similarListings ?? []
  const apollo = useApolloClient()
  const sellerId = listing?.seller.id
    ?? apollo.readFragment<{ seller: { id: string } }>({ id: apollo.cache.identify({ __typename: 'Listing', id: listingId }), fragment: LISTING_SELLER_ID_FRAGMENT })?.seller.id
  const { data: sellerData, refetch: refetchSeller } = useQuery<{ sellerProfile: RemoteSellerProfile }>(SELLER_PROFILE_QUERY, {
    variables: { sellerId: sellerId ?? '' }, skip: !sellerId,
  })
  const seller = sellerData?.sellerProfile
  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)

  const [createReport, { loading: reporting }] = useMutation(CREATE_REPORT_MUTATION)
  const [bumpListing, { loading: renewing }] = useMutation(BUMP_LISTING_MUTATION)
  const [boostOpen, setBoostOpen] = useState(false)
  const [follow] = useMutation(FOLLOW_SELLER_MUTATION)
  const [unfollow] = useMutation(UNFOLLOW_SELLER_MUTATION)

  if (loading) return <div className="p-12 text-center text-on-surface-variant">Chargement…</div>
  if (!listing) {
    return (
      <div className="p-12 text-center">
        <p className="mb-4 text-on-surface-variant">Cette annonce n'existe plus ou a été retirée.</p>
        <button onClick={() => onNavigate('home')} className="cursor-pointer rounded-lg border-none bg-primary px-5 py-2.5 text-label-lg text-white">Retour à l'accueil</button>
      </div>
    )
  }

  const images = listing.media.length > 0 ? listing.media.map(m => m.url) : (listing.coverImageUrl ? [listing.coverImageUrl] : [])
  // Gallery = a swipeable scroll-snap track; arrows, dots and thumbnails scroll it.
  const showImage = (i: number, smooth = true) => {
    const n = (i + images.length) % images.length
    const t = galleryTrack.current
    if (t) t.scrollTo({ left: n * t.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
    setImgIdx(n)
  }
  const onGalleryScroll = () => {
    const t = galleryTrack.current
    if (!t || !t.clientWidth) return
    const i = Math.round(t.scrollLeft / t.clientWidth)
    if (i !== imgIdx) setImgIdx(i)
  }
  const isFav = favorites.includes(listing.id)
  const isOwner = !!currentUser && listing.seller.id === currentUser.id
  const isExpired = listing.status === 'EXPIRED'
  const isSold = listing.status === 'SOLD'
  const canContact = !isOwner && !isExpired && !isSold
  const saving = listing.originalPrice && listing.price != null && listing.originalPrice > listing.price
    ? Math.round((1 - listing.price / listing.originalPrice) * 100) : 0
  const location = listing.locationLabel ? `${listing.locationLabel}, ${listing.city}` : listing.city
  const category = categoriesData?.categories.find(c => c.slug === listing.category.slug)
  const specs: { label: string, value: string, icon?: string }[] = [
    ...(listing.brand ? [{ label: 'Marque', value: listing.brand }] : []),
    ...(listing.modelName ? [{ label: 'Modèle', value: listing.modelName }] : []),
    ...(listing.size ? [{ label: 'Taille', value: listing.size }] : []),
    ...(listing.condition && listing.condition !== 'N/A' ? [{ label: 'État', value: listing.condition }] : []),
    ...Object.entries(listing.attributes ?? {})
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => ({ label: category?.attributes.find(a => a.key === k)?.label ?? k, value: String(v), icon: 'tune' })),
  ]
  const responseTime = formatResponseTime(seller?.responseTimeMinutes)
  const shareUrl = `${window.location.origin}${window.location.pathname}?listing=${listing.id}`

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: listing.title, text: `${listing.title} — ${location}`, url: shareUrl }) } catch { /* cancelled */ }
      return
    }
    await navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const requireAuth = (fn: () => void, reason: AuthReason) => () => {
    if (getAccessToken()) return fn()
    setAuthReason(reason)
    onNavigate('auth')
  }
  const toggleFav = () => { if (!getAccessToken()) setAuthReason('favorite'); onToggleFavorite(listing.id) }
  const openReport = requireAuth(() => {
    setReportOpen(true)
    setTimeout(() => document.getElementById('listing-report')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }, 'report')



  const toggleFollow = requireAuth(async () => {
    if (!seller) return
    await (seller.isFollowedByMe ? unfollow : follow)({ variables: { sellerId: seller.id } })
    void refetchSeller()
  }, 'follow')

  const loggedIn = !!getAccessToken() && !currentUser?.isGuest
  // "Discuter" always means chat: members go to their inbox, visitors get the
  // inline guest conversation. Price proposals live behind "Faire une offre".
  const openChat = () => (loggedIn && onContactSeller ? onContactSeller(listing.seller.id, listing.id) : setChatOpen(true))
  const negotiation = (
    <QuickNegotiation
      listing={listing}
      sellerRating={seller ? { average: seller.averageRating, count: seller.reviewsCount, verified: seller.isVerified } : null}
      responseTime={responseTime}
      onSent={(sellerId, id) => { setOfferOpen(false); onContactSeller?.(sellerId, id) }}
    />
  )


  // Seller-side / archived states replace the buying CTAs.
  const ownerPanel = isOwner ? (
    isExpired ? (
      renewed ? (
        <p className="m-0 flex items-center gap-2 rounded-lg bg-tertiary-soft p-3 text-label-md text-tertiary"><CheckCircle2 size={16} /> Annonce remise en ligne</p>
      ) : (
        <button disabled={renewing} onClick={() => void bumpListing({ variables: { id: listing.id } }).then(() => setRenewed(true))} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-primary py-3 text-label-lg text-white">
          <Archive size={18} /> {renewing ? 'Remise en ligne…' : 'Remettre en ligne'}
        </button>
      )
    ) : (
      <button onClick={() => setBoostOpen(true)} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-primary py-3 text-label-lg text-white">
        <Rocket size={18} /> Booster cette annonce
      </button>
    )
  ) : !canContact ? (
    <p className="m-0 flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
      <Archive size={17} className="mt-0.5 shrink-0" /> {isSold ? 'Cet article a déjà été vendu.' : "Cette annonce a expiré : le vendeur ne peut plus être contacté à son sujet."}
    </p>
  ) : null

  return (
    <div className="pb-24 lg:pb-8">
      {viewer !== null && images.length > 0 && <ImageLightbox images={images} start={viewer} alt={listing.title} onClose={() => setViewer(null)} onIndexChange={i => showImage(i, false)} />}
      {isOwner && <BoostSheet open={boostOpen} onClose={() => setBoostOpen(false)} listing={listing} />}
      {/* Mobile app bar (Stitch "Détails Article") — replaces the site header here */}
      <div className="safe-top sticky z-[100] flex h-14 items-center gap-1 border-0 border-b border-solid border-outline-variant bg-surface px-2 lg:hidden">
        <button onClick={() => (window.history.length > 1 ? window.history.back() : onNavigate('home'))} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface" aria-label="Retour">
          <ArrowLeft size={22} />
        </button>
        <span className="min-w-0 flex-1 truncate text-headline-sm text-on-surface">Détails article</span>
        {linkCopied && <span className="flex shrink-0 items-center gap-1 text-label-sm text-tertiary"><CheckCircle2 size={15} /> Lien copié</span>}
        <div className="relative">
          <button onClick={() => setMenuOpen(o => !o)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface" aria-label="Plus d'actions" aria-expanded={menuOpen}>
            <Icon name="more_vert" size={22} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[1]" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-[2] mt-1 w-48 rounded-xl border border-solid border-outline-variant bg-surface-lowest p-1 shadow-float">
                <button onClick={() => { setMenuOpen(false); void share() }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md text-on-surface hover:bg-surface-container-low">
                  <Share2 size={17} className="text-on-surface-variant" /> Partager
                </button>
                {!isOwner && (
                  <button onClick={() => { setMenuOpen(false); openReport() }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md text-on-surface hover:bg-surface-container-low">
                    <Flag size={17} className="text-on-surface-variant" /> Signaler
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta bar: breadcrumb + actions (desktop) */}
      <div className="hidden border-0 border-b border-solid border-outline-variant bg-surface-lowest lg:block">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-12 py-2.5 text-label-md text-on-surface-variant">
          <nav className="flex min-w-0 items-center gap-1">
            <button onClick={() => onNavigate('home')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Home size={14} /> Accueil</button>
            <ChevronRight size={14} className="text-outline-variant" />
            <span>{listing.category.name}</span>
            {listing.subcategory && <><ChevronRight size={14} className="text-outline-variant" /><span>{listing.subcategory.name}</span></>}
            <ChevronRight size={14} className="text-outline-variant" />
            <span className="truncate font-semibold text-on-surface">{listing.title}</span>
          </nav>
          <div className="flex shrink-0 items-center gap-5">
            <button onClick={() => void share()} className="relative flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-on-surface">
              <Share2 size={15} /> {linkCopied ? 'Lien copié !' : 'Partager'}
            </button>
            <button onClick={toggleFav} className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-on-surface">
              <Heart size={15} fill={isFav ? 'var(--primary)' : 'none'} color={isFav ? 'var(--primary)' : 'currentColor'} /> {isFav ? 'Sauvegardé' : 'Sauvegarder'}
              <span className="rounded-full bg-surface-container px-1.5 text-label-sm">{listing.favoritesCount}</span>
            </button>
            <span className="flex items-center gap-1.5 text-tertiary"><Eye size={15} /> {listing.viewsCount} vues</span>
          </div>
        </div>
      </div>

      {/* Mobile follows the mockup order (summary → seller → specs → description →
          meet-up place): both columns become `contents` below lg and the seller
          card is pulled up between the summary and the specs with `order`. */}
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 lg:grid-cols-12 lg:gap-6 lg:px-12 lg:pt-6">
        {/* LEFT */}
        <div className="min-w-0 max-lg:contents lg:col-span-7">
          {/* Gallery */}
          <div className="overflow-hidden max-lg:order-1 bg-surface-lowest lg:rounded-2xl lg:border lg:border-outline-variant lg:p-3">
            <div className="relative aspect-square overflow-hidden bg-surface-container-low lg:aspect-[4/3] lg:rounded-xl">
              {images.length > 0 ? (
                <div ref={galleryTrack} onScroll={onGalleryScroll} className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map((src, i) => (
                    <button key={i} onClick={() => setViewer(i)} aria-label={`Agrandir la photo ${i + 1}`} className="h-full w-full shrink-0 cursor-zoom-in snap-center border-none bg-transparent p-0">
                      {brokenImgs.includes(i)
                        ? <span className="flex h-full items-center justify-center text-outline"><Tag size={56} /></span>
                        : <img src={src} alt={`${listing.title} — photo ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" draggable={false} onError={() => setBrokenImgs(b => [...b, i])} className="h-full w-full select-none object-cover" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-outline"><Tag size={56} /></div>
              )}
              <div className="pointer-events-none absolute left-3 right-16 top-3 flex flex-wrap gap-1.5 lg:right-3">
                {(listing.seller.isVerified || seller?.isVerified) && (
                  <span className="flex items-center gap-1 rounded-full bg-tertiary px-2.5 py-1 text-label-sm uppercase text-white"><BadgeCheck size={13} /> <span className="lg:hidden">Authentique certifié</span><span className="hidden lg:inline">Vendeur certifié</span></span>
                )}
                {listing.condition && listing.condition !== 'N/A' && (
                  <span className="rounded-full bg-surface-lowest px-2.5 py-1 text-label-sm uppercase text-on-surface">{listing.condition}</span>
                )}
                {listing.urgentUntil && new Date(listing.urgentUntil) > new Date() && (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-label-sm uppercase text-white">Urgent</span>
                )}
              </div>
              {/* Mobile: the favourite sits on the photo (mockup); desktop has it in the meta bar. */}
              <button onClick={toggleFav} className="absolute right-3 top-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest/90 shadow-sm backdrop-blur-sm lg:hidden" aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                <AnimatedIcon name="heart" fallback="favorite" size={20} fill={isFav} trigger={isFav} className={isFav ? 'text-primary' : 'text-on-surface'} />
              </button>
              {images.length === 1 && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-0.5 text-label-sm text-white lg:hidden"><Icon name="photo_library" size={14} /> 1 / 1</span>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={() => showImage(imgIdx - 1)} aria-label="Photo précédente" className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest/90 text-on-surface lg:flex"><ChevronLeft size={20} /></button>
                  <button onClick={() => showImage(imgIdx + 1)} aria-label="Photo suivante" className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest/90 text-on-surface lg:flex"><ChevronRight size={20} /></button>
                  <div className="absolute bottom-3 left-3 flex gap-1 lg:hidden">
                    {images.map((_, i) => <button key={i} onClick={() => showImage(i)} className={`h-1.5 cursor-pointer rounded-full border-none p-0 ${i === imgIdx ? 'w-5 bg-primary' : 'w-1.5 bg-white/80'}`} aria-label={`Photo ${i + 1}`} />)}
                  </div>
                  <button onClick={() => setViewer(imgIdx)} aria-label="Afficher en plein écran" className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-1 rounded-full border-none bg-black/55 px-2.5 py-1 text-label-sm text-white"><Icon name="fullscreen" size={16} /> {imgIdx + 1} / {images.length}</button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 hidden gap-2 overflow-x-auto lg:flex">
                {images.map((img, i) => (
                  <button key={i} onClick={() => showImage(i)} className={`h-20 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-solid p-0 ${i === imgIdx ? 'border-primary' : 'border-transparent'}`}>
                    <img loading="lazy" decoding="async" src={thumbnailUrl(img)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile summary (desktop has it in the right column) */}
          <div className="px-4 pt-4 max-lg:order-2 lg:hidden">
            <div className="flex items-center justify-between gap-2 text-label-sm uppercase text-on-surface-variant">
              <span className="truncate">{[listing.brand, listing.subcategory?.name ?? listing.category.name].filter(Boolean).join(' • ')}</span>
              <span className="flex shrink-0 items-center gap-1 normal-case"><Eye size={14} /> {listing.viewsCount} vues</span>
            </div>
            <h1 className="m-0 mt-1 text-headline-md text-on-surface">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-headline-lg font-extrabold text-primary"><Price amount={listing.price} currency={listing.currency} /></span>
              {saving > 0 && <span className="text-headline-sm text-outline line-through"><Price amount={listing.originalPrice} currency={listing.currency} /></span>}
              {saving > 0 && <span className="rounded-md bg-primary-fixed px-2 py-0.5 text-label-sm uppercase text-primary">-{saving}% épargné</span>}
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-tertiary-soft p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tertiary text-white"><Percent size={18} /></span>
              <div className="text-body-sm">
                <div className="font-bold text-tertiary">Engagement 0 F de commission</div>
                <div className="text-on-surface-variant">Aucun frais caché. Paiement direct et remise en main propre entre particuliers.</div>
              </div>
            </div>
          </div>

          {/* Specs grid (mobile mockup "Spécifications vérifiées") */}
          {specs.length > 0 && (
            <div className="px-4 pt-6 max-lg:order-4 lg:hidden">
              <h2 className="m-0 mb-3 text-label-lg text-on-surface">Spécifications vérifiées</h2>
              <div className="grid grid-cols-2 gap-2">
                {specs.map((s, i) => (
                  <div key={s.label} className={`min-w-0 rounded-xl bg-surface-container-low p-3 ${i === specs.length - 1 && specs.length % 2 === 1 ? 'col-span-2' : ''}`}>
                    <div className="flex min-w-0 items-center gap-1 text-label-sm text-tertiary">
                      <Icon name={s.icon ?? SPEC_ICONS[s.label] ?? 'info'} size={14} className="shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </div>
                    <div className="mt-0.5 break-words text-label-lg text-on-surface">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs (desktop) / stacked sections (mobile) */}
          <div className="mt-6 px-4 max-lg:order-5 lg:rounded-2xl lg:border lg:border-outline-variant lg:bg-surface-lowest lg:p-0">
            <div className="hidden border-0 border-b border-solid border-outline-variant lg:flex">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 cursor-pointer border-0 border-b-2 border-solid bg-transparent px-4 py-3.5 text-label-lg ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="lg:p-6">
              <section className={tab === 'description' ? '' : 'lg:hidden'}>
                <h2 className="m-0 mb-3 text-label-lg text-on-surface lg:hidden">Description de l'article</h2>
                <div className="rounded-xl bg-surface-lowest text-body-md leading-7 text-on-surface max-lg:border max-lg:border-solid max-lg:border-outline-variant/60 max-lg:p-4 lg:bg-transparent [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(listing.description) }} />
                <p className="m-0 mt-4 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><MapPin size={14} /> Visible à {location} · publié {formatRelativeDate(listing.publishedAt ?? listing.createdAt)}</p>
              </section>
              <section className={tab === 'specs' ? 'hidden lg:block' : 'hidden'}>
                {specs.length === 0 ? <p className="m-0 text-body-md text-on-surface-variant">Le vendeur n'a pas renseigné de caractéristiques.</p> : (
                  <div className="grid grid-cols-2 gap-3">
                    {specs.map(s => (
                      <div key={s.label} className="rounded-xl bg-surface-container-low p-3">
                        <div className="text-label-sm uppercase text-tertiary">{s.label}</div>
                        <div className="text-label-lg text-on-surface">{s.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <section className={tab === 'safety' ? 'mt-6 lg:mt-0' : 'mt-6 lg:hidden'}>
                <h2 className="m-0 mb-3 flex items-center justify-between gap-2 text-label-lg text-on-surface lg:justify-start lg:text-headline-sm">
                  <span className="min-w-0 truncate">Lieu de rencontre suggéré</span>
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary"><ShieldCheck size={12} /> Espace public sécurisé</span>
                </h2>
                <div className="map-placeholder mb-4 h-40 items-end! justify-start! p-3">
                  <div className="relative z-[1] flex w-full items-center gap-3 rounded-xl bg-surface-lowest p-3 shadow-float">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white"><Store size={19} /></span>
                    <div className="min-w-0">
                      <div className="truncate text-label-lg text-on-surface">{listing.meetupSpot || location}</div>
                      <div className="truncate text-body-sm text-on-surface-variant">{listing.meetupSpot ? location : 'Convenez ensemble d’un lieu public et fréquenté'}</div>
                    </div>
                  </div>
                </div>
                <ul className="m-0 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface-variant">
                  {['Rencontrez-vous dans un lieu public, éclairé et fréquenté.', 'Inspectez et testez l’article avant tout paiement.', 'Ne payez jamais à l’avance et ne partagez pas de code reçu par SMS.'].map(t => (
                    <li key={t} className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-tertiary" /> {t}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <aside className="flex flex-col gap-4 max-lg:contents lg:col-span-5">
          <div className="hidden rounded-2xl border border-outline-variant bg-surface-lowest p-5 lg:block">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="truncate rounded bg-surface-container-high px-2 py-0.5 text-label-sm uppercase text-on-surface-variant">
                {[listing.brand, listing.modelName].filter(Boolean).join(' • ') || listing.category.name}
              </span>
              {listing.condition && listing.condition !== 'N/A' && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary"><CheckCircle2 size={12} /> {listing.condition}</span>
              )}
            </div>
            <h1 className="m-0 text-headline-md text-on-surface">{listing.title}</h1>

            <div className="mt-4 rounded-xl bg-surface-container-low p-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-[40px] font-extrabold leading-none tracking-tight text-primary"><Price amount={listing.price} currency={listing.currency} /></span>
                {saving > 0 && <span className="text-headline-sm text-outline line-through"><Price amount={listing.originalPrice} currency={listing.currency} /></span>}
              </div>
              {saving > 0 && <span className="mt-2 inline-block rounded-md bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">-{saving}% par rapport au prix neuf</span>}
              {listing.negotiable && <span className="ml-2 mt-2 inline-block rounded-md bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary">Prix négociable</span>}
            </div>

            <dl className="m-0 mt-4 flex flex-col gap-2 text-body-sm">
              <div className="flex justify-between"><dt className="flex items-center gap-1.5 text-on-surface-variant"><ShieldCheck size={14} /> Commission Dilchap</dt><dd className="m-0 font-bold text-tertiary">0 F (0%)</dd></div>
              <div className="flex justify-between border-0 border-t border-solid border-outline-variant pt-2"><dt className="font-bold text-on-surface">Montant à régler au vendeur</dt><dd className="m-0 text-label-lg text-on-surface"><Price amount={listing.price} currency={listing.currency} /></dd></div>
            </dl>

            <div className="mt-4">
              <div className="mb-2 text-label-sm uppercase text-on-surface-variant">Modes de remise au choix</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border-[1.5px] border-solid border-primary bg-primary-fixed/40 p-3">
                  <div className="flex items-center justify-between text-label-md text-on-surface"><span className="flex items-center gap-1.5"><Handshake size={15} className="text-primary" /> Main propre</span><span className="text-label-sm text-tertiary">Gratuit</span></div>
                  <div className="mt-1 text-body-sm text-on-surface-variant">{listing.meetupSpot || location}</div>
                </div>
                <div className={`rounded-xl border-[1.5px] border-solid border-outline-variant p-3 ${listing.deliveryAvailable ? '' : 'opacity-50'}`}>
                  <div className="flex items-center gap-1.5 text-label-md text-on-surface"><Truck size={15} /> Livraison</div>
                  <div className="mt-1 text-body-sm text-on-surface-variant">{listing.deliveryAvailable ? 'Possible, à convenir' : 'Non proposée'}</div>
                </div>
              </div>
            </div>

            {!!listing.paymentMethods?.length && (
              <div className="mt-4">
                <div className="mb-2 text-label-sm uppercase text-on-surface-variant">Règlement accepté à la rencontre</div>
                <div className="flex flex-wrap gap-1.5">
                  {listing.paymentMethods.map(p => <span key={p} className="flex items-center gap-1.5 rounded-lg bg-surface-container py-1 pl-1 pr-2 text-label-md text-on-surface"><PaymentLogo method={p} size={22} /> {PAYMENT_LABELS[p] ?? p}</span>)}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {ownerPanel ?? (
                chatOpen ? (
                  <InlineConversation sellerId={listing.seller.id} listingId={listing.id} sellerName={listing.seller.fullName} onAuthenticated={onAuthenticated} onClose={() => setChatOpen(false)} />
                ) : (
                  <>
                    {offerOpen ? negotiation : (
                    <>
                    <button onClick={openChat} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-primary py-3 text-label-lg text-white hover:bg-primary-dark">
                      <MessageSquare size={18} /> <span className="max-[400px]:hidden">Discuter en direct</span><span className="min-[400px]:hidden">Discuter</span>
                    </button>
                    {listing.negotiable && (
                      <button onClick={requireAuth(() => setOfferOpen(true), 'offer')} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-surface-container-high py-3 text-label-lg text-on-surface hover:bg-surface-container-highest">
                        <Tag size={17} /> Faire une offre
                      </button>
                    )}
                    </>
                    )}
                  </>
                )
              )}
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 text-label-sm text-tertiary">
              <span className="flex items-center gap-1"><Handshake size={13} /> Paiement à la remise</span>•<span className="flex items-center gap-1"><ShieldCheck size={13} /> Échanges protégés</span>
            </div>
          </div>

          {/* Seller card — mobile: the mockup's compact card (Suivre lives on the profile) */}
          <div className="order-3 mx-4 mt-5 rounded-2xl bg-surface-container-low p-4 lg:hidden">
            <div className="flex items-center gap-3">
              <button onClick={() => onSelectSeller(listing.seller.id)} className="relative cursor-pointer border-none bg-transparent p-0" aria-label={`Profil de ${listing.seller.fullName}`}>
                <Avatar url={listing.seller.avatarUrl} name={listing.seller.fullName} size={44} />
                {seller?.isVerified && <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-solid border-surface-container-low bg-tertiary text-white"><Icon name="check" size={10} /></span>}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1 text-label-lg text-on-surface">
                  <span className="truncate">{listing.seller.fullName}</span>
                  {seller?.isVerified && <Icon name="verified" size={16} className="shrink-0 text-tertiary" title="Vendeur vérifié" />}
                </div>
                {seller && seller.reviewsCount > 0 ? (
                  <div className="truncate text-label-sm text-primary">{seller.averageRating.toFixed(1)} ★ <span className="text-on-surface-variant">({seller.reviewsCount} avis vérifié{seller.reviewsCount > 1 ? 's' : ''})</span></div>
                ) : seller && (
                  <div className="truncate text-label-sm text-on-surface-variant">{seller.salesCount > 0 ? `${seller.salesCount} vente${seller.salesCount > 1 ? 's' : ''}` : 'Nouveau vendeur'}</div>
                )}
              </div>
              <button onClick={() => onSelectSeller(listing.seller.id)} className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border-none bg-surface-container-high px-3.5 py-1.5 text-label-md text-on-surface">Profil</button>
            </div>
            <div className="mt-3 flex gap-2">
              {responseTime && (
                <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-2 text-label-sm text-on-surface">
                  <Zap size={14} className="shrink-0 text-tertiary" /> <span className="truncate">Répond en {responseTime}</span>
                </span>
              )}
              <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-2 text-label-sm text-on-surface">
                <MapPin size={14} className="shrink-0 text-primary" /> <span className="truncate">{listing.locationLabel || listing.city}</span>
              </span>
            </div>
          </div>

          <div className="hidden rounded-2xl border border-outline-variant bg-surface-lowest p-5 lg:block">
            <div className="flex items-center gap-3">
              <button onClick={() => onSelectSeller(listing.seller.id)} className="relative cursor-pointer border-none bg-transparent p-0">
                <Avatar url={listing.seller.avatarUrl} name={listing.seller.fullName} size={52} />
                {seller?.isVerified && <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-solid border-surface-lowest bg-tertiary text-white"><BadgeCheck size={11} /></span>}
              </button>
              <div className="min-w-0 flex-1">
                <button onClick={() => onSelectSeller(listing.seller.id)} className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-left text-headline-sm text-on-surface">
                  <span className="truncate">{listing.seller.fullName}</span>
                  {seller?.isVerified && <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-tertiary-soft px-1.5 text-label-sm text-tertiary"><BadgeCheck size={12} /> Certifié</span>}
                </button>
                <div className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                  {seller && seller.reviewsCount > 0 && <><Star size={13} fill="#F59E0B" color="#F59E0B" /> <b className="text-on-surface">{seller.averageRating.toFixed(1)}</b> ({seller.reviewsCount} avis) •</>}
                  {seller && <span>{seller.salesCount} vente{seller.salesCount > 1 ? 's' : ''}</span>}
                </div>
              </div>
              {!isOwner && seller && (
                <button onClick={toggleFollow} className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-1.5 text-label-md ${seller.isFollowedByMe ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface'}`}>
                  {seller.isFollowedByMe ? <><UserCheck size={14} /> Suivi</> : <><UserPlus size={14} /> Suivre</>}
                </button>
              )}
            </div>
            <div className={`mt-3 grid gap-2 ${responseTime ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {responseTime && (
                <div className="flex items-center gap-2 rounded-lg bg-surface-container-low p-2.5">
                  <Zap size={16} className="shrink-0 text-tertiary" />
                  <div className="min-w-0 text-body-sm"><div className="font-semibold text-on-surface">Réactif</div><div className="truncate text-on-surface-variant">Répond en {responseTime}</div></div>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-lg bg-surface-container-low p-2.5">
                <MapPin size={16} className="shrink-0 text-primary" />
                <div className="min-w-0 text-body-sm"><div className="font-semibold text-on-surface">Rencontre</div><div className="truncate text-on-surface-variant">{location}</div></div>
              </div>
            </div>
            <button onClick={() => onSelectSeller(listing.seller.id)} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-surface-container-low py-2.5 text-label-md text-on-surface hover:bg-surface-container">
              Voir {seller && seller.listingsCount > 1 ? `ses ${seller.listingsCount - 1} autres articles` : 'le profil'} <ArrowRight size={15} />
            </button>
          </div>

          <div id="listing-report" className="text-center max-lg:order-6 max-lg:mx-4 max-lg:mt-4">
            {reportDone ? (
              <p className="m-0 text-body-sm text-on-surface-variant">Merci, votre signalement a été transmis.</p>
            ) : reportOpen ? (
              <div className="rounded-xl border border-outline-variant bg-surface-lowest p-3 text-left">
                <Select className="input mb-2" value={reportReason} onChange={e => setReportReason(e.target.value)}>{REPORT_REASONS.map(r => <option key={r}>{r}</option>)}</Select>
                <textarea className="input mb-2" rows={2} placeholder="Détails (optionnel)" value={reportMessage} onChange={e => setReportMessage(e.target.value)} />
                <div className="flex gap-2">
                  <button disabled={reporting} onClick={() => void createReport({ variables: { targetType: 'LISTING', targetListingId: listing.id, reason: reportReason, message: reportMessage || undefined } }).then(() => setReportDone(true))} className="flex-1 cursor-pointer rounded-lg border-none bg-primary py-2 text-label-md text-white">{reporting ? 'Envoi…' : 'Envoyer'}</button>
                  <button onClick={() => setReportOpen(false)} className="cursor-pointer rounded-lg border-none bg-surface-container px-3"><X size={15} /></button>
                </div>
              </div>
            ) : (
              <button onClick={openReport} className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-body-sm text-on-surface-variant hover:text-primary"><Flag size={13} /> Signaler cette annonce</button>
            )}
          </div>
        </aside>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mx-auto mt-10 max-w-[1320px] px-4 lg:px-12">
          <h2 className="m-0 text-headline-sm text-on-surface md:text-headline-md">Articles similaires qui pourraient vous intéresser</h2>
          <p className="m-0 mb-4 mt-1 text-body-sm text-on-surface-variant">{listing.subcategory?.name ?? listing.category.name} dans une gamme de prix proche</p>
          <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-4 md:gap-4">
            {similar.map(l => (
              <ListingCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUser?.id} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-[300] flex gap-2 border-0 border-t border-solid border-outline-variant bg-surface-lowest p-3 lg:hidden" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        {ownerPanel ?? (
          <>
            {listing.negotiable && (
              <button onClick={requireAuth(() => setOfferOpen(true), 'offer')} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-solid border-outline-variant bg-surface-lowest px-4 py-3 text-label-lg text-on-surface">
                <Tag size={17} /> Faire une offre
              </button>
            )}
            <button onClick={openChat} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-primary py-3 text-label-lg text-white">
              <MessageSquare size={18} /> <span className="max-[400px]:hidden">Discuter en direct</span><span className="min-[400px]:hidden">Discuter</span>
            </button>
          </>
        )}
      </div>

      {/* Mobile sheets (desktop shows the same content inline) */}
      <div>
        <BottomSheet open={isMobile && chatOpen && canContact} onClose={() => setChatOpen(false)} title={`Discuter avec ${listing.seller.fullName}`}>
          <InlineConversation sellerId={listing.seller.id} listingId={listing.id} sellerName={listing.seller.fullName} onAuthenticated={onAuthenticated} onClose={() => setChatOpen(false)} />
        </BottomSheet>
        <BottomSheet open={isMobile && offerOpen && canContact} onClose={() => setOfferOpen(false)} title="Faire une offre & Contacter" maxHeight="92vh">
          {negotiation}
        </BottomSheet>
      </div>
    </div>
  )
}
