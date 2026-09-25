import AnimatedIcon, { hasAnimatedIcon } from './AnimatedIcon'
import type { CSSProperties } from 'react'
import { ensureIcon, extraIconFamily, isBundledIcon } from '../lib/iconFont'

type IconProps = {
  // Material Symbols ligature name, e.g. "favorite", "chat", "location_on".
  name: string
  size?: number
  fill?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

// The Stitch mockups use Material Symbols Outlined throughout — this is the
// single icon primitive for the storefront (font loaded in index.css).
export default function Icon({ name, size = 20, fill, className, style, title }: IconProps) {
  return (
    <span
      className={`ms${fill ? ' ms-fill' : ''}${className ? ` ${className}` : ''}`}
      style={{ fontSize: size, width: size, height: size, ...style }}
      aria-hidden={title ? undefined : true}
      title={title}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {name}
    </span>
  )
}

// Category icons are stored as Material Symbols names (BO-editable); older
// rows may still hold an emoji, rendered as-is.
// Category icons come from the DB (Material names). The ones with an
// Iconsax animation (src/assets/lottie/cat-<name>.json) play when their
// tile first shows (staggered with `delay`) and on hover / press.
export function CategoryIcon({ icon, size = 28, className, delay }: { icon: string, size?: number, className?: string, delay?: number }) {
  if (hasAnimatedIcon(`cat-${icon}`)) {
    // Iconsax artwork has more inner padding than Material Symbols: scale it up a bit.
    return <AnimatedIcon name={`cat-${icon}`} fallback={icon} size={Math.round(size * 1.15)} className={className} playOnView={delay ?? 0} playOnInteract />
  }
  if (/^[a-z0-9_]+$/.test(icon)) {
    if (isBundledIcon(icon)) return <Icon name={icon} size={size} className={className} />
    ensureIcon(icon)
    return (
      <span
        className={`ms ms-x${className ? ` ${className}` : ''}`}
        data-ms={icon}
        style={{ fontSize: size, width: size, height: size, fontFamily: `'${extraIconFamily(icon)}'` }}
        aria-hidden
      >
        {icon}
      </span>
    )
  }
  return <span className={className} style={{ fontSize: size * 0.9, lineHeight: 1 }}>{icon}</span>
}
