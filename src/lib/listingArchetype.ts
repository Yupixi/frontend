import type { RemoteListing } from '../graphql/listings'

// Card presentation varies by SUBCATEGORY, not category — "Covoiturage" and
// "Cours particuliers" both live under the "Services" category (they share
// the same CategoryAttribute set: disponibilite/tarif) but should not look
// alike. Each archetype below reads only real fields the seller actually
// filled in (attributes/city/tags) — nothing here is invented.
export type ArchetypeKey =
  | 'route'
  | 'rateService'
  | 'vehicle'
  | 'realEstate'
  | 'fashion'
  | 'job'
  | 'animal'
  | 'default'

// Keyed by subcategory slug (slugify(name) at seed time — see Backend
// prisma/seed.ts). Every slug from prisma/seed-data/categories.ts is
// accounted for; anything new defaults to 'default' automatically.
const SUBCATEGORY_ARCHETYPE: Record<string, ArchetypeKey> = {
  covoiturage: 'route',

  'cours-particuliers': 'rateService',
  'services-a-la-personne': 'rateService',
  'services-de-reparations': 'rateService',
  'services-evenementiels': 'rateService',
  'baby-sitting': 'rateService',
  billetterie: 'rateService',
  'artistes-musiciens': 'rateService',
  'services-de-demenagement': 'rateService',
  'services-aux-animaux': 'rateService',
  'autres-services': 'rateService',

  voitures: 'vehicle',
  motos: 'vehicle',
  caravaning: 'vehicle',
  utilitaires: 'vehicle',
  camions: 'vehicle',
  nautisme: 'vehicle',
  'equipement-auto': 'vehicle',
  'equipement-moto': 'vehicle',

  'ventes-immobilieres': 'realEstate',
  locations: 'realEstate',
  colocations: 'realEstate',
  'bureaux-commerces': 'realEstate',
  'locations-saisonnieres': 'realEstate',

  vetements: 'fashion',
  chaussures: 'fashion',
  'accessoires-bagagerie': 'fashion',
  'montres-bijoux': 'fashion',
  'vetements-bebe': 'fashion',

  'offres-d-emploi': 'job',
  'formations-professionnelles': 'job',

  animaux: 'animal',
  'accessoires-animaux': 'animal',
  'animaux-de-ferme': 'animal',
}

export function getArchetype(listing: RemoteListing): ArchetypeKey {
  const slug = listing.subcategory?.slug
  return (slug && SUBCATEGORY_ARCHETYPE[slug]) || 'default'
}

export const ARCHETYPE_ACCENT: Record<ArchetypeKey, string> = {
  route: '#0EA5E9',
  rateService: '#F59E0B',
  vehicle: '#F59E0B',
  realEstate: '#3B82F6',
  fashion: '#EC4899',
  job: '#6366F1',
  animal: '#84CC16',
  default: '#FE0000',
}

function attr(listing: RemoteListing, key: string): string | undefined {
  const v = listing.attributes?.[key]
  const s = v == null ? '' : String(v).trim()
  return s || undefined
}

// The line that makes each subcategory read differently at a glance — only
// built from attributes the seller actually filled in; returns null (falls
// back to the plain location line) when nothing archetype-specific is set.
export function archetypeHighlight(listing: RemoteListing): string | null {
  switch (getArchetype(listing)) {
    case 'route': {
      const dispo = attr(listing, 'disponibilite')
      return dispo ? `Départ ${listing.city} · ${dispo}` : `Départ ${listing.city}`
    }
    case 'rateService': {
      const parts = [attr(listing, 'tarif'), attr(listing, 'disponibilite')].filter(Boolean)
      return parts.length ? parts.join(' · ') : null
    }
    case 'vehicle': {
      const brandModel = [attr(listing, 'marque'), attr(listing, 'modele')].filter(Boolean).join(' ')
      const km = attr(listing, 'kilometrage')
      const parts = [
        brandModel || undefined,
        attr(listing, 'annee'),
        km ? `${Number(km).toLocaleString('fr-FR')} km` : undefined,
      ].filter(Boolean)
      return parts.length ? parts.join(' · ') : null
    }
    case 'realEstate': {
      const surface = attr(listing, 'surface')
      const pieces = attr(listing, 'pieces')
      const parts = [
        surface ? `${surface} m²` : undefined,
        pieces ? `${pieces} pièce${pieces === '1' ? '' : 's'}` : undefined,
        attr(listing, 'meuble'),
      ].filter(Boolean)
      return parts.length ? parts.join(' · ') : null
    }
    case 'fashion': {
      const parts = [attr(listing, 'taille'), attr(listing, 'etat')].filter(Boolean)
      return parts.length ? parts.join(' · ') : null
    }
    case 'job': {
      const parts = [attr(listing, 'contrat'), attr(listing, 'secteur')].filter(Boolean)
      return parts.length ? parts.join(' · ') : null
    }
    case 'animal': {
      const parts = [attr(listing, 'type'), attr(listing, 'age')].filter(Boolean)
      return parts.length ? parts.join(' · ') : null
    }
    default:
      return null
  }
}

// Emploi has requiresPrice: false — there's never a real `price` to show,
// but sellers do fill in a free-text `salaire` field, so surface that
// instead of the generic "Prix sur demande" fallback.
export function archetypePriceFallback(listing: RemoteListing): string | undefined {
  if (getArchetype(listing) !== 'job') return undefined
  return attr(listing, 'salaire')
}

export function archetypePriceSuffix(listing: RemoteListing): string | null {
  const archetype = getArchetype(listing)
  if (archetype === 'route') return '/trajet'
  if (archetype === 'rateService' && attr(listing, 'tarif') === "À l'heure") return '/h'
  return null
}
