import { Grid, List } from 'lucide-react'

type ViewToggleProps = {
  viewMode: 'grid' | 'list'
  onChange: (mode: 'grid' | 'list') => void
}

export default function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="group" aria-label="Mode d'affichage">
      {[{ mode: 'grid', icon: Grid, label: 'Grille' }, { mode: 'list', icon: List, label: 'Liste' }].map(({ mode, icon: Icon, label }) => (
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
