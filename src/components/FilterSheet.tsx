import Icon, { CategoryIcon } from './Icon'
import BottomSheet from './BottomSheet'
import { formatNumber } from '../lib/format'
import type { ListingFacets, ListingSort } from '../graphql/listings'
import type { RemoteCategory } from '../graphql/categories'

// "Filtres de recherche" mobile bottom sheet (Stitch mockup). Filters
// apply live, the result count comes from the search query.
const SORTS: { value: ListingSort; label: string }[] = [
  { value: 'RECENT', label: 'Plus récents' },
  { value: 'PRICE_ASC', label: 'Prix croissant' },
  { value: 'PRICE_DESC', label: 'Prix décroissant' },
  { value: 'POPULAR', label: 'Populaires' },
]
const BUDGETS = [
  { label: 'Moins de 10 000 F', max: 10_000 },
  { label: '10 000 F - 50 000 F', min: 10_000, max: 50_000 },
  { label: '50 000 F - 150 000 F', min: 50_000, max: 150_000 },
  { label: 'Plus de 150 000 F', min: 150_000 },
]
const CONDITION_HINTS: Record<string, string> = {
  Neuf: 'Jamais utilisé, emballage d’origine',
  'Comme neuf': 'Impeccable, sans aucun défaut visible',
  'Très bon état': 'Légères marques d’usage minimes',
  'Bon état': 'Fonctionnel avec traces visibles d’utilisation',
  'Pour pièces': 'Défaut technique ou à restaurer',
}

export type SheetState = {
  sort: ListingSort
  cities: string[]
  minPrice: string
  maxPrice: string
  categorySlugs: string[]
  conditions: string[]
  verifiedOnly: boolean
  handoverOnly: boolean
  mobileMoneyOnly: boolean
}

type Props = {
  open: boolean
  state: SheetState
  onChange: (patch: Partial<SheetState>) => void
  onReset: () => void
  onClose: () => void
  facets?: ListingFacets
  categories: RemoteCategory[]
  total: number
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v])

