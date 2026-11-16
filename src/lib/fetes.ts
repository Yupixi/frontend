import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { useMarketVars } from './countries'
import { useAdultModeOn } from './adultMode'

// « Thème des fêtes » set in the Backoffice (CMS › Fêtes), for the visitor's
// country and language. Nothing when off, outside its dates, or in the
// Section Adultes.
export const FETES_STATUS_QUERY = gql`
  query FetesStatus($country: String) { fetesStatus(country: $country) }
`

export type Fetes = {
  active: true
  endsAt: string | null
  intensity: 'soft' | 'normal' | 'strong'
  palette: 'classic' | 'gold' | 'brand'
  snow: boolean
  garland: boolean
  decorations: boolean
  cardRibbons: boolean
  banner: { text: string; cta: string; link: string } | null
}

export function useFetes(): Fetes | null {
  const adult = useAdultModeOn()
  const { data, previousData } = useQuery<{ fetesStatus: Fetes | { active: false } }>(FETES_STATUS_QUERY, {
    variables: useMarketVars(),
    skip: adult,
  })
  const s = (data ?? previousData)?.fetesStatus
  return !adult && s && s.active ? s : null
}
