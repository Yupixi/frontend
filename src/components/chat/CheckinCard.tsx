import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from '../Icon'
import { Shell } from './HandoverCard'
import {
  ANSWER_DEAL_CHECKIN_MUTATION, NOT_CONCLUDED_REASONS,
  type CheckinAnswer, type NotConcludedReason, type RemoteCheckin,
} from '../../graphql/deals'
import { handoverRefusal } from '../../graphql/messaging'
import { useT, fmtDate } from '../../i18n'
import common from '../../i18n/ns/common'
import chatNs from '../../i18n/ns/chat'

const when = (iso: string) =>
  fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// « La vente a-t-elle eu lieu ? »: private card some hours after the
// meet-up time, one tap (Oui / Non / Reportée), never blocking the chat.
// The seller's « Oui » records the sale; both « Oui » confirm it. A « Non »
// can then get its reason, still one tap and optional.
export default function CheckinCard({ c, otherName, concluded, onAnswered, onReschedule }: {
  c: RemoteCheckin
  otherName: string
  // The sale is already concluded (seller's « Oui », « Marquer comme vendu »).
  concluded: boolean
  onAnswered: () => void
  onReschedule: () => void
}) {
  const t = useT(chatNs)
  const tc = useT(common)
  const [answerCheckin, { loading }] = useMutation(ANSWER_DEAL_CHECKIN_MUTATION)
  const [busy, setBusy] = useState<CheckinAnswer | NotConcludedReason | null>(null)
  const [error, setError] = useState<string | null>(null)
  const send = (answer: CheckinAnswer, reason?: NotConcludedReason) => {
    if (loading) return
    setError(null)
    setBusy(reason ?? answer)
    void answerCheckin({ variables: { input: { meetupId: c.meetupId, answer, ...(reason ? { reason } : {}) } } })
      .then(() => onAnswered())
      .catch((e: unknown) => setError(handoverRefusal(e).message))
      .finally(() => setBusy(null))
  }
  const seller = c.role === 'SELLER'
  const meta = (
    <p className="m-0 -mt-1 flex items-center gap-1.5 text-body-sm text-on-surface-variant">
      <Icon name="schedule" size={15} className="shrink-0" /> <span className="truncate">{c.place} · {when(c.scheduledAt)}</span>
    </p>
  )
  const err = error && <p role="alert" className="m-0 text-body-sm text-primary">{error}</p>

  if (c.answer === 'YES') {
    // The buyer's « Oui » (the seller's closes the sale: no card left).
    if (concluded) return null
    return (
      <Shell id="checkin-card" title={t('checkin.thanksTitle')} icon="task_alt">
        <p className="m-0 text-body-sm text-on-surface">{t('checkin.thanksText', { name: otherName })}</p>
      </Shell>
    )
  }
  if (c.answer === 'NO')
    return (
      <Shell id="checkin-card" title={t('checkin.noTitle')} icon="event_busy">
        <p className="m-0 text-body-sm text-on-surface-variant">{t('checkin.noText')}</p>
        <div>
          <div className="text-label-md text-on-surface">{t.rich('checkin.why', { muted: ch => <span className="font-normal text-on-surface-variant">{ch}</span> })}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('checkin.reasonAria')}>
            {NOT_CONCLUDED_REASONS.map(r => (
              <button key={r.key} type="button" role="radio" aria-checked={c.reason === r.key} disabled={!!busy} onClick={() => send('NO', r.key)}
                className={`cursor-pointer rounded-full border border-solid px-3 py-1.5 text-label-sm font-semibold disabled:opacity-60 ${c.reason === r.key ? 'border-primary bg-primary-fixed/40 text-on-surface' : 'border-outline-variant bg-surface-lowest text-on-surface-variant'}`}>
                {busy === r.key ? '…' : r.label}
              </button>
            ))}
          </div>
        </div>
        {err}
      </Shell>
    )
  if (c.answer === 'POSTPONED')
    return (
      <Shell id="checkin-card" title={t('checkin.postponedTitle')} icon="schedule">
        <p className="m-0 text-body-sm text-on-surface-variant">{t('checkin.postponedText')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onReschedule} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary px-3 py-2.5 text-label-md text-white hover:bg-primary-dark"><Icon name="event" size={18} /> {t('checkin.newMeetup')}</button>
          <button type="button" disabled={!!busy} onClick={() => send('YES')} className="cursor-pointer rounded-xl border-none bg-surface-container px-3 py-2.5 text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-60">{t('checkin.yesAfterAll')}</button>
        </div>
        {err}
      </Shell>
    )

  return (
    <Shell id="checkin-card" title={t('checkin.title')} icon="handshake">
      {meta}
      {c.otherSaidYes && (
        <p className="m-0 flex items-start gap-2 rounded-xl bg-tertiary-soft p-2.5 text-body-sm text-on-surface">
          <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-tertiary" />
          <span>{t('checkin.otherSaidYes', { name: otherName })}</span>
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <button type="button" disabled={!!busy} onClick={() => send('YES')} className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-none bg-primary px-2 py-2 text-label-md text-white hover:bg-primary-dark disabled:opacity-60">
          <Icon name="check" size={20} /> {busy === 'YES' ? '…' : tc('yes')}
        </button>
        <button type="button" disabled={!!busy} onClick={() => send('NO')} className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-none bg-surface-container px-2 py-2 text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-60">
          <Icon name="close" size={20} /> {busy === 'NO' ? '…' : tc('no')}
        </button>
        <button type="button" disabled={!!busy} onClick={() => send('POSTPONED')} className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-none bg-surface-container px-2 py-2 text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-60">
          <Icon name="schedule" size={20} /> {busy === 'POSTPONED' ? '…' : t('checkin.postponed')}
        </button>
      </div>
      <p className="m-0 text-body-sm text-on-surface-variant">
        {seller
          ? <>{c.quantity > 1 ? t('checkin.sellerYesQty') : t('checkin.sellerYes')}{c.canEnterCode ? t('checkin.sellerCode', { name: otherName }) : ''}</>
          : <>{t('checkin.buyerNote')}</>}
      </p>
      {err}
    </Shell>
  )
}
