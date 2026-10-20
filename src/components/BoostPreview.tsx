import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from './Icon'
import Price from './Price'
import PromoPill from './PromoPill'
import HelpLink from './HelpLink'
import { thumbnailUrl } from '../lib/media'
import { useMarketCode } from '../lib/countries'
import type { BoostPack, BoostPackInfo } from '../graphql/promotions'
import type { PromoBadge } from '../graphql/listings'
import { LISTING_BADGE_SETTINGS_QUERY, type BadgeSetting } from '../graphql/visibility'

// « À quoi ressemblera votre annonce »: the card buyers will see with each
// formula — the pill in the Backoffice's words (none when it is hidden in
// the country), and where the formula places it, as the server words it.

type Listing = { title: string; price: number | null; currency: string; coverImageUrl: string | null; city?: string | null }

const CHOICES: { pack: BoostPack; label: string }[] = [
  { pack: 'BUMP_FLASH', label: 'Remontée' },
  { pack: 'FEATURED_48H', label: 'En Vedette' },
  { pack: 'TURBO_7D', label: 'Turbo' },
  { pack: 'URGENT_72H', label: 'Urgent' },
]

function pillFor(info: BoostPackInfo | undefined, badges: BadgeSetting[]): PromoBadge | null {
  if (!info) return null
  if (info.family === 'BUMP') {
    const s = badges.find(b => b.kind === 'BUMP')
    return s?.show ? { kind: 'BUMP', label: s.label, at: new Date().toISOString() } : null
  }
  if (!info.badgeLabel) return null
  return { kind: info.family === 'TURBO' ? 'TURBO' : info.family === 'URGENT' ? 'URGENT' : 'FEATURED', label: info.badgeLabel }
}

function MiniCard({ listing, pill, dim }: { listing: Listing; pill: PromoBadge | null; dim?: boolean }) {
  return (
    <div className={`w-[150px] shrink-0 overflow-hidden rounded-[12px] bg-surface-lowest shadow-sm ${dim ? 'opacity-70' : ''}`}>
      <div className="relative aspect-square bg-surface-container-low">
        {listing.coverImageUrl ? <img src={thumbnailUrl(listing.coverImageUrl)} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-outline"><Icon name="sell" size={28} /></span>}
        {pill && <div className="absolute left-2 right-2 top-2 flex"><PromoPill badge={pill} /></div>}
      </div>
      <div className="p-2">
        <div className="text-label-md font-bold text-primary"><Price amount={listing.price} currency={listing.currency} /></div>
        <div className="truncate text-label-sm text-on-surface">{listing.title}</div>
        {listing.city && <div className="truncate text-[11px] text-on-surface-variant">{listing.city}</div>}
      </div>
    </div>
  )
}

export default function BoostPreview({ listing, packs, className = '' }: { listing: Listing; packs: BoostPackInfo[]; className?: string }) {
  const market = useMarketCode()
  const { data } = useQuery<{ listingBadgeSettings: BadgeSetting[] }>(LISTING_BADGE_SETTINGS_QUERY, { variables: { country: market ?? undefined }, fetchPolicy: 'cache-first' })
  const badges = data?.listingBadgeSettings ?? []
  const available = CHOICES.filter(c => packs.some(p => p.pack === c.pack))
  const [pack, setPack] = useState<BoostPack>('FEATURED_48H')
  const info = packs.find(p => p.pack === pack) ?? packs.find(p => p.pack === available[0]?.pack)
  const pill = pillFor(info, badges)
  return (
    <section className={`rounded-3xl bg-surface-container-low p-4 md:p-6 ${className}`}>
      <div className="text-label-sm uppercase text-primary">Aperçu</div>
      <h2 className="m-0 text-headline-sm text-on-surface">À quoi ressemblera votre annonce</h2>
      <div role="tablist" aria-label="Formule" className="mt-3 flex flex-wrap gap-2">
        {available.map(c => (
          <button key={c.pack} role="tab" aria-selected={info?.pack === c.pack} type="button" onClick={() => setPack(c.pack)}
            className={`h-9 cursor-pointer rounded-full border border-solid px-3 text-label-md ${info?.pack === c.pack ? 'border-primary bg-primary text-white' : 'border-outline-variant bg-surface-lowest text-on-surface'}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex gap-3">
          <div>
            <div className="mb-1 w-[150px] truncate text-label-sm text-on-surface-variant">Sans formule</div>
            <MiniCard listing={listing} pill={null} dim />
          </div>
          <div>
            <div className="mb-1 w-[150px] truncate text-label-sm text-primary" title={info?.label}>Avec « {info?.label ?? '…'} »</div>
            <MiniCard listing={listing} pill={pill} />
          </div>
        </div>
        <div className="min-w-0 flex-1 text-body-sm text-on-surface">
          <p className="m-0 font-semibold">Où votre annonce apparaît</p>
          <ul className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0">
            {(info?.promises ?? []).map(t => <li key={t} className="flex items-start gap-2"><Icon name="check_circle" size={15} className="mt-0.5 shrink-0 text-tertiary" /> <span>{t}</span></li>)}
          </ul>
          {!pill && info && <p className="m-0 mt-2 text-on-surface-variant">Pas de badge sur la carte avec cette formule dans votre pays.</p>}
          <HelpLink article="badges-des-annonces" label="Les badges expliqués aux acheteurs" className="mt-2" />
        </div>
      </div>
    </section>
  )
}
