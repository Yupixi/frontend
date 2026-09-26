import EmptyState from '../../components/EmptyState'
import AnimatedIcon from '../../components/AnimatedIcon'
import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import SafeImg from '../../components/SafeImg'
import { AccountLayout } from '../account/AccountLayout'
import { formatNumber } from '../../lib/format'
import { MY_FAVORITE_ENTRIES_QUERY, listingPlace, type FavoriteEntry } from '../../graphql/buyerSpace'
import type { AuthUser } from '../../graphql/auth'
import Select from '../../components/Select'

type Props = {
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  onToggleFavorite: (id: string) => Promise<void> | void
  onContactSeller: (sellerId: string, listingId?: string) => void
  onSearchCategory: (slug: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

const SORTS = [
  { key: 'recent', label: 'Derniers ajoutés' },
  { key: 'drop', label: 'Plus grosses baisses' },
  { key: 'price_asc', label: 'Prix croissant' },
  { key: 'price_desc', label: 'Prix décroissant' },
]
const dropOf = (e: FavoriteEntry) => (e.priceAtSave != null && e.listing.price != null && e.listing.price < e.priceAtSave ? e.priceAtSave - e.listing.price : 0)

function FavoriteCard({ e, onSelect, onUnfav, onChat, onSimilar }: { e: FavoriteEntry; onSelect: () => void; onUnfav: () => void; onChat: () => void; onSimilar: () => void }) {
  const l = e.listing
  const sold = l.status === 'SOLD'
  const unavailable = l.status !== 'APPROVED'
  const drop = dropOf(e)
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
      <div className="relative aspect-square bg-surface-container md:aspect-[4/3]">
        <button onClick={onSelect} className="block h-full w-full cursor-pointer border-none bg-transparent p-0">
          <SafeImg src={l.coverImageUrl} className={`h-full w-full object-cover ${unavailable ? 'grayscale' : ''}`} iconSize={36} />
        </button>
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1 md:left-3 md:top-3">
          {drop > 0 && <span className="flex items-center gap-1 rounded bg-tertiary px-2 py-0.5 text-label-sm text-white"><Icon name="trending_down" size={14} /> -{formatNumber(drop)} F</span>}
          {l.condition && l.condition !== 'N/A' && <span className="rounded bg-surface-lowest/90 px-2 py-0.5 text-label-sm uppercase text-on-surface">{l.condition}</span>}
        </div>
        {unavailable && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-inverse-surface/80 px-3 py-1 text-label-lg uppercase tracking-widest text-white md:px-4 md:py-2 md:text-headline-sm">{sold ? 'Vendu' : 'Indisponible'}</span>}
        <button onClick={onUnfav} className="absolute right-2 top-2 flex h-9 w-9 md:right-3 md:top-3 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest text-primary shadow" aria-label="Retirer des favoris"><Icon name="favorite" size={20} fill /></button>
      </div>
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <div className="flex items-center justify-between gap-2 text-label-sm">
          <span className="truncate uppercase text-primary">{l.category.name}</span>
          <span className="hidden shrink-0 items-center gap-0.5 text-on-surface-variant md:flex"><Icon name="location_on" size={13} /> {listingPlace(l)}</span>
        </div>
        <button onClick={onSelect} className={`mt-1 cursor-pointer truncate border-none bg-transparent p-0 text-left text-label-lg md:text-headline-sm ${unavailable ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{l.title}</button>
        <p className="m-0 mt-1 line-clamp-2 hidden text-body-sm text-on-surface-variant md:block">{l.description}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 md:mt-3">
          <span className={`text-headline-sm font-extrabold md:text-headline-md ${unavailable ? 'text-on-surface-variant' : 'text-on-surface'}`}><Price amount={l.price} currency={l.currency} /></span>
          {drop > 0 && <span className="text-body-sm text-on-surface-variant line-through"><Price amount={e.priceAtSave} currency={l.currency} /></span>}
          <span className="ml-auto hidden text-label-sm text-tertiary md:inline">{unavailable ? <span className="rounded bg-surface-container px-1.5 text-on-surface-variant">Transaction clôturée</span> : l.negotiable ? 'Prix négociable' : l.deliveryAvailable ? 'Livraison possible' : 'Remise en main propre'}</span>
        </div>
        <div className="mt-3 hidden items-center gap-2 rounded-xl bg-surface-container-low p-2.5 md:flex">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-label-sm text-primary">{l.seller.avatarUrl ? <SafeImg src={l.seller.avatarUrl} icon="person" iconSize={16} fallbackClassName="flex h-full w-full items-center justify-center" /> : l.seller.fullName.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
          <div className="min-w-0 flex-1"><div className="truncate text-label-md text-on-surface">{l.seller.fullName}</div>{l.seller.isVerified && <div className="flex items-center gap-0.5 text-label-sm text-tertiary"><Icon name="verified" size={12} /> Vendeur certifié</div>}</div>
          {!!l.seller.reviewsCount && <span className="text-label-sm text-on-surface"><Icon name="star" size={13} fill className="text-amber-500" /> {l.seller.averageRating.toFixed(1)} ({l.seller.reviewsCount})</span>}
        </div>
        <div className="flex-1" />
        {unavailable ? (
          <button onClick={onSimilar} className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container-high py-2 text-label-md text-on-surface md:py-2.5"><Icon name="manage_search" size={18} /> <span className="md:hidden">Similaire</span><span className="max-md:hidden">Voir articles similaires</span></button>
        ) : (
          <>
            {/* Mobile: compact "Message / Acheter" pair of the Stitch mobile favourites */}
            <div className="mt-3 grid grid-cols-2 gap-1.5 md:hidden">
              <button onClick={onChat} className="cursor-pointer rounded-lg border-none bg-surface-container-high px-1 py-2 text-label-sm text-on-surface">Message</button>
              <button onClick={onSelect} className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border-none bg-primary px-1 py-2 text-label-sm text-white"><AnimatedIcon name="cart" fallback="shopping_bag" size={15} playOnInteract /> Acheter</button>
            </div>
            <div className="mt-3 hidden grid-cols-2 gap-2 md:grid">
              <button onClick={onChat} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary py-2.5 text-label-md text-white"><Icon name="chat" size={17} /> Discuter</button>
              <button onClick={onSelect} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container-high py-2.5 text-label-md text-on-surface"><Icon name="local_offer" size={17} /> {l.negotiable ? 'Faire une offre' : "Voir l'annonce"}</button>
            </div>
          </>
        )}
      </div>
    </article>
  )
}

// "Mes Favoris & Annonces sauvegardées" (Stitch desktop + mobile).
export default function Favorites({ onNavigate, onSelectListing, onToggleFavorite, onContactSeller, onSearchCategory, currentUser, onLogout }: Props) {
  const { data, loading, refetch } = useQuery<{ myFavoriteEntries: FavoriteEntry[] }>(MY_FAVORITE_ENTRIES_QUERY, { fetchPolicy: 'cache-and-network' })
  // Removed entries disappear on tap; the list resyncs in the background.
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set())
  const all = useMemo(() => (data?.myFavoriteEntries ?? []).filter(e => !removed.has(e.listing.id)), [data, removed])
  const [cat, setCat] = useState('')
  const [dropsOnly, setDropsOnly] = useState(false)
  const [hideSold, setHideSold] = useState(false)
  const [sort, setSort] = useState('recent')

  const categories = useMemo(() => {
    const m = new Map<string, { name: string; count: number }>()
    all.forEach(e => m.set(e.listing.category.slug, { name: e.listing.category.name, count: (m.get(e.listing.category.slug)?.count ?? 0) + 1 }))
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count)
  }, [all])
  const drops = all.filter(e => dropOf(e) > 0)
  const maxDrop = Math.max(0, ...drops.map(dropOf))
  const active = all.filter(e => e.listing.status === 'APPROVED').length
  const shown = all
    .filter(e => (!cat || e.listing.category.slug === cat) && (!dropsOnly || dropOf(e) > 0) && (!hideSold || e.listing.status === 'APPROVED'))
    .sort((a, b) => sort === 'drop' ? dropOf(b) - dropOf(a)
      : sort === 'price_asc' ? (a.listing.price ?? 0) - (b.listing.price ?? 0)
        : sort === 'price_desc' ? (b.listing.price ?? 0) - (a.listing.price ?? 0)
          : new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
  const unfav = (id: string) => {
    setRemoved(r => new Set(r).add(id))
    void Promise.resolve(onToggleFavorite(id)).finally(() => { void refetch().then(() => setRemoved(r => { const n = new Set(r); n.delete(id); return n })) })
  }

  return (
    <AccountLayout active="buyer-favorites" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <section className="flex flex-wrap items-start justify-between gap-4 md:rounded-3xl md:bg-surface-container-low md:p-6">
          <div className="max-w-xl">
            <div className="hidden items-center gap-2 text-label-sm uppercase md:flex"><span className="flex items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5 text-primary"><Icon name="favorite" size={13} /> Espace acheteur</span><span className="text-on-surface-variant">• Côte d'Ivoire</span></div>
            <h1 className="m-0 mt-1 text-headline-lg-mobile text-on-surface md:text-headline-lg"><span className="max-md:hidden">Mes </span>Favoris<span className="hidden md:inline"> &amp; Annonces sauvegardées</span> <span className="rounded-full bg-primary-fixed px-2 align-middle text-label-lg text-primary md:hidden">{all.length}</span></h1>
            <p className="m-0 mt-1 hidden text-body-md text-on-surface-variant md:block">Retrouvez vos articles mis de côté et surveillez les baisses de prix en temps réel.</p>
          </div>
          <div className="hidden gap-3 md:flex">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-lowest px-4 py-3 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="bookmark" size={20} /></span><div><div className="text-headline-sm text-on-surface">{active}</div><div className="text-label-sm text-on-surface-variant">Annonces actives</div></div></div>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-lowest px-4 py-3 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="trending_down" size={20} /></span><div><div className="text-headline-sm text-tertiary">{drops.length} baisse{drops.length > 1 ? 's' : ''}</div><div className="text-label-sm text-on-surface-variant">{maxDrop ? `Jusqu'à -${formatNumber(maxDrop)} F` : 'Aucune pour le moment'}</div></div></div>
          </div>
        </section>

        <section className="mt-4 hidden flex-wrap items-center gap-3 rounded-2xl bg-tertiary p-4 text-white md:flex">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15"><Icon name="notifications_active" size={22} /></span>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-label-lg">Alertes baisse de prix instantanées <span className="rounded bg-white/20 px-1.5 text-label-sm">Gratuit</span></div><div className="text-body-sm text-white/80">Vous êtes prévenu dès qu'un vendeur baisse le prix d'un article sauvegardé.</div></div>
          <button onClick={() => onNavigate('buyer-settings')} className="flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-white px-4 py-2 text-label-md text-tertiary"><Icon name="tune" size={17} /> Gérer mes alertes</button>
        </section>

        {all.length > 0 && (
        <section className="mt-3 md:mt-4 md:rounded-2xl md:bg-surface-lowest md:p-3 md:shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              <button onClick={() => { setCat(''); setDropsOnly(false) }} className={`shrink-0 cursor-pointer rounded-xl border-none px-3 py-2 text-label-md ${!cat && !dropsOnly ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface max-md:bg-surface-lowest max-md:shadow-sm'}`}><span className="md:hidden">Tous</span><span className="max-md:hidden">Toutes</span> ({all.length})</button>
              {drops.length > 0 && <button onClick={() => setDropsOnly(d => !d)} className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border-none px-3 py-2 text-label-md ${dropsOnly ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface max-md:bg-surface-lowest max-md:shadow-sm'}`}><Icon name="local_fire_department" size={15} /> Baisse de prix ({drops.length})</button>}
              {categories.map(([slug, c]) => (
                <button key={slug} onClick={() => setCat(cat === slug ? '' : slug)} className={`shrink-0 cursor-pointer rounded-xl border-none px-3 py-2 text-label-md ${cat === slug ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface max-md:bg-surface-lowest max-md:shadow-sm'}`}>{c.name} ({c.count})</button>
              ))}
            </div>
            <label className="hidden items-center gap-2 text-label-sm text-on-surface-variant md:flex">Trier par :
              <Select value={sort} onChange={e => setSort(e.target.value)} className="cursor-pointer rounded-lg border-none bg-surface-container-low px-2 py-1.5 text-label-md text-on-surface">
                {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </label>
          </div>
          {/* Mobile: a single switch replaces the desktop checkboxes */}
          <label className="relative mt-3 flex cursor-pointer items-center justify-between gap-3 text-body-sm text-on-surface md:hidden">
            <span className="flex items-center gap-2"><Icon name="visibility_off" size={18} className="text-on-surface-variant" /> Masquer les articles vendus</span>
            <input type="checkbox" role="switch" checked={hideSold} onChange={e => setHideSold(e.target.checked)} className="peer sr-only" />
            <span aria-hidden className="relative h-6 w-11 shrink-0 rounded-full bg-surface-container-high transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:bg-tertiary peer-checked:after:translate-x-5" />
          </label>
          <div className="mt-2 hidden flex-wrap items-center gap-4 px-1 text-label-sm text-on-surface md:flex">
            <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={dropsOnly} onChange={e => setDropsOnly(e.target.checked)} className="accent-[var(--primary)]" /> Uniquement en baisse de prix</label>
            <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={hideSold} onChange={e => setHideSold(e.target.checked)} className="accent-[var(--primary)]" /> Masquer les annonces vendues</label>
            <span className="ml-auto text-on-surface-variant">Affichage de {shown.length} article{shown.length > 1 ? 's' : ''}</span>
          </div>
        </section>
        )}

        {loading && !data && <p className="mt-4 text-body-md text-on-surface-variant">Chargement…</p>}
        {!loading && all.length === 0 && (
          <EmptyState className="mt-4" icon="heart" fallback="favorite" title="Aucun favori pour le moment" text="Touchez le cœur d'une annonce pour la sauvegarder et suivre son prix." action={{ label: 'Explorer les annonces', onClick: () => onNavigate('search') }} />
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
          {shown.map(e => (
            <FavoriteCard key={e.listing.id} e={e} onSelect={() => onSelectListing(e.listing.id)} onUnfav={() => unfav(e.listing.id)} onChat={() => onContactSeller(e.listing.seller.id, e.listing.id)} onSimilar={() => onSearchCategory(e.listing.category.slug)} />
          ))}
        </div>

        {all.length > 0 && (
          <section className="mt-6 flex items-center gap-3 rounded-2xl bg-surface-container-low p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="handshake" size={20} /></span>
            <div className="min-w-0 flex-1"><div className="text-label-lg text-on-surface">Paiement à la remise, protégé par Dilchap</div><div className="text-body-sm text-on-surface-variant">Vous ne payez le vendeur qu'après avoir vérifié l'article, et validez avec votre code de remise.</div></div>
            <span className="hidden shrink-0 items-center gap-1 text-label-sm text-tertiary md:flex"><Icon name="verified_user" size={15} /> Protection acheteur active</span>
          </section>
        )}
      </div>
    </AccountLayout>
  )
}
