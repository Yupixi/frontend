import { useEffect, useState } from 'react'
import { Grid, List } from 'lucide-react'

type ViewToggleProps = {
  viewMode: 'grid' | 'list'
  onChange: (mode: 'grid' | 'list') => void
}

const MODES = [
  { mode: 'grid' as const, icon: Grid, label: 'Grille' },
  { mode: 'list' as const, icon: List, label: 'Liste' },
]

// List view only makes sense as a compact layout for small screens — on
// desktop there's room for the grid, so the toggle (and the choice itself)
// disappears there rather than leaving a single-option control on screen.
export default function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
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
    <div className="view-toggle" role="group" aria-label="Mode d'affichage">
      {MODES.map(({ mode, icon: Icon, label }) => (
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
      ))}
    </div>
  )
}
