import { dateFormat } from './intl'
import { formatNumber } from './format'
import { creditsLabel } from '../components/Credits'
import { fmtDate, fmtTime, getLocale } from '../i18n'
import boost from '../i18n/ns/boost'
import type { BumpEntry, BumpPosition } from '../graphql/bumps'

// Wording of the bump proof, one place for every screen (Mes annonces,
// Booster, the listing page, the history).

const t = boost.t

// « 14 h 32 » (« 14:32 » in English)
export function clock(iso: string | Date) {
  const hhmm = fmtTime(iso)
  return getLocale() === 'fr' ? hhmm.replace(':', ' h ') : hhmm
}

const dayKey = (d: Date) => dateFormat('fr-CA').format(d)

// « aujourd’hui à 18 h », « demain à 18 h », « le 24 oct. à 18 h »
export function whenLabel(iso: string) {
  const at = new Date(iso)
  const time = getLocale() === 'fr' ? clock(at).replace(/ h 00$/, ' h') : clock(at)
  const now = new Date()
  if (dayKey(at) === dayKey(now)) return t('bump.when.today', { time })
  if (dayKey(at) === dayKey(new Date(now.getTime() + 86_400_000))) return t('bump.when.tomorrow', { time })
  if (dayKey(at) === dayKey(new Date(now.getTime() - 86_400_000))) return t('bump.when.yesterday', { time })
  return t('bump.when.date', { date: fmtDate(at, { day: 'numeric', month: 'short' }), time })
}

// « Remontée il y a 12 min » (the minute it is rendered: no ticking timer).
export function agoLabel(iso: string) {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))
  if (min < 1) return t('bump.ago.now')
  if (min < 60) return t('bump.ago.minutes', { n: String(min) })
  const h = Math.floor(min / 60)
  if (h < 24) return t('bump.ago.hours', { n: String(h) })
  const d = Math.floor(h / 24)
  return d === 1 ? t('bump.ago.yesterday') : t('bump.ago.days', { n: String(d) })
}

// « 1re », « 2e » (« 1st », « 2nd »)
export const ordinal = (n: number) => {
  const vars = { n: String(n) }
  if (n === 1) return t('ordinal.first', vars)
  const tens = n % 100
  if (n % 10 === 1 && tens !== 11) return t('ordinal.st', vars)
  if (n % 10 === 2 && tens !== 12) return t('ordinal.nd', vars)
  if (n % 10 === 3 && tens !== 13) return t('ordinal.rd', vars)
  return t('ordinal.other', vars)
}

// « 3e sur 128 en Mode à Abidjan »
export function placeLabel(p: Pick<BumpPosition, 'rank' | 'peers' | 'categoryName' | 'city'>) {
  return t('bump.place', { rank: ordinal(p.rank), peers: formatNumber(p.peers, 0), category: p.categoryName ?? t('bump.categoryFallback'), city: p.city })
}

// What a bump cost: « 5 crédits », « Offerte », « Incluse dans la formule ».
export function bumpCostLabel(b: Pick<BumpEntry, 'source' | 'credits' | 'offerPercent'>) {
  if (b.credits > 0) return b.offerPercent ? t('bump.cost.withOffer', { credits: creditsLabel(b.credits), percent: String(b.offerPercent) }) : creditsLabel(b.credits)
  if (b.source === 'AUTO') return t('bump.cost.included')
  if (b.source === 'STAFF' || (b.offerPercent ?? 0) >= 100) return t('bump.cost.offered')
  return t('bump.cost.free')
}
