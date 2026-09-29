import { useEffect, useState } from 'react'
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react'
import Icon from './Icon'
import BuyCreditsSheet from './BuyCreditsSheet'
import { creditsLabel } from './Credits'
import { offerLabel, useOfferPrice } from '../lib/priceOffers'
import {
  ASSIST_LISTING_MUTATION, LISTING_ADVICE_QUERY, LISTING_ASSIST_AVAILABLE_QUERY,
  type ListingAdvice, type ListingAssistOffer, type ListingDraftSuggestion,
} from '../graphql/listingAssist'
import { WALLET_BALANCE_QUERY, type WalletBalance } from '../graphql/payments'
import { usePriceVars } from '../lib/countries'

const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

// Cover photo shrunk in the browser (≤ 512 px JPEG, < 90 KB) so it fits
// in one small request to the assistant.
async function thumbnail(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    for (const q of [0.72, 0.55, 0.4]) {
      const url = canvas.toDataURL('image/jpeg', q)
      if (url.length < 118_000) return url
    }
  } catch { /* unreadable image: text only */ }
  return null
}

// "Rédiger avec l'IA": an open model (Hugging Face) drafts the title,
// description, category, brand and condition from the cover photo. Paid in
// credits (price set in the back-office, given back if no draft comes
// out); a short balance opens the credit purchase. The seller reviews and
// can undo.
export function AssistButton({ cover, title, description, onApply }: {
  cover: File | null
  title: string
  description: string
  onApply: (s: ListingDraftSuggestion) => void
}) {
  const { data } = useQuery<ListingAssistOffer>(LISTING_ASSIST_AVAILABLE_QUERY, { variables: usePriceVars(), fetchPolicy: 'cache-and-network' })
  // Price less the live offer (« Offres & gratuités »), as the server takes it.
  const quote = useOfferPrice('AI_ASSIST', data?.listingAssistPrice ?? 0)
  const cost = quote?.price ?? 0
  const { data: wallet, refetch } = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { variables: usePriceVars(), skip: !data?.listingAssistAvailable || !cost, fetchPolicy: 'cache-and-network' })
  const [assist, { loading }] = useMutation<{ assistListing: ListingDraftSuggestion }>(ASSIST_LISTING_MUTATION)
  const [error, setError] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [topUp, setTopUp] = useState(false)
  if (!data?.listingAssistAvailable) return null
  const canRun = !!cover || !!title.trim() || !!plain(description)
  const balance = wallet?.myWallet.credits
  const missing = cost && balance != null ? Math.max(0, cost - balance) : 0

  const run = async () => {
    setError(null)
    if (missing) { setTopUp(true); return }
    setPreparing(true)
    const photo = cover ? await thumbnail(cover) : null
    setPreparing(false)
    try {
      const res = await assist({ variables: { input: { photo, title: title.trim() || undefined, description: plain(description) || undefined } } })
      if (res.data) onApply(res.data.assistListing)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'L’assistant est indisponible pour le moment.')
    }
    if (cost) void refetch()
  }

  const busy = loading || preparing
  return (
    <div className="rounded-xl bg-gradient-to-r from-primary-fixed/60 to-surface-container-low p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 min-w-0 flex-1 basis-56 text-body-sm text-on-surface">
          <b>Pas d’inspiration ?</b> L’IA propose un titre, une description, la catégorie et l’état {cover ? 'à partir de votre première photo' : 'à partir de vos premiers mots'}. Vous relisez avant de publier.
        </p>
        <button type="button" disabled={busy || !canRun} onClick={() => void run()}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-on-surface px-3.5 py-2.5 text-label-md text-surface-lowest disabled:cursor-default disabled:opacity-50">
          <Icon name={busy ? 'progress_activity' : 'auto_awesome'} size={17} className={busy ? 'animate-spin' : ''} /> {busy ? 'Rédaction…' : 'Rédiger avec l’IA'}
          {!busy && (cost > 0 || !!quote?.percent) && <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-label-sm">{quote?.percent ? <><s className="opacity-70">{quote.base}</s> {cost > 0 ? creditsLabel(cost) : offerLabel(100)}</> : creditsLabel(cost)}</span>}
        </button>
      </div>
      {cost > 0 && balance != null && (
        <p className="m-0 mt-1 text-body-sm text-on-surface-variant">
          {missing ? <>Solde : {creditsLabel(balance)}. <button type="button" onClick={() => setTopUp(true)} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">Acheter des crédits</button></>
            : <>Solde : {creditsLabel(balance)} • remboursé si l’IA ne propose rien.</>}
        </p>
      )}
      {!canRun && <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Ajoutez d’abord une photo ou quelques mots.</p>}
      {error && <p role="alert" className="m-0 mt-1 text-body-sm text-primary">{error}</p>}
      <BuyCreditsSheet open={topUp} suggested={missing || undefined} onClose={() => setTopUp(false)} onDone={() => { setTopUp(false); void refetch() }} />
    </div>
  )
}

const LEVEL = {
  BLOCKING: { icon: 'block', cls: 'bg-primary-fixed text-primary', label: 'À corriger' },
  WARNING: { icon: 'warning', cls: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200', label: 'Vérification manuelle' },
  TIP: { icon: 'lightbulb', cls: 'bg-surface-container-low text-on-surface-variant', label: 'Conseil' },
} as const

// Live advice while writing: the same rules the moderation applies
// (instant, no AI call), refreshed a moment after the seller stops typing.
export function ListingAdvicePanel({ title, description, price, currency, categoryId, subcategoryId, photoCount, listingId }: {
  title: string; description: string; price: number | null; currency: string
  categoryId: string; subcategoryId: string; photoCount: number; listingId?: string
}) {
  const [fetchAdvice, { data }] = useLazyQuery<{ listingAdvice: ListingAdvice[] }>(LISTING_ADVICE_QUERY, { fetchPolicy: 'network-only' })
  const text = plain(description)
  useEffect(() => {
    if (!title.trim() && !text) return
    const t = setTimeout(() => {
      void fetchAdvice({ variables: { input: {
        title: title.slice(0, 200), description: text.slice(0, 10000), price: price || undefined, currency,
        categoryId: categoryId || undefined, subcategoryId: subcategoryId || undefined, photoCount, listingId,
      } } }).catch(() => undefined)
    }, 700)
    return () => clearTimeout(t)
  }, [title, text, price, currency, categoryId, subcategoryId, photoCount, listingId, fetchAdvice])

  const items = (title.trim() || text) ? data?.listingAdvice ?? [] : []
  if (!items.length) return null
  return (
    <div className="rounded-xl border border-solid border-outline-variant p-3" aria-live="polite">
      <p className="m-0 flex items-center gap-1.5 text-label-md text-on-surface"><Icon name="lightbulb" size={17} className="text-primary" /> Avant de publier</p>
      <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
        {items.map((a) => {
          const l = LEVEL[a.level as keyof typeof LEVEL] ?? LEVEL.TIP
          return (
            <li key={a.code} className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-body-sm ${l.cls}`}>
              <Icon name={l.icon} size={16} className="mt-0.5 shrink-0" />
              <span className="min-w-0"><b>{l.label} :</b> {a.message}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
