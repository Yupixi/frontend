import { useEffect, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from './Icon'
import Price from './Price'
import SafeImg from './SafeImg'
import { thumbnailUrl } from '../lib/media'
import { useMemberCountryCode } from '../lib/countries'
import { useRules } from '../lib/rules'
import {
  MY_SUPPORT_ATTACHABLES_QUERY, OBJECT_KINDS, OBJECT_KIND_ICON, OBJECT_KIND_LABEL,
  type SupportObjectCard, type SupportObjectKind,
} from '../graphql/support'

const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

// A listing card says whose it is: « Votre annonce » or « Consultée le … ».
const originLabel = (o: SupportObjectCard) =>
  o.kind !== 'LISTING' || !o.origin ? null : o.origin === 'OWN' ? 'Votre annonce' : `Consultée${o.viewedAt ? ` le ${day(o.viewedAt)}` : ''}`

// Compact card of an object attached to a support conversation: picture,
// kind, title, price, status, date. A consulted listing no longer public
// shows the copy of the member's last visit, its status (« Retirée », « Plus
// disponible », « Vendeur suspendu ») stands out, and a cover gone from
// storage gives way to the kind's icon (SafeImg).
export function SupportObjectCard({ o, onRemove, tone = 'card' }: { o: SupportObjectCard; onRemove?: () => void; tone?: 'card' | 'mine' }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 rounded-2xl border border-solid p-2 text-left ${tone === 'mine' ? 'border-primary/30 bg-primary-fixed/40' : 'border-outline-variant/60 bg-surface-lowest'}`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container text-on-surface-variant">
        {o.image ? <SafeImg src={thumbnailUrl(o.image)} icon={OBJECT_KIND_ICON[o.kind]} /> : <Icon name={OBJECT_KIND_ICON[o.kind]} size={22} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1 text-label-sm normal-case tracking-normal text-on-surface-variant"><Icon name={OBJECT_KIND_ICON[o.kind]} size={13} /> <span className="truncate">{OBJECT_KIND_LABEL[o.kind]}{originLabel(o) && <> · <span className={o.origin === 'OWN' ? 'font-semibold text-primary' : ''}>{originLabel(o)}</span></>}</span></span>
        <span className="block truncate text-label-md text-on-surface">{o.title}</span>
        {o.snapshotAt && o.sellerName && <span className="block truncate text-label-sm normal-case tracking-normal text-on-surface-variant">{o.sellerName}{o.city ? ` · ${o.city}` : ''}</span>}
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-label-sm normal-case tracking-normal text-on-surface-variant">
          {o.price != null && <span className="font-semibold text-on-surface"><Price amount={o.price} currency={o.currency} /></span>}
          <span className={`rounded-full px-1.5 ${o.snapshotAt ? 'bg-primary-fixed font-semibold text-primary' : 'bg-surface-container'}`} title={o.snapshotAt ? `Telle que vous l’avez vue le ${day(o.snapshotAt)}` : undefined}>{o.statusLabel}</span>
          <span>{day(o.date)}</span>
        </span>
      </span>
      {onRemove && <button type="button" onClick={onRemove} aria-label={`Retirer ${o.title}`} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-primary"><Icon name="close" size={18} /></button>}
    </div>
  )
}

// « Joindre »: the member's own objects, by kind, searchable, with their
// picture; several can be picked. Shown over the support panel. Listings:
// their own and those they consulted (never the whole catalogue).
export function SupportAttachPicker({ already, onPick, onClose }: { already: { kind: SupportObjectKind; id: string }[]; onPick: (cards: SupportObjectCard[]) => void; onClose: () => void }) {
  const [kind, setKind] = useState<SupportObjectKind | ''>('')
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<SupportObjectCard[]>([])
  const rules = useRules(useMemberCountryCode())
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(input.trim()), 300)
    return () => window.clearTimeout(t)
  }, [input])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  const { data, loading, error } = useQuery<{ mySupportAttachables: SupportObjectCard[] }>(MY_SUPPORT_ATTACHABLES_QUERY, { variables: { kind: kind || undefined, search: search || undefined }, fetchPolicy: 'cache-and-network' })
  const list = data?.mySupportAttachables ?? []
  const isAlready = (o: SupportObjectCard) => already.some(a => a.kind === o.kind && a.id === o.id)
  const isPicked = (o: SupportObjectCard) => picked.some(p => p.kind === o.kind && p.id === o.id)
  const toggle = (o: SupportObjectCard) => setPicked(p => (isPicked(o) ? p.filter(x => !(x.kind === o.kind && x.id === o.id)) : [...p, o]))
  const chip = (on: boolean) => `flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border border-solid px-3 py-1.5 text-label-md ${on ? 'border-primary bg-primary-fixed/60 text-primary' : 'border-outline-variant bg-surface-lowest text-on-surface'}`
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-surface-lowest animate-[slideUp_0.2s_cubic-bezier(0.16,1,0.3,1)]" role="dialog" aria-modal="true" aria-label="Joindre un élément">
      <div className="flex shrink-0 items-center gap-2 border-0 border-b border-solid border-outline-variant/60 px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Fermer" className="-ml-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface hover:bg-surface-container"><Icon name="arrow_back" size={21} /></button>
        <div className="min-w-0 flex-1"><div className="text-label-lg text-on-surface">Joindre un élément</div><div className="text-body-sm text-on-surface-variant">Une annonce (la vôtre ou une annonce consultée), un achat, une vente, un paiement, un litige ou une conversation.</div></div>
      </div>
      <div className="shrink-0 space-y-2 px-3 pt-3">
        <label className="flex h-11 items-center gap-2 rounded-xl bg-surface-container px-3 focus-within:bg-surface-container-high">
          <Icon name="search" size={19} className="text-on-surface-variant" />
          <input value={input} onChange={e => setInput(e.target.value.slice(0, 80))} placeholder="Rechercher (titre, référence, nom…)" aria-label="Rechercher un élément" className="min-w-0 flex-1 border-none bg-transparent text-body-md text-on-surface outline-none" />
        </label>
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          <button type="button" aria-pressed={kind === ''} onClick={() => setKind('')} className={chip(kind === '')}>Tout</button>
          {OBJECT_KINDS.map(([k, label, icon]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}><Icon name={icon} size={15} /> {label}</button>)}
        </div>
        {kind === 'LISTING' && <p className="m-0 px-1 text-label-sm normal-case tracking-normal text-on-surface-variant">Vos annonces et celles que vous avez ouvertes en étant connecté ces {rules.SUPPORT_ATTACH_VIEWED_DAYS} derniers jours ({rules.SUPPORT_ATTACH_LISTINGS_MAX} au plus).</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
        {error && <p className="m-0 p-4 text-center text-body-sm text-primary">{error.message}</p>}
        {!error && !list.length && (loading ? <p className="m-0 p-6 text-center text-body-sm text-on-surface-variant">Chargement…</p>
          : kind === 'LISTING' && !search ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"><Icon name="history" size={24} /></span>
              <p className="m-0 text-label-lg text-on-surface">Les annonces que vous consultez apparaîtront ici.</p>
              <p className="m-0 text-body-sm text-on-surface-variant">Ouvrez l’annonce concernée en étant connecté, puis revenez la joindre. Vos propres annonces y figurent aussi.</p>
            </div>
          ) : <p className="m-0 p-6 text-center text-body-sm text-on-surface-variant">{search ? kind === 'LISTING' ? 'Aucun résultat parmi vos annonces et celles que vous avez consultées.' : 'Aucun résultat.' : 'Rien à joindre pour l’instant.'}</p>)}
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {list.map(o => {
            const done = isAlready(o)
            const on = done || isPicked(o)
            return (
              <li key={`${o.kind}-${o.id}`}>
                <button type="button" disabled={done} aria-pressed={on} onClick={() => toggle(o)} className="flex w-full cursor-pointer items-center gap-2 rounded-2xl border-none bg-transparent p-0 text-left disabled:cursor-default">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-solid ${on ? 'border-primary bg-primary text-white' : 'border-outline-variant bg-surface-lowest'}`}>{on && <Icon name="check" size={15} />}</span>
                  <span className="min-w-0 flex-1"><SupportObjectCard o={o} /></span>
                </button>
                {done && <span className="ml-8 text-label-sm normal-case tracking-normal text-on-surface-variant">Déjà joint</span>}
              </li>
            )
          })}
        </ul>
      </div>
      <div className="shrink-0 border-0 border-t border-solid border-outline-variant/60 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <button type="button" disabled={!picked.length} onClick={() => onPick(picked)} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-45">
          <Icon name="attach_file" size={19} /> {picked.length ? `Joindre ${picked.length} élément${picked.length > 1 ? 's' : ''}` : 'Choisissez un ou plusieurs éléments'}
        </button>
      </div>
    </div>
  )
}
