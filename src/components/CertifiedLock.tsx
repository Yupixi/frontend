import Icon from './Icon'

// Placeholder for a perk of the "Vendeur certifié" badge the viewer does
// not have yet: what it is, and the way to get it.
export default function CertifiedLock({ title, text, items, onUpgrade, className = '' }: {
  title: string
  text: string
  items?: string[]
  onUpgrade: () => void
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-dashed border-tertiary/40 bg-surface-lowest p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="lock" size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-label-lg text-on-surface">{title} <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-tertiary-soft px-1.5 py-0.5 text-label-sm text-tertiary"><Icon name="verified" size={13} fill /> Vendeur certifié</span></div>
          <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{text}</p>
          {items && items.length > 0 && (
            <ul className="m-0 mt-2 grid list-none grid-cols-1 gap-1 p-0 sm:grid-cols-2">
              {items.map(i => <li key={i} className="flex items-center gap-1.5 text-body-sm text-on-surface"><Icon name="check" size={16} className="shrink-0 text-tertiary" /> {i}</li>)}
            </ul>
          )}
        </div>
      </div>
      <button onClick={onUpgrade} className="mt-3 flex h-10 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-tertiary px-4 text-label-md text-white"><Icon name="verified" size={17} fill /> Devenir Vendeur certifié</button>
    </section>
  )
}
