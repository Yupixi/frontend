import Icon from './Icon'
import type { SearchRouting } from '../lib/adult'

// « Section Adultes » routing of a search (Backend searchRouting):
// - pornographic or sexual-service words: Dilchap hosts none of it (with
//   the link to the section for products where it is open). Nothing else
//   happens to the member;
// - adult products found or asked for, without the access: a card to the
//   section's gate (the results never hold them);
// - a confirmed member: a link to the same search inside the section (the
//   general results never hold its listings).
export function AdultSearchNotice({ routing, onOpenSection, className = '' }: {
  routing: SearchRouting
  onOpenSection: (slug: string) => void
  className?: string
}) {
  const slug = routing.sectionAvailable ? routing.sectionSlug : null
  if (routing.intent === 'PORN')
    return (
      <div role="note" data-testid="porn-notice" className={`flex items-start gap-3 rounded-2xl bg-surface-container-low p-4 ${className}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant"><Icon name="block" size={20} /></span>
        <div className="min-w-0">
          <p className="m-0 text-label-lg text-on-surface">Dilchap n’héberge aucun contenu pornographique</p>
          <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Ni vidéos, photos ou abonnements, ni services sexuels. Les annonces de ce type sont retirées.</p>
          {slug && (
            <button type="button" onClick={() => onOpenSection(slug)} className="mt-2 inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary">
              Produits pour adultes : section Adultes (18+) <Icon name="arrow_forward" size={16} />
            </button>
          )}
        </div>
      </div>
    )
  if (routing.intent !== 'ADULT' || !slug) return null
  if (routing.access === 'OK')
    return (
      <p role="note" className={`m-0 flex items-center gap-2 text-body-sm text-on-surface-variant ${className}`}>
        <Icon name="lock" size={15} /> D’autres résultats sont dans la Section Adultes.
        <button type="button" onClick={() => onOpenSection(slug)} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">Voir dans la section</button>
      </p>
    )
  return (
    <button type="button" data-testid="adult-card" onClick={() => onOpenSection(slug)} className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border-none bg-inverse-surface p-4 text-left text-white ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15"><Icon name="lock" size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-label-lg">Des résultats sont réservés aux adultes</span>
        <span className="block text-body-sm text-white/80">Accéder à la section Adultes (18+)</span>
      </span>
      <Icon name="arrow_forward" size={18} className="shrink-0" />
    </button>
  )
}
