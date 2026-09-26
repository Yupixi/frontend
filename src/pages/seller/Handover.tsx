import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import { OpenDisputeModal } from '../../components/DisputeParts'
import { PAYMENT_LABELS } from '../ListingDetail'
import {
  CONFIRM_HANDOVER_MUTATION, SALES_ORDER_QUERY, VERIFY_HANDOVER_CODE_MUTATION, disputeIsOpen, type HandoverOrder,
} from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'
import PaymentLogo from '../../components/PaymentLogo'
import SellerBadge from '../../components/SellerBadge'
import { BADGE_LABEL } from '../../graphql/badges'

type Props = { orderId: string; onNavigate: (p: any) => void; onOpenDispute: (id: string) => void; currentUser?: AuthUser | null; onLogout: () => void }

const CHECKS = [
  'Article allumé / essayé et fonctionnel, testé avec l’acheteur',
  "État esthétique strictement conforme aux photos de l'annonce",
  "Accessoires et éléments d'origine annoncés remis",
]
// Full-row tappable check (the native box stays for a11y, drawn at 24px).
function CheckRow({ checked, onChange, tone = 'tertiary', children, className = '' }: { checked: boolean, onChange: (v: boolean) => void, tone?: 'tertiary' | 'primary', children: React.ReactNode, className?: string }) {
  const on = tone === 'tertiary' ? 'border-tertiary bg-tertiary' : 'border-primary bg-primary'
  return (
    <label className={`relative flex min-h-12 cursor-pointer items-start gap-3 rounded-xl p-3 ${className}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-solid peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${checked ? `${on} text-white` : 'border-outline bg-surface-lowest text-transparent'}`}>
        <Icon name="check" size={18} />
      </span>
      <span className="text-body-md text-on-surface">{children}</span>
    </label>
  )
}

const BUYER_TAGS = ['Ponctuel au rendez-vous', 'Paiement immédiat', 'Très respectueux', 'Négociation courtoise']

