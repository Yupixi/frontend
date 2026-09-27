import AnimatedIcon, { hasAnimatedIcon } from './AnimatedIcon'
import type { CSSProperties } from 'react'
import { ensureIcon, extraIconFamily, isBundledIcon } from '../lib/iconFont'
import { GLYPHS, MATERIAL_TO_ICONSAX } from '../lib/iconsaxGlyphs'

type IconProps = {
  // Material Symbols ligature name, e.g. "favorite", "chat", "location_on".
  name: string
  size?: number
  fill?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

// Iconsax artwork for a Material Symbols name (Linear, or Bold when filled
// and shipped), or null when the name has no Iconsax counterpart.
export function iconsaxGlyph(name: string, filled?: boolean): string | null {
  const g = GLYPHS[MATERIAL_TO_ICONSAX[name]]
  if (!g) return null
  return (filled && g[1]) || g[0]
}

// Inline Iconsax SVG in the current text colour, sized like the font icon.
export function IconsaxSvg({ glyph, size, className, style, title, onClick }: { glyph: string, size: number, className?: string, style?: CSSProperties, title?: string, onClick?: () => void }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={`isx${className ? ` ${className}` : ''}`}
      style={style}
      onClick={onClick}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: title ? `<title>${title.replace(/</g, '&lt;')}</title>${glyph}` : glyph }}
    />
  )
}

// Names come from the Material Symbols vocabulary (the Stitch mockups' icon
// font) but render as Iconsax — the family of the animated icons — whenever
// scripts/iconsax-map.txt has a counterpart; the font is only the fallback.
export default function Icon({ name, size = 20, fill, className, style, title }: IconProps) {
  const glyph = iconsaxGlyph(name, fill)
  if (glyph) return <IconsaxSvg glyph={glyph} size={size} className={className} style={style} title={title} />
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
    if (isBundledIcon(icon) || iconsaxGlyph(icon)) return <Icon name={icon} size={size} className={className} />
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
