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
      avatarUrl
      notificationPreferences
      isGuest
      emailVerifiedAt
      isVerified badge
      bio
      coverUrl
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
  email: string
  fullName: string
  phone?: string | null
  city?: string | null
  avatarUrl?: string | null
  notificationPreferences?: Record<string, unknown>
  isGuest?: boolean
  // Null until the member opens the link e-mailed at sign-up.
  emailVerifiedAt?: string | null
  isVerified?: boolean; badge?: BadgeTier | null
  boostCredits?: number
  bio?: string | null
  coverUrl?: string | null
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
