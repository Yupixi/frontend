import { gql } from '@apollo/client'

export const VAPID_PUBLIC_KEY_QUERY = gql`
  query VapidPublicKey {
    vapidPublicKey
  }
`

export const SAVE_PUSH_SUBSCRIPTION_MUTATION = gql`
  mutation SavePushSubscription($input: SavePushSubscriptionInput!) {
    savePushSubscription(input: $input)
  }
`
