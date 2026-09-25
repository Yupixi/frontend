import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import { AccountLayout } from '../account/AccountLayout'
import { formatRelativeDate } from '../../lib/format'
import {
  DELETE_NOTIFICATION_MUTATION, MARK_ALL_NOTIFICATIONS_READ_MUTATION, MARK_NOTIFICATION_READ_MUTATION, MY_NOTIFICATIONS_QUERY,
  NOTIFICATION_META, notificationTarget, type NotificationKind, type RemoteNotification,
} from '../../graphql/account'
import { RESPOND_TO_OFFER_MUTATION } from '../../graphql/offers'
import { MY_PURCHASE_ORDERS_QUERY, disputeIsOpen, type PurchaseOrder } from '../../graphql/sellerTools'
import { MY_SALES_ORDERS_QUERY, type SalesOrder } from '../../graphql/sellerHub'
import { getPushAvailability } from '../../lib/pushNotifications'
import type { AuthUser } from '../../graphql/auth'

type Props = {
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  onOpenPurchase: (orderId: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

const LABELS: Record<NotificationKind, string> = {
  MESSAGE: 'Message', OFFER_RECEIVED: 'Négociation directe', OFFER_ACCEPTED: 'Offre acceptée', OFFER_REJECTED: 'Offre refusée',
  LISTING_APPROVED: 'Annonce en ligne', LISTING_REJECTED: 'Annonce refusée', LISTING_STATUS_CHANGED: 'Annonce',
  ANNOUNCEMENT: 'Sécurité Dilchap', SAVED_SEARCH_MATCH: 'Alerte recherche', DISPUTE: 'Litige', MEETUP: 'Remise en main propre', PRICE_DROP: 'Baisse de prix',
}
// `short` labels keep the chips on one line on a phone.
const FILTERS: { key: string; label: string; short?: string; icon?: string; types?: NotificationKind[] }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'unread', label: 'Non lues' },
  { key: 'chat', label: 'Messages & Négociations', short: 'Messages', icon: 'forum', types: ['MESSAGE', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_REJECTED'] },
  { key: 'meetups', label: 'Rendez-vous & Remises', short: 'Rendez-vous', icon: 'handshake', types: ['MEETUP'] },
  { key: 'disputes', label: 'Litiges', icon: 'gavel', types: ['DISPUTE'] },
  { key: 'deals', label: 'Baisses de prix & alertes', short: 'Alertes', icon: 'sell', types: ['PRICE_DROP', 'SAVED_SEARCH_MATCH'] },
]
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()

// "Centre de notifications" (Stitch desktop + mobile).
export default function Notifications({ onNavigate, onSelectListing, onOpenPurchase, currentUser, onLogout }: Props) {
  const { data, loading, refetch } = useQuery<{ myNotifications: RemoteNotification[] }>(MY_NOTIFICATIONS_QUERY, { fetchPolicy: 'cache-and-network', pollInterval: 15_000 })
  const { data: purchasesData } = useQuery<{ myPurchaseOrders: PurchaseOrder[] }>(MY_PURCHASE_ORDERS_QUERY)
  const { data: salesData } = useQuery<{ mySalesOrders: SalesOrder[] }>(MY_SALES_ORDERS_QUERY)
  const [markRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION)
  const [markAll] = useMutation(MARK_ALL_NOTIFICATIONS_READ_MUTATION)
  const [remove] = useMutation(DELETE_NOTIFICATION_MUTATION)
  const [respond, { loading: responding }] = useMutation(RESPOND_TO_OFFER_MUTATION)
  const [filter, setFilter] = useState('all')
  const [done, setDone] = useState<Record<string, string>>({})
  const all = data?.myNotifications ?? []
  const unread = all.filter(n => !n.readAt).length
  const count = (f: typeof FILTERS[number]) => f.key === 'all' ? all.length : f.key === 'unread' ? unread : all.filter(n => f.types!.includes(n.type)).length
  const active = FILTERS.find(f => f.key === filter)!
  const shown = all.filter(n => filter === 'all' ? true : filter === 'unread' ? !n.readAt : active.types!.includes(n.type))
  const today = shown.filter(n => isToday(n.createdAt))
  const earlier = shown.filter(n => !isToday(n.createdAt))

  // Next confirmed hand-over (as buyer or seller).
  const upcoming = [
    ...(purchasesData?.myPurchaseOrders ?? []).map(o => ({ id: o.id, role: 'BUYER' as const, title: o.listing.title, other: o.seller.fullName, meetup: o.meetup, open: (o.stage === 'PENDING' || o.stage === 'IN_PROGRESS') && !(o.disputeStatus && disputeIsOpen(o.disputeStatus)) })),
    ...(salesData?.mySalesOrders ?? []).map(o => ({ id: o.id, role: 'SELLER' as const, title: o.listing.title, other: o.buyer.fullName, meetup: o.meetup, open: o.stage === 'PENDING' || o.stage === 'IN_PROGRESS' })),
  ].filter(o => o.open && o.meetup?.status === 'CONFIRMED' && new Date(o.meetup.scheduledAt).getTime() > Date.now() - 3 * 3600_000)
    .sort((a, b) => new Date(a.meetup!.scheduledAt).getTime() - new Date(b.meetup!.scheduledAt).getTime())[0]

  // This week's activity (Mon → Sun).
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const perDay = WEEKDAYS.map((_, i) => all.filter(n => { const d = new Date(n.createdAt); return d >= new Date(monday.getTime() + i * 86_400_000) && d < new Date(monday.getTime() + (i + 1) * 86_400_000) }).length)
  const maxDay = Math.max(1, ...perDay)
  const weekOffers = all.filter(n => n.type === 'OFFER_RECEIVED' && new Date(n.createdAt) >= monday).length
  const todayIdx = (new Date().getDay() + 6) % 7
  const push = getPushAvailability()

  const open = (n: RemoteNotification) => {
    if (!n.readAt) void markRead({ variables: { id: n.id } }).then(() => refetch())
    const target = notificationTarget(n)
    if (target) onNavigate(target)
    else if (n.listingId) onSelectListing(n.listingId)
  }
  const accept = (n: RemoteNotification) => void respond({ variables: { offerId: n.offerId, accept: true } })
    .then(() => { setDone(d => ({ ...d, [n.id]: 'Offre acceptée' })); if (!n.readAt) void markRead({ variables: { id: n.id } }).then(() => refetch()) })
    .catch(e => setDone(d => ({ ...d, [n.id]: e instanceof Error ? e.message : 'Action impossible' })))
  const del = (n: RemoteNotification) => void remove({ variables: { id: n.id } }).then(() => refetch())

  const card = (n: RemoteNotification) => {
    const meta = NOTIFICATION_META[n.type] ?? NOTIFICATION_META.LISTING_STATUS_CHANGED
    const btn = 'flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none px-3 py-2 text-label-md'
    const actions = (() => {
      if (done[n.id]) return <span className="text-label-md text-tertiary">{done[n.id]}</span>
      switch (n.type) {
        case 'OFFER_RECEIVED':
          return <>
            {n.offerId && <button onClick={e => { e.stopPropagation(); accept(n) }} disabled={responding} className={`${btn} bg-tertiary text-white`}><Icon name="check_circle" size={17} /> Accepter</button>}
            <button onClick={() => open(n)} className={`${btn} bg-surface-container-high text-on-surface`}><Icon name="reply" size={17} /> <span className="md:hidden">Répondre</span><span className="max-md:hidden">Répondre &amp; contre-proposer</span></button>
          </>
        case 'MEETUP': return <button onClick={() => open(n)} className={`${btn} bg-primary text-white`}><Icon name="handshake" size={17} /> Voir le rendez-vous</button>
        case 'PRICE_DROP': case 'SAVED_SEARCH_MATCH': case 'LISTING_APPROVED': case 'LISTING_REJECTED': case 'LISTING_STATUS_CHANGED': case 'OFFER_ACCEPTED': case 'OFFER_REJECTED':
          return n.listingId ? <button onClick={() => open(n)} className={`${btn} bg-inverse-surface text-white`}><Icon name="visibility" size={17} /> Voir l'annonce</button> : null
        case 'DISPUTE': return <button onClick={() => open(n)} className={`${btn} bg-surface-container-high text-on-surface`}><Icon name="folder_open" size={17} /> Consulter le dossier</button>
        case 'MESSAGE': return <button onClick={() => open(n)} className={`${btn} bg-surface-container-high text-on-surface`}><Icon name="send" size={17} /> Ouvrir la discussion</button>
        default: return null
      }
    })()
    return (
      // Tapping the card body opens its target, like the action button.
      <article key={n.id} onClick={() => open(n)} className={`group relative flex cursor-pointer gap-3 rounded-2xl p-4 shadow-sm md:gap-4 ${n.readAt ? 'bg-surface-lowest' : 'bg-surface-lowest ring-1 ring-primary/15'}`}>
        <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.cls}`}>
          <Icon name={meta.icon} size={22} />
          {!n.readAt && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-solid border-surface-lowest bg-primary" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-7">
            <span className={`rounded px-1.5 py-0.5 text-label-sm uppercase ${meta.cls}`}>{LABELS[n.type] ?? 'Notification'}</span>
            <span className="text-label-sm text-on-surface-variant">{formatRelativeDate(n.createdAt)}</span>
          </div>
          <h3 className={`m-0 mt-1.5 text-label-lg ${n.readAt ? 'text-on-surface' : 'font-extrabold text-on-surface'}`}>{n.title}</h3>
          <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">{n.body}</p>
          {actions && <div onClick={e => e.stopPropagation()} className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <button onClick={e => { e.stopPropagation(); del(n) }} className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface-variant md:hidden md:group-hover:flex" aria-label="Supprimer"><Icon name="close" size={15} /></button>
      </article>
    )
  }

  return (
    <AccountLayout active="buyer-notifications" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <div className="flex items-center justify-between gap-3 md:flex-wrap md:items-end">
          <div className="min-w-0">
            <div className="hidden text-label-sm uppercase text-primary md:block">Activité de compte • Temps réel</div>
            {/* Mobile: the account header already shows "Notifications" */}
            <h1 className="m-0 mt-1 hidden items-center gap-2 md:flex text-headline-lg-mobile text-on-surface md:text-headline-lg">
              <span className="hidden md:inline">Centre de notifications</span>
              {unread > 0 && <span className="flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5 text-label-md text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {unread} non lue{unread > 1 ? 's' : ''}</span>}
            </h1>
            <p className="m-0 text-body-sm text-on-surface-variant md:hidden">{unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu'}</p>
            <p className="m-0 mt-1 hidden text-body-md text-on-surface-variant md:block">Suivez vos négociations, vos rendez-vous de remise et l'état de vos offres.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => void markAll().then(() => refetch())} disabled={!unread} className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-none bg-transparent p-0 text-label-md text-primary disabled:opacity-50 md:rounded-xl md:bg-surface-container-high md:px-3 md:py-2 md:text-on-surface"><Icon name="done_all" size={18} className="max-md:hidden" /> Tout marquer comme lu</button>
            <button onClick={() => onNavigate('buyer-settings')} className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-none bg-surface-container-high text-on-surface md:flex" aria-label="Préférences"><Icon name="tune" size={19} /></button>
          </div>
        </div>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:mt-4 md:px-0">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none px-3 py-2 text-label-md ${filter === f.key ? 'bg-inverse-surface text-white' : 'bg-surface-lowest text-on-surface shadow-sm'}`}>
              {f.key === 'unread' && <span className="h-2 w-2 rounded-full bg-primary" />}{f.icon && <Icon name={f.icon} size={15} />}{f.short ? <><span className="md:hidden">{f.short}</span><span className="max-md:hidden">{f.label}</span></> : f.label}
              <span className={`rounded-full px-1.5 text-label-sm ${filter === f.key ? 'bg-white/20' : 'bg-surface-container'}`}>{count(f)}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            {loading && !data && <p className="text-body-md text-on-surface-variant">Chargement…</p>}
            {!loading && shown.length === 0 && (
              <div className="rounded-2xl bg-surface-container-low p-8 text-center">
                <Icon name="notifications_off" size={34} className="text-on-surface-variant" />
                <p className="m-0 mt-2 text-headline-sm text-on-surface">Rien de neuf ici</p>
              </div>
            )}
            {today.map(card)}
            {earlier.length > 0 && (
              <>
                <div className="mt-2 flex items-center gap-3 text-label-sm uppercase text-on-surface-variant">{today.length ? 'Hier et jours précédents' : 'Plus ancien'}<span className="h-px flex-1 bg-outline-variant" /></div>
                {earlier.map(card)}
              </>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            {upcoming && (
              <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <div className="flex items-center justify-between text-label-sm uppercase text-tertiary">Rendez-vous imminent <Icon name="verified" size={18} /></div>
                <h3 className="m-0 mt-2 text-headline-sm text-on-surface">Remise {upcoming.meetup!.place}</h3>
                <p className="m-0 text-body-sm text-on-surface-variant">{new Date(upcoming.meetup!.scheduledAt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} avec {upcoming.other}</p>
                <p className="m-0 mt-1 truncate text-body-sm text-on-surface">{upcoming.title}</p>
                <button onClick={() => (upcoming.role === 'BUYER' ? onOpenPurchase(upcoming.id) : onNavigate('seller-orders'))} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary py-2.5 text-label-md text-white">
                  <Icon name={upcoming.role === 'BUYER' ? 'qr_code_2' : 'task_alt'} size={18} /> {upcoming.role === 'BUYER' ? 'Voir mon code de remise' : 'Préparer la remise'}
                </button>
                <p className="m-0 mt-2 text-label-sm text-on-surface-variant">Ne donnez votre code qu'après avoir inspecté et testé l'article.</p>
              </section>
            )}
            <section className="hidden rounded-2xl bg-surface-lowest p-4 shadow-sm md:block">
              <div className="flex items-center justify-between"><h3 className="m-0 text-headline-sm text-on-surface">Activité de la semaine</h3><Icon name="insights" size={20} className="text-primary" /></div>
              <div className="mt-2 flex items-baseline gap-2"><span className="text-headline-lg font-extrabold text-on-surface">{perDay.reduce((a, b) => a + b, 0)}</span><span className="text-body-sm text-on-surface-variant">notifications</span>{weekOffers > 0 && <span className="rounded bg-tertiary-soft px-1.5 text-label-sm text-tertiary">+{weekOffers} offre{weekOffers > 1 ? 's' : ''}</span>}</div>
              <div className="mt-3 flex h-20 items-end gap-2">
                {perDay.map((c, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className={`w-full rounded-t ${i === todayIdx ? 'bg-primary' : 'bg-primary-fixed'}`} style={{ height: `${Math.max(6, (c / maxDay) * 64)}px` }} />
                    <span className={`text-label-sm ${i === todayIdx ? 'text-primary' : 'text-on-surface-variant'}`}>{WEEKDAYS[i]}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="hidden rounded-2xl bg-surface-container-low p-4 md:block">
              <div className="flex items-center gap-2 text-label-lg text-on-surface"><Icon name="notifications_active" size={19} className="text-tertiary" /> Alertes sur votre téléphone</div>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Recevez une notification push dès qu'une offre, un rendez-vous ou un message arrive.</p>
              <div className="mt-2 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-label-sm ${push === 'available' ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>{push === 'available' ? 'Actif' : 'À activer'}</span>
                <button onClick={() => onNavigate('buyer-settings')} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">Préférences</button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AccountLayout>
  )
}
