import type { BadgeTier } from './badges'
import { gql } from '@apollo/client'

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      user {
        id
        email
        fullName
        countryCode
      }
    }
  }
`

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        email
        fullName
        countryCode
      }
    }
  }
`

// Lets a visitor message a seller without registering first — creates (or
// reuses) a lightweight account behind the scenes so the rest of the app's
// messaging stays unchanged. See Backend AuthService.guestLogin.
export const GUEST_LOGIN_MUTATION = gql`
  mutation GuestLogin($input: GuestLoginInput!) {
    guestLogin(input: $input) {
      accessToken
      guestSecret
      user {
        id
        email
        fullName
        isGuest
        countryCode
      }
    }
  }
`

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      fullName
      phone
      city
      countryCode
      avatarUrl
      notificationPreferences
      isGuest
      emailVerifiedAt
      phoneVerifiedAt
      isVerified badge
      bio
      coverUrl
      handle
      boostCredits
    }
  }
`

// Revokes the session behind the refresh cookie (or a pre-cookie token).
export const LOGOUT_MUTATION = gql`
  mutation Logout($refreshToken: String) {
    logout(refreshToken: $refreshToken)
  }
`

export type AuthUser = {
  id: string
  // Null for an account without e-mail (signed up with its phone only).
  email: string | null
  fullName: string
  phone?: string | null
  city?: string | null
  // UEMOA country of the account (CI, SN…).
  countryCode?: string | null
  avatarUrl?: string | null
  notificationPreferences?: Record<string, unknown>
  isGuest?: boolean
  // Null until the member opens the link e-mailed at sign-up.
  emailVerifiedAt?: string | null
  // Set once the number was proven by an SMS code (sign-up or Paramètres).
  phoneVerifiedAt?: string | null
  isVerified?: boolean; badge?: BadgeTier | null
  boostCredits?: number
  bio?: string | null
  coverUrl?: string | null
  // Short public address dilchap.com/@handle.
  handle?: string | null
  handleChangedAt?: string | null
}

export type AuthPayload = {
  accessToken: string
  guestSecret?: string | null
  user: AuthUser
}

// E-mailed links (Backend MailModule): address confirmation and password
// reset. requestPasswordReset answers true whether or not the address
// belongs to a member.
export const VERIFY_EMAIL_MUTATION = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`

export const RESEND_VERIFICATION_MUTATION = gql`
  mutation ResendVerificationEmail {
    resendVerificationEmail
  }
`

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`

// « Ne plus recevoir ces e-mails » (signed link of activity e-mails).
export const UNSUBSCRIBE_EMAILS_MUTATION = gql`
  mutation UnsubscribeEmails($t: String!) {
    unsubscribeEmails(token: $t)
  }
`

// « Inscription par téléphone » and « Mot de passe oublié » by SMS (Backend
// PhoneAuthService): what the country offers, then a 6-digit code by SMS.
// requestPasswordResetCode answers the same whether or not the number has
// an account.
export type PhoneAuthOptions = { signup: boolean; passwordReset: boolean }
export type PhoneCodeSent = { expiresAt: string; resendAfterSeconds: number; phoneHint: string }

export const PHONE_AUTH_OPTIONS_QUERY = gql`
  query PhoneAuthOptions($countryCode: String) {
    phoneAuthOptions(countryCode: $countryCode) { signup passwordReset }
  }
`

export const REQUEST_SIGNUP_CODE_MUTATION = gql`
  mutation RequestSignupCode($phone: String!, $countryCode: String!) {
    requestSignupCode(phone: $phone, countryCode: $countryCode) { expiresAt resendAfterSeconds phoneHint }
  }
`

export const REQUEST_PASSWORD_RESET_CODE_MUTATION = gql`
  mutation RequestPasswordResetCode($phone: String!, $countryCode: String!) {
    requestPasswordResetCode(phone: $phone, countryCode: $countryCode) { expiresAt resendAfterSeconds phoneHint }
  }
`

export const RESET_PASSWORD_WITH_CODE_MUTATION = gql`
  mutation ResetPasswordWithCode($input: ResetPasswordWithCodeInput!) {
    resetPasswordWithCode(input: $input)
  }
`
