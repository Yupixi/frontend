import { gql } from '@apollo/client'

// A live Dilchap campaign as the home promotions module and the campaign
// page show it: identity, window, figures, and a few items for the photos
// (the items themselves come from `listings(filter: { campaignId })`).
const CAMPAIGN_FIELDS = `
  id name slug description type themeColor startsAt endsAt visuals
  listingsCount sellersCount maxDiscountPercent
  listings { id discountPercent salePrice listing { id title coverImageUrl } }
`

// `country`: the visitor's market — only the campaigns running there, with
// their listings of that country; campaign(slug) is null elsewhere.
export const LIVE_CAMPAIGNS_QUERY = gql`
  query LiveCampaigns($country: String) { activeCampaigns(country: $country) { ${CAMPAIGN_FIELDS} } }
`

export const CAMPAIGN_PAGE_QUERY = gql`
  query CampaignPage($slug: String!, $country: String) {
    campaign(slug: $slug, country: $country) {
      ${CAMPAIGN_FIELDS}
      status shopId openToShops entryFee listingFee minDiscountPercent
      categoryCounts { slug name icon count }
    }
  }
`

export type CampaignType = 'SALE' | 'FLASH' | 'SEASONAL' | 'CUSTOM'

// Visuals the team designs per campaign (BO « Visuels »; backend
// campaign-visuals.ts). Empty slots fall back to the generated look.
export type VisualKind = 'image' | 'video' | 'lottie'
export type CampaignVisual = { kind: VisualKind; url: string; mobileUrl?: string; mobileKind?: VisualKind; alt?: string; link?: string }
export type CampaignVisuals = {
  hero?: CampaignVisual; homeCard?: CampaignVisual; banner?: CampaignVisual
  heroMode?: 'background' | 'artwork'; heroAnimated?: boolean; heroTone?: 'light' | 'dark'
}

export type LiveCampaign = {
  id: string; name: string; slug: string; description: string | null; type: CampaignType; themeColor: string | null
  startsAt: string; endsAt: string; visuals: CampaignVisuals | null
  listingsCount: number; sellersCount: number; maxDiscountPercent: number | null
  listings: { id: string; discountPercent: number | null; salePrice: number | null; listing: { id: string; title: string; coverImageUrl: string | null } }[]
}

export type CampaignPage = LiveCampaign & {
  status: string; shopId: string | null; openToShops: boolean; entryFee: number; listingFee: number; minDiscountPercent: number | null
  categoryCounts: { slug: string; name: string; icon: string | null; count: number }[]
}

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  SALE: 'Soldes', FLASH: 'Vente flash', SEASONAL: 'Saisonnière', CUSTOM: 'Campagne',
}

// Live = what the storefront may show (campaign(slug) also returns drafts
// and ended ones).
export const isLive = (c: { status?: string; startsAt: string; endsAt: string }) => {
  const now = Date.now()
  return (c.status === undefined || c.status === 'ACTIVE') && new Date(c.startsAt).getTime() <= now && new Date(c.endsAt).getTime() > now
}
