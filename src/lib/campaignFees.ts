import { creditsLabel } from '../components/Credits'
import campaign from '../i18n/ns/campaign'

// Participation fees of a Dilchap campaign, in credits: a flat fee per
// seller (« frais de participation ») and/or a price per accepted item.
// Tiers replace them for sellers holding a status (the cheapest applicable
// one wins, as the API computes it).
export type Fees = { entryFee: number; listingFee: number }
export type FeeTierStatus = 'KYC' | 'BADGE_VERIFIED' | 'BADGE_CERTIFIED' | 'OFFICIAL_SHOP'
export type FeeTier = Fees & { status: FeeTierStatus }

export const TIER_LABEL: Record<FeeTierStatus, string> = {
  get KYC() { return campaign.t('tier.KYC') },
  get BADGE_VERIFIED() { return campaign.t('tier.BADGE_VERIFIED') },
  get BADGE_CERTIFIED() { return campaign.t('tier.BADGE_CERTIFIED') },
  get OFFICIAL_SHOP() { return campaign.t('tier.OFFICIAL_SHOP') },
}

// "Participation gratuite", "20 crédits de participation + 5 crédits par
// article accepté"…
export const feeText = (c: Fees) => {
  const f = creditsLabel
  if (c.entryFee && c.listingFee) return campaign.t('fee.both', { entry: f(c.entryFee), item: f(c.listingFee) })
  if (c.entryFee) return campaign.t('fee.entry', { entry: f(c.entryFee) })
  if (c.listingFee) return campaign.t('fee.item', { item: f(c.listingFee) })
  return campaign.t('fee.free')
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
      { label: campaign.t('fee.base'), text: feeText(base) },
      ...lower.map((t) => ({ label: TIER_LABEL[t.status], text: feeText(t) })),
    ],
    anyPaid: !free(base) || lower.some((t) => !free(t)),
  }
}
