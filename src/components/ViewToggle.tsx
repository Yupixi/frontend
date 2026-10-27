import { useEffect, useState } from 'react'
import { Grid, List } from './icons'
import { useT } from '../i18n'
import layout from '../i18n/ns/layout'

type ViewToggleProps = {
  viewMode: 'grid' | 'list'
  onChange: (mode: 'grid' | 'list') => void
}

const MODES = [
  { mode: 'grid' as const, icon: Grid, labelKey: 'viewToggle.grid' as const },
  { mode: 'list' as const, icon: List, labelKey: 'viewToggle.list' as const },
]

// List view only makes sense as a compact layout for small screens — on
// desktop there's room for the grid, so the toggle (and the choice itself)
// disappears there rather than leaving a single-option control on screen.
export default function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  const t = useT(layout)
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (isDesktop && viewMode === 'list') onChange('grid')
  }, [isDesktop, viewMode, onChange])

  if (isDesktop) return null

  return (
    <div className="view-toggle" role="group" aria-label={t('viewToggle.aria')}>
      {MODES.map(({ mode, icon: Icon, labelKey }) => {
        const label = t(labelKey)
        return (
        <button
          key={mode}
          type="button"
          className={`view-toggle-btn${viewMode === mode ? ' active' : ''}`}
          onClick={() => onChange(mode)}
          title={label}
          aria-pressed={viewMode === mode}
        >
          <Icon size={17} strokeWidth={2.2} />
          <span className="view-toggle-label">{label}</span>
        </button>
        )
      })}
    </div>
  )
}
