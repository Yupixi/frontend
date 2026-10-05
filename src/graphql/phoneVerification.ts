import { gql } from '@apollo/client'

// SMS / WhatsApp alerts (Backend src/modules/channels): offered once the team
// has set them up; they only reach a number the member verified with a code.
// `phoneVerificationAvailable`: SMS can be sent at all — a member whose
// account isn't confirmed can confirm it with a code (independent of the
// alerts).
export const PHONE_CHANNEL_QUERY = gql`
  query PhoneChannel {
    smsAlertsAvailable
    phoneVerificationAvailable
    me { id phone phoneVerifiedAt email emailVerifiedAt isGuest }
  }
`
// 6-digit code by SMS to the member's current number (5 minutes).
export const REQUEST_PHONE_CODE_MUTATION = gql`
  mutation RequestPhoneVerification { requestPhoneVerification }
`
export const VERIFY_PHONE_MUTATION = gql`
  mutation VerifyPhone($code: String!) { verifyPhone(code: $code) }
`
// The one-click link sent by SMS (dilchap.com/v/<code>).
export const CONFIRM_ACCOUNT_LINK_MUTATION = gql`
  mutation ConfirmAccountLink($code: String!) { confirmAccountLink(code: $code) }
`
export type PhoneChannelData = {
  smsAlertsAvailable: boolean
  phoneVerificationAvailable: boolean
  me: { id: string; phone: string | null; phoneVerifiedAt: string | null; email: string | null; emailVerifiedAt: string | null; isGuest?: boolean }
}
