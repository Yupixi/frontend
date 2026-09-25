import { useState } from 'react'
import Icon from './Icon'

type Props = {
  src?: string | null
  alt?: string
  className?: string
  // Material Symbols name shown when there is no image or it fails to load.
  icon?: string
  iconSize?: number
  fallbackClassName?: string
}

// Listing covers can be missing or point to a dead file (seeded/removed
// uploads): show a neutral placeholder instead of the browser's broken-image glyph.
export default function SafeImg({ src, alt = '', className = 'h-full w-full object-cover', icon = 'image', iconSize = 22, fallbackClassName }: Props) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || failed === src) {
    return (
      <span className={fallbackClassName ?? 'flex h-full w-full items-center justify-center bg-surface-container text-on-surface-variant/70'} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
        <Icon name={icon} size={iconSize} />
      </span>
    )
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(src)} />
}
