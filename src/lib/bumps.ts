import { dateFormat } from './intl'
import { formatNumber } from './format'
import { creditsLabel } from '../components/Credits'
import type { BumpEntry, BumpPosition } from '../graphql/bumps'

// Wording of the bump proof, one place for every screen (Mes annonces,
// Booster, the listing page, the history).

// « 14 h 32 »
export function clock(iso: string | Date) {
  return dateFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)).replace(':', ' h ')
}

const dayKey = (d: Date) => dateFormat('fr-CA').format(d)

// « aujourd’hui à 18 h », « demain à 18 h », « le 24 oct. à 18 h »
export function whenLabel(iso: string) {
  const at = new Date(iso)
  const hour = clock(at).replace(/ h 00$/, ' h')
  const now = new Date()
  if (dayKey(at) === dayKey(now)) return `aujourd’hui à ${hour}`
  if (dayKey(at) === dayKey(new Date(now.getTime() + 86_400_000))) return `demain à ${hour}`
  if (dayKey(at) === dayKey(new Date(now.getTime() - 86_400_000))) return `hier à ${hour}`
  return `le ${dateFormat('fr-FR', { day: 'numeric', month: 'short' }).format(at)} à ${hour}`
}

// « Remontée il y a 12 min » (the minute it is rendered: no ticking timer).
export function agoLabel(iso: string) {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'hier' : `il y a ${d} jours`
}

// « 1re », « 2e »
export const ordinal = (n: number) => (n === 1 ? '1re' : `${n}e`)

// « 3e sur 128 en Mode à Abidjan »
export function placeLabel(p: Pick<BumpPosition, 'rank' | 'peers' | 'categoryName' | 'city'>) {
  return `${ordinal(p.rank)} sur ${formatNumber(p.peers, 0)} en ${p.categoryName ?? 'catégorie'} à ${p.city}`
}

// What a bump cost: « 5 crédits », « Offerte », « Incluse dans la formule ».
export function bumpCostLabel(b: Pick<BumpEntry, 'source' | 'credits' | 'offerPercent'>) {
  if (b.credits > 0) return `${creditsLabel(b.credits)}${b.offerPercent ? ` (−${b.offerPercent} %)` : ''}`
  if (b.source === 'AUTO') return 'Incluse dans la formule'
  if (b.source === 'STAFF' || (b.offerPercent ?? 0) >= 100) return 'Offerte'
  return 'Gratuite'
}
