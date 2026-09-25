import EmptyState from '../../components/EmptyState'
import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import SafeImg from '../../components/SafeImg'
import { AccountLayout } from '../account/AccountLayout'
import { PhotoPicker } from '../../components/DisputeParts'
import { BuyerTabs, Breadcrumb, TrustFooter } from './BuyerShared'
import {
  MY_DISPUTE_STATS_QUERY, MY_PURCHASE_ORDERS_QUERY, OPEN_DISPUTE_MUTATION, SALES_ORDER_QUERY,
  type Dispute, type DisputeReason, type DisputeStats, type HandoverOrder, type PurchaseOrder,
} from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'

type Props = {
  orderId: string
  onNavigate: (p: any) => void
  onSelectOrder: (orderId: string) => void
  onOpened: (disputeId: string) => void
  onOpenConversation: (sellerId: string, listingId?: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

const REASONS: { value: DisputeReason; icon: string; title: string; text: string }[] = [
  { value: 'NOT_AS_DESCRIBED', icon: 'broken_image', title: 'Non conforme / Défaut caché', text: 'Rayures, casse non déclarée, composants défectueux au test.' },
  { value: 'NO_SHOW', icon: 'person_off', title: 'Vendeur absent au rendez-vous', text: "Le vendeur ne s'est pas présenté au point de retrait convenu." },
  { value: 'PAYMENT_PRESSURE', icon: 'warning', title: "Demande anormale d'acompte", text: 'Pression pour un paiement avant la remise ou hors application.' },
  { value: 'COUNTERFEIT', icon: 'new_releases', title: 'Contrefaçon présumée', text: 'Logo non authentique, matière suspecte ou numéro de série faux.' },
  { value: 'OTHER', icon: 'help', title: 'Autre motif', text: 'Circonstances particulières nécessitant un arbitrage.' },
]
const STEPS = [
  { title: 'Échange amiable (24h)', text: 'Le vendeur est averti immédiatement et peut proposer une remise ou l’annulation.' },
  { title: 'Intervention Dilchap', text: "Sans accord sous 24h, un médiateur Dilchap analyse les preuves et contacte les deux parties." },
  { title: 'Décision finale', text: 'Vente finalisée, remise accordée ou achat annulé : aucun paiement n’est dû avant la décision.' },
]

// "Déclarer un litige sur votre commande" (desktop + mobile mockups).
export default function OpenDispute({ orderId, onNavigate, onSelectOrder, onOpened, onOpenConversation, currentUser, onLogout }: Props) {
  const { data: purchasesData } = useQuery<{ myPurchaseOrders: PurchaseOrder[] }>(MY_PURCHASE_ORDERS_QUERY, { skip: !!orderId })
  const { data, loading } = useQuery<{ salesOrder: HandoverOrder }>(SALES_ORDER_QUERY, { variables: { id: orderId }, skip: !orderId })
  const { data: statsData } = useQuery<{ myDisputeStats: DisputeStats }>(MY_DISPUTE_STATS_QUERY)
  const o = data?.salesOrder
  const [reason, setReason] = useState<DisputeReason>('NOT_AS_DESCRIBED')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [open, { loading: sending, error }] = useMutation<{ openDispute: Dispute }>(OPEN_DISPUTE_MUTATION)
  const amount = o?.agreedPrice ?? o?.listing.price ?? 0
  const whatsapp = statsData?.myDisputeStats.mediationWhatsapp
  const submit = () => o && void open({ variables: { input: { conversationId: o.id, reason, description: description.trim(), photos } } })
    .then(r => r.data && onOpened(r.data.openDispute.id))

  const candidates = (purchasesData?.myPurchaseOrders ?? []).filter(p => p.stage !== 'CANCELLED')

  return (
    <AccountLayout active="buyer-dispute-new" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <BuyerTabs active="buyer-dispute-new" onNavigate={onNavigate} />

        {!orderId ? (
          <section className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <h1 className="m-0 text-headline-md text-on-surface">Ouvrir un litige</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Choisissez l'achat concerné :</p>
            <div className="mt-4 flex flex-col gap-2">
              {candidates.length === 0 && (
                <EmptyState icon="cart" fallback="shopping_bag" title="Aucun achat en cours" text="Un litige s'ouvre depuis un achat avec un vendeur." action={{ label: 'Voir mes achats', onClick: () => onNavigate('buyer-purchases') }} />
              )}
              {candidates.map(p => (
                <button key={p.id} onClick={() => onSelectOrder(p.id)} className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline-variant bg-surface-lowest p-3 text-left hover:border-primary">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container"><SafeImg src={p.listing.coverImageUrl} icon="shopping_bag" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-label-md text-on-surface">{p.listing.title}</span><span className="block text-body-sm text-on-surface-variant">#{p.reference} • {p.seller.fullName}</span></span>
                  <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
                </button>
              ))}
            </div>
          </section>
        ) : loading && !o ? <p className="text-body-md text-on-surface-variant">Chargement…</p> : !o ? <p className="text-body-md text-on-surface-variant">Commande introuvable.</p> : o.disputeId ? (
          <section className="rounded-2xl bg-surface-container-low p-6 text-center">
            <p className="m-0 text-headline-sm text-on-surface">Un litige existe déjà pour cette commande</p>
            <button onClick={() => onOpened(o.disputeId!)} className="mt-3 cursor-pointer rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white">Suivre mon litige</button>
          </section>
        ) : (
          <>
            <Breadcrumb onNavigate={onNavigate} items={[{ label: 'Mes achats', page: 'buyer-purchases' }, { label: `Commande #${o.reference}`, page: 'buyer-handover' }, { label: 'Ouverture de litige' }]} />
            <section className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-container-low p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="gavel" size={21} /></span>
              <div className="min-w-[12rem] flex-1"><div className="text-headline-sm text-on-surface">Garantie Tierce-Partie Dilchap</div><div className="text-body-sm text-on-surface-variant">Tant que le litige est ouvert, votre code de remise est gelé : aucun paiement n'est dû.</div></div>
              <span className="flex items-center gap-1 rounded-full bg-surface-lowest px-3 py-1 text-label-sm uppercase text-on-surface"><span className="h-2 w-2 rounded-full bg-primary" /> Procédure sécurisée</span>
            </section>

            {/* Mobile: the order under dispute comes first (Stitch mobile) */}
            <section className="mb-4 rounded-2xl bg-surface-lowest p-3 shadow-sm lg:hidden">
              <div className="flex gap-3">
                <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container"><SafeImg src={o.listing.coverImageUrl} icon="shopping_bag" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2"><span className="text-label-sm text-on-surface-variant">#{o.reference}</span><span className="text-label-lg font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></span></div>
                  <div className="truncate text-label-lg text-on-surface">{o.listing.title}</div>
                  <div className="flex items-center gap-1 truncate text-body-sm text-on-surface-variant"><Icon name="storefront" size={14} /> {o.seller.fullName}{o.seller.isVerified && <Icon name="verified" size={14} className="text-tertiary" />}</div>
                </div>
              </div>
              {o.meetup && <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-2 text-body-sm text-on-surface-variant"><Icon name="location_on" size={16} className="shrink-0 text-primary" /> <span className="truncate">RDV prévu : <b className="text-on-surface">{o.meetup.place}</b></span></div>}
            </section>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5">
                <div className="flex items-center gap-1 text-label-sm uppercase text-primary"><Icon name="shield" size={15} /> Signalement tiers de confiance</div>
                <h1 className="m-0 mt-1 text-headline-md text-on-surface md:text-headline-lg">Déclarer un litige sur votre commande</h1>
                <p className="m-0 mt-1 text-body-md text-on-surface-variant">Bénéficiez de la médiation Dilchap : notre équipe d'arbitrage protège votre paiement.</p>

                <h2 className="m-0 mt-5 flex items-center gap-2 text-label-lg text-on-surface"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-label-sm text-white">1</span> Motif principal du litige</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {REASONS.map(r => {
                    const on = reason === r.value
                    return (
                      <label key={r.value} className={`flex cursor-pointer gap-3 rounded-xl p-3 ${on ? 'bg-primary-fixed/70' : 'bg-surface-container-low'}`}>
                        <input type="radio" name="reason" checked={on} onChange={() => setReason(r.value)} className="sr-only" />
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-primary text-white' : 'bg-surface-lowest text-on-surface-variant'}`}><Icon name={r.icon} size={19} /></span>
                        <span className="min-w-0 flex-1"><span className="block text-label-lg text-on-surface md:text-label-md">{r.title}</span><span className="block text-body-sm text-on-surface-variant">{r.text}</span></span>
                        <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} size={20} fill={on} className={on ? 'text-primary' : 'text-outline-variant'} />
                      </label>
                    )
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between gap-2">
                  <h2 className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-label-sm text-white">2</span> Détaillez précisément l'incident</h2>
                  <span className="shrink-0 whitespace-nowrap text-label-sm text-on-surface-variant">{description.length} / 1500<span className="max-md:hidden"> caractères</span></span>
                </div>
                <p className="m-0 mt-2 flex gap-1 rounded-xl bg-surface-container-low p-2.5 text-body-sm text-on-surface-variant"><Icon name="lightbulb" size={16} className="shrink-0 text-primary" /> <span><b className="text-on-surface">Conseil de médiateur :</b> décrivez de façon factuelle l'écart constaté par rapport à l'annonce et ce qui a été échangé lors de la rencontre.</span></p>
                <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 1500))} rows={5} placeholder="Lors du contrôle sur place, j'ai constaté…" className="mt-2 w-full resize-y rounded-xl border border-outline-variant bg-surface-lowest p-3 text-body-md text-on-surface outline-none focus:border-primary" />
                {description.trim().length > 0 && description.trim().length < 20 && <p className="m-0 text-label-sm text-primary">Minimum 20 caractères</p>}

                <div className="mt-5 flex items-center justify-between gap-2">
                  <h2 className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-label-sm text-white">3</span> Pièces justificatives & photos</h2>
                  {photos.length > 0 && <span className="flex items-center gap-1 text-label-sm text-tertiary"><Icon name="check_circle" size={14} /> {photos.length} photo{photos.length > 1 ? 's' : ''} importée{photos.length > 1 ? 's' : ''}</span>}
                </div>
                <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Photos nettes de l'anomalie, de l'emballage ou captures d'écran de la conversation.</p>
                <div className="mt-2"><PhotoPicker urls={photos} onChange={setPhotos} label="Ajouter des photos ou captures" max={6} /></div>

                <div className="mt-5 flex gap-3 rounded-xl bg-tertiary-soft p-3">
                  <Icon name="lock" size={22} className="shrink-0 text-tertiary" />
                  <p className="m-0 text-body-sm text-on-surface"><b className="text-tertiary">Garantie d'immunité financière Dilchap</b><br />Aucune vente ne peut être clôturée tant que le litige est ouvert : votre code de remise est temporairement désactivé.</p>
                </div>
                {error && <p className="m-0 mt-2 text-body-sm text-primary">{error.message}</p>}
                {description.trim().length < 20 && <p className="m-0 mt-4 text-center text-body-sm text-on-surface-variant sm:text-right">Décrivez l'incident (20 caractères minimum) pour pouvoir transmettre le dossier.</p>}
                <div className="mt-3 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
                  <button onClick={() => onNavigate('buyer-handover')} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-on-surface">Annuler et retourner au récapitulatif</button>
                  <button onClick={submit} disabled={sending || description.trim().length < 20} className="flex w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border-none bg-primary px-5 py-3 text-label-md text-white disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant sm:w-auto">
                    <Icon name="report" size={19} /> Ouvrir le litige et notifier le vendeur
                  </button>
                </div>
              </section>

              <aside className="flex flex-col gap-4">
                <section className="hidden rounded-2xl bg-surface-lowest p-4 shadow-sm lg:block">
                  <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                    <div><div className="text-label-sm uppercase text-on-surface-variant">N° commande</div><div className="text-label-lg text-on-surface">#{o.reference}</div></div>
                    <span className="rounded bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">Litige imminent</span>
                  </div>
                  <div className="mt-3 flex gap-3">
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container"><SafeImg src={o.listing.coverImageUrl} icon="shopping_bag" /></span>
                    <div className="min-w-0"><div className="text-label-sm uppercase text-on-surface-variant">{o.listing.category.name}</div><div className="truncate text-label-lg text-on-surface">{o.listing.title}</div>{o.listing.condition && <div className="text-body-sm text-on-surface-variant">État déclaré : {o.listing.condition}</div>}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                    <span className="flex items-center gap-1.5 text-label-md text-on-surface"><Icon name="account_balance_wallet" size={17} /> Montant en jeu</span>
                    <span className="text-headline-sm font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">{o.seller.avatarUrl ? <img src={o.seller.avatarUrl} alt="" className="h-full w-full object-cover" /> : o.seller.fullName.charAt(0)}</span>
                    <div className="min-w-0 flex-1"><div className="text-label-md text-on-surface">{o.seller.fullName}</div><div className="text-body-sm text-on-surface-variant">{o.seller.reviewsCount ? `★ ${o.seller.averageRating.toFixed(1)} • ${o.seller.reviewsCount} avis` : 'Nouveau vendeur'}</div></div>
                    <button onClick={() => onOpenConversation(o.seller.id, o.listing.id)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface" aria-label="Chat"><Icon name="chat" size={18} /></button>
                  </div>
                  {o.meetup && <div className="mt-3 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="location_on" size={16} className="text-primary" /> RDV prévu : {o.meetup.place}</div>}
                </section>

                <section className="hidden rounded-2xl bg-surface-lowest p-4 shadow-sm md:block">
                  <h3 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="balance" size={22} className="text-tertiary" /> Comment fonctionne la médiation ?</h3>
                  <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
                    {STEPS.map((s, i) => (
                      <li key={s.title} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-outline-variant text-label-sm text-primary">{i + 1}</span>
                        <div><div className="text-label-md text-on-surface">{s.title}</div><div className="text-body-sm text-on-surface-variant">{s.text}</div></div>
                      </li>
                    ))}
                  </ol>
                </section>

                {whatsapp && (
                  <section className="hidden rounded-2xl bg-surface-container-low p-4 md:block">
                    <div className="flex items-center gap-2"><Icon name="support_agent" size={22} className="text-primary" /><div><div className="text-label-md text-on-surface">Urgence sur place ?</div><div className="text-body-sm text-on-surface-variant">Ligne directe des médiateurs Dilchap</div></div></div>
                    <a href={`https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-between rounded-xl bg-surface-lowest px-3 py-2 no-underline">
                      <span className="text-headline-sm text-on-surface">{whatsapp}</span><span className="rounded bg-tertiary-soft px-1.5 text-label-sm text-tertiary">7j/7 • 8h-22h</span>
                    </a>
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
        <TrustFooter />
      </div>
    </AccountLayout>
  )
}
