import type { CSSProperties } from 'react'

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'wordmark'
  colorMode?: 'red' | 'white' | 'yellow'
  className?: string
  style?: CSSProperties
}

export default function DilchapLogo({ size = 'md', variant = 'wordmark', colorMode = 'red', className, style }: Props) {
  // The "Circulaire Dynamique" identity: lowercase wordmark + the green
  // trust dot. The bitmap logo stays available for places that need the
  // square pictogram (PWA icon, install prompts).
  if (variant === 'wordmark') {
    const fontSize = { sm: 22, md: 26, lg: 32, xl: 40 }[size]
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 3, userSelect: 'none', ...style }}>
        <span style={{ fontSize, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: colorMode === 'white' ? '#FFFFFF' : 'var(--primary)' }}>dilchap</span>
        <span style={{ width: fontSize * 0.26, height: fontSize * 0.26, borderRadius: '50%', background: 'var(--tertiary)', marginTop: fontSize * 0.08, flexShrink: 0 }} />
      </span>
    )
  }
  const height = { sm: 32, md: 42, lg: 56, xl: 72 }[size]
  return <img src={variant === 'icon' ? '/icon-192.png' : '/logo-dilchap.png'} alt="Dilchap" className={className} style={{ display: 'block', width: variant === 'icon' ? height : 'auto', height, objectFit: 'contain', flexShrink: 0, userSelect: 'none', ...style }} />
}
