import Icon from '../Icon'
import Price from '../Price'
import { hasPoint } from '../../lib/maps'
import type { RemoteMeetup, SystemCard as Card } from '../../graphql/messaging'
import { MapsActions, StaticMap } from './MeetupPoint'

export const MEETUP_CHECKLIST = [
  'Lieu public et fréquenté, de jour',
  'Vérifiez l’article avant de payer',
  'Payez à la remise, jamais avant',
]

const when = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-body-sm text-on-surface-variant">
      {items.map(t => <li key={t} className="flex items-start gap-1.5"><Icon name="task_alt" size={15} className="mt-0.5 shrink-0 text-tertiary" /> {t}</li>)}
    </ul>
  )
}

// A meet-up proposal in the thread: place, address, small map, date, and
// the actions (confirm / change, then hand-over shortcuts and Maps links).
export function MeetupCard({ meetup, mine, busy, onConfirm, onChange, action }: {
  meetup: RemoteMeetup
  mine: boolean
  busy: boolean
  onConfirm: () => void
  onChange: () => void
  action?: { label: string; icon: string; onClick: () => void }
}) {
  const point = hasPoint(meetup) ? { lat: meetup.lat!, lng: meetup.lng! } : null
  const live = meetup.status !== 'DECLINED'
  return (
    <div className="w-80 max-w-full overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
      {point && live && <StaticMap point={point} label={meetup.place} height={112} />}
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary"><Icon name={meetup.pointSource === 'SUGGESTED' ? 'verified_user' : 'location_on'} size={20} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 text-label-lg text-on-surface"><span className="break-words">{meetup.place}</span>{meetup.pointSource === 'SUGGESTED' && <span className="rounded bg-tertiary-soft px-1.5 text-[10px] font-bold text-tertiary">Lieu conseillé</span>}</div>
            {meetup.address && <div className="break-words text-body-sm text-on-surface-variant">{meetup.address}</div>}
            <div className="text-body-sm capitalize text-on-surface">{when(meetup.scheduledAt)}</div>
          </div>
        </div>
        {meetup.status === 'PROPOSED' ? (
          mine ? (
            <p className="m-0 rounded-lg bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">En attente de confirmation…</p>
          ) : (
            <div className="flex gap-2">
              <button disabled={busy} onClick={onConfirm} className="flex-1 cursor-pointer whitespace-nowrap rounded-lg border-none bg-primary py-2 text-label-md text-white disabled:opacity-60">Confirmer le RDV</button>
              <button disabled={busy} onClick={onChange} className="cursor-pointer whitespace-nowrap rounded-lg border-none bg-surface-container px-3 py-2 text-label-md text-on-surface">Changer</button>
            </div>
          )
        ) : (
          <p className={`m-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-label-md ${meetup.status === 'CONFIRMED' ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
            <Icon name={meetup.status === 'CONFIRMED' ? 'check_circle' : 'cancel'} size={16} /> {meetup.status === 'CONFIRMED' ? (meetup.handedOverAt ? 'Remise effectuée' : 'Rendez-vous confirmé') : 'Proposition remplacée ou déclinée'}
          </p>
        )}
        {live && <MapsActions point={point} label={meetup.place} address={meetup.address} compact />}
        {meetup.status === 'CONFIRMED' && action && (
          <button onClick={action.onClick} className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-on-surface py-2 text-label-md text-surface"><Icon name={action.icon} size={17} /> {action.label}</button>
        )}
      </div>
    </div>
  )
}

// A Dilchap card (SYSTEM message), visible to both members.
export function SystemCard({ card, currency, onAction }: {
  card: Card
  currency: string
  onAction?: (cta: NonNullable<Card['cta']>) => void
}) {
  const point = hasPoint(card) ? { lat: card.lat!, lng: card.lng! } : null
  const safety = card.type === 'SAFETY_NOTICE'
  const icon = card.type === 'OFFER_ACCEPTED' ? 'handshake' : card.type === 'MEETUP_CONFIRMED' ? 'event_available' : card.type === 'DEAL_CONCLUDED' ? 'verified' : 'shield'
  return (
    <section aria-label={`Dilchap : ${card.title}`} className={`mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-solid ${safety ? 'border-amber-300/70 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-outline-variant/70 bg-surface-lowest'} shadow-sm`}>
      <div className="flex items-center gap-2 px-3.5 pb-1 pt-3">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${safety ? 'bg-amber-200 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200' : 'bg-primary text-white'}`}><Icon name={icon} size={16} /></span>
        <span className="min-w-0 flex-1 text-label-lg text-on-surface">{card.title}</span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant"><Icon name="verified_user" size={12} /> Dilchap</span>
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 pb-3.5 pt-1.5">
        {card.type === 'OFFER_ACCEPTED' && card.amount != null && (
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-body-sm text-on-surface-variant">{card.listingTitle}</span>
            <span className="shrink-0 whitespace-nowrap text-headline-sm font-extrabold text-on-surface"><Price amount={card.amount} currency={card.currency ?? currency} /></span>
          </div>
        )}
        {card.type === 'MEETUP_CONFIRMED' ? (
          <>
            {point && <StaticMap point={point} label={card.place ?? ''} height={120} />}
            <div>
              <div className="text-label-lg text-on-surface">{card.place}</div>
              {card.address && <div className="text-body-sm text-on-surface-variant">{card.address}</div>}
              {card.scheduledAt && <div className="text-body-sm capitalize text-on-surface">{when(card.scheduledAt)}</div>}
            </div>
            <MapsActions point={point} label={card.place ?? ''} address={card.address} />
            <Checklist items={card.checklist?.length ? card.checklist : MEETUP_CHECKLIST} />
          </>
        ) : card.type !== 'OFFER_ACCEPTED' && (
          card.lines.map((l, i) => <p key={i} className={`m-0 text-body-sm ${safety ? 'text-amber-950 dark:text-amber-100' : 'text-on-surface-variant'}`}>{l}</p>)
        )}
        {card.next && <p className="m-0 flex items-center gap-1.5 text-label-md text-primary"><Icon name="arrow_forward" size={16} /> {card.next}</p>}
        {card.cta && onAction && (
          <button type="button" onClick={() => onAction(card.cta!)} className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none px-3 py-2 text-label-md ${card.cta === 'REPORT' ? 'bg-transparent text-on-surface underline' : 'bg-primary text-white'}`}>
            <Icon name={card.cta === 'MEETUP' ? 'event' : card.cta === 'REVIEW' ? 'rate_review' : 'flag'} size={17} />
            {card.cta === 'MEETUP' ? 'Fixer le rendez-vous' : card.cta === 'REVIEW' ? 'Laisser un avis' : 'Signaler ce membre'}
          </button>
        )}
      </div>
    </section>
  )
}
