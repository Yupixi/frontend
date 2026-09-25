import type { CSSProperties } from 'react'

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
export function CategoryIcon({ icon, size = 28, className }: { icon: string, size?: number, className?: string }) {
  if (/^[a-z0-9_]+$/.test(icon)) return <Icon name={icon} size={size} className={className} />
  return <span className={className} style={{ fontSize: size * 0.9, lineHeight: 1 }}>{icon}</span>
}
