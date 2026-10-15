import { lazy, Suspense, useState, type ReactNode } from 'react'
import Icon from './Icon'
import { useNoCommissionClaims } from '../lib/site'
import { requestOpenHelp } from '../lib/navigation'
import { PaymentLogos } from './PaymentLogo'
import { useMethods } from '../lib/countries'

const BottomSheet = lazy(() => import('./BottomSheet'))

export type TrustTopic = 'commission' | 'payment' | 'handover'

// « Comment ça marche » behind the reassurance badges of the home page
// (« 100% P2P • 0% Commission », « Remise directe ou espèces »…): they look
// like buttons, so a tap opens this short explanation instead of nothing.
// The « 0 % commission » lines follow « Réglages du site » (claims).
function TrustSheetBody({ topic, onClose }: { topic: TrustTopic, onClose: () => void }) {
  const noCommission = useNoCommissionClaims()
  const methods = useMethods().filter(m => m !== 'CASH')
  const help = (slug: string) => () => { onClose(); requestOpenHelp(slug) }
  const rows: { key: TrustTopic, icon: string, title: string, text: ReactNode }[] = [
    ...(noCommission ? [{
      key: 'commission' as const, icon: 'percent', title: '0 % de commission',
      text: 'Dilchap ne prend rien sur vos ventes ni sur vos achats : le prix affiché est celui que vous payez au vendeur.',
    }] : []),
    {
      key: 'payment', icon: 'payments', title: 'Paiement de main à main',
      text: <>Vous payez le vendeur directement, en espèces ou par Mobile Money, au moment de la remise. Dilchap ne garde jamais votre argent. {methods.length > 0 && <PaymentLogos size={18} methods={methods.slice(0, 4)} className="mt-1.5" />}</>,
    },
    {
      key: 'handover', icon: 'handshake', title: 'Remise en main propre',
      text: 'Fixez le rendez-vous dans la discussion, de préférence dans un lieu public. Vérifiez l’article avant de payer, puis donnez votre code de remise au vendeur.',
    },
  ]
  return (
    <div className="flex flex-col gap-3">
      {rows.map(r => (
        <div key={r.key} className={`flex gap-3 rounded-2xl p-3 ${r.key === topic ? 'bg-tertiary-soft/70' : 'bg-surface-container-low'}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tertiary text-white"><Icon name={r.icon} size={18} /></span>
          <div className="min-w-0">
            <div className="text-label-lg text-on-surface">{r.title}</div>
            <div className="text-body-sm text-on-surface-variant">{r.text}</div>
          </div>
        </div>
      ))}
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
        <button type="button" onClick={help('rendez-vous-et-code-de-remise')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary"><Icon name="help" size={17} /> Le code de remise</button>
        <button type="button" onClick={help('payer-le-vendeur')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary"><Icon name="help" size={17} /> Payer le vendeur</button>
      </div>
    </div>
  )
}

// The sheet's state and element, for any number of badges on a page.
export function useTrustSheet() {
  const [topic, setTopic] = useState<TrustTopic | null>(null)
  // Mounted on the first tap, then kept (closing animation).
  const [used, setUsed] = useState(false)
  const open = (t: TrustTopic) => { setUsed(true); setTopic(t) }
  const close = () => setTopic(null)
  const sheet = used && (
    <Suspense fallback={null}>
      <BottomSheet open={!!topic} onClose={close} title="Comment ça marche">
        <TrustSheetBody topic={topic ?? 'payment'} onClose={close} />
      </BottomSheet>
    </Suspense>
  )
  return { open, sheet }
}

// Which explanation a reassurance item (BO « Page d'accueil ») opens.
export function trustTopicOf(icon: string, title: string): TrustTopic {
  if (/commission|gratuit|0\s?%/i.test(title) || icon === 'percent') return 'commission'
  if (/remise|main propre|rendez/i.test(title) || icon === 'handshake') return 'handover'
  return 'payment'
}
