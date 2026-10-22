import { useEffect, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from './Icon'
import HelpLink from './HelpLink'
import { PHONE_CODE_DELIVERY_QUERY, type CodeChannel, type CodeDeliveryStatus, type PhoneCodeSent } from '../graphql/auth'

// How long the code screen follows a code's delivery (operator reports
// usually come within a minute; a missing one changes nothing).
const FOLLOW_MS = 3 * 60_000
const POLL_MS = 4_000
// The « Je n'ai pas reçu le code » options open by themselves after this.
const OPEN_AFTER_MS = 45_000

// Delivery of the code just sent (`ref`: PhoneCodeSent.deliveryRef), polled
// while it is on its way. Null when unknown (password reset, too old).
export function useCodeDelivery(ref: string | null | undefined) {
  const [following, setFollowing] = useState(true)
  useEffect(() => {
    setFollowing(true)
    if (!ref) return
    const t = setTimeout(() => setFollowing(false), FOLLOW_MS)
    return () => clearTimeout(t)
  }, [ref])
  const [done, setDone] = useState(false)
  useEffect(() => setDone(false), [ref])
  // Polled only while on its way, for a few minutes.
  const { data } = useQuery<{ phoneCodeDelivery: { status: CodeDeliveryStatus; channel: CodeChannel } | null }>(PHONE_CODE_DELIVERY_QUERY, {
    variables: { ref: ref ?? '' },
    skip: !ref,
    fetchPolicy: 'network-only',
    errorPolicy: 'ignore',
    pollInterval: ref && following && !done ? POLL_MS : 0,
  })
  const status = ref ? data?.phoneCodeDelivery?.status ?? null : null
  const final = status === 'DELIVERED' || status === 'FAILED'
  useEffect(() => { if (final) setDone(true) }, [final])
  return status
}

type Props = {
  sent: Pick<PhoneCodeSent, 'channel' | 'previousFailed' | 'unreliable' | 'whatsappAvailable'>
  status: CodeDeliveryStatus | null
  // « Recevoir le code par WhatsApp » / « par SMS » (the other channel).
  onOtherChannel?: (channel: CodeChannel) => void
  sending?: boolean
  // Seconds before another code can be asked (the other channel included,
  // unless the server knows this one failed).
  wait: number
  // « S'inscrire avec mon e-mail », « Me connecter avec mon e-mail »…
  email?: { label: string; onClick: () => void }
}

// « Je n'ai pas reçu le code »: the ways out when a code doesn't arrive —
// the other channel (WhatsApp when the team switched it on), the e-mail,
// the help article. Opens by itself when the server knows the SMS failed
// (operator report), when SMS arrive badly on this network, or after a
// while without a code.
export default function CodeHelp({ sent, status, onOtherChannel, sending = false, wait, email }: Props) {
  const delivered = status === 'DELIVERED'
  const failed = status === 'FAILED' || (sent.previousFailed && !delivered)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (status === 'DELIVERED') return
    const t = setTimeout(() => setOpen(true), OPEN_AFTER_MS)
    return () => clearTimeout(t)
  }, [status])
  const shown = open || failed || (sent.unreliable && !delivered)
  const other: CodeChannel | null = sent.channel === 'WHATSAPP' ? 'SMS' : sent.whatsappAvailable ? 'WHATSAPP' : null
  // A known failure frees the minute between two codes (server side too).
  const blocked = sending || (wait > 0 && !failed)
  const by = sent.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'
  return (
    <div className="flex flex-col gap-2">
      {status === 'FAILED' ? (
        <p role="alert" className="m-0 flex items-start gap-2 rounded-xl bg-primary-fixed/60 px-3 py-2.5 text-body-sm text-primary">
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          <span className="min-w-0"><b className="font-semibold">{sent.channel === 'WHATSAPP' ? 'WhatsApp n’a pas pu remettre le message.' : 'Votre opérateur n’a pas reçu le SMS.'}</b> Inutile d’attendre : choisissez une autre solution ci-dessous.</span>
        </p>
      ) : delivered ? (
        <p role="status" className="m-0 flex items-center gap-1.5 text-body-sm text-tertiary"><Icon name="check_circle" size={17} /> {by === 'SMS' ? 'SMS remis à votre téléphone.' : 'Message WhatsApp remis.'}</p>
      ) : sent.previousFailed ? (
        <p role="status" className="m-0 flex items-start gap-2 rounded-xl bg-primary-fixed/60 px-3 py-2.5 text-body-sm text-primary">
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          <span className="min-w-0">Le code précédent n’a pas été remis par votre opérateur. S’il n’arrive pas cette fois non plus, choisissez une autre solution ci-dessous.</span>
        </p>
      ) : sent.unreliable && sent.channel === 'SMS' ? (
        <p role="status" className="m-0 flex items-start gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-primary" />
          <span className="min-w-0">Les SMS arrivent mal en ce moment vers votre réseau. Si le code n’arrive pas, choisissez une autre solution ci-dessous.</span>
        </p>
      ) : null}
      {!shown ? (
        <button type="button" onClick={() => setOpen(true)} className="flex w-fit cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-label-md text-primary">
          <Icon name="help" size={17} /> Je n’ai pas reçu le code
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-solid border-outline-variant/70 p-3">
          <p className="m-0 text-label-md text-on-surface">{status === 'FAILED' ? 'Autres solutions' : 'Vous n’avez pas reçu le code ?'}</p>
          {other && onOtherChannel && (
            <button type="button" disabled={blocked} onClick={() => onOtherChannel(other)}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-3 text-label-lg text-white hover:opacity-90 disabled:cursor-default disabled:opacity-60 ${other === 'WHATSAPP' ? 'bg-[#128C7E]' : 'bg-primary'}`}>
              <Icon name={other === 'WHATSAPP' ? 'chat' : 'sms'} size={19} />
              {sending ? 'Envoi…' : `${other === 'WHATSAPP' ? 'Recevoir le code par WhatsApp' : 'Recevoir le code par SMS'}${blocked && wait > 0 ? ` (${wait} s)` : ''}`}
            </button>
          )}
          {email && (
            <button type="button" onClick={email.onClick} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-solid border-outline-variant bg-surface-lowest px-3 text-label-lg text-on-surface hover:bg-surface-container-low">
              <Icon name="mail" size={19} /> {email.label}
            </button>
          )}
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-body-sm text-on-surface-variant">
            <li>Vérifiez le numéro affiché et que votre téléphone capte le réseau.</li>
            {sent.channel === 'SMS' && <li>« Renvoyer le code » redevient possible après le délai affiché.</li>}
          </ul>
          <HelpLink article="member/je-ne-recois-pas-le-code" label="Je ne reçois pas le code : l’aide" className="self-start" />
        </div>
      )}
    </div>
  )
}
