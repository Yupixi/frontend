import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from '../Icon'
import { DISMISS_SAFETY_ALERT_MUTATION, type SafetyAlert } from '../../graphql/messaging'
import { CREATE_REPORT_MUTATION } from '../../graphql/reports'

const RULE_REASON: Record<string, string> = {
  DEPOSIT: 'Demande d’acompte',
  PAY_FIRST: 'Paiement demandé avant le rendez-vous',
  OTP_CODE: 'Demande de code reçu par SMS',
  SHIPPING_PREPAY: 'Envoi par transporteur payé d’avance',
  EXTERNAL_LINK: 'Lien suspect',
  OFF_PLATFORM: 'Passage sur une autre messagerie',
  PHONE_EARLY: 'Numéro partagé très tôt',
  LOW_PRICE: 'Prix anormalement bas',
}

// Private safety banners: only the member at risk sees them (the server
// decides). « Compris » closes one; « Signaler » files a report with the
// conversation reference and closes it.
export default function SafetyBanners({ alerts, conversationId, otherId, onDone, compact }: {
  alerts: SafetyAlert[]
  conversationId: string
  otherId?: string
  onDone: () => void
  compact?: boolean
}) {
  const [dismiss] = useMutation(DISMISS_SAFETY_ALERT_MUTATION)
  const [report] = useMutation(CREATE_REPORT_MUTATION)
  const [busy, setBusy] = useState<string | null>(null)
  const [reported, setReported] = useState<string | null>(null)
  if (!alerts.length) return null
  const close = (a: SafetyAlert, didReport: boolean) => {
    setBusy(a.id)
    void dismiss({ variables: { id: a.id, reported: didReport } }).then(onDone).finally(() => setBusy(null))
  }
  const signal = (a: SafetyAlert) => {
    if (!otherId) return close(a, false)
    setBusy(a.id)
    void report({ variables: { targetType: 'USER', targetUserId: a.senderId || otherId, reason: 'Tentative d’arnaque', message: `Alerte Dilchap « ${RULE_REASON[a.rule] ?? a.rule} » — conversation ${conversationId}` } })
      .then(() => { setReported(a.id); close(a, true) })
      .catch(() => setBusy(null))
  }
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Alertes de sécurité">
      {alerts.map(a => {
        const high = a.severity === 'HIGH'
        return (
          <div key={a.id} role="alert" className={`chat-in flex items-start gap-2.5 rounded-2xl border border-solid p-3 ${high ? 'border-primary/30 bg-primary-fixed/60' : 'border-amber-300/70 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${high ? 'bg-primary text-white' : 'bg-amber-200 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200'}`}><Icon name={high ? 'gpp_maybe' : 'shield'} size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className={`m-0 text-body-sm ${high ? 'text-on-surface' : 'text-amber-950 dark:text-amber-100'}`}>{a.text}</p>
              <p className="m-0 mt-0.5 text-[11px] text-on-surface-variant">Visible par vous seul{compact ? '' : ' — l’autre membre ne voit pas cette alerte'}.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" disabled={busy === a.id} onClick={() => close(a, false)} className="cursor-pointer rounded-full border-none bg-surface-lowest px-3 py-1.5 text-label-sm font-semibold text-on-surface disabled:opacity-60">Compris</button>
                <button type="button" disabled={busy === a.id || reported === a.id} onClick={() => signal(a)} className="flex cursor-pointer items-center gap-1 rounded-full border-none bg-transparent px-2 py-1.5 text-label-sm font-semibold text-primary disabled:opacity-60"><Icon name="flag" size={15} /> {reported === a.id ? 'Signalé' : 'Signaler'}</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
