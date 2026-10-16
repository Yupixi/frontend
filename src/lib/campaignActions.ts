import type { CampaignAction, OpenCampaign } from '../graphql/shops'

// The buttons that get what a seller lacks for a Dilchap campaign (the
// server says what: `actions`, `blockedCode`); shared by « Campagnes
// Dilchap » and the listing wizard.
export type CampaignButton = { page: string; icon: string; label: string }

export const ACTION_BUTTON: Record<CampaignAction, CampaignButton> = {
  BADGE: { page: 'seller-badge', icon: 'verified', label: 'Obtenir un badge' },
  KYC: { page: 'seller-kyc', icon: 'badge', label: 'Vérifier mon identité' },
  SHOP: { page: 'seller-shop', icon: 'storefront', label: 'Ouvrir ma Boutique officielle' },
}

// Certified sellers' head start: the badge that skips it.
export const EARLY_ACCESS_BUTTON: CampaignButton = { page: 'seller-badge', icon: 'verified', label: 'Devenir Vendeur certifié' }

// Why this seller cannot join now, in the server's words, with the useful
// buttons (empty reason = nothing in the way). `wizard`: joining from the
// listing form, which never takes a place on the waiting list.
export function campaignBlock(c: OpenCampaign, wizard = false): { reason: string; buttons: CampaignButton[] } | null {
  if (!c.eligible)
    return {
      reason: [c.ineligibleMessage?.trim(), `Il vous faut : ${c.missing.join(' ; ')}.`].filter(Boolean).join(' '),
      buttons: c.actions.map(a => ACTION_BUTTON[a]),
    }
  if (c.blockedReason)
    return {
      reason: c.blockedReason,
      buttons: c.blockedCode === 'EARLY_ACCESS' ? [EARLY_ACCESS_BUTTON]
        : c.blockedCode === 'SELLER_LIMIT' && wizard ? [{ page: 'seller-campaigns', icon: 'campaign', label: 'Voir mes inscriptions' }]
          : [],
    }
  if (wizard && c.placesLeft === 0)
    return {
      reason: c.waitlist ? 'Campagne complète : inscrivez-vous sur la liste d’attente depuis « Campagnes Dilchap ».' : 'Campagne complète : toutes les places sont prises.',
      buttons: c.waitlist ? [{ page: 'seller-campaigns', icon: 'campaign', label: 'Voir dans Campagnes Dilchap' }] : [],
    }
  return null
}
