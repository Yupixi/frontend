// Ad campaign parameters of the landing address (?utm_source=facebook…,
// ?fbclid=…, ?gclid=…): read once when the app starts, then taken off the
// address bar, so no recording (Microsoft Clarity) and no page address sent
// later carries them. They are handed only to what needs them, after the
// visitor's consent:
// - Google Analytics: added to the first page_view (campaign of the visit,
//   lib/analytics), even when the banner is accepted on a later page;
// - the Meta Pixel: fbclid becomes Meta's own « _fbc » cookie (lib/metaPixel).
// None of them is personal: they name the ad, not the visitor.

export const CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'] as const
type CampaignParam = (typeof CAMPAIGN_PARAMS)[number]

// An e-mail address or a phone number never goes anywhere.
const PERSONAL = /@|\+?\d[\d\s.-]{7,}\d/
const VALID = /^[\w.\-~ %+:|/]{1,500}$/

let landing: Partial<Record<CampaignParam, string>> = {}
let gaTaken = false

/** Reads the campaign parameters of the address and removes them from the address bar (main.tsx, before the app). */
export function captureCampaignParams() {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    let found = false
    for (const k of CAMPAIGN_PARAMS) {
      if (!url.searchParams.has(k)) continue
      found = true
      const v = url.searchParams.get(k) ?? ''
      if (VALID.test(v) && !PERSONAL.test(v)) landing[k] = v.slice(0, k === 'fbclid' || k === 'gclid' ? 500 : 100)
      url.searchParams.delete(k)
    }
    if (found) window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  } catch {
    landing = {}
  }
}

/** UTM parameters and gclid for the first Google Analytics page view of the visit (once). */
export function takeGaCampaign(): [string, string][] {
  if (gaTaken) return []
  gaTaken = true
  return CAMPAIGN_PARAMS.filter((k) => k !== 'fbclid' && landing[k]).map((k) => [k, landing[k]!])
}

/** The Facebook click id of the landing address, if any. */
export const landingFbclid = () => landing.fbclid ?? null
