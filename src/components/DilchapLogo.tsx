import type { CSSProperties } from 'react'

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'wordmark'
  colorMode?: 'red' | 'white' | 'yellow'
  className?: string
  style?: CSSProperties
}

// public/logo-dilchap.png is 428×147.
const LOGO_RATIO = 428 / 147

export default function DilchapLogo({ size = 'md', variant = 'wordmark', colorMode = 'red', className, style }: Props) {
  // The official horizontal logo (red "di" + bell tile and the « dilchap »
  // wordmark, from the brand source files — see scripts/app-icon). The text
  // version only remains for the white variant (logo on a coloured band).
  if (variant === 'wordmark' && colorMode !== 'white') {
    const h = { sm: 30, md: 36, lg: 44, xl: 56 }[size]
    return (
      <img
        src="/logo-dilchap.png"
        alt="Dilchap"
        width={Math.round(h * LOGO_RATIO)}
        height={h}
        className={className}
        style={{ display: 'block', height: h, width: 'auto', flexShrink: 0, userSelect: 'none', ...style }}
        draggable={false}
      />
    )
  }
  if (variant === 'wordmark') {
    const fontSize = { sm: 22, md: 26, lg: 32, xl: 40 }[size]
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 3, userSelect: 'none', ...style }}>
        <span style={{ fontSize, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: '#FFFFFF' }}>dilchap</span>
        <span style={{ width: fontSize * 0.26, height: fontSize * 0.26, borderRadius: '50%', background: 'var(--tertiary)', marginTop: fontSize * 0.08, flexShrink: 0 }} />
      </span>
    )
  }
  const height = { sm: 32, md: 42, lg: 56, xl: 72 }[size]
  return <img src={variant === 'icon' ? '/icon-192.png' : '/logo-dilchap.png'} alt="Dilchap" className={className} style={{ display: 'block', width: variant === 'icon' ? height : 'auto', height, objectFit: 'contain', flexShrink: 0, userSelect: 'none', ...style }} />
}
