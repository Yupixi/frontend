import PaymentLogo from './PaymentLogo'
import Icon from './Icon'
import type { PaymentIntent } from '../graphql/payments'
import { useT } from '../i18n'
import payment from '../i18n/ns/paymentCore'

// A payment whose outcome the operator has not confirmed yet (no answer,
// polling over, « À confirmer » on the server). Never a failure nor a
// success: Dilchap keeps checking with Paytic, adds the credits if it is
// confirmed and tells the member.
export default function PaymentVerifying({ intent, method, compact = false }: { intent: PaymentIntent; method: string; compact?: boolean }) {
  const t = useT(payment)
  return (
    <div className={`flex flex-col items-center gap-3 text-center ${compact ? '' : 'py-4'}`}>
      {!compact && (
        <span className="relative flex h-20 w-20 items-center justify-center">
          <PaymentLogo method={method} size={64} />
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-surface-lowest text-primary shadow-sm"><Icon name="schedule" size={20} /></span>
        </span>
      )}
      {compact && <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-primary"><Icon name="schedule" size={32} /></span>}
      <div>
        <p className="m-0 text-headline-sm text-on-surface">{t('verifying.title')}</p>
        <p className="m-0 mt-1 max-w-xs text-body-sm text-on-surface-variant">
          {t('verifying.text')}
        </p>
      </div>
      <ul className="m-0 flex w-full max-w-xs list-none flex-col gap-2 rounded-2xl bg-surface-container-low p-4 text-left text-body-sm text-on-surface">
        <li className="flex items-start gap-2.5"><Icon name="notifications" size={20} className="mt-0.5 shrink-0 text-primary" /> {t('verifying.canClose')}</li>
        <li className="flex items-start gap-2.5"><Icon name="info" size={20} className="mt-0.5 shrink-0 text-primary" /> {t('verifying.checkBalance')}</li>
      </ul>
      <p className="m-0 text-label-sm normal-case tracking-normal text-on-surface-variant">{t('verifying.ref', { ref: intent.reference })}</p>
    </div>
  )
}
