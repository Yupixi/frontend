import { gql } from '@apollo/client'
import type { FeeTier } from '../lib/campaignFees'
import campaignNs from '../i18n/ns/campaign'

// A live Dilchap campaign as the home promotions module and the campaign
// page show it: identity, window, figures, and a few items for the photos
// (the items themselves come from `listings(filter: { campaignId })`).
const CAMPAIGN_FIELDS = `
  id name slug description type themeColor startsAt endsAt visuals
  listingsCount sellersCount maxDiscountPercent featuredOnHome
  homeHero homeHeroAnimated homeHeroListings homeHeroTagline homeDealsRail
  listings { id discountPercent salePrice listing { id title coverImageUrl isAdult } }
`

// `country`: the visitor's market — only the campaigns running there, with
// their listings of that country; campaign(slug) is null elsewhere.
export const LIVE_CAMPAIGNS_QUERY = gql`
  query LiveCampaigns($country: String) { activeCampaigns(country: $country) { ${CAMPAIGN_FIELDS} } }
`

// The best deals the home hero animates: only what its cards print.
export const HERO_DEALS_QUERY = gql`
  query HeroDeals($filter: ListingFilterInput, $pageSize: Float) {
    listings(filter: $filter, sort: DISCOUNT_DESC, page: 1, pageSize: $pageSize) {
      items {
        id title price currency coverImageUrl
        activeCampaignDiscount { campaignId campaignName campaignSlug themeColor discountPercent salePrice }
      }
    }
  }
`

export type HeroDeal = {
  id: string; title: string; price: number | null; currency: string; coverImageUrl: string | null
  activeCampaignDiscount: { campaignId: string; discountPercent: number | null; salePrice: number | null } | null
}

export const CAMPAIGN_PAGE_QUERY = gql`
  query CampaignPage($slug: String!, $country: String) {
    campaign(slug: $slug, country: $country) {
      ${CAMPAIGN_FIELDS}
      status shopId openToShops entryFee listingFee minDiscountPercent sellerConditions sellerTerms feeTiers { status entryFee listingFee }
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
  // Shown in the home « Promotions en cours » (BO « Visibilité »; the API
  // already sorts by the BO's home order).
  featuredOnHome: boolean
  // The home hero taken over while live (BO « Visibilité »): its animations,
  // how many best deals it animates, its catchphrase (null = the type).
  homeHero: boolean; homeHeroAnimated: boolean; homeHeroListings: number; homeHeroTagline: string | null
  // Its « Les meilleures affaires » rail on the home (BO « Visibilité »).
  homeDealsRail: boolean
  listings: { id: string; discountPercent: number | null; salePrice: number | null; listing: { id: string; title: string; coverImageUrl: string | null } }[]
}

export type CampaignPage = LiveCampaign & {
  status: string; shopId: string | null; openToShops: boolean; entryFee: number; listingFee: number; minDiscountPercent: number | null
  // Lower fees for sellers holding a status (the cheapest applicable one wins).
  feeTiers: FeeTier[]
  // Every condition of participation in plain words, and the team's terms (rich text).
  sellerConditions: string[]; sellerTerms: string | null
  categoryCounts: { slug: string; name: string; icon: string | null; count: number }[]
}

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  get SALE() { return campaignNs.t('type.SALE') }, get FLASH() { return campaignNs.t('type.FLASH') },
  get SEASONAL() { return campaignNs.t('type.SEASONAL') }, get CUSTOM() { return campaignNs.t('type.CUSTOM') },
}

// The badge over a campaign's title (campaign page, home hero).
export const CAMPAIGN_HERO_BADGE: Record<CampaignType, string> = {
  get SALE() { return campaignNs.t('heroBadge.SALE') }, get FLASH() { return campaignNs.t('heroBadge.FLASH') },
  get SEASONAL() { return campaignNs.t('heroBadge.SEASONAL') }, get CUSTOM() { return campaignNs.t('heroBadge.CUSTOM') },
}

// Live = what the storefront may show (campaign(slug) also returns drafts
// and ended ones).
export const isLive = (c: { status?: string; startsAt: string; endsAt: string }) => {
  const now = Date.now()
  return (c.status === undefined || c.status === 'ACTIVE') && new Date(c.startsAt).getTime() <= now && new Date(c.endsAt).getTime() > now
}
