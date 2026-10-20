import { useApolloClient } from '@apollo/client/react'
import { TRACK_LISTING_INTENT_MUTATION } from '../graphql/deals'
import { TRACK_LISTING_CLICK_MUTATION } from '../graphql/sellerTools'
import { noteSearchContact } from './searchAttribution'

// Purchase intents a tap alone reveals (« Appeler », « Partager ») and the
// contact taps of a listing (« Contacter », « Discuter », « Faire une
// offre »). First-party operational statistics for the seller and the
// team (« Statistiques », « Mises en relation & ventes »): no personal
// data, rate-limited by the server, not marketing — so not behind the
// analytics banner. Fire and forget: a failed count never shows.
export function useListingIntents() {
  const client = useApolloClient()
  const send = (mutation: typeof TRACK_LISTING_CLICK_MUTATION, variables: Record<string, unknown>) => {
    void client.mutate({ mutation, variables }).catch(() => undefined)
  }
  return {
    call: (listingId: string) => { noteSearchContact(listingId); send(TRACK_LISTING_INTENT_MUTATION, { listingId, type: 'CALL' }) },
    share: (listingId: string) => send(TRACK_LISTING_INTENT_MUTATION, { listingId, type: 'SHARE' }),
    contactTap: (listingId: string) => { noteSearchContact(listingId); send(TRACK_LISTING_CLICK_MUTATION, { listingId }) },
  }
}
