import { useQuery } from '@apollo/client/react'
import { BOOST_PACKS_QUERY, type BoostPackInfo } from '../graphql/promotions'
import { useOfferPrice } from './priceOffers'
import { usePriceVars } from './countries'

// Credits a "Remonter" costs: the "Remontée instantanée" price set in the
// back-office ("Tarifs & abonnements"), less the member's live offer
// (« Offres & gratuités ») on this listing — what the server will take.
export function useBumpCost(skip = false, listingId?: string | null) {
  const base = useQuery<{ boostPacks: BoostPackInfo[] }>(BOOST_PACKS_QUERY, { variables: usePriceVars(), skip }).data?.boostPacks.find(p => p.pack === 'BUMP_FLASH')?.price
  return useOfferPrice('BUMP', base, null, listingId)?.price
}
