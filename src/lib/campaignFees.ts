import { creditsLabel } from '../components/Credits'

// Participation fees of a Dilchap campaign, in credits: a flat fee per
// seller (« frais de participation ») and/or a price per accepted item.
// Tiers replace them for sellers holding a status (the cheapest applicable
// one wins, as the API computes it).
export type Fees = { entryFee: number; listingFee: number }
export type FeeTierStatus = 'KYC' | 'BADGE_VERIFIED' | 'BADGE_CERTIFIED' | 'OFFICIAL_SHOP'
export type FeeTier = Fees & { status: FeeTierStatus }

export const TIER_LABEL: Record<FeeTierStatus, string> = {
  KYC: 'Identité vérifiée',
  BADGE_VERIFIED: 'Compte vérifié',
  BADGE_CERTIFIED: 'Vendeur certifié',
  OFFICIAL_SHOP: 'Boutique officielle',
}

// "Participation gratuite", "20 crédits de participation + 5 crédits par
// article accepté"…
export const feeText = (c: Fees) => {
  const f = creditsLabel
  if (c.entryFee && c.listingFee) return `${f(c.entryFee)} de participation + ${f(c.listingFee)} par article accepté`
  if (c.entryFee) return `${f(c.entryFee)} de participation (forfait)`
  if (c.listingFee) return `${f(c.listingFee)} par article accepté`
  return 'Participation gratuite'
}

const total = (f: Fees) => f.entryFee + f.listingFee
const free = (f: Fees) => total(f) === 0

// For a visitor whose status is unknown: the base price and, when some
// statuses pay less, the cheapest one (« à partir de ») with the detail.
export function feeOptions(base: Fees, tiers: FeeTier[] | null | undefined) {
  const lower = (tiers ?? []).filter((t) => total(t) < total(base))
  const cheapest = lower.reduce<Fees>((best, t) => (total(t) < total(best) ? t : best), base)
  return {
    // Everyone pays the same.
    single: lower.length === 0,
    cheapest,
    lines: [
      { label: 'Tarif de base', text: feeText(base) },
      ...lower.map((t) => ({ label: TIER_LABEL[t.status], text: feeText(t) })),
    ],
    anyPaid: !free(base) || lower.some((t) => !free(t)),
  }
}
