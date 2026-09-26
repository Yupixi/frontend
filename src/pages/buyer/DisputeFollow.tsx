import EmptyState from '../../components/EmptyState'
import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import SafeImg from '../../components/SafeImg'
import { AccountLayout } from '../account/AccountLayout'
import { DisputeStatusChip, DisputeTimeline, MediationCard, hoursLeft } from '../../components/DisputeParts'
import { BuyerTabs, Breadcrumb, TrustFooter } from './BuyerShared'
import {
  ANSWER_DISPUTE_PROPOSAL_MUTATION, DISPUTE_REASON_LABELS, MY_BUYER_DISPUTES_QUERY, MY_DISPUTE_STATS_QUERY, disputeIsOpen,
  type Dispute, type DisputeStats,
} from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'

type Props = {
  focusDisputeId?: string
  onNavigate: (p: any) => void
  onSelectDispute: (id: string) => void
  onOpenConversation: (sellerId: string, listingId?: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

function Banner({ d }: { d: Dispute }) {
  const first = d.seller.fullName
  const map: Record<string, { title: string; tone: string; chip: string }> = {
    AWAITING_BUYER: { title: `${first} vous a soumis une proposition de règlement amiable`, tone: 'border-l-primary', chip: 'Action requise' },
    AWAITING_SELLER: { title: `En attente de la réponse de ${first}`, tone: 'border-l-outline-variant', chip: 'Médiation active' },
    IN_MEDIATION: { title: 'Un médiateur Dilchap examine votre dossier', tone: 'border-l-primary', chip: 'Arbitrage en cours' },
  }
  const m = map[d.status]
  const open = disputeIsOpen(d.status)
  return (
    <section className={`flex flex-wrap items-center gap-4 rounded-2xl border-0 border-l-4 border-solid bg-surface-lowest p-4 shadow-sm ${m?.tone ?? 'border-l-tertiary'}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${open ? 'bg-primary-fixed text-primary' : 'bg-tertiary-soft text-tertiary'}`}><Icon name={open ? 'gavel' : 'task_alt'} size={22} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {m ? <span className="rounded-full bg-primary px-2 py-0.5 text-label-sm uppercase text-white">{m.chip}</span> : <DisputeStatusChip d={d} />}
          {(d.status === 'AWAITING_BUYER' || d.status === 'AWAITING_SELLER') && <span className="text-label-sm text-on-surface-variant">{hoursLeft(d.deadlineAt)}h restantes — sans réponse, un médiateur prend le relais</span>}
        </div>
        <div className="mt-1 text-headline-sm text-on-surface">{m?.title ?? `Dossier clôturé : ${d.verdict ?? ''}`}</div>
      </div>
      {/* Mobile shows the amount on the transaction card instead */}
      <div className="hidden sm:block sm:w-auto sm:text-right">
        <div className="text-label-sm text-on-surface-variant">Montant de l'achat</div>
        <div className="text-headline-sm font-extrabold text-tertiary"><Price amount={d.amount} currency={d.listing?.currency} /> {open && <Icon name="lock" size={16} />}</div>
      </div>
    </section>
  )
}

function Decision({ d, onDone }: { d: Dispute; onDone: () => void }) {
  const [answer, { loading, error }] = useMutation(ANSWER_DISPUTE_PROPOSAL_MUTATION)
  const [message, setMessage] = useState('')
  const sellerEvent = [...d.events].reverse().find(e => e.actor === 'SELLER')
  const netAmount = d.proposal === 'COURTESY_DISCOUNT' ? Math.max(0, d.amount - (d.discountAmount ?? 0)) : d.amount
  const decide = (decision: 'ACCEPT' | 'CANCEL' | 'ARBITRATION') => {
    const confirmText = { ACCEPT: 'Accepter la proposition du vendeur et clôturer ?', CANCEL: "Annuler l'achat ? L'annonce sera remise en vente.", ARBITRATION: "Demander l'arbitrage d'un agent Dilchap ?" }[decision]
    if (!window.confirm(confirmText)) return
    void answer({ variables: { input: { disputeId: d.id, decision, message: message.trim() || undefined } } }).then(onDone)
  }

  if (!d.proposal) return null
  return (
    <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:order-2 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-label-sm uppercase text-on-surface-variant">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Dernière offre du vendeur</span>
        {sellerEvent && <span>Reçue le {new Date(sellerEvent.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl bg-surface-container-low p-4">
        <div className="min-w-0 flex-1">
          <div className="text-label-sm uppercase text-tertiary">Solution proposée</div>
          <div className="text-headline-sm text-on-surface">
            {d.proposal === 'COURTESY_DISCOUNT' ? <>Remise de courtoisie de <Price amount={d.discountAmount} /></> : d.proposal === 'CANCEL_RELIST' ? 'Annulation sans frais de la vente' : "Arbitrage d'un agent Dilchap"}
          </div>
        </div>
        {d.proposal === 'COURTESY_DISCOUNT' && (
          <div className="rounded-xl bg-surface-lowest px-4 py-2 text-right shadow-sm">
            <div className="text-label-sm text-on-surface-variant line-through"><Price amount={d.amount} /> initial</div>
            <div className="text-headline-md font-extrabold text-primary"><Price amount={netAmount} /></div>
            <div className="text-label-sm text-tertiary">- <Price amount={d.discountAmount} /> sur le prix</div>
          </div>
        )}
      </div>
      {sellerEvent?.body && (
        <div className="mt-3 rounded-xl bg-surface-container-low p-4">
          <div className="flex items-center gap-2 text-label-md text-on-surface">{d.seller.fullName}{d.seller.isVerified && <Icon name="verified" size={15} className="text-tertiary" />}</div>
          <p className="m-0 mt-1 text-body-md italic text-on-surface-variant">« {sellerEvent.body} »</p>
        </div>
      )}
      {(sellerEvent?.photos.length || d.photos.length) ? (
        <>
          <div className="mt-4 flex items-center gap-2 text-label-md text-on-surface"><Icon name="compare" size={18} className="text-primary" /> Examen comparatif des pièces justificatives</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[{ label: 'Photos vendeur', urls: sellerEvent?.photos ?? [], cls: 'bg-inverse-surface' }, { label: 'Votre constat', urls: d.photos, cls: 'bg-primary' }].map(g => (
              <div key={g.label} className="overflow-hidden rounded-xl bg-surface-container-low">
                <div className="relative aspect-[4/3] bg-surface-container">
                  {g.urls[0] ? <a href={g.urls[0]} target="_blank" rel="noreferrer"><img src={g.urls[0]} alt="" className="h-full w-full object-cover" /></a> : <span className="flex h-full items-center justify-center text-body-sm text-on-surface-variant">Aucune photo</span>}
                  <span className={`absolute left-2 top-2 rounded px-2 py-0.5 text-label-sm text-white ${g.cls}`}>{g.label}</span>
                </div>
                {g.urls.length > 1 && <div className="px-2 py-1 text-label-sm text-on-surface-variant">+{g.urls.length - 1} autre{g.urls.length > 2 ? 's' : ''}</div>}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {d.status === 'AWAITING_BUYER' && (
        <>
          <div className="mt-5 text-label-sm uppercase text-on-surface-variant">Votre décision d'acheteur</div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="Message au vendeur (optionnel)" className="mt-2 w-full resize-none rounded-xl border border-outline-variant bg-surface-lowest p-3 text-body-md text-on-surface outline-none focus:border-primary" />
          <button onClick={() => decide('ACCEPT')} disabled={loading} className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border-none bg-tertiary px-4 py-3 text-left text-white disabled:opacity-60">
            <Icon name="check_circle" size={22} />
            <span className="flex-1"><span className="block text-label-lg">{d.proposal === 'COURTESY_DISCOUNT' ? <>Accepter la remise &amp; clôturer l'achat</> : d.proposal === 'CANCEL_RELIST' ? "Accepter l'annulation" : 'Accepter'}</span>
              {d.proposal === 'COURTESY_DISCOUNT' && <span className="block text-body-sm text-white/85">Vous réglerez <Price amount={netAmount} /> au vendeur à la remise</span>}</span>
            <Icon name="arrow_forward" size={20} />
          </button>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {d.proposal !== 'CANCEL_RELIST' && <button onClick={() => decide('CANCEL')} disabled={loading} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-lowest px-3 py-3 text-label-md text-on-surface"><Icon name="cancel" size={18} /> Refuser et annuler l'achat</button>}
            <button onClick={() => decide('ARBITRATION')} disabled={loading} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-3 py-3 text-label-md text-white ${d.proposal === 'CANCEL_RELIST' ? 'sm:col-span-2' : ''}`}><Icon name="support_agent" size={18} /> Arbitrage officiel Dilchap</button>
          </div>
          {error && <p className="m-0 mt-2 text-body-sm text-primary">{error.message}</p>}
          <p className="m-0 mt-2 flex items-center justify-center gap-1 text-label-sm text-on-surface-variant"><Icon name="verified_user" size={14} className="text-tertiary" /> Tant que vous ne validez pas, aucun paiement n'est dû au vendeur.</p>
        </>
      )}
    </section>
  )
}

// "Suivi & médiation de litige" (desktop) / "Suivi des litiges" (mobile).
export default function DisputeFollow({ focusDisputeId, onNavigate, onSelectDispute, onOpenConversation, currentUser, onLogout }: Props) {
  const { data, loading, refetch } = useQuery<{ myBuyerDisputes: Dispute[] }>(MY_BUYER_DISPUTES_QUERY, { fetchPolicy: 'cache-and-network', pollInterval: 30_000 })
  const { data: statsData } = useQuery<{ myDisputeStats: DisputeStats }>(MY_DISPUTE_STATS_QUERY)
  const all = data?.myBuyerDisputes ?? []
  const d = all.find(x => x.id === focusDisputeId) ?? all.find(x => disputeIsOpen(x.status)) ?? all[0]

  return (
    <AccountLayout active="buyer-disputes" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <BuyerTabs active="buyer-disputes" onNavigate={onNavigate} />
        {loading && !data && <p className="text-body-md text-on-surface-variant">Chargement…</p>}
        {!loading && all.length === 0 && (
          <EmptyState icon="empty-shield" fallback="verified_user" tone="tertiary" title="Aucun litige" text="En cas de problème lors d'une remise, ouvrez un litige depuis votre code de remise." />
        )}

        {all.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {all.map(x => (
              <button key={x.id} onClick={() => onSelectDispute(x.id)} className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border-none px-3 py-2 text-label-md ${x.id === d?.id ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface'}`}>
                #{x.reference} {disputeIsOpen(x.status) && <span className="h-2 w-2 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        )}

        {d && (
          <>
            {/* Mobile: dossier reference + status (Stitch mobile "Suivi de mon litige") */}
            <div className="mb-3 flex items-start justify-between gap-3 md:hidden">
              <div className="min-w-0"><div className="truncate text-headline-sm text-on-surface">#{d.reference}</div><div className="text-body-sm text-on-surface-variant">Dossier ouvert le {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div></div>
              <span className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-label-sm ${disputeIsOpen(d.status) ? 'bg-primary-fixed/60 text-primary' : 'bg-tertiary-soft text-tertiary'}`}><span className={`h-1.5 w-1.5 rounded-full ${disputeIsOpen(d.status) ? 'bg-primary' : 'bg-tertiary'}`} /> {disputeIsOpen(d.status) ? 'Médiation en cours' : 'Dossier clôturé'}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Breadcrumb onNavigate={onNavigate} items={[{ label: 'Mes achats', page: 'buyer-purchases' }, { label: `Litige #${d.reference}` }, { label: 'Suivi & Résolution' }]} />
              <span className="mb-3 hidden text-label-sm uppercase text-on-surface-variant md:block">Dossier ouvert le {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} • Commande #{d.orderReference}</span>
            </div>
            <Banner d={d} />

            {/* Below lg both columns flatten (contents) and `order` gives the
                mobile sequence: transaction, decision, history, seller, help. */}
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 md:mt-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-5">
              <div className="flex min-w-0 flex-col gap-4 max-lg:contents">
                <Decision key={d.id + d.status} d={d} onDone={() => void refetch()} />
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:order-3 md:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0"><h2 className="m-0 text-headline-sm text-on-surface"><span className="md:hidden">Historique du litige</span><span className="max-md:hidden">Journal des événements &amp; échanges</span></h2><p className="m-0 text-body-sm text-on-surface-variant">Motif : {DISPUTE_REASON_LABELS[d.reason]}</p></div>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface">{d.events.length} entrée{d.events.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-4"><DisputeTimeline d={d} perspective="BUYER" /></div>
                </section>
              </div>

              <aside className="flex flex-col gap-4 max-lg:contents">
                {d.listing && (
                  <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:order-1">
                    <div className="flex items-center justify-between gap-2 text-label-sm uppercase text-on-surface-variant">
                      <span><span className="md:hidden">Transaction</span><span className="max-md:hidden">Article concerné</span></span>
                      {disputeIsOpen(d.status)
                        ? <span className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-tertiary-soft px-2 py-0.5 normal-case text-tertiary md:hidden"><Icon name="lock" size={13} /> Fonds bloqués</span>
                        : null}
                      <span className={`rounded bg-surface-container px-1.5 normal-case ${disputeIsOpen(d.status) ? 'max-md:hidden' : ''}`}>{d.listing.category.name}</span>
                    </div>
                    <div className="mt-2 flex gap-3">
                      <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container"><SafeImg src={d.listing.coverImageUrl} icon="shopping_bag" /></span>
                      <div className="min-w-0"><div className="truncate text-label-lg text-on-surface">{d.listing.title}</div><div className="text-headline-sm font-extrabold text-primary"><Price amount={d.amount} currency={d.listing.currency} /></div></div>
                    </div>
                    <dl className="m-0 mt-3 flex flex-col gap-1.5 text-body-sm">
                      <div className="flex justify-between"><dt className="text-on-surface-variant">Mode de remise</dt><dd className="m-0 text-on-surface">Main propre (code)</dd></div>
                      {d.meetupPlace && <div className="flex justify-between gap-2"><dt className="text-on-surface-variant">Lieu de rendez-vous</dt><dd className="m-0 truncate text-on-surface">{d.meetupPlace}</dd></div>}
                    </dl>
                  </section>
                )}
                {disputeIsOpen(d.status) && (
                  <section className="hidden rounded-2xl bg-surface-container-low p-4 md:block max-lg:order-4">
                    <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icon name="lock" size={19} /></span><div><div className="text-label-md text-on-surface">Code de remise gelé</div><div className="text-body-sm text-on-surface-variant">Commande #{d.orderReference}</div></div></div>
                    <div className="mt-3 rounded-xl bg-surface-lowest p-3 text-center">
                      <div className="text-label-sm uppercase text-on-surface-variant">Code temporairement verrouillé</div>
                      <div className="mt-2 flex justify-center gap-2">{[0, 1, 2, 3].map(i => <span key={i} className="h-3 w-3 rounded-full bg-on-surface-variant" />)}</div>
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-label-sm text-white"><Icon name="block" size={13} /> Paiement bloqué</span>
                    </div>
                    <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Aucune vente ne peut être clôturée sans votre accord explicite sur la plateforme.</p>
                  </section>
                )}
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:order-4">
                  <div className="text-label-sm uppercase text-on-surface-variant">Vendeur</div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">{d.seller.avatarUrl ? <SafeImg src={d.seller.avatarUrl} icon="person" fallbackClassName="flex h-full w-full items-center justify-center" /> : d.seller.fullName.charAt(0)}</span>
                    <div className="min-w-0 flex-1"><div className="flex items-center gap-1 text-label-md text-on-surface">{d.seller.fullName}{d.seller.isVerified && <Icon name="verified" size={15} className="text-tertiary" />}</div><div className="text-body-sm text-on-surface-variant">{d.seller.reviewsCount ? `★ ${d.seller.averageRating.toFixed(1)} (${d.seller.reviewsCount} avis)` : 'Nouveau vendeur'}</div></div>
                    {d.listing && <button onClick={() => onOpenConversation(d.seller.id, d.listing!.id)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface" aria-label="Chat"><Icon name="chat" size={18} /></button>}
                  </div>
                </section>
                <div className="max-md:hidden max-lg:order-5"><MediationCard whatsapp={statsData?.myDisputeStats.mediationWhatsapp ?? null} compact /></div>
                {statsData?.myDisputeStats.mediationWhatsapp && (
                  <a href={`https://wa.me/${statsData.myDisputeStats.mediationWhatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="order-5 flex items-center gap-3 rounded-2xl bg-surface-container-low p-3 no-underline md:hidden">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary text-white"><Icon name="support_agent" size={20} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-label-md text-on-surface">Médiateurs Dilchap</span><span className="block truncate text-body-sm text-on-surface-variant">7j/7 • 8h-22h</span></span>
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-tertiary px-3 py-2 text-label-md text-white"><Icon name="chat" size={16} /> WhatsApp</span>
                  </a>
                )}
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-md:hidden max-lg:order-6">
                  <div className="text-label-sm uppercase text-on-surface-variant">Règles d'or de résolution</div>
                  <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface-variant">
                    {["Ne partagez jamais votre code de remise en dehors de l'application.", "Conservez l'objet dans son état initial tant que la procédure est ouverte.", "Aucun paiement n'est dû au vendeur avant la clôture du litige."].map(r => (
                      <li key={r} className="flex gap-1.5"><Icon name="check_circle" size={16} className="shrink-0 text-tertiary" /> {r}</li>
                    ))}
                  </ul>
                </section>
              </aside>
            </div>
          </>
        )}
        <TrustFooter />
      </div>
    </AccountLayout>
  )
}
