import Icon from './Icon'
import { useAdultModeOn } from '../lib/adultMode'

// « Section Adultes »: the thin strip on top of its dark theme
// (lib/adultMode.ts), with the way out of its space: « Quitter », back to
// the general marketplace's home page (nothing of the section kept).
export default function AdultModeBar({ onLeave }: { onLeave: () => void }) {
  const on = useAdultModeOn()
  if (!on) return null
  return (
    <div role="region" aria-label="Section Adultes" data-testid="adult-mode-bar" className="flex h-9 shrink-0 items-center justify-between gap-3 border-0 border-b border-solid border-outline-variant bg-surface-container-low px-4 lg:px-12">
      <span className="flex min-w-0 items-center gap-2 text-label-sm uppercase text-on-surface">
        <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-4 tracking-normal text-white">18+</span>
        <span className="truncate">Section Adultes</span>
      </span>
      <button type="button" onClick={onLeave} className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-solid border-outline-variant bg-transparent px-3 py-1 text-label-md text-on-surface hover:bg-surface-container">
        <Icon name="logout" size={15} /> Quitter
      </button>
    </div>
  )
}
