import { useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import { MY_PURCHASE_ORDERS_QUERY, type PurchaseOrder } from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'

// Buyer-side hand-over space (Stitch "Mon code de remise / Reçus & Clôtures /
// Ouvrir un litige / Médiation & Suivi"): desktop tab strip shared by every page.
export const BUYER_TABS = [
  { key: 'buyer-purchases', icon: 'qr_code_2', label: 'Mon code remise', match: ['buyer-purchases', 'buyer-handover'] },
  { key: 'buyer-receipts', icon: 'receipt_long', label: 'Reçus & Clôtures', match: ['buyer-receipts', 'buyer-receipt'] },
  { key: 'buyer-dispute-new', icon: 'report', label: 'Ouvrir un litige', match: ['buyer-dispute-new'] },
  { key: 'buyer-disputes', icon: 'gavel', label: 'Médiation & Suivi', match: ['buyer-disputes'] },
]

export function BuyerTabs({ active, onNavigate }: { active: string; onNavigate: (p: any) => void }) {
  return (
    <div className="mb-5 hidden items-center gap-1 rounded-2xl bg-surface-lowest p-1.5 shadow-sm md:flex">
      {BUYER_TABS.map(t => {
        const on = t.match.includes(active)
        return (
          <button key={t.key} onClick={() => onNavigate(t.key)} className={`flex cursor-pointer items-center gap-1.5 rounded-xl border-none px-3 py-2 text-label-md ${on ? 'bg-surface-container-high text-on-surface' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}>
            <Icon name={t.icon} size={17} /> {t.label}
          </button>
        )
      })}
      <span className="ml-auto flex items-center gap-1 rounded-full bg-tertiary-soft px-3 py-1 text-label-sm uppercase text-tertiary"><Icon name="verified_user" size={15} /> Protection acheteur</span>
    </div>
  )
}

export function Breadcrumb({ items, onNavigate }: { items: { label: string; page?: string }[]; onNavigate: (p: any) => void }) {
  return (
    <nav className="mb-3 hidden flex-wrap items-center gap-1 text-label-sm text-on-surface-variant md:flex">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1">
          {i > 0 && <Icon name="chevron_right" size={14} />}
          {it.page ? <button onClick={() => onNavigate(it.page)} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-primary">{it.label}</button>
            : <span className={i === items.length - 1 ? 'text-primary' : 'text-on-surface'}>{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export const TRUST_FOOTER = [
  { icon: 'percent', title: '0% Commission', text: 'Achetez et vendez sans frais cachés en remise directe.', cls: 'bg-tertiary-soft text-tertiary' },
  { icon: 'account_balance_wallet', title: 'Wave & Orange Money', text: 'Vous ne payez le vendeur qu’après avoir vérifié l’article sur place.', cls: 'bg-primary-fixed text-primary' },
  { icon: 'handshake', title: 'Remise Sécurisée', text: "Contrôle physique de l'article avant confirmation définitive.", cls: 'bg-tertiary-soft text-tertiary' },
]

export function TrustFooter() {
  return (
    <section className="mt-8 hidden gap-4 md:grid md:grid-cols-3">
      {TRUST_FOOTER.map(t => (
        <div key={t.title} className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.cls}`}><Icon name={t.icon} size={22} /></span>
          <div><div className="text-headline-sm text-on-surface">{t.title}</div><div className="text-body-sm text-on-surface-variant">{t.text}</div></div>
        </div>
      ))}
    </section>
  )
}

const STAGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'RDV à confirmer', cls: 'bg-surface-container-high text-on-surface' },
  IN_PROGRESS: { label: 'RDV confirmé', cls: 'bg-tertiary-soft text-tertiary' },
  DONE: { label: 'Remise effectuée', cls: 'bg-tertiary-soft text-tertiary' },
  CANCELLED: { label: 'Annulé', cls: 'bg-surface-container-high text-on-surface-variant' },
}
const OPEN_DISPUTE = ['AWAITING_SELLER', 'AWAITING_BUYER', 'IN_MEDIATION']

