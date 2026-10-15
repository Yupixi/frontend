// One formula for every « -X % » of a campaign entry, the same as the API's
// (backend promotions/campaign-discount.ts): a fixed sale price wins over
// the entry's percent — the card prints the sale price first, so its badge
// must say what that price takes off. 0 when nothing comes off.
type Entry = { discountPercent: number | null; salePrice: number | null }

export function entryDiscountPercent(entry: Entry, price: number | null | undefined): number {
  if (entry.salePrice != null) {
    if (!price || price <= 0 || entry.salePrice >= price) return 0
    return Math.max(1, Math.round(((price - entry.salePrice) / price) * 100))
  }
  return entry.discountPercent != null && entry.discountPercent > 0 ? Math.min(100, Math.round(entry.discountPercent)) : 0
}

// « Jusqu’à -X % » of a campaign: its best real discount among the items
// the visitor is shown (Campaign.maxDiscountPercent, worked out by the API
// with the formula above), or nothing — never a made-up figure.
export const campaignBestDiscount = (c: { maxDiscountPercent: number | null }) =>
  c.maxDiscountPercent != null && c.maxDiscountPercent > 0 ? c.maxDiscountPercent : null

export const upToLabel = (c: { maxDiscountPercent: number | null }) => {
  const best = campaignBestDiscount(c)
  return best ? `Jusqu’à -${best} %` : null
}
