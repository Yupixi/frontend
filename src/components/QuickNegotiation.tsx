import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from './Icon'
import Price from './Price'
import { formatNumber } from '../lib/format'
import { SEND_MESSAGE_MUTATION, START_CONVERSATION_MUTATION, type RemoteConversation } from '../graphql/messaging'
import { MAKE_OFFER_MUTATION } from '../graphql/offers'
import SellerBadge from '../components/SellerBadge'
import type { BadgeTier } from '../graphql/badges'
import { Claim } from '../lib/site'
import AccountVerifyPanel from './AccountVerifyPanel'
import { isNotVerifiedError } from '../lib/accountVerify'
import { cfaUnit, useT } from '../i18n'
import offersNs from '../i18n/ns/offers'

type Props = {
  listing: {
    id: string; title: string; price: number | null; currency: string; negotiable: boolean; minOfferPrice?: number | null
    coverImageUrl: string | null; city: string; locationLabel?: string | null; meetupSpot?: string | null
    seller: { id: string; fullName: string; avatarUrl: string | null }
  }
  sellerRating?: { average: number; count: number; badge?: BadgeTier | null } | null
  responseTime?: string | null
  // Chat opened on the conversation once the message/offer is sent.
  onSent: (sellerId: string, listingId: string) => void
}

const round = (n: number, step: number) => Math.max(step, Math.round(n / step) * step)
// « 12 500 F » / « 12,500 CFA F ».
const cfa = (n: number) => `${formatNumber(n)} ${cfaUnit()}`

