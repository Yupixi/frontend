import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import { BuyerTabs } from './BuyerShared'
import { MY_DISPUTE_STATS_QUERY, MY_PURCHASE_ORDERS_QUERY, disputeIsOpen, type DisputeStats, type PurchaseOrder } from '../../graphql/sellerTools'
import { RESPOND_TO_MEETUP_MUTATION } from '../../graphql/messaging'
import type { AuthUser } from '../../graphql/auth'

type Props = {
  mode: 'purchases' | 'receipts'
  onNavigate: (p: any) => void
  onOpenOrder: (orderId: string, page: 'buyer-handover' | 'buyer-receipt' | 'buyer-dispute-new') => void
  onOpenDispute: (disputeId: string) => void
  onOpenConversation: (sellerId: string, listingId?: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

type Tab = 'all' | 'open' | 'done' | 'disputes'
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Tous mes achats' },
  { key: 'open', label: 'En cours / RDV à venir' },
  { key: 'done', label: 'Remises terminées' },
  { key: 'disputes', label: 'Litiges & réclamations' },
]
const GOLDEN = [
  ['handshake', 'Protocole de remise', "La vente n'est clôturée que lorsque vous donnez votre code à 4 chiffres en face-à-face."],
  ['sell', '0 F de commission', 'Le prix affiché est le prix exact payé. Aucun frais caché.'],
  ['location_on', 'Points de rencontre sûrs', 'Privilégiez les galeries marchandes : Playce, Cap Sud, Cosmos Yopougon, Sococé.'],
  ['support_agent', 'Assistance locale 7j/7', "Notre équipe intervient par WhatsApp en cas de retard ou d'imprévu."],
]
const when = (iso: string) => {
  const d = new Date(iso)
  return new Date().toDateString() === d.toDateString()
    ? `aujourd'hui ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}`
    : d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
const digits = (s: string) => s.replace(/[^\d]/g, '')

// "Mes Achats & Remises en main propre" (Stitch desktop + mobile).
export default function Purchases({ mode, onNavigate, onOpenOrder, onOpenDispute, onOpenConversation, currentUser, onLogout }: Props) {
  const { data, loading, refetch } = useQuery<{ myPurchaseOrders: PurchaseOrder[] }>(MY_PURCHASE_ORDERS_QUERY, { fetchPolicy: 'cache-and-network' })
  const { data: statsData } = useQuery<{ myDisputeStats: DisputeStats }>(MY_DISPUTE_STATS_QUERY)
  const [respondToMeetup, { loading: answering }] = useMutation(RESPOND_TO_MEETUP_MUTATION)
  const [tab, setTab] = useState<Tab>(mode === 'receipts' ? 'done' : 'all')
  const inDispute = (o: PurchaseOrder) => !!o.disputeStatus && disputeIsOpen(o.disputeStatus)
  const all = (data?.myPurchaseOrders ?? []).filter(o => o.stage !== 'CANCELLED' || inDispute(o))
  const groups: Record<Tab, PurchaseOrder[]> = {
    all,
    open: all.filter(o => (o.stage === 'PENDING' || o.stage === 'IN_PROGRESS') && !inDispute(o)),
    done: all.filter(o => o.stage === 'DONE' && !inDispute(o)),
    disputes: all.filter(inDispute),
  }
  const shown = groups[tab]
  const atStake = groups.open.reduce((n, o) => n + (o.agreedPrice ?? o.listing.price ?? 0), 0)
  const whatsapp = statsData?.myDisputeStats.mediationWhatsapp
  const active = mode === 'receipts' ? 'buyer-receipts' : 'buyer-purchases'
  const answer = (o: PurchaseOrder, confirm: boolean) => {
    if (!o.meetup) return
    void respondToMeetup({ variables: { meetupId: o.meetup.id, confirm } }).then(() => {
      void refetch()
      if (!confirm) onOpenConversation(o.seller.id, o.listing.id)
    })
  }
  const btn = 'flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-3 py-2.5 text-label-md'

  return (
    <AccountLayout active={active} onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1120px] pb-8">
        <BuyerTabs active={active} onNavigate={onNavigate} />
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-3xl bg-surface-container-low p-5 md:p-6">
          <div className="max-w-2xl">
            <div className="hidden items-center gap-1 text-label-sm uppercase text-tertiary md:flex"><Icon name="verified" size={15} /> Sécurisation peer-to-peer Côte d'Ivoire</div>
            <h1 className="m-0 mt-1 text-headline-lg-mobile text-on-surface md:text-headline-lg">Mes achats &amp; remises<span className="hidden md:inline"> en main propre</span></h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Suivi de vos achats, code secret de remise et 0 F de commission.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-surface-lowest px-4 py-3 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="lock" size={20} /></span>
            <div><div className="text-label-sm uppercase text-on-surface-variant">Achats en cours</div><div className="text-headline-sm font-extrabold text-on-surface"><Price amount={atStake} /></div></div>
          </div>
        </section>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border-none px-3 py-2 text-label-md ${tab === t.key ? 'bg-inverse-surface text-white' : 'bg-surface-lowest text-on-surface shadow-sm'}`}>
              {t.label}
              <span className={`rounded-full px-1.5 text-label-sm ${t.key === 'disputes' && groups.disputes.length ? 'bg-primary text-white' : tab === t.key ? 'bg-white/20' : 'bg-surface-container'}`}>{groups[t.key].length}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-3 rounded-2xl bg-surface-container-low p-3 md:hidden">
          <Icon name="handshake" size={22} className="shrink-0 text-tertiary" />
          <p className="m-0 text-body-sm text-on-surface"><b>Rappel de sécurité :</b> ne transmettez jamais votre <b className="text-primary">code de remise</b> avant d'avoir vérifié et testé l'article avec le vendeur.</p>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {loading && !data && <p className="text-body-md text-on-surface-variant">Chargement…</p>}
          {!loading && shown.length === 0 && (
            <div className="rounded-2xl bg-surface-container-low p-8 text-center">
              <Icon name={tab === 'done' ? 'receipt_long' : 'handshake'} size={36} className="text-on-surface-variant" />
              <p className="m-0 mt-2 text-headline-sm text-on-surface">{tab === 'done' ? 'Aucune remise terminée' : tab === 'disputes' ? 'Aucun litige' : 'Aucun achat en cours'}</p>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Un achat apparaît ici dès qu'un vendeur accepte votre offre ou qu'un rendez-vous est proposé dans le chat.</p>
              <button onClick={() => onNavigate('search')} className="mt-4 cursor-pointer rounded-xl border-none bg-primary px-5 py-2.5 text-label-md text-white">Explorer les annonces</button>
            </div>
          )}
          {shown.map(o => {
            const m = o.meetup
            const dispute = inDispute(o)
            const done = o.stage === 'DONE'
            const confirmed = m?.status === 'CONFIRMED'
            const sellerProposed = m?.status === 'PROPOSED' && m.proposedById !== currentUser?.id
            const header = dispute
              ? { cls: 'bg-primary-fixed/50', chip: 'bg-primary text-white', icon: 'warning', text: o.disputeStatus === 'IN_MEDIATION' ? 'Litige en cours de médiation' : 'Litige en cours' }
              : done
                ? { cls: 'bg-tertiary-soft/60', chip: 'bg-tertiary-soft text-tertiary', icon: 'check_circle', text: 'Remise effectuée avec succès' }
                : confirmed
                  ? { cls: 'bg-surface-container-low', chip: 'bg-primary text-white', icon: 'event_available', text: `RDV confirmé (${when(m!.scheduledAt)})` }
                  : { cls: 'bg-surface-container-low', chip: 'bg-surface-container-high text-on-surface', icon: 'schedule', text: m ? 'RDV à confirmer par les deux parties' : 'RDV à planifier' }
            return (
              <article key={o.id} className="overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
                <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 ${header.cls}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm uppercase ${header.chip}`}><Icon name={header.icon} size={14} /> {header.text}</span>
                    <span className="text-label-sm text-on-surface-variant">Réf : #{o.reference}</span>
                  </div>
                  <span className="hidden items-center gap-1 text-label-sm text-tertiary md:flex"><Icon name="verified_user" size={14} /> {done ? `Clôturé le ${new Date(o.dealClosedAt ?? o.agreedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : 'Aucun paiement avant la remise'}</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)_220px] md:items-center">
                  <div className="flex gap-3">
                    <span className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-container">{o.listing.coverImageUrl && <img src={o.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                    <div className="min-w-0">
                      <span className="rounded bg-surface-container px-1.5 py-0.5 text-label-sm uppercase text-on-surface-variant">{o.listing.category.name}</span>
                      <div className="mt-1 truncate text-headline-sm text-on-surface">{o.listing.title}</div>
                      <div className="text-body-sm text-on-surface-variant">{[o.listing.condition && o.listing.condition !== 'N/A' ? `État : ${o.listing.condition}` : null, o.listing.size ? `Taille ${o.listing.size}` : null].filter(Boolean).join(' • ')}</div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-headline-md font-extrabold text-primary"><Price amount={o.agreedPrice ?? o.listing.price} currency={o.listing.currency} /></span>
                        {o.agreedPrice != null && o.listing.price != null && o.agreedPrice < o.listing.price && <span className="text-body-sm text-on-surface-variant line-through"><Price amount={o.listing.price} currency={o.listing.currency} /></span>}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">{o.seller.avatarUrl ? <img src={o.seller.avatarUrl} alt="" className="h-full w-full object-cover" /> : o.seller.fullName.charAt(0)}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 truncate text-label-md text-on-surface">{o.seller.fullName}{o.seller.isVerified && <Icon name="verified" size={14} className="text-tertiary" />}</div>
                        <div className="text-label-sm text-on-surface-variant">{o.seller.reviewsCount ? `${o.seller.averageRating.toFixed(1)} ★ (${o.seller.reviewsCount} avis)` : 'Nouveau vendeur'}</div>
                      </div>
                    </div>
                    {dispute ? (
                      <p className="m-0 mt-2 text-body-sm text-on-surface"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />Médiation Dilchap en cours. Aucun paiement n'est dû avant l'accord.</p>
                    ) : done ? (
                      <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Remise en main propre{m ? ` • ${m.place}` : ''}{m?.handedOverAt ? ' • code validé' : ''}</p>
                    ) : m ? (
                      <div className="mt-2 rounded-lg bg-surface-lowest p-2 text-body-sm">
                        <div className="text-label-sm text-on-surface-variant">{confirmed ? 'Lieu de remise' : `Créneau proposé par ${m.proposedById === currentUser?.id ? 'vous' : o.seller.fullName.split(' ')[0]}`}</div>
                        <div className="flex items-center gap-1 text-on-surface"><Icon name="location_on" size={14} className="text-primary" /> {m.place} • {when(m.scheduledAt)}</div>
                      </div>
                    ) : (
                      <p className="m-0 mt-2 text-body-sm text-on-surface-variant">{o.listing.meetupSpot ? `Point suggéré : ${o.listing.meetupSpot}` : 'Lieu à fixer dans le chat'}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {dispute ? (
                      <>
                        <button onClick={() => onOpenDispute(o.disputeId!)} className={`${btn} bg-primary text-white`}><Icon name="gavel" size={18} /> Suivre mon litige</button>
                        {whatsapp && <a href={`https://wa.me/${digits(whatsapp)}`} target="_blank" rel="noreferrer" className={`${btn} bg-tertiary text-white no-underline`}><Icon name="support_agent" size={18} /> WhatsApp modérateur</a>}
                      </>
                    ) : done ? (
                      <>
                        <button onClick={() => onOpenOrder(o.id, 'buyer-receipt')} className={`${btn} bg-surface-container-high text-on-surface`}><Icon name="receipt_long" size={18} /> Voir le reçu</button>
                        <button onClick={() => onOpenOrder(o.id, 'buyer-receipt')} className={`${btn} bg-surface-container-low text-on-surface`}><Icon name="rate_review" size={18} /> Mon évaluation</button>
                      </>
                    ) : confirmed ? (
                      <>
                        <button onClick={() => onOpenOrder(o.id, 'buyer-handover')} className={`${btn} bg-primary text-white`}><Icon name="qr_code_2" size={18} /> Mon code de remise</button>
                        <button onClick={() => onOpenConversation(o.seller.id, o.listing.id)} className={`${btn} bg-surface-container-high text-on-surface`}><Icon name="chat" size={18} /> Chat avec le vendeur</button>
                        <button onClick={() => onOpenOrder(o.id, 'buyer-handover')} className="flex cursor-pointer items-center justify-center gap-1 border-none bg-transparent p-0 text-label-sm text-on-surface-variant"><Icon name="shield" size={14} /> Consignes de sécurité</button>
                      </>
                    ) : sellerProposed ? (
                      <>
                        <button onClick={() => answer(o, true)} disabled={answering} className={`${btn} bg-tertiary text-white`}><Icon name="done_all" size={18} /> Confirmer le créneau &amp; lieu</button>
                        <button onClick={() => onOpenConversation(o.seller.id, o.listing.id)} className={`${btn} bg-surface-container-high text-on-surface`}><Icon name="chat" size={18} /> Discuter sur le chat</button>
                        <button onClick={() => answer(o, false)} disabled={answering} className="flex cursor-pointer items-center justify-center gap-1 border-none bg-transparent p-0 text-label-sm text-on-surface-variant"><Icon name="close" size={14} /> Proposer un autre horaire</button>
                      </>
                    ) : (
                      <button onClick={() => onOpenConversation(o.seller.id, o.listing.id)} className={`${btn} bg-surface-container-high text-on-surface`}><Icon name="forum" size={18} /> {m ? 'En attente du vendeur — ouvrir le chat' : 'Ouvrir le chat pour fixer le lieu'}</button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <section className="mt-6 hidden gap-4 rounded-2xl bg-surface-container-low p-5 md:grid md:grid-cols-4">
          {GOLDEN.map(([icon, title, text]) => (
            <div key={title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-lowest text-primary"><Icon name={icon} size={20} /></span>
              <div><div className="text-label-md text-on-surface">{title}</div><div className="text-body-sm text-on-surface-variant">{text}</div></div>
            </div>
          ))}
        </section>
      </div>
    </AccountLayout>
  )
}
