import { useQuery } from '@apollo/client/react'
import { Lightbulb } from 'lucide-react'
import Price from './Price'
import { PRICE_SUGGESTION_QUERY, type RemotePriceSuggestion } from '../graphql/offers'

type PriceSuggestionHintProps = {
  listingId: string | null | undefined
  onUseAmount?: (amount: number) => void
}

// Heuristic, not ML — the median of what buyers and sellers actually agreed
// on for comparable items. Silent when there isn't enough data (see
// OffersService.getPriceSuggestion's MIN_SAMPLE) rather than showing a
// number built on 1-2 data points.
export default function PriceSuggestionHint({ listingId, onUseAmount }: PriceSuggestionHintProps) {
  const { data } = useQuery<{ priceSuggestion: RemotePriceSuggestion }>(PRICE_SUGGESTION_QUERY, {
    variables: { listingId: listingId as string },
    skip: !listingId,
  })
  const suggestion = data?.priceSuggestion
  if (!suggestion || suggestion.suggestedAmount == null) return null

  const plural = suggestion.sampleSize > 1 ? 's' : ''

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--fg-muted)', marginBottom: 8, flexWrap: 'wrap' }}>
      <Lightbulb size={13} style={{ flexShrink: 0, color: '#F59E0B' }} />
      <span>
        Prix suggéré : <strong style={{ color: 'var(--fg)' }}><Price amount={suggestion.suggestedAmount} currency={suggestion.currency} /></strong>
        {' '}(basé sur {suggestion.sampleSize} offre{plural} similaire{plural} accepté{plural})
      </span>
      {onUseAmount && (
        <button
          type="button"
          onClick={() => onUseAmount(suggestion.suggestedAmount!)}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}
        >
          Utiliser
        </button>
      )}
    </div>
  )
}
