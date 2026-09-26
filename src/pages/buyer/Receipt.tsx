import AnimatedIcon from '../../components/AnimatedIcon'
import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import SafeImg from '../../components/SafeImg'
import { handoverProof } from '../../lib/format'
import PrintableReceipt from '../../components/PrintableReceipt'
import { ListingCard } from '../../components/ListingCard'
import { AccountLayout } from '../account/AccountLayout'
import { BuyerTabs, TrustFooter } from './BuyerShared'
import { PAYMENT_LABELS } from '../ListingDetail'
import { SALES_ORDER_QUERY, type HandoverOrder } from '../../graphql/sellerTools'
import { SIMILAR_LISTINGS_QUERY, type RemoteListing } from '../../graphql/listings'
import { CREATE_REVIEW_MUTATION, SELLER_PROFILE_QUERY } from '../../graphql/reviews'
import type { AuthUser } from '../../graphql/auth'

type Props = {
  orderId: string
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

const TAGS = ['Article 100% conforme', 'Ponctuel au rendez-vous', 'Vendeur très courtois', 'Produit soigné']
const RATING_LABEL = ['', 'Décevant', 'Moyen', 'Correct', 'Très bien', 'Remise parfaite']

// "Remise validée par code sécurisé" / "Reçu de remise réussie": receipt
// of a concluded hand-over + review of the seller + similar items.
export default function Receipt({ orderId, onNavigate, onSelectListing, favorites, onToggleFavorite, currentUser, onLogout }: Props) {
  const { data, loading } = useQuery<{ salesOrder: HandoverOrder }>(SALES_ORDER_QUERY, { variables: { id: orderId }, skip: !orderId })
  const o = data?.salesOrder
  const { data: profileData, refetch: refetchProfile } = useQuery<{ sellerProfile: { hasReviewed: boolean; canReview: boolean } }>(SELLER_PROFILE_QUERY, { variables: { sellerId: o?.seller.id }, skip: !o })
  const { data: similarData } = useQuery<{ similarListings: RemoteListing[] }>(SIMILAR_LISTINGS_QUERY, { variables: { listingId: o?.listing.id, limit: 4 }, skip: !o })
  const [rating, setRating] = useState(5)
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [createReview, { loading: sending, error, data: sent }] = useMutation(CREATE_REVIEW_MUTATION)
  const reviewed = !!sent || !!profileData?.sellerProfile.hasReviewed
  const amount = o?.agreedPrice ?? o?.listing.price ?? 0
  const closedAt = o?.meetup?.handedOverAt ?? o?.dealClosedAt
  const share = () => {
    const text = `Reçu Dilchap #${o?.reference} — ${o?.listing.title} : ${amount.toLocaleString('fr-FR')} F`
    if (navigator.share) void navigator.share({ title: 'Reçu Dilchap', text }).catch(() => undefined)
    else void navigator.clipboard?.writeText(text)
  }
  // The buyer may also sell in the same category: never recommend (and offer
  // to boost) their own listings on a purchase receipt.
  const similar = (similarData?.similarListings ?? []).filter(l => l.seller.id !== currentUser?.id)
  const payment = o?.paymentMethod && PAYMENT_LABELS[o.paymentMethod] ? PAYMENT_LABELS[o.paymentMethod] : 'Paiement direct au vendeur'
  // The PDF gets a meaningful file name (browsers use the page title).
  const printReceipt = () => {
    const title = document.title
    document.title = `Recu-Dilchap-${o?.reference ?? ''}-CI`
    window.addEventListener('afterprint', () => { document.title = title }, { once: true })
    window.print()
  }
  const send = () => o && void createReview({ variables: { input: { sellerId: o.seller.id, rating, comment: comment.trim() || undefined, tags } } }).then(() => refetchProfile())

  return (
    <AccountLayout active="buyer-receipt" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <div className="print:hidden"><BuyerTabs active="buyer-receipt" onNavigate={onNavigate} /></div>
        {loading && !o && <p className="text-body-md text-on-surface-variant">Chargement…</p>}
        {!loading && !o && <p className="text-body-md text-on-surface-variant">Reçu introuvable.</p>}
        {o && o.stage !== 'DONE' && (
          <div className="rounded-2xl bg-surface-container-low p-6 text-center">
            <p className="m-0 text-headline-sm text-on-surface">Cette remise n'est pas encore clôturée</p>
            <button onClick={() => onNavigate('buyer-handover')} className="mt-3 cursor-pointer rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white">Voir mon code de remise</button>
          </div>
        )}

        {o && o.stage === 'DONE' && (
          <>
            <PrintableReceipt order={o} amount={amount} payment={payment} closedAt={closedAt} />
            {/* Mobile hero */}
            <div className="mb-4 text-center md:hidden">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-tertiary text-white ring-8 ring-tertiary-soft"><AnimatedIcon name="check" fallback="check_circle" size={40} playOnMount /></span>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-tertiary-soft px-3 py-1 text-label-sm uppercase text-tertiary"><Icon name="verified_user" size={14} /> Handshake scellé & sécurisé</span>
              <h1 className="m-0 mt-2 text-headline-md text-on-surface">Félicitations pour votre achat !</h1>
              <p className="m-0 text-body-md text-on-surface-variant">La remise en main propre a été scellée avec succès.</p>
            </div>
            {/* Desktop header */}
            <div className="mb-5 hidden flex-wrap items-center justify-between gap-3 md:flex print:flex">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="check_circle" size={24} /></span>
                <div>
                  <span className="rounded-full bg-tertiary-soft px-2.5 py-0.5 text-label-sm uppercase text-tertiary">Transaction clôturée • Paiement confirmé</span>
                  <h1 className="m-0 mt-1 text-headline-lg text-on-surface">Remise validée par code sécurisé</h1>
                </div>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => onNavigate('buyer-dashboard')} className="flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-surface-container-high px-3 py-2 text-label-md text-on-surface"><Icon name="dashboard" size={17} /> Mon tableau de bord</button>
                <button onClick={() => onNavigate('buyer-receipts')} className="flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-surface-container-high px-3 py-2 text-label-md text-on-surface"><Icon name="receipt_long" size={17} /> Historique achats</button>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <section className="overflow-hidden rounded-2xl bg-surface-lowest shadow-sm max-md:border-0 max-md:border-t-[6px] max-md:border-solid max-md:border-tertiary">
                <div className="hidden flex-wrap items-center justify-between gap-2 bg-tertiary px-5 py-4 text-white md:flex print:flex">
                  <div className="flex items-center gap-3">
                    <Icon name="verified" size={26} />
                    <div><div className="text-label-sm uppercase text-white/80">Code de remise validé</div><div className="text-headline-sm">Remise effectuée avec succès !</div></div>
                  </div>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-label-sm uppercase">Transaction 100% locale</span>
                </div>
                <div className="p-5">
                  {/* Mobile: ticket layout of the Stitch mobile receipt */}
                  <div className="md:hidden print:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><div className="text-label-sm uppercase text-on-surface-variant">Référence transaction</div><div className="truncate text-label-lg text-on-surface">#{o.reference}-CI</div></div>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary"><span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> Payé &amp; Livré</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
                      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-container"><SafeImg src={o.listing.coverImageUrl} icon="shopping_bag" /></span>
                      <div className="min-w-0"><div className="truncate text-label-lg text-on-surface">{o.listing.title}</div><div className="truncate text-body-sm text-on-surface-variant">{[o.listing.condition && o.listing.condition !== 'N/A' ? o.listing.condition : null, o.listing.city].filter(Boolean).join(' • ')}</div></div>
                    </div>
                    <dl className="m-0 mt-3 flex flex-col gap-2 text-body-sm">
                      {[
                        ['Date & Heure', closedAt ? new Date(closedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(':', 'h') : '—', 'schedule'],
                        ['Règlement', payment, 'account_balance_wallet'],
                        ['Lieu de rendez-vous', o.meetup?.place ?? '—', 'location_on'],
                        ['Vendeur', o.seller.fullName, o.seller.isVerified ? 'verified' : ''],
                      ].map(([label, value, icon]) => (
                        <div key={label} className="flex items-start justify-between gap-3">
                          <dt className="shrink-0 text-on-surface-variant">{label}</dt>
                          <dd className="m-0 flex min-w-0 items-center gap-1 text-right text-on-surface">{icon && icon !== 'verified' && <Icon name={icon} size={15} className="shrink-0 text-primary" />}<span className="min-w-0">{value}</span>{icon === 'verified' && <Icon name="verified" size={15} className="shrink-0 text-tertiary" />}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="-mx-5 my-4 border-0 border-t-2 border-dashed border-outline-variant" />
                    <div className="flex items-center justify-between gap-2 text-body-sm"><span className="text-on-surface-variant">Frais Dilchap</span><span className="text-tertiary">0 F (100% P2P)</span></div>
                    <div className="mt-1 flex items-baseline justify-between gap-2"><span className="text-label-lg text-on-surface">Montant Total Réglé</span><span className="text-headline-md font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></span></div>
                  </div>
                  <div className="hidden md:block print:block">
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-container-low p-4">
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container"><SafeImg src={o.listing.coverImageUrl} icon="shopping_bag" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-label-sm text-on-surface-variant">Réf : #{o.reference}</div>
                      <div className="truncate text-label-lg text-on-surface">{o.listing.title}</div>
                      <div className="text-body-sm text-on-surface-variant">Vendu par {o.seller.fullName}</div>
                    </div>
                    <div className="flex w-full items-baseline justify-between gap-2 border-0 border-t border-dashed border-outline-variant pt-3 sm:block sm:w-auto sm:border-none sm:pt-0 sm:text-right">
                      <div className="text-label-sm uppercase text-on-surface-variant">Montant réglé</div>
                      <div className="text-headline-md font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></div>
                    </div>
                  </div>
                  <dl className="m-0 mt-4 grid gap-4 sm:grid-cols-2">
                    {[
                      ['location_on', 'Lieu de rendez-vous', o.meetup?.place ?? '—', 'Point de rencontre convenu'],
                      ['schedule', 'Date et horodatage', closedAt ? new Date(closedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—', handoverProof(o.meetup)],
                      ['account_balance_wallet', 'Mode de règlement', payment, 'Réglé directement au vendeur'],
                      ['sell', 'Commission plateforme', '0 F (0% sans frais)', 'Aucun frais pour l’acheteur'],
                    ].map(([icon, label, value, sub]) => (
                      <div key={label}>
                        <dt className="text-label-sm uppercase text-on-surface-variant">{label}</dt>
                        <dd className="m-0 mt-1 flex items-center gap-1.5 text-label-md text-on-surface"><Icon name={icon} size={17} className="text-primary" /> {value}</dd>
                        <dd className="m-0 text-body-sm text-on-surface-variant">{sub}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-1"><Icon name="lock" size={15} /> Remise enregistrée & scellée</span>
                    <span className="font-mono text-label-sm text-on-surface">#{o.reference}-CI</span>
                  </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
                    <button onClick={printReceipt} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container-high py-3 text-label-md text-on-surface"><Icon name="download" size={18} /> Reçu PDF</button>
                    <button onClick={share} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-inverse-surface py-3 text-label-md text-white"><Icon name="share" size={18} /> Partager</button>
                  </div>
                </div>
              </section>

              <aside className="flex flex-col gap-4 print:hidden">
                <section className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-label-md text-primary">{o.seller.avatarUrl ? <SafeImg src={o.seller.avatarUrl} icon="person" fallbackClassName="flex h-full w-full items-center justify-center" /> : o.seller.fullName.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
                    <div><div className="flex items-center gap-1 text-label-lg text-on-surface">{o.seller.fullName}{o.seller.isVerified && <Icon name="verified" size={16} className="text-tertiary" />}</div><div className="text-body-sm text-on-surface-variant">Comment s'est passée la remise ?</div></div>
                  </div>
                  {reviewed ? (
                    <div className="mt-4 rounded-xl bg-tertiary-soft p-4 text-center">
                      <Icon name="task_alt" size={28} className="text-tertiary" />
                      <p className="m-0 mt-1 text-label-md text-on-surface">Merci ! Votre avis sur ce vendeur est publié.</p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 rounded-xl bg-surface-container-low p-4 text-center">
                        <div className="text-label-sm uppercase text-on-surface-variant">Votre note globale</div>
                        <div className="mt-2 flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} onClick={() => setRating(n)} className="cursor-pointer border-none bg-transparent p-0" aria-label={`${n} étoile${n > 1 ? 's' : ''}`}><Icon name="star" size={32} fill={n <= rating} className="text-primary" /></button>
                          ))}
                        </div>
                        <div className="mt-1 text-label-md text-tertiary">{rating}.0 – {RATING_LABEL[rating]}</div>
                      </div>
                      <div className="mt-3 text-label-sm uppercase text-on-surface-variant">Points forts remarqués</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {TAGS.map(t => {
                          const on = tags.includes(t)
                          return <button key={t} onClick={() => setTags(prev => on ? prev.filter(x => x !== t) : [...prev, t])} className={`cursor-pointer rounded-full border-none px-3 py-1.5 text-label-sm ${on ? 'bg-inverse-surface text-white' : 'bg-surface-container text-on-surface'}`}>{t}</button>
                        })}
                      </div>
                      <label className="mt-3 block text-label-md text-on-surface">Votre témoignage <span className="text-label-sm text-on-surface-variant">(optionnel)</span>
                        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={1000} placeholder="Racontez comment s'est déroulée la remise en main propre…" className="mt-1 w-full resize-none rounded-xl border border-outline-variant bg-surface-container-low p-3 text-body-md text-on-surface outline-none focus:border-primary" />
                      </label>
                      {error && <p className="m-0 mt-1 text-body-sm text-primary">{error.message}</p>}
                      <button onClick={send} disabled={sending} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3 text-label-md text-white disabled:opacity-60"><Icon name="send" size={18} /> Envoyer mon avis sur le vendeur</button>
                    </>
                  )}
                </section>
                <section className="hidden items-center gap-3 rounded-2xl bg-surface-container-low p-4 md:flex">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="handshake" size={21} /></span>
                  <div><div className="text-label-lg text-on-surface">Expérience 100% Locale</div><div className="text-body-sm text-on-surface-variant">Vous n'avez payé le vendeur qu'après avoir validé la qualité de l'article sur place.</div></div>
                </section>
              </aside>
            </div>

            {similar.length > 0 && (
              <section className="mt-8 hidden md:block print:hidden">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <span className="rounded bg-primary-fixed px-2 py-0.5 text-label-sm uppercase text-primary">Recommandations Dilchap</span>
                    <h2 className="m-0 mt-2 text-headline-md text-on-surface">Autres pépites similaires</h2>
                  </div>
                  <button onClick={() => onNavigate('search')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary">Explorer d'autres pépites <Icon name="arrow_forward" size={16} /></button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {similar.map(l => (
                    <ListingCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUser?.id} />
                  ))}
                </div>
              </section>
            )}

            <div className="mt-6 flex flex-col items-center gap-3 md:hidden print:hidden">
              <button onClick={() => onNavigate('search')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-headline-sm text-primary">Explorer d'autres pépites <Icon name="arrow_forward" size={20} /></button>
              <button onClick={() => onNavigate('buyer-purchases')} className="cursor-pointer border-none bg-transparent p-0 text-body-sm text-on-surface-variant">Retourner à mes achats</button>
            </div>
            <section className="mt-6 hidden flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-4 md:flex print:hidden">
              <div className="flex items-center gap-3"><Icon name="help" size={22} className="text-primary" /><div><div className="text-label-md text-on-surface">Une question sur cette transaction clôturée ?</div><div className="text-body-sm text-on-surface-variant">L'équipe Dilchap reste joignable pour votre historique d'achat.</div></div></div>
              <button onClick={() => onNavigate('buyer-receipts')} className="cursor-pointer rounded-xl border-none bg-inverse-surface px-4 py-2 text-label-md text-white">Retour à mes achats</button>
            </section>
          </>
        )}
        <div className="print:hidden"><TrustFooter /></div>
      </div>
    </AccountLayout>
  )
}
