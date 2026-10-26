import common from '../i18n/ns/common'
import { fmtNumber } from '../i18n/format'

const t = common.t

export function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return t('justNow')
  if (minutes < 60) return t('minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return t('daysAgo', { count: days })
  const months = Math.floor(days / 30)
  if (months < 12) return t('monthsAgo', { count: months })
  return t('yearsAgo', { count: Math.floor(months / 12) })
}

// In the page's language: « 1 815 », « 22,8 » (no-break spaces the font has)
// in French, « 1,815 », « 22.8 » in English.
export function formatNumber(n: number, maximumFractionDigits = 1): string {
  return fmtNumber(n, maximumFractionDigits)
}

// How a concluded hand-over was validated (receipts).
export const handoverProof = (m: { handedOverAt: string | null; handoverMethod?: 'CODE' | 'SELLER_DECLARED' | null } | null | undefined) =>
  !m?.handedOverAt ? t('handoverMediation')
    : m.handoverMethod === 'SELLER_DECLARED' ? t('handoverSellerConfirmed')
      : t('handoverCode')

// The 4-digit code was really typed (not a seller declaration, nor a deal
// closed by mediation or without a meet-up): only then may a receipt say
// « validée par code ».
export const handoverByCode = (m: { handedOverAt: string | null; handoverMethod?: 'CODE' | 'SELLER_DECLARED' | null } | null | undefined) =>
  !!m?.handedOverAt && m.handoverMethod !== 'SELLER_DECLARED'

// Receipt headline matching how the sale was actually closed.
export const handoverHeadline = (m: Parameters<typeof handoverByCode>[0]) =>
  handoverByCode(m) ? t('handoverHeadlineCode') : m?.handedOverAt ? t('handoverSellerConfirmed') : t('handoverHeadlineSold')

// Listing descriptions are rich text (HTML from the editor): card excerpts
// need the words only.
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' }
export function plainText(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#39|[a-z]+);/gi, (m, e: string) => ENTITIES[e.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
}

// « Liberté 6, Dakar »: the place typed by the seller, then the city — once
// (the place often already ends with it: never « Liberté 6, Dakar, Dakar »).
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
export function placeLabel(l: { locationLabel?: string | null; city: string }): string {
  const label = l.locationLabel?.trim()
  if (!label) return l.city
  if (!l.city) return label
  const parts = label.split(',').map(fold)
  return parts.includes(fold(l.city)) ? label : `${label}, ${l.city}`
}

// « Taille M », never « Taille Taille unique ».
export const sizeLabel = (size: string) => (/^(taille|size)\b/i.test(size.trim()) ? size.trim() : t('size', { size }))