// "Faire une offre & Contacter" (Stitch mobile "Négociation rapide"): price
// chips, custom amount, 1-click messages, then one button sends everything
// and opens the chat.
export default function QuickNegotiation({ listing, sellerRating, responseTime, onSent }: Props) {
  const t = useT(offersNs)
  const price = listing.price ?? 0
  const step = price >= 100_000 ? 5000 : price >= 10_000 ? 1000 : 500
  const floor = listing.minOfferPrice ?? 0
  const chips = listing.negotiable && price > 0
    ? [
        { key: 'direct', label: t('quick.chip.direct'), amount: price, sub: t('quick.chip.noDiscount') },
        { key: 'reco', label: t('quick.chip.reco'), amount: Math.max(floor, round(price * 0.93, step)), sub: '' },
        { key: 'low', label: t('quick.chip.low'), amount: Math.max(floor, round(price * 0.9, step)), sub: '' },
      ].map(c => ({ ...c, sub: c.sub || `-${cfa(price - c.amount)}` }))
    : []
  const place = listing.meetupSpot || listing.locationLabel || listing.city
  const presets = [
    t('quick.preset.available', { place }),
    t('quick.preset.test'),
    t('quick.preset.take'),
  ]
  const [amount, setAmount] = useState<number | null>(chips[1]?.amount ?? null)
  const [custom, setCustom] = useState(chips[1] ? String(chips[1].amount) : '')
  const [message, setMessage] = useState(presets[0])
  const [error, setError] = useState<string | null>(null)
  // Account not confirmed: the SMS code here, then the same message goes.
  const [needsVerify, setNeedsVerify] = useState(false)
  const [startConversation, { loading: starting }] = useMutation<{ startConversation: RemoteConversation }>(START_CONVERSATION_MUTATION)
  const [sendMessage, { loading: sendingMsg }] = useMutation(SEND_MESSAGE_MUTATION)
  const [makeOffer, { loading: offering }] = useMutation(MAKE_OFFER_MUTATION)
  const busy = starting || sendingMsg || offering
  const offer = listing.negotiable && amount && amount < price ? amount : null

  const pick = (a: number) => { setAmount(a); setCustom(String(a)) }
  const submit = async () => {
    setError(null)
    if (offer && floor && offer < floor) { setError(t('quick.belowFloor', { amount: cfa(floor) })); return }
    try {
      const { data } = await startConversation({ variables: { recipientId: listing.seller.id, listingId: listing.id } })
      const conversationId = data!.startConversation.id
      if (message.trim()) await sendMessage({ variables: { conversationId, body: message.trim() } })
      if (offer) await makeOffer({ variables: { input: { listingId: listing.id, amount: offer, conversationId } } })
      onSent(listing.seller.id, listing.id)
    } catch (e) {
      if (isNotVerifiedError(e)) { setNeedsVerify(true); return }
      setError(e instanceof Error ? e.message : t('quick.sendError'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-container-low p-3">
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-container">{listing.coverImageUrl && <img src={listing.coverImageUrl} alt={t('quick.photoAlt', { title: listing.title })} className="h-full w-full object-cover" />}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-label-md text-on-surface">{listing.title}</div>
          <div className="text-body-sm text-on-surface-variant"><Price amount={listing.price} currency={listing.currency} /> • {place}</div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-surface-lowest px-2.5 py-1.5">
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary text-label-sm text-white">{listing.seller.avatarUrl ? <img src={listing.seller.avatarUrl} alt="" className="h-full w-full object-cover" /> : listing.seller.fullName.charAt(0)}</span>
          <div className="text-label-sm"><div className="flex items-center gap-0.5 text-on-surface">{listing.seller.fullName}<SellerBadge tier={sellerRating?.badge} size={13} /></div>{!!sellerRating?.count && <div className="text-on-surface-variant">★ {sellerRating.average.toFixed(1)}</div>}</div>
        </div>
      </div>

      {chips.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <span className="text-label-sm uppercase text-on-surface-variant">{t('quick.yourOffer')}</span>
            <span className="rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary">{t('quick.saving', { amount: cfa(Math.max(0, price - (amount ?? price))) })}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {chips.map(c => {
              const on = amount === c.amount
              return (
                <button key={c.key} onClick={() => pick(c.amount)} className={`cursor-pointer rounded-xl border-none p-2.5 text-left ${on ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface'}`}>
                  <span className="block text-label-sm">{c.label}</span>
                  <span className="block text-label-md font-extrabold">{cfa(c.amount)}</span>
                  <span className={`block text-label-sm ${on ? 'text-white/80' : 'text-on-surface-variant'}`}>{c.sub}</span>
                </button>
              )
            })}
          </div>
          <label className="mt-2 flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2">
            <Icon name="edit_note" size={20} className="text-on-surface-variant" />
            <span className="min-w-0 flex-1">
              <span className="block text-label-sm text-on-surface-variant">{t('quick.custom')}</span>
              <input inputMode="numeric" value={custom} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setCustom(v); setAmount(v ? Number(v) : null) }} className="w-full border-none bg-transparent text-headline-sm text-on-surface outline-none" />
            </span>
            <span className="text-headline-sm text-on-surface">{t('quick.unit')}</span>
          </label>
        </div>
      )}

      <div>
        <div className="text-label-sm uppercase text-on-surface-variant">{t('quick.presets')}</div>
        <div className="mt-2 flex flex-col gap-1.5">
          {presets.map(p => (
            <button key={p} onClick={() => setMessage(p)} className={`flex cursor-pointer items-center gap-2 rounded-xl border-none px-3 py-2.5 text-left text-body-sm ${message === p ? 'bg-surface-container-high text-on-surface' : 'bg-surface-container-low text-on-surface-variant'}`}>
              <span className="min-w-0 flex-1 truncate">{p}</span>
              <Icon name={message === p ? 'check_circle' : 'radio_button_unchecked'} size={18} className={message === p ? 'text-primary' : 'text-outline-variant'} />
            </button>
          ))}
        </div>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} className="mt-2 w-full resize-none rounded-xl border border-transparent bg-surface-container-low p-3 text-body-md text-on-surface outline-none focus:border-primary" />
      </div>

      <div className="flex gap-3 rounded-xl bg-tertiary-soft p-3">
        <Icon name="shield" size={20} className="shrink-0 text-tertiary" />
        <p className="m-0 text-body-sm text-on-surface">{t.rich('quick.safety', { b: c => <b className="text-tertiary">{c}</b>, br: () => <br />, claim: c => <Claim>{c}</Claim> })}</p>
      </div>

      {error && <p className="m-0 text-body-sm text-primary">{error}</p>}
      {needsVerify && <AccountVerifyPanel tone="plain" intro={t('quick.verifyIntro')} onVerified={() => { setNeedsVerify(false); void submit() }} />}
      <button onClick={() => void submit()} disabled={busy || (!message.trim() && !offer)} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-label-lg text-white hover:bg-primary-dark disabled:opacity-60">
        <Icon name="send" size={19} /> {busy ? t('quick.sending') : offer ? t('quick.sendOffer', { amount: cfa(offer) }) : t('quick.send')}
      </button>
      {responseTime && <p className="m-0 -mt-2 text-center text-label-sm text-on-surface-variant">{t('quick.responseTime', { name: listing.seller.fullName, time: responseTime })}</p>}
    </div>
  )
}
