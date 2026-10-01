// Storefront addresses. Public pages get a real URL (shared, indexed by
// search engines; the storefront's server fills in their title and share
// preview, Backend src/modules/seo). Account pages all sit under /compte:
// the page itself is restored from the session (App's nav state).

export type RoutePage =
  | 'home' | 'listing-detail' | 'seller-profile' | 'shop' | 'shops' | 'categories'
  | 'search' | 'flash-offers' | 'legal' | 'auth' | 'help'

export type Route = {
  page: RoutePage | 'account'
  listingId?: string
  sellerId?: string
  shopKey?: string
  legalSlug?: string
  campaignSlug?: string
  category?: string
  // A category page in one city (/categorie/velos/abidjan): the city's
  // address word.
  categoryCity?: string
  // Centre d’aide: an article's key ('' = the help centre's home).
  helpSlug?: string
}

// URL-safe words from a title: "Télé Samsung 55\"" → "tele-samsung-55"
// (same as Backend src/common/slug.ts).
export function slugify(text: string, max = 60): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '')
}

const UUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

// /annonce/<words of the title>-<id>; only the id is read back.
export const listingPath = (id: string, title?: string) => {
  const words = title ? slugify(title) : ''
  return `/annonce/${words ? `${words}-` : ''}${id}`
}

const enc = encodeURIComponent

// Members' short addresses (dilchap.com/@handle) met so far: their
// profile's URL uses it instead of /vendeur/<id>.
const handles = new Map<string, string>()
export const rememberHandle = (sellerId: string, handle: string) => { handles.set(sellerId, handle) }

export function pathFor(page: string, s: Omit<Route, 'page'> & { searchTerm?: string } = {}): string {
  switch (page) {
    case 'home': return '/'
    case 'listing-detail': return s.listingId ? listingPath(s.listingId) : '/'
    case 'seller-profile': {
      if (!s.sellerId) return '/'
      if (s.sellerId.startsWith('@')) return `/@${enc(s.sellerId.slice(1))}`
      const h = handles.get(s.sellerId)
      return h ? `/@${enc(h)}` : `/vendeur/${enc(s.sellerId)}`
    }
    case 'shop': return s.shopKey ? `/boutique/${enc(s.shopKey)}` : '/boutiques'
    case 'shops': return '/boutiques'
    case 'categories': return '/categories'
    case 'search':
      return s.category && !s.searchTerm
        ? `/categorie/${enc(s.category)}${s.categoryCity ? `/${enc(s.categoryCity)}` : ''}`
        : s.searchTerm ? `/recherche?q=${enc(s.searchTerm)}` : '/recherche'
    case 'flash-offers': return s.campaignSlug ? `/bonnes-affaires/${enc(s.campaignSlug)}` : '/bonnes-affaires'
    case 'legal': return s.legalSlug ? `/legal/${enc(s.legalSlug)}` : '/'
    case 'auth': return '/connexion'
    case 'help': return s.helpSlug ? `/aide/${enc(s.helpSlug)}` : '/aide'
    default: return '/compte'
  }
}

// The page a storefront URL opens; null = the home page (or unknown).
export function parsePath(pathname: string): Route | null {
  const seg = pathname.split('/').filter(Boolean).map(s => { try { return decodeURIComponent(s) } catch { return s } })
  const [head, key] = seg
  if (!head) return null
  if (head === 'annonce' && key) {
    const id = UUID.exec(key)?.[1] ?? key
    return { page: 'listing-detail', listingId: id }
  }
  if (head === 'vendeur' && key) return { page: 'seller-profile', sellerId: key }
  // dilchap.com/@handle (resolved by SellerProfile).
  if (head.startsWith('@') && head.length > 1 && !key) return { page: 'seller-profile', sellerId: head.toLowerCase() }
  if (head === 'boutique' && key) return { page: 'shop', shopKey: key }
  if (head === 'boutiques') return { page: 'shops' }
  if (head === 'categories') return { page: 'categories' }
  if (head === 'categorie' && key) return seg[2] ? { page: 'search', category: key, categoryCity: seg[2] } : { page: 'search', category: key }
  if (head === 'recherche') return { page: 'search' }
  if (head === 'bonnes-affaires') return { page: 'flash-offers', campaignSlug: key ?? '' }
  if (head === 'legal' && key) return { page: 'legal', legalSlug: key }
  if (head === 'connexion') return { page: 'auth' }
  if (head === 'aide') return { page: 'help', helpSlug: key ?? '' }
  if (head === 'compte') return { page: 'account' }
  return null
}

// Same page and item (the words before a listing id don't count).
export function samePlace(a: string, b: string): boolean {
  const pa = parsePath(a.split('?')[0])
  const pb = parsePath(b.split('?')[0])
  if (!pa || !pb) return !pa && !pb
  return JSON.stringify(pa) === JSON.stringify(pb)
}
