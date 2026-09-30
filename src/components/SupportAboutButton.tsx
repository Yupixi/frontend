import Icon from './Icon'
import { requestSupport, type SupportAbout } from '../lib/navigation'

// « Contacter le support à propos de… »: opens the « Support » tab on a new
// conversation with this object attached.
export default function SupportAboutButton({ about, what, className = '', onBefore }: { about: SupportAbout; what: string; className?: string; onBefore?: () => void }) {
  return (
    <button type="button" onClick={() => { onBefore?.(); requestSupport(about) }} className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-solid border-outline-variant bg-surface-lowest px-3 py-2.5 text-label-md text-on-surface hover:bg-surface-container-low print:hidden ${className}`}>
      <Icon name="support_agent" size={18} className="shrink-0 text-primary" /> <span className="min-w-0">Contacter le support à propos de {what}</span>
    </button>
  )
}
