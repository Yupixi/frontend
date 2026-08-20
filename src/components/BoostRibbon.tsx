import { useQuery } from '@apollo/client/react'
import { SITEWIDE_RIBBON_QUERY, type RemoteBanner } from '../graphql/content'
import { followBannerCta } from '../lib/bannerCta'

// BO-managed promo (typically "boost your listing") shown at the top of
// seller-facing pages. Renders nothing when no banner is configured —
// unlike the hero/partners slots this one has no default content, it's
// purely optional marketing.
export default function BoostRibbon({ onNavigate }: { onNavigate: (p: any) => void }) {
  const { data } = useQuery<{ activeBanners: RemoteBanner[] }>(SITEWIDE_RIBBON_QUERY)
  const banner = data?.activeBanners[0]
  if (!banner?.imageUrl) return null

  const goToCta = () =>
    banner.ctaUrl ? followBannerCta(banner.ctaUrl, onNavigate) : onNavigate('seller-premium')

  return (
    <button
      type="button"
      onClick={goToCta}
      style={{ display: 'block', width: '100%', aspectRatio: '3.2 / 1', border: 'none', padding: 0, cursor: 'pointer', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: '1.5rem' }}
    >
      {/* These "boost" creatives tend to be exported on a much taller
          canvas than their actual content (lots of blank margin above and
          below the card itself) — cover-crop to the card's own ratio
          instead of showing the full canvas with its dead space. */}
      <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </button>
  )
}
