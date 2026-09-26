import AnimatedIcon from '../../components/AnimatedIcon'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  Rocket, Eye, Heart, MessageSquare, ArrowUp, ArrowRight, Star, CheckCircle2, ShieldCheck, Percent, Handshake,
  Flame, Clock, TrendingUp, Tag, MapPin,
} from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import ConfirmSheet from '../../components/ConfirmSheet'
import PaymentSheet from '../../components/PaymentSheet'
import { AccountLayout } from '../account/AccountLayout'
import { MY_LISTINGS_QUERY, BUMP_LISTING_MUTATION, type MyListingRow } from '../../graphql/listings'
import { BOOST_PACKS_QUERY, MY_BOOSTS_QUERY, type BoostPack, type BoostPackInfo, type RemoteBoost } from '../../graphql/promotions'
import type { AuthUser } from '../../graphql/auth'
import { MY_WALLET_QUERY, type WalletSummary } from '../../graphql/sellerHub'
import Select from '../../components/Select'
import BoosterMobile from './BoosterMobile'
import PaymentLogo from '../../components/PaymentLogo'

type Props = { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }

const isFuture = (iso?: string | null) => !!iso && new Date(iso) > new Date()

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// "Booster mes annonces & Remontées en tête" mockup. Packs and prices come
// from the backend (boostPacks); packs are paid by Mobile Money (Paytic,
// PaymentSheet) and activated by the server once the payment is confirmed.
export default function Booster({ onNavigate, currentUser, onLogout }: Props) {
  const { data: listingsData, refetch: refetchListings } = useQuery<{ myListings: { items: MyListingRow[] } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 100 } })
  const live = (listingsData?.myListings.items ?? []).filter(l => l.status === 'APPROVED')
  const { data: packsData } = useQuery<{ boostPacks: BoostPackInfo[] }>(BOOST_PACKS_QUERY)
  const packs = packsData?.boostPacks ?? []
  const { data: boostsData, refetch: refetchBoosts } = useQuery<{ myBoosts: RemoteBoost[] }>(MY_BOOSTS_QUERY)
  const history = boostsData?.myBoosts ?? []
  const { data: walletData, refetch: refetchWallet } = useQuery<{ myWallet: WalletSummary }>(MY_WALLET_QUERY)
  const credits = walletData?.myWallet.credits ?? 0

  const [listingId, setListingId] = useState('')
  useEffect(() => { if (!listingId && live[0]) setListingId(live[0].id) }, [live, listingId])
  const listing = live.find(l => l.id === listingId)

  const [bumpChoice, setBumpChoice] = useState<BoostPack>('BUMP_FLASH')
  const [featuredChoice, setFeaturedChoice] = useState<BoostPack>('FEATURED_48H')
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bumpListing, { loading: bumping }] = useMutation(BUMP_LISTING_MUTATION)

  const pack = (p: BoostPack) => packs.find(x => x.pack === p)
  // A paid pack is never activated on a single tap: the buttons open a
  // confirmation sheet recapping pack, listing and price first.
  const [confirmPack, setConfirmPack] = useState<BoostPack | null>(null)
  const activate = (p: BoostPack) => { if (listing) setConfirmPack(p) }
  const paid = (p: BoostPack) => {
    if (!listing) return
    setError(null)
    setDone(`${pack(p)?.label ?? 'Formule'} activée sur « ${listing.title} »`)
    void refetchListings(); void refetchBoosts(); void refetchWallet()
  }
  const [confirmBump, setConfirmBump] = useState(false)
  const spendCredit = async () => {
    setConfirmBump(false)
    if (!listing) return
    setError(null); setDone(null)
    try {
      await bumpListing({ variables: { id: listing.id } })
      setDone('Annonce remontée en tête du catalogue')
      void refetchListings(); void refetchWallet()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de remonter l’annonce.')
    }
  }

  const visible = listing && (isFuture(listing.boostExpiresAt) || isFuture(listing.autoBumpUntil) || isFuture(listing.urgentUntil))
  const turbo = pack('TURBO_7D')
  const urgent = pack('URGENT_72H')
  const radio = (p: BoostPack, current: BoostPack, set: (p: BoostPack) => void, sub?: string) => {
    const info = pack(p)
    if (!info) return null
    const active = current === p
    return (
      <label key={p} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] border-solid p-3 ${active ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant bg-surface-lowest'}`}>
        <input type="radio" checked={active} onChange={() => set(p)} className="m-0 h-5 w-5 shrink-0 accent-[var(--primary)]" />
        <span className="flex-1 text-body-sm">
          <span className="block font-semibold text-on-surface">{info.label}</span>
          {sub && <span className="text-[11px] text-on-surface-variant">{sub}</span>}
        </span>
        <span className="text-label-md font-bold text-on-surface"><Price amount={info.price} /></span>
      </label>
    )
  }
  const packLabel = (p: BoostPack) => pack(p)?.label ?? p

  return (
    <AccountLayout active="seller-premium" title="Booster & Visibilité" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="lg:hidden">
        <BoosterMobile
          live={live}
          listing={listing}
          onSelectListing={setListingId}
          packs={packs}
          credits={credits}
          busy={bumping}
          done={done}
          error={error}
          onChoose={activate}
          onBump={() => setConfirmBump(true)}
          onNavigate={onNavigate}
        />
      </div>
      <div className="mx-auto hidden max-w-[1120px] lg:block">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-lowest via-surface-lowest to-primary-fixed/60 p-6 md:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1.5fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 text-label-sm uppercase text-primary"><Rocket size={14} /> Accélérateur de ventes P2P</span>
              <h1 className="m-0 mt-3 text-headline-lg-mobile text-on-surface md:text-[40px] md:font-extrabold md:leading-[48px]">Boostez vos ventes &amp; dominez le fil d'affichage</h1>
              <p className="m-0 mt-2 text-body-md text-on-surface-variant">Vendez plus vite grâce aux options de visibilité ciblées. <b className="text-tertiary">100% du produit de la vente reste pour vous</b> (0% de commission Dilchap).</p>
            </div>
            <div className="rounded-2xl bg-surface-lowest p-4 border border-outline-variant">
              <div className="flex items-center justify-between">
                <span className="text-label-sm uppercase text-on-surface-variant">État de votre visibilité</span>
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm ${visible ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>● {visible ? 'Actif' : 'Standard'}</span>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary"><ArrowUp size={20} /></span>
                <div>
                  <div className="text-label-sm uppercase text-on-surface-variant">Solde de visibilité</div>
                  <div className="text-headline-sm text-on-surface">{credits} crédit{credits > 1 ? 's' : ''} restant{credits > 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-2 text-body-sm text-on-surface-variant">
                <Clock size={16} className="mt-0.5 text-primary" />
                {isFuture(listing?.autoBumpUntil)
                  ? <span>Prochaine remontée planifiée : <b className="text-on-surface">chaque jour à 18h00</b> jusqu'au {formatDate(listing!.autoBumpUntil!)}</span>
                  : <span>Aucune remontée automatique planifiée</span>}
              </div>
              <button onClick={() => onNavigate('seller-wallet')} className="mt-3 h-11 w-full cursor-pointer whitespace-nowrap rounded-lg border-none bg-surface-container-low text-label-md text-on-surface hover:bg-surface-container">Recharger des crédits</button>
            </div>
          </div>
        </section>

        {(done || error) && (
          <p className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-body-sm ${done ? 'bg-tertiary-soft text-tertiary' : 'bg-primary-fixed text-primary'}`}>
            {done ? <AnimatedIcon name="flash" fallback="bolt" size={20} trigger={done} /> : <Icon name="error" size={17} />} {done ?? error}
          </p>
        )}

        {/* Step 1 */}
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-label-sm uppercase text-primary">Étape 1 sur 2</div>
              <h2 className="m-0 text-headline-sm text-on-surface md:text-headline-md">Sélectionnez l'annonce à propulser</h2>
            </div>
            {live.length > 0 && (
              <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                Changer d'article :
                <Select value={listingId} onChange={e => setListingId(e.target.value)} className="max-w-[280px] cursor-pointer rounded-lg border border-outline-variant bg-surface-lowest px-3 py-2 text-label-md text-on-surface outline-none">
                  {live.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </Select>
              </label>
            )}
          </div>
          {listing ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-lowest p-4 md:flex-row md:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-container-low">
                {listing.coverImageUrl ? <img src={listing.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-outline"><Tag size={28} /></div>}
                <span className="absolute left-1 top-1 rounded bg-tertiary px-1.5 text-[10px] font-bold uppercase text-white">Actif</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">
                  {listing.category && <span className="rounded bg-surface-container px-1.5">{listing.category.name}</span>}
                  {listing.city && <span className="flex items-center gap-0.5"><MapPin size={13} /> {listing.locationLabel ? `${listing.locationLabel}, ` : ''}{listing.city}</span>}
                </div>
                <div className="mt-1 truncate text-headline-sm text-on-surface">{listing.title}</div>
                <div className="text-headline-sm font-extrabold text-primary"><Price amount={listing.price} currency={listing.currency} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-container-low p-2 text-center md:w-80">
                {[
                  { icon: <Eye size={16} />, label: 'Vues', value: listing.viewsCount },
                  { icon: <Heart size={16} />, label: 'Favoris', value: listing.favoritesCount },
                  { icon: <MessageSquare size={16} />, label: 'Contacts', value: listing.contactsCount ?? 0 },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-surface-lowest p-2">
                    <div className="flex items-center justify-center gap-1 text-label-sm text-on-surface-variant">{s.icon} {s.label}</div>
                    <div className="text-headline-sm text-on-surface">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {/* Spending a credit acts on the listing picked just above, so it lives in step 1. */}
          {!!listing && credits > 0 && (
            <button disabled={bumping} onClick={() => setConfirmBump(true)} className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-primary px-3 text-label-md text-white disabled:opacity-60 md:w-auto">
              <ArrowUp size={16} /> Remonter cette annonce · 1 crédit
            </button>
          )}
          {!listing && (
            <div className="rounded-2xl bg-surface-container-low p-6 text-center">
              <p className="m-0 text-body-md text-on-surface-variant">Aucune annonce en ligne à booster pour le moment.</p>
              <button onClick={() => onNavigate('seller-post')} className="mt-3 cursor-pointer rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white">Déposer une annonce</button>
            </div>
          )}
        </section>

        {/* Step 2 */}
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-label-sm uppercase text-primary">Étape 2 sur 2</div>
              <h2 className="m-0 text-headline-sm text-on-surface md:text-headline-md">Choisissez la formule adaptée à votre objectif</h2>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 text-label-sm text-on-surface-variant"><ShieldCheck size={15} className="text-tertiary" /> Activation immédiate</span>
          </div>
          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Remontée */}
            <div className="flex flex-col rounded-2xl border border-outline-variant bg-surface-lowest p-4">
              <span className="self-start rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">Recommandé pour relancer</span>
              <div className="mt-3 flex items-center gap-2 text-headline-sm text-on-surface"><ArrowUp size={22} className="text-primary" /> Remontée Flash en Tête</div>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Votre annonce est immédiatement repositionnée tout en haut du catalogue, comme si elle venait d'être publiée.</p>
              <div className="mt-3 flex flex-col gap-2">
                {radio('BUMP_FLASH', bumpChoice, setBumpChoice)}
                {radio('BUMP_PACK_3', bumpChoice, setBumpChoice, 'À la demande')}
                {radio('BUMP_DAILY_7', bumpChoice, setBumpChoice, 'À 18h00 pile')}
              </div>
              <button disabled={!listing} onClick={() => activate(bumpChoice)} className="mt-auto flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-surface-container-high py-2.5 text-label-md text-on-surface hover:bg-surface-container-highest disabled:opacity-50" style={{ marginTop: 16 }}>
                Activer maintenant <ArrowRight size={16} />
              </button>
            </div>

            {/* Vedette */}
            <div className="flex flex-col rounded-2xl border border-outline-variant bg-surface-lowest p-4">
              <span className="flex items-center gap-1 self-start rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary"><TrendingUp size={13} /> Meilleur impact</span>
              <div className="mt-3 flex items-center gap-2 text-headline-sm text-on-surface"><Star size={22} className="text-tertiary" /> Badge En Vedette &amp; Carrousel</div>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Votre annonce passe avant les résultats standards et dans la sélection « Pépites à la Une » de l'accueil.</p>
              <div className="mt-3 flex flex-col gap-2">
                {radio('FEATURED_48H', featuredChoice, setFeaturedChoice)}
                {radio('FEATURED_7D', featuredChoice, setFeaturedChoice, '1 semaine complète')}
              </div>
              <button disabled={!listing} onClick={() => activate(featuredChoice)} className="mt-auto flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-surface-container-high py-2.5 text-label-md text-on-surface hover:bg-surface-container-highest disabled:opacity-50" style={{ marginTop: 16 }}>
                Choisir En Vedette <ArrowRight size={16} />
              </button>
            </div>

            {/* Turbo */}
            {turbo && (
              <div className="relative flex flex-col rounded-2xl border-2 border-solid border-primary bg-surface-lowest p-4">
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-label-sm uppercase text-white"><Flame size={13} /> Formule pro rentabilité</span>
                <div className="mt-3 flex items-center gap-2 text-headline-sm text-on-surface"><Rocket size={22} className="text-primary" /> {turbo.label}</div>
                <p className="m-0 mt-1 text-body-sm text-on-surface-variant">La formule tout-en-un pour déclencher la vente sous 72h chrono.</p>
                <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface">
                  {['7 remontées quotidiennes à l’heure d’affluence (18h)', 'Épinglage 7 jours en tête des résultats', 'Badge visuel « Prix Choc »', 'Mise en avant sur l’accueil'].map(t => (
                    <li key={t} className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-tertiary" /> {t}</li>
                  ))}
                </ul>
                <div className="mt-4 rounded-xl bg-surface-container-low p-3">
                  <div className="text-label-sm uppercase text-on-surface-variant">Tarif spécial tout-inclus</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-headline-md font-extrabold text-primary"><Price amount={turbo.price} /></span>
                    <span className="text-label-sm text-tertiary">pour 7 jours</span>
                  </div>
                </div>
                <button disabled={!listing} onClick={() => activate('TURBO_7D')} className="mt-4 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-primary py-3 text-label-lg text-white hover:bg-primary-dark disabled:opacity-50">
                  <Rocket size={18} /> Activer le Pack Turbo
                </button>
              </div>
            )}

            {/* Urgent */}
            {urgent && (
              <div className="flex flex-col rounded-2xl border border-outline-variant bg-surface-lowest p-4">
                <span className="self-start rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">Signal visuel flash</span>
                <div className="mt-3 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="alarm" size={22} className="text-primary" /> {urgent.label}</div>
                <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{urgent.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm">
                  <span className="text-on-surface-variant">Validité continue</span><span className="text-right font-semibold text-on-surface">{urgent.durationHours} heures</span>
                  <span className="text-on-surface-variant">Tarif unique</span><span className="text-right font-extrabold text-primary"><Price amount={urgent.price} /></span>
                </div>
                <button disabled={!listing} onClick={() => activate('URGENT_72H')} className="mt-auto flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-surface-container-high py-2.5 text-label-md text-on-surface hover:bg-surface-container-highest disabled:opacity-50" style={{ marginTop: 16 }}>
                  {/* One text node: flex gap would otherwise space out "(", amount, "F" and ")". */}
                  <span>Prendre le badge (<Price amount={urgent.price} />)</span> <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Preview */}
        {listing && (
          <section className="mt-8 rounded-3xl bg-surface-container-low p-5 md:p-6">
            <div className="text-label-sm uppercase text-primary">Simulateur en direct</div>
            <h2 className="m-0 mb-4 text-headline-sm text-on-surface">Aperçu de votre annonce dans le fil d'actualité</h2>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-1.5 text-label-md text-on-surface-variant"><span className="h-2 w-2 rounded-full bg-outline" /> Sans boost (affichage standard)</div>
                <div className="flex items-center gap-3 rounded-xl bg-surface-lowest p-3 opacity-70">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-container">{listing.coverImageUrl && <img src={listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="min-w-0"><div className="text-[11px] text-outline">Publiée il y a quelques jours</div><div className="truncate text-label-md text-on-surface">{listing.title}</div><div className="text-label-md"><Price amount={listing.price} currency={listing.currency} /></div></div>
                </div>
                <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Descend dans le fil au fil des nouvelles publications.</p>
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-1.5 text-label-md text-primary"><span className="h-2 w-2 rounded-full bg-primary" /> Avec boost (en tête de liste)</div>
                <div className="relative flex items-center gap-3 rounded-xl border-2 border-solid border-primary bg-surface-lowest p-3">
                  <span className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-tertiary px-2 py-0.5 text-[10px] font-bold uppercase text-white"><Star size={11} /> En vedette Dilchap</span>
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                    {listing.coverImageUrl && <img src={listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}
                    <span className="absolute inset-x-0 bottom-0 bg-primary text-center text-[8px] font-bold uppercase text-white">Prix choc</span>
                  </div>
                  <div className="min-w-0"><div className="text-[11px] text-primary">Remontée à l'instant</div><div className="truncate text-label-md text-on-surface">{listing.title}</div><div className="text-label-md font-bold text-primary"><Price amount={listing.price} currency={listing.currency} /></div></div>
                </div>
                <p className="m-0 mt-2 flex items-center gap-1.5 rounded-lg bg-tertiary-soft p-2 text-body-sm text-tertiary"><TrendingUp size={15} /> 1re position de sa catégorie pendant la durée du boost</p>
              </div>
            </div>
          </section>
        )}

        {/* History */}
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="m-0 text-headline-sm text-on-surface md:text-headline-md">Historique des boosts &amp; performances</h2>
              <p className="m-0 text-body-sm text-on-surface-variant">Gains de vues et de contacts depuis chaque activation.</p>
            </div>
            <span className="flex items-center gap-1.5 text-label-sm text-tertiary"><span className="h-2 w-2 rounded-full bg-tertiary" /> Mise à jour en temps réel</span>
          </div>
          {/* Mobile: one card per boost instead of a sideways-scrolling table. */}
          <div className="flex flex-col gap-2 md:hidden">
            {history.length === 0 && <p className="m-0 rounded-2xl bg-surface-container-low p-5 text-center text-body-sm text-on-surface-variant">Aucun boost pour le moment.</p>}
            {history.map(b => {
              const active = isFuture(b.expiresAt) && new Date(b.expiresAt).getTime() - new Date(b.startsAt).getTime() > 0
              const img = b.listing?.coverImageUrl ?? b.listing?.media[0]?.url
              return (
                <div key={b.id} className="rounded-2xl border border-outline-variant bg-surface-lowest p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container text-outline">{img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Tag size={18} />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-label-md text-on-surface">{b.listing?.title ?? '—'}</div>
                      <div className="text-body-sm text-on-surface-variant">{formatDate(b.createdAt)}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm ${active ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>{active ? 'Actif' : 'Terminé'}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">{packLabel(b.pack)}</span>
                    <span className="text-label-md font-bold text-on-surface"><Price amount={b.price} /></span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-body-sm text-tertiary"><TrendingUp size={14} /> +{b.viewsGained ?? 0} vues • +{b.contactsGained ?? 0} contacts</div>
                </div>
              )
            })}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-outline-variant bg-surface-lowest md:block">
            <table className="w-full min-w-[640px] border-collapse text-left text-body-sm">
              <thead>
                <tr className="bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
                  {['Date d’activation', 'Annonce', 'Formule', 'Coût', 'Performance', 'Statut'].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant">Aucun boost pour le moment.</td></tr>}
                {history.map(b => {
                  const active = isFuture(b.expiresAt) && new Date(b.expiresAt).getTime() - new Date(b.startsAt).getTime() > 0
                  return (
                    <tr key={b.id} className="border-0 border-t border-solid border-outline-variant">
                      <td className="px-4 py-3 text-on-surface">{formatDate(b.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-surface-container">{(b.listing?.coverImageUrl ?? b.listing?.media[0]?.url) && <img src={b.listing?.coverImageUrl ?? b.listing?.media[0]?.url} alt="" className="h-full w-full object-cover" />}</span>
                          <span className="max-w-[180px] truncate text-on-surface">{b.listing?.title ?? '—'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">{packLabel(b.pack)}</span></td>
                      <td className="px-4 py-3 font-semibold text-on-surface"><Price amount={b.price} /></td>
                      <td className="px-4 py-3 text-tertiary"><span className="flex items-center gap-1"><TrendingUp size={14} /> +{b.viewsGained ?? 0} vues • +{b.contactsGained ?? 0} contacts</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-label-sm ${active ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>{active ? 'Actif' : 'Terminé'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reassurance */}
        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: <Percent size={19} />, title: '0% Commission', text: 'Vendez gratuitement sans frais cachés' },
            { icon: <Handshake size={19} />, title: 'Remise en main propre', text: 'Vérification directe de l’article' },
            { icon: <span className="flex -space-x-2">{['WAVE', 'ORANGE_MONEY'].map(m => <PaymentLogo key={m} method={m} size={26} className="ring-2 ring-surface-lowest" />)}</span>, title: 'Paiement direct Wave / OM', text: 'Transactions entre particuliers', bare: true },
            { icon: <ShieldCheck size={19} />, title: 'Mise en relation sécurisée', text: 'Profils vérifiés et signalement' },
          ].map(t => (
            <div key={t.title} className="flex items-start gap-3 rounded-xl bg-surface-container-low p-3">
              {'bare' in t ? <span className="shrink-0">{t.icon}</span> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tertiary-soft text-tertiary">{t.icon}</span>}
              <div><div className="text-label-md text-on-surface">{t.title}</div><div className="text-body-sm text-on-surface-variant">{t.text}</div></div>
            </div>
          ))}
        </section>
      </div>
      <ConfirmSheet
        open={confirmBump}
        title="Remonter l'annonce"
        confirmLabel="Utiliser 1 crédit"
        loading={bumping}
        onClose={() => setConfirmBump(false)}
        onConfirm={() => void spendCredit()}
      >
        {listing && <p className="m-0">« {listing.title} » repasse en tête du catalogue. <b className="text-on-surface">1 crédit</b> sera utilisé.</p>}
      </ConfirmSheet>
      <PaymentSheet
        open={!!confirmPack}
        title="Payer le boost"
        amount={pack(confirmPack ?? 'BUMP_FLASH')?.price ?? 0}
        request={confirmPack && listing ? { kind: 'BOOST_PACK', product: confirmPack, listingId: listing.id } : null}
        onClose={() => setConfirmPack(null)}
        onPaid={() => confirmPack && paid(confirmPack)}
      >
        {confirmPack && listing && (
          <>
            <b className="block text-label-lg text-on-surface">{pack(confirmPack)?.label ?? 'Formule'}</b>
            <span className="line-clamp-1">« {listing.title} »</span>
          </>
        )}
      </PaymentSheet>
    </AccountLayout>
  )
}
