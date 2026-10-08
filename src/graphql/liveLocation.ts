import { gql } from '@apollo/client'

// Live position on meet-up day (members of the conversation only).
export const LIVE_LOCATION_QUERY = gql`
  query LiveLocation($meetupId: ID!) {
    liveLocation(meetupId: $meetupId)
  }
`

export const START_LIVE_LOCATION_MUTATION = gql`
  mutation StartLiveLocation($meetupId: ID!, $minutes: Int!, $position: LivePositionInput) {
    startLiveLocation(meetupId: $meetupId, minutes: $minutes, position: $position)
  }
`

export const UPDATE_LIVE_LOCATION_MUTATION = gql`
  mutation UpdateLiveLocation($meetupId: ID!, $position: LivePositionInput!) {
    updateLiveLocation(meetupId: $meetupId, position: $position)
  }
`

export const STOP_LIVE_LOCATION_MUTATION = gql`
  mutation StopLiveLocation($meetupId: ID!) {
    stopLiveLocation(meetupId: $meetupId)
  }
`

// UPDATE (a position) or STOP (end of a sharing, with its reason).
export const LIVE_LOCATION_SUBSCRIPTION = gql`
  subscription LiveLocationChanged($conversationId: String!) {
    liveLocationChanged(conversationId: $conversationId)
  }
`

export type LiveEvent =
  | { kind: 'UPDATE'; meetupId: string; userId: string; lat: number | null; lng: number | null; accuracy: number | null; positionAt: string | null; startedAt: string; expiresAt: string }
  | { kind: 'STOP'; meetupId: string; userId: string; reason: string }
