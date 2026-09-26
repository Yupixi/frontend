import Icon from './Icon'
import { BADGE_LABEL, type BadgeTier } from '../graphql/badges'

const TONE: Record<BadgeTier, { text: string, pill: string }> = {
  VERIFIED: { text: 'text-verified', pill: 'bg-verified-soft text-verified' },
  CERTIFIED: { text: 'text-tertiary', pill: 'bg-tertiary-soft text-tertiary' },
}

// Paid badge next to a member's name: the check alone (`icon`), or a pill
// with its label. Renders nothing without an active badge.
export default function SellerBadge({ tier, variant = 'icon', size = 16, short, className = '' }: {
  tier?: BadgeTier | null
  variant?: 'icon' | 'pill'
  size?: number
  // Pill: "Vérifié" / "Certifié" instead of the full label.
  short?: boolean
  className?: string
}) {
  if (!tier) return null
  const label = BADGE_LABEL[tier]
  if (variant === 'icon') return <Icon name="verified" size={size} fill className={`shrink-0 ${TONE[tier].text} ${className}`} title={label} />
  return (
    <span className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-label-sm ${TONE[tier].pill} ${className}`} title={label}>
      <Icon name="verified" size={size - 2} fill /> {short ? (tier === 'VERIFIED' ? 'Vérifié' : 'Certifié') : label}
    </span>
  )
}
