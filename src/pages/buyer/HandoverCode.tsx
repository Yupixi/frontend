import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import { BuyerTabs, Breadcrumb, TrustFooter } from './BuyerShared'
import { PAYMENT_LABELS } from '../ListingDetail'
import { SALES_ORDER_QUERY, disputeIsOpen, type HandoverOrder } from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'

type Props = {
  orderId: string
  onNavigate: (p: any) => void
  onOpenOrder: (orderId: string, page: 'buyer-receipt' | 'buyer-dispute-new') => void
  onOpenDispute: (id: string) => void
  onOpenConversation: (sellerId: string, listingId?: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

const CHECKS = [
  { title: 'Allumage et fonctionnalités', text: "Testez l'article devant le vendeur (allumage, boutons, connexions).", icon: 'power_settings_new' },
  { title: 'État conforme aux photos', text: "Comparez l'aspect avec les photos et la description de l'annonce.", icon: 'photo_camera' },
  { title: "Accessoires et boîte d'origine", text: 'Vérifiez que tous les éléments annoncés sont bien remis.', icon: 'inventory_2' },
]
const METHOD_BADGE: Record<string, { letter: string; cls: string; sub: string }> = {
  WAVE: { letter: 'W', cls: 'bg-sky-100 text-sky-600', sub: 'Instantané' },
  ORANGE_MONEY: { letter: 'OM', cls: 'bg-orange-100 text-orange-600', sub: 'Sans frais' },
  MTN_MOMO: { letter: 'M', cls: 'bg-yellow-100 text-yellow-700', sub: 'Mobile Money' },
  MOOV_MONEY: { letter: 'M', cls: 'bg-blue-100 text-blue-700', sub: 'Mobile Money' },
  CASH: { letter: 'F', cls: 'bg-surface-container text-on-surface', sub: "Faire l'appoint" },
}

// "Mon code de remise" (desktop + mobile mockups): the buyer's 4-digit
// code, to give only after checking the item, plus the meet-up details.
export default function HandoverCode({ orderId, onNavigate, onOpenOrder, onOpenDispute, onOpenConversation, currentUser, onLogout }: Props) {
  const { data, loading } = useQuery<{ salesOrder: HandoverOrder }>(SALES_ORDER_QUERY, { variables: { id: orderId }, skip: !orderId, pollInterval: 15_000 })
  const o = data?.salesOrder
  const [checks, setChecks] = useState(CHECKS.map(() => false))
  const [copied, setCopied] = useState(false)
  const frozen = !!o?.disputeStatus && disputeIsOpen(o.disputeStatus)
  const code = o?.meetup?.handoverCode
  const confirmed = o?.meetup?.status === 'CONFIRMED'
  const done = o?.stage === 'DONE'
  const amount = o?.agreedPrice ?? o?.listing.price ?? 0
  const copy = () => { if (code) void navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }

  return (
    <AccountLayout active="buyer-handover" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <BuyerTabs active="buyer-handover" onNavigate={onNavigate} />
        {o && <Breadcrumb onNavigate={onNavigate} items={[{ label: 'Mes achats', page: 'buyer-purchases' }, { label: `Commande #${o.reference}` }, { label: 'Remise en main propre' }]} />}
        {loading && !o && <p className="text-body-md text-on-surface-variant">Chargement…</p>}
        {!loading && !o && <p className="text-body-md text-on-surface-variant">Commande introuvable.</p>}

        {o && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              <section className={`flex items-center gap-3 rounded-2xl p-4 ${confirmed ? 'bg-tertiary-soft' : 'bg-surface-container-low'}`}>
                <Icon name={confirmed ? 'verified_user' : 'hourglass_top'} size={26} className={confirmed ? 'text-tertiary' : 'text-on-surface-variant'} />
                <div className="min-w-0 flex-1">
                  <div className={`text-headline-sm ${confirmed ? 'text-tertiary' : 'text-on-surface'}`}>{done ? 'Remise effectuée' : confirmed ? 'Rendez-vous confirmé & sécurisé' : 'Rendez-vous à confirmer'}</div>
                  <div className="text-body-sm text-on-surface-variant">{done ? 'La vente a été clôturée avec votre code.' : confirmed ? "Protection acheteur active jusqu'à la remise." : 'Votre code apparaîtra dès que le rendez-vous sera confirmé dans le chat.'}</div>
                </div>
                {confirmed && !done && <span className="hidden items-center gap-1 rounded-full bg-surface-lowest px-3 py-1 text-label-sm text-tertiary sm:flex"><span className="h-2 w-2 rounded-full bg-tertiary" /> {frozen ? 'Code gelé' : 'Handshake actif'}</span>}
              </section>

              {/* Code */}
              <section className={`rounded-2xl p-5 shadow-sm ${frozen ? 'bg-surface-lowest' : 'bg-primary text-white md:bg-surface-lowest md:text-on-surface'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className={`text-label-sm uppercase ${frozen ? 'text-primary' : 'text-white/80 md:text-primary'}`}>Protocole de libération</div>
                    <h2 className="m-0 text-headline-md">Code Handshake Secret</h2>
                    <p className={`m-0 text-body-sm ${frozen ? 'text-on-surface-variant' : 'text-white/80 md:text-on-surface-variant'}`}>La remise physique valide la vente.</p>
                  </div>
                  {o.meetup && <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-label-sm ${frozen ? 'bg-surface-container text-on-surface' : 'bg-white/15 md:bg-surface-container'}`}><Icon name="schedule" size={15} /> RDV {new Date(o.meetup.scheduledAt).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
                <div className="mt-4 flex justify-center gap-3">
                  {[0, 1, 2, 3].map(i => (
                    <span key={i} className="flex h-16 w-14 items-center justify-center rounded-xl bg-surface-lowest text-headline-lg font-extrabold text-on-surface shadow-sm md:bg-surface-container-low">
                      {frozen ? <span className="h-3 w-3 rounded-full bg-on-surface-variant" /> : code?.[i] ?? '•'}
                    </span>
                  ))}
                </div>
                {frozen ? (
                  <p className="m-0 mt-3 flex items-center justify-center gap-1 text-label-md text-primary"><Icon name="lock" size={16} /> Code temporairement gelé : un litige est en cours</p>
                ) : code && !done ? (
                  <button onClick={copy} className="mx-auto mt-3 flex cursor-pointer items-center gap-2 rounded-xl border-none bg-white px-4 py-2 text-label-md text-primary md:bg-surface-container-low md:text-on-surface">
                    <Icon name={copied ? 'check' : 'content_copy'} size={17} /> {copied ? 'Code copié' : 'Copier le code à 4 chiffres'}
                  </button>
                ) : null}
                {!frozen && !done && (
                  <div className={`mt-4 flex gap-3 rounded-xl p-3 ${'bg-white/10 md:bg-primary-fixed/50'}`}>
                    <Icon name="gpp_maybe" size={22} className="shrink-0 md:text-primary" />
                    <p className="m-0 text-body-sm"><b>Règle d'or de protection Dilchap :</b> ne communiquez ce code <u>qu'après avoir minutieusement inspecté</u> et testé l'article. Une fois le code saisi par le vendeur, la vente est définitivement clôturée.</p>
                  </div>
                )}
                {done && <button onClick={() => onOpenOrder(o.id, 'buyer-receipt')} className="mx-auto mt-4 flex cursor-pointer items-center gap-2 rounded-xl border-none bg-inverse-surface px-4 py-2.5 text-label-md text-white"><Icon name="receipt_long" size={18} /> Voir mon reçu</button>}
              </section>

              {!done && (
                <section className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="checklist" size={22} className="text-tertiary" /> Checklist avant de payer</h2>
                    <span className="rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface">{checks.filter(Boolean).length}/{CHECKS.length} validés</span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {CHECKS.map((c, i) => (
                      <label key={c.title} className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-container-low p-3">
                        <input type="checkbox" checked={checks[i]} onChange={e => setChecks(prev => prev.map((x, j) => (j === i ? e.target.checked : x)))} className="mt-0.5 h-5 w-5 accent-[#006947]" />
                        <span className="min-w-0 flex-1"><span className="block text-label-md text-on-surface">{c.title}</span><span className="block text-body-sm text-on-surface-variant">{c.text}</span></span>
                        <Icon name={c.icon} size={19} className="text-on-surface-variant" />
                      </label>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="m-0 text-headline-sm text-on-surface">Règlement accepté</h2>
                    <p className="m-0 text-body-sm text-on-surface-variant">Ce vendeur accepte les modalités suivantes sur place :</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary"><Icon name="verified" size={14} /> 0 F de commission</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {(o.listing.paymentMethods.length ? o.listing.paymentMethods : ['CASH']).map(m => (
                    <div key={m} className="flex items-center gap-2 rounded-xl bg-surface-container-low p-3 md:flex-col md:text-center">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-label-md font-extrabold ${METHOD_BADGE[m]?.cls ?? 'bg-surface-container'}`}>{METHOD_BADGE[m]?.letter ?? '•'}</span>
                      <span><span className="block text-label-md text-on-surface">{PAYMENT_LABELS[m] ?? m}</span><span className="block text-label-sm text-tertiary">{METHOD_BADGE[m]?.sub}</span></span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="flex gap-3 rounded-2xl bg-primary-fixed/40 p-4">
                <Icon name="storefront" size={22} className="shrink-0 text-primary" />
                <div>
                  <div className="text-label-md text-primary">Sécurité Dilchap</div>
                  <p className="m-0 text-body-sm text-on-surface">Privilégiez les galeries marchandes éclairées et fréquentées. <b>N'envoyez jamais d'acompte</b> de transport ou de réservation par mobile money avant d'avoir touché et vérifié le produit.</p>
                </div>
              </section>
            </div>

            {/* Aside */}
            <aside className="flex flex-col gap-4">
              <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <div className="text-label-sm uppercase text-on-surface-variant">Article réservé</div>
                <div className="mt-2 flex gap-3">
                  <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container">{o.listing.coverImageUrl && <img src={o.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                  <div className="min-w-0">
                    {o.listing.condition && o.listing.condition !== 'N/A' && <span className="rounded bg-tertiary-soft px-1.5 py-0.5 text-label-sm uppercase text-tertiary">{o.listing.condition}</span>}
                    <div className="mt-1 truncate text-headline-sm text-on-surface">{o.listing.title}</div>
                    <div className="text-headline-sm font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></div>
                  </div>
                </div>
              </section>

              {o.meetup && (
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="m-0 text-headline-sm text-on-surface">Lieu du rendez-vous</h3>
                    <span className="flex items-center gap-1 text-label-sm text-primary"><Icon name="schedule" size={14} /> {new Date(o.meetup.scheduledAt).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="location_on" size={21} /></span>
                    <div className="min-w-0 flex-1"><div className="text-label-md text-on-surface">{o.meetup.place}</div><div className="text-body-sm text-on-surface-variant">{o.listing.city}</div></div>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.meetup.place} ${o.listing.city}`)}`} target="_blank" rel="noreferrer" className="rounded-lg bg-surface-lowest px-2.5 py-1.5 text-label-sm text-on-surface no-underline shadow-sm">Itinéraire</a>
                  </div>
                </section>
              )}

              <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <div className="text-label-sm uppercase text-on-surface-variant">Vendeur</div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">{o.seller.avatarUrl ? <img src={o.seller.avatarUrl} alt="" className="h-full w-full object-cover" /> : o.seller.fullName.charAt(0)}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-label-lg text-on-surface">{o.seller.fullName}{o.seller.isVerified && <Icon name="verified" size={16} className="text-tertiary" />}</div>
                    <div className="text-body-sm text-on-surface-variant">{o.seller.reviewsCount ? <>★ {o.seller.averageRating.toFixed(1)} • {o.seller.reviewsCount} avis</> : 'Nouveau vendeur'}{o.seller.isVerified ? ' • Vérifié' : ''}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => onOpenConversation(o.seller.id, o.listing.id)} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container-high py-2.5 text-label-md text-on-surface"><Icon name="chat" size={17} /> Discuter</button>
                  {o.sellerPhone
                    ? <a href={`tel:${o.sellerPhone.replace(/\s/g, '')}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-label-md text-white no-underline"><Icon name="call" size={17} /> Appeler</a>
                    : <span className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-container py-2.5 text-label-sm text-on-surface-variant">Numéro après RDV confirmé</span>}
                </div>
              </section>

              {!done && (
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <div className="flex gap-2"><Icon name="report_problem" size={20} className="text-primary" /><div><div className="text-label-lg text-on-surface">Un imprévu sur place ?</div><p className="m-0 text-body-sm text-on-surface-variant">Le vendeur ne se présente pas, l'article est défectueux ou non conforme aux photos ?</p></div></div>
                  {o.disputeId
                    ? <button onClick={() => onOpenDispute(o.disputeId!)} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary-fixed/60 py-2.5 text-label-md text-primary"><Icon name="gavel" size={17} /> Suivre mon litige</button>
                    : <button onClick={() => onOpenOrder(o.id, 'buyer-dispute-new')} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary-fixed/60 py-2.5 text-label-md text-primary"><Icon name="flag" size={17} /> Déclarer un incident / Ouvrir un litige</button>}
                </section>
              )}
            </aside>
          </div>
        )}
        <TrustFooter />
      </div>
    </AccountLayout>
  )
}
