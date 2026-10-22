import Icon from './Icon'
import { agoLabel } from '../lib/bumps'
import type { PromoBadge, PromoBadgeKind } from '../graphql/listings'

// The one pill of a listing card / page: why the listing is placed where it
// is (« Badges des annonces », BO › Classement). The API sends it only while
// it really applies — the paid period running, the campaign live, the hours
// after a bump — in the Backoffice's words. Fixed colours with white (or
// green) text, AA on any photo and in both themes; no blur (repeated badge).
const LOOK: Record<PromoBadgeKind, { icon: string; fill?: boolean; cls: string }> = {
  FEATURED: { icon: 'star', fill: true, cls: 'bg-[#006947] text-white' },
  TURBO: { icon: 'bolt', fill: true, cls: 'bg-[#B00000] text-white' },
  URGENT: { icon: 'timer', cls: 'bg-[#9A3412] text-white' },
  PROMO: { icon: 'sell', cls: 'bg-[#1D4ED8] text-white' },
  BUMP: { icon: 'arrow_upward', cls: 'bg-white text-[#006947] shadow-sm' },
}

export function pillText(b: PromoBadge) {
  if (b.kind === 'PROMO') return b.percent ? `${b.label} -${b.percent} %` : b.label
  if (b.kind === 'BUMP') return b.at ? `${b.label} ${agoLabel(b.at)}` : b.label
  return b.label
}

export default function PromoPill({ badge, size = 'card', className = '' }: { badge: PromoBadge; size?: 'card' | 'page'; className?: string }) {
  const look = LOOK[badge.kind] ?? LOOK.FEATURED
  const text = pillText(badge)
  const big = size === 'page'
  return (
    <span
      title={text}
      className={`inline-flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap rounded-md font-bold ${big ? 'px-2 py-1 text-label-md' : 'px-1.5 py-0.5 text-[10px] md:px-2 md:text-label-sm'} ${badge.kind === 'BUMP' ? '' : 'uppercase'} ${look.cls} ${className}`}
    >
      <Icon name={look.icon} size={big ? 15 : 12} fill={look.fill} className="shrink-0" />
      {/* A narrow card cuts the label, never the discount. */}
      {badge.kind === 'PROMO' && badge.percent
        ? <><span className="min-w-0 truncate">{badge.label}</span><span className="shrink-0">-{badge.percent} %</span></>
        : <span className="truncate">{text}</span>}
    </span>
  )
}
