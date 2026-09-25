import { useQuery } from '@apollo/client/react'
import Icon from './Icon'
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
    <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-tertiary-soft px-2.5 py-1.5 text-label-sm text-on-surface-variant">
      <Icon name="lightbulb" size={15} className="shrink-0 text-tertiary" />
      <span>
        Prix suggéré : <b className="text-on-surface"><Price amount={suggestion.suggestedAmount} currency={suggestion.currency} /></b>
        {' '}(basé sur {suggestion.sampleSize} offre{plural} similaire{plural} accepté{plural})
      </span>
      {onUseAmount && (
        <button type="button" onClick={() => onUseAmount(suggestion.suggestedAmount!)} className="cursor-pointer rounded-md border-none bg-surface-lowest px-2 py-0.5 text-label-sm text-primary">
          Utiliser
        </button>
      )}
    </div>
  )
}
