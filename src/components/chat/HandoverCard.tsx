import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from '../Icon'
import Price from '../Price'
import PaymentLogo, { paymentLabel } from '../PaymentLogo'
import {
  CONFIRM_SALE_MUTATION, REVIEW_DEAL_MUTATION, handoverRefusal,
  type HandoverRefusal, type RemoteHandover,
} from '../../graphql/messaging'
import { useT, fmtDate, fmtTime } from '../../i18n'
import common from '../../i18n/ns/common'
import chatNs from '../../i18n/ns/chat'

// What the buyer checks before giving the code (same as the former
// « Mon code de remise » page).
const CHECKS = [
  { key: 'power', icon: 'power_settings_new' },
  { key: 'photos', icon: 'photo_camera' },
  { key: 'box', icon: 'inventory_2' },
] as const

const when = (iso: string) =>
  fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const clock = (iso: string) => fmtTime(iso)

// A private Dilchap card of the thread (only this member sees it).
export function Shell({ title, icon = 'handshake', children, onHide, id = 'remise-card' }: { title: string; icon?: string; children: React.ReactNode; onHide?: () => void; id?: string }) {
  const t = useT(chatNs)
  return (
    <section id={id} aria-label={t('card.aria', { title })} className="chat-in mx-auto mt-3 w-full max-w-md scroll-mt-24 overflow-hidden rounded-2xl border border-solid border-primary/25 bg-surface-lowest shadow-sm">
      <div className="flex items-center gap-2 px-3.5 pb-1 pt-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white"><Icon name={icon} size={16} /></span>
        <span className="min-w-0 flex-1 text-label-lg text-on-surface">{title}</span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant"><Icon name="lock" size={12} /> {t('handover.private')}</span>
        {onHide && (
          <button type="button" onClick={onHide} aria-label={t('handover.hideAria')} className="-mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface-variant hover:bg-surface-container">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 px-3.5 pb-3.5 pt-1.5">{children}</div>
    </section>
  )
}

function Frozen({ h, onOpenDispute }: { h: RemoteHandover; onOpenDispute?: (id: string) => void }) {
  const t = useT(chatNs)
  return (
    <div role="status" className="flex flex-col gap-2 rounded-xl bg-primary-fixed/50 p-3">
      <p className="m-0 flex items-start gap-2 text-body-sm text-on-surface">
        <Icon name="lock" size={18} className="mt-0.5 shrink-0 text-primary" />
        <span>{t.rich(h.role === 'BUYER' ? 'handover.frozenBuyer' : 'handover.frozenSeller', { b: c => <b className="text-primary">{c}</b> })}</span>
      </p>
      {h.disputeId && onOpenDispute && (
        <button type="button" onClick={() => onOpenDispute(h.disputeId!)} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-surface-lowest px-3 py-2 text-label-md text-primary">
          <Icon name="gavel" size={17} /> {t('handover.viewDispute')}
        </button>
      )}
    </div>
  )
}

// Buyer: the secret code, large and copyable, one rule, the checks.
function BuyerView({ h, onOpenDispute }: { h: RemoteHandover; onOpenDispute?: (id: string) => void }) {
  const t = useT(chatNs)
  const [copied, setCopied] = useState(false)
  if (h.frozen) return <Frozen h={h} onOpenDispute={onOpenDispute} />
  const code = h.code ?? ''
  const copy = () => {
    if (!code) return
    void navigator.clipboard?.writeText(code).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }
  return (
    <>
      <div>
        <div className="text-body-sm text-on-surface-variant">{t('handover.yourCode')}</div>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="select-all font-mono text-[40px] font-extrabold leading-none tracking-[0.18em] text-on-surface" aria-label={t('handover.codeAria', { digits: code.split('').join(' ') })}>{code || '••••'}</span>
          <button type="button" onClick={copy} disabled={!code} className="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-none bg-surface-container px-3 py-2 text-label-sm font-semibold text-on-surface hover:bg-surface-container-high">
            <Icon name={copied ? 'check' : 'content_copy'} size={16} /> {copied ? common.t('copied') : common.t('copy')}
          </button>
        </div>
      </div>
      <p className="m-0 flex items-start gap-2 rounded-xl bg-primary-fixed/40 p-2.5 text-body-sm text-on-surface">
        <Icon name="verified_user" size={18} className="mt-0.5 shrink-0 text-primary" />
        <span>{t('handover.giveRule')}</span>
      </p>
      <details className="group rounded-xl bg-surface-container-low">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-label-md text-on-surface [&::-webkit-details-marker]:hidden">
          <Icon name="checklist" size={18} className="text-tertiary" /> {t('handover.toCheck')}
          <Icon name="expand_more" size={18} className="ml-auto text-on-surface-variant transition-transform group-open:rotate-180" />
        </summary>
        <ul className="m-0 flex list-none flex-col gap-2 px-3 pb-3 pt-0">
          {CHECKS.map(c => (
            <li key={c.key} className="flex items-start gap-2.5">
              <Icon name={c.icon} size={18} className="mt-0.5 shrink-0 text-on-surface-variant" />
              <span className="text-body-sm"><b className="block text-label-md text-on-surface">{t(`handover.check.${c.key}.title`)}</b><span className="text-on-surface-variant">{t(`handover.check.${c.key}.text`)}</span></span>
            </li>
          ))}
        </ul>
      </details>
    </>
  )
}

// Seller: the buyer's code, the payment received, « Confirmer la vente »
// (code checked and sale concluded in one call).
function SellerView({ h, conversationId, otherName, onConfirmed, onOpenDispute }: {
  h: RemoteHandover
  conversationId: string
  otherName: string
  onConfirmed: () => void
  onOpenDispute?: (id: string) => void
}) {
  const t = useT(chatNs)
  const [code, setCode] = useState('')
  const [focused, setFocused] = useState(false)
  const [method, setMethod] = useState<string | null>(h.defaultPaymentMethod)
  const [qty, setQty] = useState(1)
  const [refusal, setRefusal] = useState<HandoverRefusal | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const [confirmSale, { loading }] = useMutation(CONFIRM_SALE_MUTATION)
  const lockedUntil = refusal?.reason === 'HANDOVER_CODE_LOCKED' ? refusal.lockedUntil : h.lockedUntil
  const locked = !!lockedUntil && Date.parse(lockedUntil) > Date.now()
  const frozen = h.frozen || refusal?.reason === 'HANDOVER_FROZEN'
  const ready = code.length === 4 && (!!method || !h.paymentRequired) && !locked && !frozen && !loading

  // The lock ends on its own: the card unlocks without a reload.
  useEffect(() => {
    if (!lockedUntil) return
    const ms = Date.parse(lockedUntil) - Date.now()
    if (ms <= 0) return
    const timer = window.setTimeout(() => setRefusal(r => (r?.reason === 'HANDOVER_CODE_LOCKED' ? null : r)), Math.min(ms + 500, 2_147_000_000))
    return () => window.clearTimeout(timer)
  }, [lockedUntil])

  const submit = () => {
    if (!ready || !h.meetupId) return
    setRefusal(null)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setRefusal(handoverRefusal(null)); return }
    void confirmSale({ variables: { input: { meetupId: h.meetupId, code, ...(method ? { paymentMethod: method } : {}), ...(h.quantity > 1 ? { quantity: qty } : {}) } } })
      .then(() => onConfirmed())
      .catch((e: unknown) => {
        const r = handoverRefusal(e)
        setRefusal(r)
        if (r.reason === 'HANDOVER_CODE_INVALID') { setCode(''); window.setTimeout(() => input.current?.focus(), 30) }
      })
  }

  if (frozen) return <Frozen h={{ ...h, disputeId: h.disputeId ?? (refusal?.reason === 'HANDOVER_FROZEN' ? refusal.disputeId : null) }} onOpenDispute={onOpenDispute} />
  const invalid = refusal?.reason === 'HANDOVER_CODE_INVALID'
  return (
    <>
      <div>
        <label htmlFor={`remise-code-${conversationId}`} className="text-label-md text-on-surface">{t('handover.buyerCode')}</label>
        <p className="m-0 text-body-sm text-on-surface-variant">{t('handover.askFor', { name: otherName })}</p>
        {/* One real input (paste, autofill, fast typing) drawn as 4 boxes: the
            caret moves to the next box by itself. */}
        <div className={`relative mt-2 flex w-fit gap-2.5 ${locked ? 'opacity-50' : ''}`}>
          <input
            ref={input}
            id={`remise-code-${conversationId}`}
            value={code}
            disabled={locked}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            enterKeyHint="done"
            maxLength={4}
            aria-invalid={invalid || undefined}
            aria-describedby={refusal ? `remise-error-${conversationId}` : undefined}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); if (invalid) setRefusal(null) }}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 disabled:cursor-not-allowed"
          />
          {[0, 1, 2, 3].map(i => {
            const active = focused && (i === code.length || (i === 3 && code.length === 4))
            return (
              <span key={i} aria-hidden className={`flex h-14 w-12 items-center justify-center rounded-xl border-2 border-solid bg-surface-container-low text-headline-md font-extrabold text-on-surface ${invalid ? 'border-primary' : active ? 'border-primary' : 'border-transparent'}`}>
                {code[i] ?? ''}
              </span>
            )
          })}
        </div>
      </div>

      <div>
        <div className="text-label-md text-on-surface">{t('handover.paymentReceived')}{!h.paymentRequired && <span className="font-normal text-on-surface-variant">{t('handover.optional')}</span>}</div>
        <div className="-mx-3.5 mt-1.5 flex gap-1.5 overflow-x-auto px-3.5 pb-0.5 [scrollbar-width:none]" role="radiogroup" aria-label={t('handover.paymentAria')}>
          {h.paymentMethods.map(m => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              onClick={() => setMethod(cur => (cur === m && !h.paymentRequired ? h.defaultPaymentMethod : m))}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-solid py-1 pl-1 pr-3 text-label-sm font-semibold ${method === m ? 'border-primary bg-primary-fixed/40 text-on-surface' : 'border-outline-variant bg-surface-lowest text-on-surface-variant'}`}
            >
              <PaymentLogo method={m} size={24} className="rounded-full" /> {paymentLabel(m)}
            </button>
          ))}
        </div>
      </div>

      {h.quantity > 1 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-3 py-2">
          <span className="text-label-md text-on-surface">{t('handover.unitsSold')}</span>
          <span className="flex items-center gap-1">
            <button type="button" aria-label={t('handover.oneLess')} disabled={qty <= 1} onClick={() => setQty(q => Math.max(1, q - 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-on-surface disabled:opacity-40"><Icon name="remove" size={17} /></button>
            <span className="w-8 text-center text-label-lg text-on-surface">{qty}</span>
            <button type="button" aria-label={t('handover.oneMore')} disabled={qty >= h.quantity} onClick={() => setQty(q => Math.min(h.quantity, q + 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-on-surface disabled:opacity-40"><Icon name="add" size={17} /></button>
          </span>
        </div>
      )}

      {(refusal || locked) && (
        <div id={`remise-error-${conversationId}`} role="alert" className="flex items-start gap-2 rounded-xl bg-primary-fixed/60 p-2.5 text-body-sm text-on-surface">
          <Icon name={locked ? 'lock' : 'error'} size={18} className="mt-0.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            {locked ? t('handover.locked', { time: clock(lockedUntil!) }) : refusal!.message}
            {refusal?.reason === 'OFFLINE' && (
              <button type="button" onClick={submit} className="ml-1 cursor-pointer border-none bg-transparent p-0 text-body-sm font-bold text-primary underline">{common.t('retry')}</button>
            )}
          </span>
        </div>
      )}

      <button type="button" onClick={submit} disabled={!ready} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-4 py-3 text-label-lg text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">
        <Icon name="task_alt" size={20} /> {loading ? t('handover.checking') : t('handover.confirmSale')}
      </button>
    </>
  )
}

// « Remise » card in the thread: private to each member (the buyer's code,
// the seller's entry). Shown on meet-up day and right after, or when
// opened from the header.
export default function HandoverCard({ h, conversationId, otherName, onConfirmed, onOpenDispute, onHide }: {
  h: RemoteHandover
  conversationId: string
  otherName: string
  onConfirmed: () => void
  onOpenDispute?: (id: string) => void
  // Opened by hand outside its window: can be put away again.
  onHide?: () => void
}) {
  const t = useT(chatNs)
  return (
    <Shell title={t('handover.title')} onHide={onHide}>
      {h.place && h.scheduledAt && (
        <p className="m-0 -mt-1 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="schedule" size={15} className="shrink-0" /> <span className="truncate">{h.place} · {when(h.scheduledAt)}</span></p>
      )}
      {h.role === 'BUYER'
        ? <BuyerView h={h} onOpenDispute={onOpenDispute} />
        : <SellerView h={h} conversationId={conversationId} otherName={otherName} onConfirmed={onConfirmed} onOpenDispute={onOpenDispute} />}
    </Shell>
  )
}

const skipKey = (id: string) => `dilchap_deal_review_later_${id}`

// Inline rating once the sale is concluded (« Vente conclue » card): stars
// and an optional comment, never blocking; « Plus tard » folds it into a
// button on the same card.
export function DealReview({ h, conversationId, otherName, onSaved }: {
  h: RemoteHandover
  conversationId: string
  otherName: string
  onSaved: () => void
}) {
  const t = useT(chatNs)
  const [later, setLater] = useState(() => { try { return localStorage.getItem(skipKey(conversationId)) === '1' } catch { return false } })
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [review, { loading }] = useMutation(REVIEW_DEAL_MUTATION)
  if (!h.inlineRating && !h.myReview) return null
  if (h.myReview) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-body-sm text-on-surface">
        <span className="flex shrink-0" aria-label={t('review.yourRatingAria', { rating: h.myReview.rating })}>
          {[1, 2, 3, 4, 5].map(n => <Icon key={n} name="star" size={16} fill={n <= h.myReview!.rating} className={n <= h.myReview!.rating ? 'text-amber-500' : 'text-outline-variant'} />)}
        </span>
        <span className="min-w-0 truncate">{t('review.saved', { name: otherName })}</span>
      </div>
    )
  }
  const setSkipped = (v: boolean) => { setLater(v); try { if (v) localStorage.setItem(skipKey(conversationId), '1'); else localStorage.removeItem(skipKey(conversationId)) } catch { /* private mode */ } }
  if (later) {
    return (
      <button type="button" onClick={() => setSkipped(false)} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container px-3 py-2 text-label-md text-on-surface hover:bg-surface-container-high">
        <Icon name="star" size={17} /> {t('review.rate', { name: otherName })}
      </button>
    )
  }
  const send = () => {
    if (!rating) return
    setError(null)
    void review({ variables: { conversationId, rating, comment: comment.trim() || null } })
      .then(() => { setSkipped(false); onSaved() })
      .catch((e: unknown) => setError(handoverRefusal(e).message))
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-3">
      <div className="text-label-md text-on-surface">{t('review.question', { name: otherName })}</div>
      <div className="flex gap-1" role="radiogroup" aria-label={t('review.ratingAria')}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={t('review.stars', { count: n })} onClick={() => setRating(n)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0">
            <Icon name="star" size={30} fill={n <= rating} className={n <= rating ? 'text-amber-500' : 'text-outline-variant'} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} rows={2} placeholder={t('review.commentPlaceholder')} aria-label={t('review.commentAria')} className="input min-h-0 resize-none !bg-surface-lowest text-body-sm" />
      )}
      {error && <p role="alert" className="m-0 text-body-sm text-primary">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={send} disabled={!rating || loading} className="flex-1 cursor-pointer rounded-lg border-none bg-primary py-2 text-label-md text-white disabled:opacity-50">{loading ? t('review.sending') : common.t('send')}</button>
        <button type="button" onClick={() => setSkipped(true)} className="cursor-pointer rounded-lg border-none bg-transparent px-3 py-2 text-label-md text-on-surface-variant hover:bg-surface-container">{t('review.later')}</button>
      </div>
    </div>
  )
}

// A sale recorded without the code (the seller's « Oui », « Marquer comme
// vendu »): the buyer's code can still certify it. Optional, folded into
// a button until asked for.
export function CertifyWithCode({ h, otherName, onDone }: { h: RemoteHandover; otherName: string; onDone: () => void }) {
  const t = useT(chatNs)
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [refusal, setRefusal] = useState<HandoverRefusal | null>(null)
  const [confirmSale, { loading }] = useMutation(CONFIRM_SALE_MUTATION)
  if (!h.certifiable || !h.meetupId) return null
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container px-3 py-2 text-label-md text-on-surface hover:bg-surface-container-high">
        <Icon name="verified" size={17} /> {t.rich('certify.open', { name: otherName, muted: c => <span className="font-normal text-on-surface-variant">{c}</span> })}
      </button>
    )
  const submit = () => {
    if (code.length !== 4 || loading) return
    setRefusal(null)
    void confirmSale({ variables: { input: { meetupId: h.meetupId, code } } })
      .then(() => onDone())
      .catch((e: unknown) => { setRefusal(handoverRefusal(e)); setCode('') })
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-3">
      <label htmlFor={`certify-${h.meetupId}`} className="text-label-md text-on-surface">{t('certify.label', { name: otherName })}</label>
      <div className="flex gap-2">
        <input id={`certify-${h.meetupId}`} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={e => { if (e.key === 'Enter') submit() }}
          inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" maxLength={4} placeholder="••••" aria-invalid={!!refusal || undefined}
          className="input h-11 w-28 min-w-0 !bg-surface-lowest text-center font-mono text-headline-sm tracking-[0.3em]" />
        <button type="button" onClick={submit} disabled={code.length !== 4 || loading} className="flex-1 cursor-pointer rounded-lg border-none bg-primary px-3 text-label-md text-white disabled:opacity-50">{loading ? t('handover.checking') : t('certify.submit')}</button>
      </div>
      {refusal && <p role="alert" className="m-0 text-body-sm text-primary">{refusal.message}</p>}
    </div>
  )
}

// « Vente conclue » for a sale whose thread has no Dilchap card (cards off
// in the Backoffice, or a sale concluded before them).
export function DealDoneCard({ h, conversationId, otherName, amount, currency, onSaved }: {
  h: RemoteHandover
  conversationId: string
  otherName: string
  amount?: number | null
  currency: string
  onSaved: () => void
}) {
  const t = useT(chatNs)
  return (
    <Shell title={t('dealDone.title')} icon="verified">
      <p className="m-0 text-body-sm text-on-surface-variant">
        {t.rich(h.handoverMethod === 'CODE' || h.handoverMethod === 'BOTH_CONFIRMED' ? 'dealDone.confirmed' : 'dealDone.recorded', {
          on: h.handedOverAt ? t('dealDone.on', { date: when(h.handedOverAt) }) : '',
          price: amount != null ? <> · <Price amount={amount} currency={currency} /></> : null,
        })}
      </p>
      <CertifyWithCode h={h} otherName={otherName} onDone={onSaved} />
      <DealReview h={h} conversationId={conversationId} otherName={otherName} onSaved={onSaved} />
    </Shell>
  )
}