function Section({ icon, title, sub, children }: { icon: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface-lowest p-4">
      <h3 className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><Icon name={icon} size={20} className="text-primary" /> {title}</h3>
      {sub && <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default function FilterSheet({ open, state, onChange, onReset, onClose, facets, categories, total }: Props) {
  const hist = facets?.priceHistogram ?? []
  const maxCount = Math.max(1, ...hist.map(b => b.count))
  const min = state.minPrice ? Number(state.minPrice) : null
  const max = state.maxPrice ? Number(state.maxPrice) : null
  const inRange = (b: { min: number; max: number }) => (min == null || b.max >= min) && (max == null || b.min <= max)
  const catCount = (slug: string) => facets?.categories.find(c => c.value === slug)?.count ?? 0
  const shownCategories = [...categories].sort((a, b) => catCount(b.slug) - catCount(a.slug)).slice(0, 6)

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filtres"
      maxHeight="94vh"
      footer={
        <div className="flex gap-3 border-0 border-t border-solid border-outline-variant bg-surface-lowest px-4 py-3">
          <button onClick={onReset} className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-surface-container text-on-surface" aria-label="Réinitialiser"><Icon name="restart_alt" size={22} /></button>
          <button onClick={onClose} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="search" size={20} /> Afficher les {formatNumber(total)} annonce{total > 1 ? 's' : ''}</button>
        </div>
      }
    >
      <div>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-lowest p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="tune" size={22} /></span>
          <div>
            <div className="text-headline-sm text-on-surface">Affiner les résultats</div>
            <div className="flex items-center gap-1 text-label-md text-tertiary"><span className="h-2 w-2 rounded-full bg-tertiary" /> {formatNumber(total)} annonce{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><Icon name="swap_vert" size={20} className="text-primary" /> Trier par</h3>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {SORTS.map(s => (
              <button key={s.value} onClick={() => onChange({ sort: s.value })} className={`shrink-0 cursor-pointer rounded-xl border-none px-4 py-2 text-label-md ${state.sort === s.value ? 'bg-inverse-surface text-white' : 'bg-surface-container text-on-surface'}`}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Section icon="location_on" title="Localisation & Communes" sub="Sélectionnez vos zones favorites pour la remise directe">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onChange({ cities: [] })} className={`cursor-pointer rounded-xl border-none px-3 py-2 text-label-md ${state.cities.length === 0 ? 'bg-inverse-surface text-white' : 'bg-surface-container text-on-surface'}`}>Toutes les zones</button>
              {(facets?.cities ?? []).slice(0, 8).map(c => (
                <button key={c.value} onClick={() => onChange({ cities: toggle(state.cities, c.value) })} className={`cursor-pointer rounded-xl border-none px-3 py-2 text-label-md ${state.cities.includes(c.value) ? 'bg-inverse-surface text-white' : 'bg-surface-container text-on-surface'}`}>{c.label}</button>
              ))}
            </div>
          </Section>

          <Section icon="payments" title="Fourchette de prix (F)">
            {hist.length > 1 && (
              <div className="flex h-16 items-end gap-1" aria-hidden>
                {hist.map(b => (
                  <span key={b.min} className={`flex-1 rounded-t ${inRange(b) ? (min != null || max != null ? 'bg-primary' : 'bg-primary/70') : 'bg-surface-container-high'}`} style={{ height: `${Math.max(8, (b.count / maxCount) * 100)}%` }} />
                ))}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([['Min', 'minPrice'], ['Max', 'maxPrice']] as const).map(([label, key]) => (
                <label key={key} className="rounded-xl bg-surface-container-low px-3 py-2">
                  <span className="block text-label-sm text-on-surface-variant">{label}</span>
                  <span className="flex items-center gap-1">
                    <input type="number" inputMode="numeric" min={0} value={state[key]} onChange={e => onChange({ [key]: e.target.value } as Partial<SheetState>)} placeholder={key === 'minPrice' ? '0' : '∞'} className="w-full min-w-0 border-none bg-transparent text-headline-sm text-on-surface outline-none" />
                    <span className="text-label-md text-primary">F</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUDGETS.map(b => {
                const active = state.minPrice === String(b.min ?? '') && state.maxPrice === String(b.max ?? '')
                return (
                  <button key={b.label} onClick={() => onChange(active ? { minPrice: '', maxPrice: '' } : { minPrice: String(b.min ?? ''), maxPrice: String(b.max ?? '') })} className={`cursor-pointer rounded-full border-none px-3 py-1.5 text-label-sm ${active ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface'}`}>{b.label}</button>
                )
              })}
            </div>
          </Section>

          <div>
            <h3 className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><Icon name="category" size={20} className="text-primary" /> Catégories phares</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {shownCategories.map(c => {
                const on = state.categorySlugs.includes(c.slug)
                return (
                  <button key={c.id} onClick={() => onChange({ categorySlugs: toggle(state.categorySlugs, c.slug) })} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-none p-3 text-left ${on ? 'bg-surface-container-high' : 'bg-surface-lowest'}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-primary text-white' : 'bg-surface-container-low text-primary'}`}><CategoryIcon icon={c.icon} size={22} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-label-md text-on-surface">{c.name}</span>
                      <span className={`block text-body-sm ${on ? 'text-primary' : 'text-on-surface-variant'}`}>{on ? 'Sélectionné' : `${formatNumber(catCount(c.slug))} annonce${catCount(c.slug) > 1 ? 's' : ''}`}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {!!facets?.conditions.length && (
            <Section icon="verified" title="État de l'article">
              <div className="flex flex-col gap-2">
                {facets.conditions.map(c => {
                  const on = state.conditions.includes(c.value)
                  return (
                    <label key={c.value} className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-container-low p-3">
                      <input type="checkbox" checked={on} onChange={() => onChange({ conditions: toggle(state.conditions, c.value) })} className="mt-0.5 h-5 w-5 accent-[#BB0013]" />
                      <span>
                        <span className="block text-label-md text-on-surface">{c.label} <span className="text-label-sm text-on-surface-variant">({c.count})</span></span>
                        {CONDITION_HINTS[c.value] && <span className="block text-body-sm text-on-surface-variant">{CONDITION_HINTS[c.value]}</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
            </Section>
          )}

          <Section icon="shield" title="Confiance & Transactions directes">
            {([
              ['verifiedOnly', 'verified_user', 'Vendeurs certifiés uniquement', 'Identité vérifiée par Dilchap'],
              ['handoverOnly', 'storefront', 'Remise en main propre privilégiée', 'Point de rendez-vous public indiqué'],
              ['mobileMoneyOnly', 'account_balance_wallet', 'Wave & Orange Money acceptés', 'Paiement mobile direct à la remise'],
            ] as const).map(([key, icon, title, sub]) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 py-2">
                <Icon name={icon} size={20} className="text-tertiary" />
                <span className="min-w-0 flex-1"><span className="block text-label-md text-on-surface">{title}</span><span className="block text-body-sm text-on-surface-variant">{sub}</span></span>
                <input type="checkbox" className="peer sr-only" checked={state[key]} onChange={() => onChange({ [key]: !state[key] } as Partial<SheetState>)} />
                <span className="relative h-6 w-11 shrink-0 rounded-full bg-surface-container-high transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-tertiary peer-checked:after:translate-x-5" />
              </label>
            ))}
          </Section>
        </div>
      </div>
    </BottomSheet>
  )
}