type Props = {
  mode: 'purchases' | 'receipts'
  onNavigate: (p: any) => void
  onOpenOrder: (orderId: string, page: 'buyer-handover' | 'buyer-receipt' | 'buyer-dispute-new') => void
  onOpenDispute: (disputeId: string) => void
  onOpenConversation: (sellerId: string, listingId?: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

// "Mes achats": the buyer's deals (from chat) with their hand-over code, or
// the concluded ones with their receipt.
export default function Purchases({ mode, onNavigate, onOpenOrder, onOpenDispute, onOpenConversation, currentUser, onLogout }: Props) {
  const { data, loading } = useQuery<{ myPurchaseOrders: PurchaseOrder[] }>(MY_PURCHASE_ORDERS_QUERY, { fetchPolicy: 'cache-and-network' })
  const all = data?.myPurchaseOrders ?? []
  const orders = mode === 'receipts' ? all.filter(o => o.stage === 'DONE') : all.filter(o => o.stage === 'PENDING' || o.stage === 'IN_PROGRESS')
  const active = mode === 'receipts' ? 'buyer-receipts' : 'buyer-purchases'

  return (
    <AccountLayout active={active} onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1120px] pb-8">
        <BuyerTabs active={active} onNavigate={onNavigate} />
        <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">{mode === 'receipts' ? 'Reçus & Clôtures' : 'Mes achats & codes de remise'}</h1>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">
          {mode === 'receipts' ? 'Vos achats remis en main propre et leurs reçus.' : 'Vos rendez-vous de remise : présentez votre code au vendeur seulement après avoir vérifié l’article.'}
        </p>

        <div className="mt-5 flex flex-col gap-3">
          {loading && !data && <p className="text-body-md text-on-surface-variant">Chargement…</p>}
          {!loading && orders.length === 0 && (
            <div className="rounded-2xl bg-surface-container-low p-8 text-center">
              <Icon name={mode === 'receipts' ? 'receipt_long' : 'handshake'} size={36} className="text-on-surface-variant" />
              <p className="m-0 mt-2 text-headline-sm text-on-surface">{mode === 'receipts' ? 'Aucun reçu pour le moment' : 'Aucun achat en cours'}</p>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Un achat apparaît ici dès qu'un vendeur accepte votre offre ou qu'un rendez-vous est proposé dans le chat.</p>
              <button onClick={() => onNavigate('search')} className="mt-4 cursor-pointer rounded-xl border-none bg-primary px-5 py-2.5 text-label-md text-white">Explorer les annonces</button>
            </div>
          )}
          {orders.map(o => {
            const disputeOpen = !!o.disputeStatus && OPEN_DISPUTE.includes(o.disputeStatus)
            const stage = STAGE[o.stage] ?? STAGE.PENDING
            return (
              <article key={o.id} className="flex flex-col gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container">{o.listing.coverImageUrl && <img src={o.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">#{o.reference}<span className={`rounded-full px-2 py-0.5 ${disputeOpen ? 'bg-primary-fixed text-primary' : stage.cls}`}>{disputeOpen ? 'Litige en cours' : stage.label}</span></div>
                    <div className="truncate text-label-lg text-on-surface">{o.listing.title}</div>
                    <div className="text-body-sm text-on-surface-variant">
                      <Price amount={o.agreedPrice ?? o.listing.price} currency={o.listing.currency} /> • {o.seller.fullName}
                      {o.meetup && <> • {o.meetup.place}, {new Date(o.meetup.scheduledAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => onOpenConversation(o.seller.id, o.listing.id)} className="flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-surface-container-high px-3 py-2 text-label-md text-on-surface"><Icon name="chat" size={17} /> Chat</button>
                  {o.disputeId && <button onClick={() => onOpenDispute(o.disputeId!)} className="flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary-fixed px-3 py-2 text-label-md text-primary"><Icon name="gavel" size={17} /> Litige</button>}
                  {mode === 'receipts'
                    ? <button onClick={() => onOpenOrder(o.id, 'buyer-receipt')} className="flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-inverse-surface px-3 py-2 text-label-md text-white"><Icon name="receipt_long" size={17} /> Voir le reçu</button>
                    : <button onClick={() => onOpenOrder(o.id, 'buyer-handover')} className="flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-3 py-2 text-label-md text-white"><Icon name="qr_code_2" size={17} /> {o.meetup?.status === 'CONFIRMED' ? 'Mon code de remise' : 'Voir le rendez-vous'}</button>}
                </div>
              </article>
            )
          })}
        </div>
        <TrustFooter />
      </div>
    </AccountLayout>
  )
}
