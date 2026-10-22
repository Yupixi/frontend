import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { usePriceVars } from './countries'

// F CFA price of one credit in the payer's country (BO › Tarifs), public.
// Every price in credits is shown with its F CFA value next to it.
export const CREDIT_VALUE_QUERY = gql`
  query CreditValue($country: String) { walletSettings(country: $country) }
`

export function useCreditValue(): number {
  const { data } = useQuery<{ walletSettings: { creditValue: number } }>(CREDIT_VALUE_QUERY, { variables: usePriceVars(), fetchPolicy: 'cache-first' })
  return data?.walletSettings.creditValue ?? 0
}
