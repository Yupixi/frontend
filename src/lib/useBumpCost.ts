import { useQuery } from '@apollo/client/react'
import { BOOST_PACKS_QUERY, type BoostPackInfo } from '../graphql/promotions'

// Credits a "Remonter" costs: the "Remontée instantanée" price set in the
// back-office ("Tarifs & abonnements").
export function useBumpCost(skip = false) {
  return useQuery<{ boostPacks: BoostPackInfo[] }>(BOOST_PACKS_QUERY, { skip }).data?.boostPacks.find(p => p.pack === 'BUMP_FLASH')?.price
}
