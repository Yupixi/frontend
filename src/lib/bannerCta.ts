// BO-authored banner CTAs store a path like "/search" (mirroring how a
// real router would); this app navigates via named pages instead, so an
// internal-looking path maps to its page name, external links open in a
// new tab.
export function followBannerCta(ctaUrl: string, onNavigate: (page: any) => void) {
  if (/^https?:\/\//.test(ctaUrl)) {
    window.open(ctaUrl, '_blank', 'noopener,noreferrer')
    return
  }
  onNavigate(ctaUrl.replace(/^\//, ''))
}
