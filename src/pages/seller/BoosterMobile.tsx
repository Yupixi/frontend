import EmptyState from '../../components/EmptyState'
import AnimatedIcon from '../../components/AnimatedIcon'
import { useState } from 'react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import SafeImg from '../../components/SafeImg'
import BottomSheet from '../../components/BottomSheet'
import type { MyListingRow } from '../../graphql/listings'
import type { BoostPack, BoostPackInfo } from '../../graphql/promotions'
import PaymentLogo from '../../components/PaymentLogo'

type Props = {
  live: MyListingRow[]
  listing?: MyListingRow
  onSelectListing: (id: string) => void
  packs: BoostPackInfo[]
  credits: number
  busy: boolean
  done: string | null
  error: string | null
  // Both only open the page's confirmation sheets — nothing is spent on a tap.
  onChoose: (p: BoostPack) => void
  onBump: () => void
  onNavigate: (p: any) => void
}

const days = (hours: number) => Math.round(hours / 24)

// "Boost & Visibilité" (Stitch mobile): credits banner, selected listing with
// its stats, impact simulator, then the packs as tap-to-confirm tiles.
export default function BoosterMobile({ live, listing, onSelectListing, packs, credits, busy, done, error, onChoose, onBump, onNavigate }: Props) {
  const [picking, setPicking] = useState(false)
  const pack = (p: BoostPack) => packs.find(x => x.pack === p)
  const turbo = pack('TURBO_7D')
  const urgent = pack('URGENT_72H')
  const flash = pack('BUMP_FLASH')
  const pack3 = pack('BUMP_PACK_3')
  const daily = pack('BUMP_DAILY_7')
  // Pack 3 discount vs. three single bumps, derived from the live prices.
  const saving = flash && pack3 && pack3.bumpCredits > 0
    ? Math.round((1 - pack3.price / (flash.price * pack3.bumpCredits)) * 100)
    : 0
  const bumpTiles = [
    flash && { p: flash, top: '1 Remontée', sub: 'Flash', eco: false },
    pack3 && { p: pack3, top: `Pack ${pack3.bumpCredits}`, sub: saving > 0 ? `-${saving}%` : 'À la demande', eco: saving > 0 },
    daily && { p: daily, top: 'Quotidien', sub: `${days(daily.durationHours)} jours`, eco: false },
  ].filter(Boolean) as { p: BoostPackInfo, top: string, sub: string, eco: boolean }[]
  const featuredTiles = (['FEATURED_48H', 'FEATURED_7D'] as BoostPack[]).map(pack).filter(Boolean) as BoostPackInfo[]
  const disabled = !listing || busy
  // Clicks aren't tracked yet: favourites stand in as the middle engagement stat.
  const stats = listing ? [
    { icon: 'visibility', label: 'Vues', value: listing.viewsCount },
    { icon: 'favorite', label: 'Favoris', value: listing.favoritesCount },
    { icon: 'forum', label: 'Contacts', value: listing.contactsCount ?? 0 },
  ] : []

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Credits banner */}
      <section className="rounded-2xl bg-surface-container-low p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-label-md text-on-surface"><Icon name="rocket_launch" size={18} className="text-primary" /> Boost &amp; Visibilité</span>
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary-fixed px-2.5 py-1 text-label-sm text-primary"><Icon name="stars" size={14} /> {credits} crédit{credits > 1 ? 's' : ''} restant{credits > 1 ? 's' : ''}</span>
        </div>
        <h1 className="m-0 mt-2 text-headline-sm text-on-surface">Propulsez vos annonces en tête de liste</h1>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="m-0 text-body-sm text-on-surface-variant">1 crédit = 1 remontée immédiate en tête du catalogue.</p>
          <button onClick={() => onNavigate('seller-wallet')} className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-surface-container-high px-3 text-label-md text-on-surface">
            <Icon name="add_circle" size={17} /> Recharger
          </button>
        </div>
      </section>

      {(done || error) && (
        <p className={`m-0 flex items-center gap-2 rounded-xl p-3 text-body-sm ${done ? 'bg-tertiary-soft text-tertiary' : 'bg-primary-fixed text-primary'}`}>
          {done ? <AnimatedIcon name="flash" fallback="bolt" size={20} trigger={done} /> : <Icon name="error" size={17} />} {done ?? error}
        </p>
      )}

      {/* Selected listing */}
      {listing ? (
        <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-label-sm uppercase text-on-surface-variant">Article sélectionné</span>
            {live.length > 0 && (
              <button onClick={() => setPicking(true)} className="flex cursor-pointer items-center gap-0.5 whitespace-nowrap border-none bg-transparent p-0 text-label-md text-primary">
                Changer d'annonce <Icon name="expand_more" size={18} />
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container">
              <SafeImg src={listing.coverImageUrl} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-headline-sm text-on-surface">{listing.title}</div>
              <div className="text-label-lg font-bold text-primary"><Price amount={listing.price} currency={listing.currency} /></div>
              <div className="mt-0.5 flex items-center gap-1 text-label-sm text-tertiary"><Icon name="verified" size={14} /> Annonce active &amp; vérifiée</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-surface-container-low p-1 text-center">
            {stats.map(s => (
              <div key={s.label} className="rounded-lg py-2">
                <div className="flex items-center justify-center gap-1 text-label-sm text-on-surface-variant"><Icon name={s.icon} size={14} /> {s.label}</div>
                <div className="text-label-lg font-bold text-on-surface">{s.value}</div>
              </div>
            ))}
          </div>
          {credits > 0 && (
            <button disabled={disabled} onClick={onBump} className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-3 text-label-md text-white disabled:opacity-60">
              <Icon name="arrow_upward" size={17} /> Remonter · 1 crédit
            </button>
          )}
        </section>
      ) : (
        <EmptyState icon="empty-box" fallback="inventory_2" title="Aucune annonce à booster" text="Publiez une annonce pour pouvoir la mettre en avant." action={{ label: 'Déposer une annonce', onClick: () => onNavigate('seller-post') }} />
      )}

      {/* Packs */}
      <div className="mt-2 flex items-center justify-between">
        <h2 className="m-0 text-headline-sm text-on-surface">Formules disponibles</h2>
        <span className="text-label-sm text-on-surface-variant">Durée garantie</span>
      </div>

      {turbo && (
        <section className="relative overflow-hidden rounded-2xl border-2 border-solid border-primary bg-surface-lowest p-4 pt-8">
          <span className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-primary px-2.5 py-1 text-label-sm uppercase text-white"><Icon name="local_fire_department" size={13} /> Le plus populaire</span>
          <h3 className="m-0 text-headline-sm text-on-surface">{turbo.label}</h3>
          {/* What the pack really includes, from the API (no marketing claims) */}
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface">
            {(turbo.description ?? '').replace(/\.$/, '').split(/, | et /).filter(Boolean).map((t, i) => (
              <li key={i} className="flex items-start gap-2"><Icon name="check_circle" size={16} className="mt-0.5 shrink-0 text-primary" /> <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span></li>
            ))}
          </ul>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-label-sm text-on-surface-variant">Tarif forfaitaire</div>
              <div className="whitespace-nowrap text-headline-sm font-extrabold text-primary"><Price amount={turbo.price} /></div>
            </div>
            <button disabled={disabled} onClick={() => onChoose('TURBO_7D')} className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white disabled:opacity-50">
              Choisir Turbo <Icon name="bolt" size={17} />
            </button>
          </div>
        </section>
      )}

      {bumpTiles.length > 0 && (
        <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="m-0 text-headline-sm text-on-surface">Remontée Flash en Tête</h3>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Replace immédiatement votre annonce tout en haut, comme si elle venait d'être publiée.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="arrow_upward" size={20} /></span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {bumpTiles.map(t => (
              <button key={t.p.pack} disabled={disabled} onClick={() => onChoose(t.p.pack)} aria-label={`${t.p.label} · ${t.p.price} F`} className={`relative flex cursor-pointer flex-col items-center gap-0.5 overflow-hidden rounded-xl border-none px-1 pb-2 text-on-surface disabled:opacity-50 ${t.eco ? 'bg-primary-fixed/40 pt-6' : 'bg-surface-container-low pt-2.5'}`}>
                {t.eco && <span className="absolute inset-x-0 top-0 bg-primary py-0.5 text-[10px] font-bold uppercase text-white">Éco</span>}
                <span className="whitespace-nowrap text-label-sm text-on-surface-variant">{t.top}</span>
                <span className="whitespace-nowrap text-label-lg font-bold"><Price amount={t.p.price} /></span>
                <span className={`whitespace-nowrap text-label-sm ${t.eco ? 'text-primary' : 'text-tertiary'}`}>{t.sub}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {featuredTiles.length > 0 && (
        <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="m-0 text-headline-sm text-on-surface">En Vedette</h3>
                <span className="rounded bg-tertiary-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-tertiary">Recommandé</span>
              </div>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Bandeau exclusif sur la page d'accueil et premier résultat sur les recherches de votre catégorie.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface"><Icon name="hotel_class" size={20} /></span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {featuredTiles.map(p => (
              <button key={p.pack} disabled={disabled} onClick={() => onChoose(p.pack)} aria-label={`${p.label} · ${p.price} F`} className="flex cursor-pointer items-center justify-between gap-1 rounded-xl border border-solid border-outline-variant bg-surface-lowest p-3 text-left text-on-surface disabled:opacity-50">
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-label-sm text-on-surface-variant">{p.durationHours < 168 ? `${p.durationHours} Heures` : `${days(p.durationHours)} Jours complets`}</span>
                  <span className="block whitespace-nowrap text-label-lg font-bold"><Price amount={p.price} /></span>
                </span>
                <Icon name="chevron_right" size={20} className="shrink-0 text-primary" />
              </button>
            ))}
          </div>
        </section>
      )}

      {urgent && (
        <section className="flex items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="alarm_on" size={24} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="m-0 text-label-lg text-on-surface">{urgent.label}</h3>
            <p className="m-0 text-body-sm text-on-surface-variant">Macaron clignotant rouge {urgent.durationHours}h</p>
            <span className="text-label-md font-bold text-primary"><Price amount={urgent.price} /></span>
          </div>
          <button disabled={disabled} onClick={() => onChoose('URGENT_72H')} className="h-10 shrink-0 cursor-pointer whitespace-nowrap rounded-xl border-none bg-surface-container-high px-4 text-label-md text-on-surface disabled:opacity-50">Activer</button>
        </section>
      )}

      {/* Mobile Money operators accepted by the Paytic checkout */}
      <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-label-md text-on-surface"><Icon name="security" size={18} className="text-tertiary" /> Paiement Mobile Instantané</span>
          <span className="shrink-0 whitespace-nowrap text-label-sm text-on-surface-variant">0 frais • 2 min chrono</span>
        </div>
        <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Activez votre visibilité directement sans carte bancaire via votre portefeuille mobile favori.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { code: 'WAVE', name: 'Wave', sub: 'Confirmation dans l’app' },
            { code: 'ORANGE_MONEY', name: 'Orange Money', sub: 'Code #144*82#' },
            { code: 'MTN_MOMO', name: 'MTN MoMo', sub: 'Validation mobile' },
            { code: 'MOOV_MONEY', name: 'Moov Money', sub: 'Validation mobile' },
          ].map(m => (
            <div key={m.name} className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
              <PaymentLogo method={m.code} size={32} />
              <span className="min-w-0">
                <span className="block truncate text-label-md text-on-surface">{m.name}</span>
                <span className="block truncate text-[11px] text-on-surface-variant">{m.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tertiary text-white"><Icon name="savings" size={22} /></span>
        <div className="min-w-0">
          <p className="m-0 text-label-md text-on-surface">100% du prix de vente reste pour vous</p>
          <p className="m-0 text-body-sm text-on-surface-variant">Dilchap applique 0% de commission sur toutes vos transactions entre particuliers.</p>
        </div>
      </section>

      <BottomSheet open={picking} onClose={() => setPicking(false)} title="Choisir l'annonce à booster">
        <div className="flex flex-col gap-2 px-4 pb-4">
          {live.map(l => (
            <button key={l.id} onClick={() => { onSelectListing(l.id); setPicking(false) }} className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-solid p-2 text-left ${l.id === listing?.id ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant bg-surface-lowest'}`}>
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container"><SafeImg src={l.coverImageUrl} iconSize={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label-md text-on-surface">{l.title}</span>
                <span className="block text-body-sm text-primary"><Price amount={l.price} currency={l.currency} /></span>
              </span>
              {l.id === listing?.id && <Icon name="check_circle" size={20} className="shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
