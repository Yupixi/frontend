import { gql } from '@apollo/client'

// SMS / WhatsApp alerts (Backend src/modules/channels): offered once the team
// has set them up; they only reach a number the member verified with a code.
export const PHONE_CHANNEL_QUERY = gql`
  query PhoneChannel {
    smsAlertsAvailable
    me { id phone phoneVerifiedAt }
  }
`
// 6-digit code by SMS to the member's current number (5 minutes).
export const REQUEST_PHONE_CODE_MUTATION = gql`
  mutation RequestPhoneVerification { requestPhoneVerification }
`
export const VERIFY_PHONE_MUTATION = gql`
  mutation VerifyPhone($code: String!) { verifyPhone(code: $code) }
`
export type PhoneChannelData = {
  smsAlertsAvailable: boolean
  me: { id: string; phone: string | null; phoneVerifiedAt: string | null }
}
