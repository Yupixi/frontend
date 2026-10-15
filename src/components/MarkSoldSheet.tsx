import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import Icon from './Icon'
import Price from './Price'
import SafeImg from './SafeImg'
import { MARK_LISTING_SOLD_MUTATION, SALE_CANDIDATES_QUERY, type SaleCandidate } from '../graphql/deals'

type Data = {
  myListing: { id: string; title: string; quantity: number; status: string; price: number | null; currency: string }
  listingSaleCandidates: SaleCandidate[]
}

const OFFSITE = 'offsite'

// « Marquer comme vendu »: « Vendu à qui ? » — one of the members who
// wrote about the listing (the sale is recorded with them, the discussion
// closes and ratings open), or « Vendu hors Dilchap ». A listing with
// stock loses the units sold and stays online while some are left.
export default function MarkSoldSheet({ open, listingId, preselect, onClose, onDone }: {
  open: boolean
  listingId: string | null
  // The conversation the sheet was opened from (chat header).
  preselect?: string | null
  onClose: () => void
  onDone: (status: string) => void
}) {
  const { data, loading } = useQuery<Data>(SALE_CANDIDATES_QUERY, {
    variables: { listingId, id: listingId },
    skip: !open || !listingId,
    fetchPolicy: 'network-only',
  })
  const [markSold, { loading: saving }] = useMutation<{ markListingSold: { id: string; status: string; quantity: number } }>(MARK_LISTING_SOLD_MUTATION)
  const [choice, setChoice] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (open) { setChoice(preselect ?? null); setQty(1); setError(null) } }, [open, preselect])

  const listing = data?.myListing
  const candidates = data?.listingSaleCandidates ?? []
  const stock = listing?.quantity ?? 1
  const confirm = () => {
    if (!choice || !listingId) return
    setError(null)
    void markSold({ variables: { input: { listingId, ...(choice === OFFSITE ? { offsite: true } : { conversationId: choice }), ...(stock > 1 ? { quantity: qty } : {}) } } })
      .then(({ data: d }) => onDone(d?.markListingSold.status ?? 'SOLD'))
      .catch((e: Error) => setError(e.message))
  }

  const option = (key: string, body: React.ReactNode) => (
    <button key={key} type="button" role="radio" aria-checked={choice === key} onClick={() => setChoice(key)}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-solid p-2.5 text-left ${choice === key ? 'border-primary bg-primary-fixed/30' : 'border-transparent bg-surface-container-low hover:bg-surface-container'}`}>
      {body}
      <Icon name={choice === key ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} className={`ml-auto shrink-0 ${choice === key ? 'text-primary' : 'text-outline'}`} />
    </button>
  )

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Vendu à qui ?"
      maxWidth="520px"
      footer={
        <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
          <button type="button" onClick={onClose} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Annuler</button>
          <button type="button" onClick={confirm} disabled={!choice || saving} className="h-12 flex-[1.4] cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-50">
            {saving ? 'Un instant…' : 'Marquer comme vendu'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {listing && <p className="m-0 text-body-sm text-on-surface-variant">« <b className="text-on-surface">{listing.title}</b> »{stock > 1 ? ` · ${stock} exemplaires en stock` : ''}</p>}
        {loading && !data ? (
          <div className="flex flex-col gap-2" aria-busy="true">{[0, 1].map(i => <div key={i} className="chat-skeleton h-14 rounded-xl" />)}</div>
        ) : (
          <div role="radiogroup" aria-label="Acheteur" className="flex flex-col gap-2">
            {candidates.map(c => option(c.conversationId, (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high text-label-lg font-bold text-on-surface-variant">
                  {c.buyerAvatarUrl ? <SafeImg src={c.buyerAvatarUrl} alt={c.buyerName} icon="person" /> : c.buyerName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-label-lg text-on-surface">{c.buyerName}</span>
                  <span className="flex flex-wrap gap-x-2 text-body-sm text-on-surface-variant">
                    {c.acceptedOffer != null && <span>Offre acceptée <Price amount={c.acceptedOffer} currency={listing?.currency ?? 'XOF'} /></span>}
                    {c.meetupConfirmed && <span>RDV confirmé</span>}
                    {c.acceptedOffer == null && !c.meetupConfirmed && <span>A écrit pour cette annonce</span>}
                  </span>
                </span>
              </>
            )))}
            {!candidates.length && <p className="m-0 text-body-sm text-on-surface-variant">Personne ne vous a encore écrit pour cette annonce sur Dilchap.</p>}
            {option(OFFSITE, (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant"><Icon name="storefront" size={20} /></span>
                <span className="min-w-0">
                  <span className="block text-label-lg text-on-surface">Vendu hors Dilchap</span>
                  <span className="block text-body-sm text-on-surface-variant">Vendu ailleurs, à quelqu’un qui ne vous a pas écrit ici</span>
                </span>
              </>
            ))}
          </div>
        )}
        {stock > 1 && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-3 py-2">
            <span className="text-label-md text-on-surface">Exemplaires vendus</span>
            <span className="flex items-center gap-1">
              <button type="button" aria-label="Un de moins" disabled={qty <= 1} onClick={() => setQty(q => Math.max(1, q - 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-on-surface disabled:opacity-40"><Icon name="remove" size={17} /></button>
              <span className="w-8 text-center text-label-lg text-on-surface">{qty}</span>
              <button type="button" aria-label="Un de plus" disabled={qty >= stock} onClick={() => setQty(q => Math.min(stock, q + 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-on-surface disabled:opacity-40"><Icon name="add" size={17} /></button>
            </span>
          </div>
        )}
        <p className="m-0 text-body-sm text-on-surface-variant">
          {choice && choice !== OFFSITE
            ? 'La vente est enregistrée avec ce membre et la discussion se ferme ; vous pourrez vous noter. Son code de remise, si vous l’avez, certifie la vente (facultatif).'
            : stock > 1 ? 'Les exemplaires vendus sont retirés du stock ; l’annonce reste en ligne tant qu’il en reste.' : 'L’annonce passe « Vendue » et sort de la recherche.'}
        </p>
        {error && <p role="alert" className="m-0 text-body-sm text-primary">{error}</p>}
      </div>
    </BottomSheet>
  )
}
