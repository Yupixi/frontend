import type { CSSProperties } from 'react'

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon'
  colorMode?: 'red' | 'white' | 'yellow'
  className?: string
  style?: CSSProperties
}

export default function DilchapLogo({ size = 'md', variant = 'full', className, style }: Props) {
  const height = { sm: 32, md: 42, lg: 56, xl: 72 }[size]
  return <img src={variant === 'icon' ? '/icon-dilchap-192.png' : '/logo-dilchap.png'} alt="Dilchap" className={className} style={{ display: 'block', width: variant === 'icon' ? height : 'auto', height, objectFit: 'contain', flexShrink: 0, userSelect: 'none', ...style }} />
}
