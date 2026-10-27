import type { CampaignAction, OpenCampaign } from '../graphql/shops'
import campaign from '../i18n/ns/campaign'

// The buttons that get what a seller lacks for a Dilchap campaign (the
// server says what: `actions`, `blockedCode`); shared by « Campagnes
// Dilchap » and the listing wizard.
export type CampaignButton = { page: string; icon: string; label: string }

export const ACTION_BUTTON: Record<CampaignAction, CampaignButton> = {
  BADGE: { page: 'seller-badge', icon: 'verified', get label() { return campaign.t('action.badge') } },
  KYC: { page: 'seller-kyc', icon: 'badge', get label() { return campaign.t('action.kyc') } },
  SHOP: { page: 'seller-shop', icon: 'storefront', get label() { return campaign.t('action.shop') } },
}

// Certified sellers' head start: the badge that skips it.
export const EARLY_ACCESS_BUTTON: CampaignButton = { page: 'seller-badge', icon: 'verified', get label() { return campaign.t('action.earlyAccess') } }

// Why this seller cannot join now, in the server's words, with the useful
// buttons (empty reason = nothing in the way). `wizard`: joining from the
// listing form, which never takes a place on the waiting list.
export function campaignBlock(c: OpenCampaign, wizard = false): { reason: string; buttons: CampaignButton[] } | null {
  if (!c.eligible)
    return {
      reason: [c.ineligibleMessage?.trim(), campaign.t('block.missing', { list: c.missing.join(campaign.t('block.missingSep')) })].filter(Boolean).join(' '),
      buttons: c.actions.map(a => ACTION_BUTTON[a]),
    }
  if (c.blockedReason)
    return {
      reason: c.blockedReason,
      buttons: c.blockedCode === 'EARLY_ACCESS' ? [EARLY_ACCESS_BUTTON]
        : c.blockedCode === 'SELLER_LIMIT' && wizard ? [{ page: 'seller-campaigns', icon: 'campaign', label: campaign.t('action.myEntries') }]
          : [],
    }
  if (wizard && c.placesLeft === 0)
    return {
      reason: c.waitlist ? campaign.t('block.fullWaitlist') : campaign.t('block.full'),
      buttons: c.waitlist ? [{ page: 'seller-campaigns', icon: 'campaign', label: campaign.t('action.seeInCampaigns') }] : [],
    }
  return null
}