// "Confirmation De Remise" (mobile mockup, centred on desktop): the seller
// types the buyer's 4-digit code, checks the item together with the buyer,
// attests the payment and rates the buyer — the sale is then concluded.
export default function Handover({ orderId, onNavigate, onOpenDispute, currentUser, onLogout }: Props) {
  const { data, loading, refetch } = useQuery<{ salesOrder: HandoverOrder }>(SALES_ORDER_QUERY, { variables: { id: orderId }, skip: !orderId })
  const o = data?.salesOrder
  const [code, setCode] = useState('')
  const [codeFocused, setCodeFocused] = useState(false)
  const [codeState, setCodeState] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [checks, setChecks] = useState(CHECKS.map(() => false))
  const methods = o?.listing.paymentMethods.length ? o.listing.paymentMethods : ['WAVE', 'ORANGE_MONEY', 'CASH']
  const [method, setMethod] = useState('')
  const [attested, setAttested] = useState(false)
  const [rating, setRating] = useState(5)
  const [tags, setTags] = useState<string[]>([])
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [verify, { error: verifyError }] = useMutation<{ verifyHandoverCode: boolean }>(VERIFY_HANDOVER_CODE_MUTATION)
  const [confirm, { loading: confirming, error: confirmError }] = useMutation(CONFIRM_HANDOVER_MUTATION)

  useEffect(() => { if (o && !method) setMethod(methods[0]) }, [o, method, methods])

  useEffect(() => {
    if (code.length !== 4 || !o?.meetup) { setCodeState('idle'); return }
    void verify({ variables: { meetupId: o.meetup.id, code } }).then(r => setCodeState(r.data?.verifyHandoverCode ? 'valid' : 'invalid')).catch(() => setCodeState('invalid'))
  }, [code, o?.meetup, verify])


  const amount = o?.agreedPrice ?? o?.listing.price ?? 0
  const buyerFirst = o?.buyer.fullName.split(' ')[0] ?? "l'acheteur"
  const ready = codeState === 'valid' && checks.every(Boolean) && attested && !!method
  const submit = () => o?.meetup && void confirm({
    variables: { input: { meetupId: o.meetup.id, code, paymentMethod: method, buyerRating: rating, buyerTags: tags } },
  }).then(() => refetch())

  const done = o?.stage === 'DONE' || !!o?.meetup?.handedOverAt
  // An open dispute freezes the hand-over code server-side: say so upfront
  // instead of letting the seller type a code that will be refused.
  const frozen = !!o?.disputeStatus && disputeIsOpen(o.disputeStatus)

  return (
    <AccountLayout active="seller-orders" title="Confirmation de remise" onBack={() => onNavigate('seller-orders')} onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-xl pb-10">
        {/* Mobile: the account header already carries back + this title */}
        <div className="mb-3 hidden items-center gap-2 lg:flex">
          <button onClick={() => onNavigate('seller-orders')} className="flex cursor-pointer border-none bg-transparent p-1 text-primary" aria-label="Retour"><Icon name="arrow_back" size={24} /></button>
          <h1 className="m-0 text-headline-md text-on-surface">Confirmation de remise</h1>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-label-sm uppercase"><span className="text-primary">Étape {done ? 3 : 2} sur 3</span><span className="text-on-surface-variant">{done ? 'Vente clôturée' : 'Finalisation de la transaction'}</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary" style={{ width: done ? '100%' : '66%' }} /></div>
        </div>

        {loading && <p className="text-body-md text-on-surface-variant">Chargement…</p>}
        {!loading && !o && (
          <div className="rounded-2xl bg-surface-container-low p-6 text-center">
            <p className="m-0 text-body-md text-on-surface-variant">Commande introuvable.</p>
            <button onClick={() => onNavigate('seller-orders')} className="mt-4 cursor-pointer rounded-xl border-none bg-primary px-5 py-2.5 text-label-lg text-white">Retour aux commandes</button>
          </div>
        )}

        {o && (
          <div className="flex flex-col gap-4">
            {o.meetup && (
              <section className="flex items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="verified_user" size={22} fill /></span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-label-md text-on-surface">Lieu de remise convenu {o.meetup.status === 'CONFIRMED' && <span className="rounded bg-tertiary px-1.5 text-label-sm text-white">Actif</span>}</div>
                  <div className="text-body-sm text-on-surface-variant">{o.meetup.place} • {new Date(o.meetup.scheduledAt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </section>
            )}

            <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
              <div className="flex gap-3">
                <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container">{o.listing.coverImageUrl && <img src={o.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-tertiary-soft px-1.5 py-0.5 text-label-sm text-tertiary">Remise en main propre</span>
                    <span className="text-headline-sm font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></span>
                  </div>
                  <div className="mt-1 truncate text-label-lg text-on-surface">{o.listing.title}</div>
                  {o.listing.condition && o.listing.condition !== 'N/A' && <div className="text-body-sm text-on-surface-variant">État : {o.listing.condition}</div>}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">{o.buyer.avatarUrl ? <img src={o.buyer.avatarUrl} alt="" className="h-full w-full object-cover" /> : o.buyer.fullName.charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-label-md text-on-surface">{o.buyer.fullName}<SellerBadge tier={o.buyer.badge} size={15} /></div>
                  <div className="text-label-sm text-on-surface-variant">{o.buyer.badge ? BADGE_LABEL[o.buyer.badge] : 'Membre Dilchap'}{o.buyer.buyerReviewsCount ? ` • ${o.buyer.buyerReviewsCount} achat${o.buyer.buyerReviewsCount > 1 ? 's' : ''} réussi${o.buyer.buyerReviewsCount > 1 ? 's' : ''}` : ''}</div>
                </div>
                {!!o.buyer.buyerReviewsCount && <span className="flex items-center gap-0.5 rounded-lg bg-surface-lowest px-2 py-1 text-label-sm text-on-surface"><Icon name="star" size={14} fill className="text-amber-500" /> {o.buyer.buyerRating.toFixed(1)}</span>}
              </div>
            </section>

            {done ? (
              <section className="rounded-2xl bg-tertiary-soft p-5 text-center">
                <Icon name="task_alt" size={44} className="text-tertiary" />
                <h2 className="m-0 mt-2 text-headline-sm text-on-surface">Remise validée, vente clôturée</h2>
                <p className="m-0 mt-1 text-body-md text-on-surface-variant">Commande #{o.reference} • <Price amount={amount} currency={o.listing.currency} /> encaissés en direct. L'annonce est marquée comme vendue.</p>
                <button onClick={() => onNavigate('seller-orders')} className="mt-4 cursor-pointer rounded-xl border-none bg-primary px-5 py-3 text-label-md text-white">Retour aux commandes</button>
              </section>
            ) : !o.meetup || o.meetup.status !== 'CONFIRMED' ? (
              <section className="rounded-2xl bg-surface-container-low p-5">
                <h2 className="m-0 text-headline-sm text-on-surface">Rendez-vous non confirmé</h2>
                <p className="m-0 mt-1 text-body-md text-on-surface-variant">Le code de remise de l'acheteur est généré dès que le rendez-vous est confirmé dans le chat.</p>
              </section>
            ) : (
              <>
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="pin" size={22} className="text-primary" /> Code Handshake Secret</h2>
                  <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Demandez à {buyerFirst} de vous dicter son code à 4 chiffres affiché dans son application Dilchap.</p>
                  {frozen && (
                    <div role="status" className="mt-3 flex items-start gap-2 rounded-xl bg-primary-fixed/60 p-3 text-body-sm text-on-surface">
                      <Icon name="lock" size={20} className="shrink-0 text-primary" />
                      <span><b className="text-primary">Code gelé</b> : un litige est en cours sur cette vente. La remise pourra être validée une fois le litige résolu.</span>
                    </div>
                  )}
                  {/* One real input (paste / autofill / fast typing safe) drawn as 4 boxes. */}
                  <label className={`relative mx-auto mt-4 flex w-fit justify-center gap-3 ${frozen ? 'cursor-not-allowed opacity-50' : 'cursor-text'}`}>
                    <input
                      disabled={frozen}
                      value={code}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={4}
                      aria-label="Code de remise à 4 chiffres"
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      onFocus={() => setCodeFocused(true)}
                      onBlur={() => setCodeFocused(false)}
                      className="absolute inset-0 h-full w-full cursor-text opacity-0 disabled:cursor-not-allowed"
                    />
                    {[0, 1, 2, 3].map(i => {
                      const active = codeFocused && (i === code.length || (i === 3 && code.length === 4))
                      return (
                        <span key={i} aria-hidden className={`flex h-16 w-14 items-center justify-center rounded-xl border-2 bg-surface-container-low text-headline-lg font-extrabold ${codeState === 'valid' ? 'border-tertiary text-on-surface' : codeState === 'invalid' ? 'border-primary text-primary' : active ? 'border-primary text-on-surface' : 'border-transparent text-on-surface'}`}>
                          {code[i] ?? ''}
                        </span>
                      )
                    })}
                  </label>
                  {codeState === 'valid' && <div className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-tertiary-soft py-2 text-label-md text-tertiary"><Icon name="check_circle" size={18} fill /> Code de remise synchronisé et valide</div>}
                  {codeState === 'invalid' && <div className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-primary-fixed py-2 text-label-md text-primary"><Icon name="error" size={18} /> {verifyError?.message ?? 'Code incorrect — vérifiez avec l’acheteur'}</div>}
                </section>

                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="checklist" size={22} className="text-tertiary" /> Contrôle physique conjoint</h2>
                  <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Cochez les points vérifiés ensemble pour sceller la vente :</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {CHECKS.map((c, i) => (
                      <CheckRow key={c} checked={checks[i]} onChange={v => setChecks(prev => prev.map((x, j) => (j === i ? v : x)))} className="bg-surface-container-low">{c}</CheckRow>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="m-0 text-headline-sm text-on-surface">Règlement du vendeur</h2>
                    <span className="rounded-full border border-outline-variant px-2 py-0.5 text-label-sm text-on-surface-variant">0 F de frais Dilchap</span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {methods.map(m => (
                      <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${method === m ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant'}`}>
                        <input type="radio" checked={method === m} onChange={() => setMethod(m)} className="hidden" />
                        <PaymentLogo method={m} size={36} />
                        <span className="flex-1 text-label-md text-on-surface">{PAYMENT_LABELS[m] ?? m}</span>
                        <span className="text-label-md font-extrabold text-on-surface"><Price amount={amount} currency={o.listing.currency} /></span>
                      </label>
                    ))}
                  </div>
                  {method !== 'CASH' && (
                    <div className="mt-3 flex gap-3 rounded-xl bg-primary-fixed/60 p-3">
                      <Icon name="crisis_alert" size={24} className="shrink-0 text-primary" />
                      <p className="m-0 text-body-sm text-on-surface"><b className="text-primary">Alerte sécurité Dilchap</b><br />Ne validez <b className="text-primary">JAMAIS</b> sur la foi d'un simple SMS reçu. Ouvrez votre application {PAYMENT_LABELS[method] ?? ''} et vérifiez que votre solde affiche le versement effectif de <Price amount={amount} currency={o.listing.currency} />.</p>
                    </div>
                  )}
                  <CheckRow checked={attested} onChange={setAttested} tone="primary" className="-mx-3 mt-1">
                    J'atteste sur l'honneur avoir {method === 'CASH' ? 'reçu' : 'visualisé et encaissé'} <Price amount={amount} currency={o.listing.currency} /> nets {method === 'CASH' ? 'en espèces' : `sur mon compte ${PAYMENT_LABELS[method] ?? ''}`}.
                  </CheckRow>
                </section>

                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <h2 className="m-0 text-headline-sm text-on-surface">Évaluer l'acheteur {buyerFirst}</h2>
                  <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Aidez la communauté en notant son comportement lors de cette remise :</p>
                  <div className="mt-3 flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setRating(n)} className="cursor-pointer border-none bg-transparent p-0" aria-label={`${n} étoile${n > 1 ? 's' : ''}`}>
                        <Icon name="star" size={36} fill={n <= rating} className={n <= rating ? 'text-primary' : 'text-outline-variant'} />
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {BUYER_TAGS.map(t => {
                      const on = tags.includes(t)
                      return <button key={t} onClick={() => setTags(prev => on ? prev.filter(x => x !== t) : [...prev, t])} className={`cursor-pointer rounded-full border-none px-3 py-1.5 text-label-md ${on ? 'bg-primary text-white' : 'bg-surface-container text-on-surface'}`}>{t}</button>
                    })}
                  </div>
                </section>

                {confirmError && <p className="m-0 text-center text-body-sm text-primary">{confirmError.message}</p>}
                <button onClick={submit} disabled={!ready || confirming} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-none bg-primary px-4 py-4 text-label-lg text-white hover:bg-primary-dark disabled:opacity-50">
                  <Icon name="task_alt" size={22} /> <span className="max-[380px]:hidden">Valider la remise &amp; Clôturer la vente</span><span className="min-[380px]:hidden">Valider la remise</span>
                </button>
              </>
            )}

            {!done && (
              o.disputeId
                ? <button onClick={() => onOpenDispute(o.disputeId!)} className="flex cursor-pointer items-center justify-center gap-1 border-none bg-transparent p-0 text-label-md text-primary"><Icon name="gavel" size={18} /> Litige en cours — le consulter</button>
                : <button onClick={() => setDisputeOpen(true)} className="flex cursor-pointer items-center justify-center gap-1 border-none bg-transparent p-0 text-label-md text-primary"><Icon name="report_problem" size={18} /> Un imprévu ? Signaler un litige</button>
            )}
          </div>
        )}
      </div>
      {disputeOpen && o && (
        <OpenDisputeModal conversationId={o.id} perspective="SELLER" onClose={() => setDisputeOpen(false)} onOpened={d => { setDisputeOpen(false); onOpenDispute(d.id) }} />
      )}
    </AccountLayout>
  )
}
