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
        hasPassword
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
      hasPassword
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
  // False for an account without a password of its own (SMS code, Google,
  // Facebook): Paramètres offers « Choisir un mot de passe ».
  hasPassword?: boolean | null
}

export type AuthPayload = {
  accessToken: string
  guestSecret?: string | null
  // Google / Facebook: the account was just created.
  isNewAccount?: boolean | null
  user: AuthUser
}

// Why a sign-in was refused (Backend auth-errors): WRONG_PASSWORD,
// UNKNOWN_IDENTIFIER, PHONE_FORMAT, NO_PASSWORD, INACTIVE, NOT_VERIFIED,
// WRONG_CODE, CODE_EXPIRED, LOCKED, ACCOUNT_EXISTS, PROVIDER_ERROR, DISABLED…
export function authReasonOf(error: unknown): string | null {
  const first = (error as { errors?: { extensions?: { originalError?: { reason?: unknown } } }[] } | null)?.errors?.[0]
  const reason = first?.extensions?.originalError?.reason
  if (typeof reason === 'string') return reason
  return /Trop de tentatives/.test((error as Error | null)?.message ?? '') ? 'LOCKED' : null
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
// `emailSignup`: « S'inscrire avec mon e-mail » next to the phone sign-up
// (BO › Règles); `whatsappCodes`: « Recevoir le code par WhatsApp » (BO ›
// SMS & WhatsApp); `codeTtlMinutes`: lifetime of a code.
export type PhoneAuthOptions = { signup: boolean; passwordReset: boolean; smsLogin: boolean; emailSignup: boolean; whatsappCodes: boolean; codeTtlMinutes: number }
export type CodeChannel = 'SMS' | 'WHATSAPP'
// `deliveryRef` follows the delivery (null for a password reset);
// `previousFailed`: the last code to this number was not delivered;
// `unreliable`: SMS arrive badly on this number's network right now.
export type PhoneCodeSent = { expiresAt: string; resendAfterSeconds: number; phoneHint: string; channel: CodeChannel; deliveryRef: string | null; previousFailed: boolean; unreliable: boolean; whatsappAvailable: boolean }
export type CodeDeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'

export const PHONE_AUTH_OPTIONS_QUERY = gql`
  query PhoneAuthOptions($countryCode: String) {
    phoneAuthOptions(countryCode: $countryCode) { signup passwordReset smsLogin emailSignup whatsappCodes codeTtlMinutes }
  }
`

export const REQUEST_SIGNUP_CODE_MUTATION = gql`
  mutation RequestSignupCode($phone: String!, $countryCode: String!, $channel: String) {
    requestSignupCode(phone: $phone, countryCode: $countryCode, channel: $channel) { expiresAt resendAfterSeconds phoneHint channel deliveryRef previousFailed unreliable whatsappAvailable }
  }
`

// Delivery of a code just asked (PhoneCodeSent.deliveryRef).
export const PHONE_CODE_DELIVERY_QUERY = gql`
  query PhoneCodeDelivery($ref: String!) {
    phoneCodeDelivery(ref: $ref) { status channel }
  }
`

export const REQUEST_PASSWORD_RESET_CODE_MUTATION = gql`
  mutation RequestPasswordResetCode($phone: String!, $countryCode: String!, $channel: String) {
    requestPasswordResetCode(phone: $phone, countryCode: $countryCode, channel: $channel) { expiresAt resendAfterSeconds phoneHint channel deliveryRef previousFailed unreliable whatsappAvailable }
  }
`

export const RESET_PASSWORD_WITH_CODE_MUTATION = gql`
  mutation ResetPasswordWithCode($input: ResetPasswordWithCodeInput!) {
    resetPasswordWithCode(input: $input)
  }
`

// « Se connecter par code SMS »: a code to the confirmed number of an
// account, then the code typed.
export const REQUEST_LOGIN_CODE_MUTATION = gql`
  mutation RequestLoginCode($phone: String!, $countryCode: String!, $channel: String) {
    requestLoginCode(phone: $phone, countryCode: $countryCode, channel: $channel) { expiresAt resendAfterSeconds phoneHint channel deliveryRef previousFailed unreliable whatsappAvailable }
  }
`

export const LOGIN_WITH_CODE_MUTATION = gql`
  mutation LoginWithCode($input: LoginWithCodeInput!) {
    loginWithCode(input: $input) { accessToken user { id email fullName countryCode hasPassword } }
  }
`

// A first password (an account created with an SMS code, Google or Facebook).
export const SET_PASSWORD_MUTATION = gql`
  mutation SetPassword($input: SetPasswordInput!) { setPassword(input: $input) }
`

// « Continuer avec Google / Facebook » (Backend auth/social).
export type SocialLoginConfig = {
  google: { enabled: boolean; clientId: string | null }
  facebook: { enabled: boolean; appId: string | null }
}
export const SOCIAL_LOGIN_CONFIG_QUERY = gql`
  query SocialLoginConfig($country: String) { socialLoginConfig(country: $country) }
`
export const GOOGLE_LOGIN_MUTATION = gql`
  mutation GoogleLogin($input: GoogleLoginInput!) {
    googleLogin(input: $input) { accessToken isNewAccount user { id email fullName countryCode hasPassword } }
  }
`
export const FACEBOOK_LOGIN_MUTATION = gql`
  mutation FacebookLogin($input: FacebookLoginInput!) {
    facebookLogin(input: $input) { accessToken isNewAccount user { id email fullName countryCode hasPassword } }
  }
`

// Paramètres › Connexion.
export type LoginMethods = {
  hasPassword: boolean
  smsLogin: boolean
  identities: { provider: 'GOOGLE' | 'FACEBOOK'; email: string | null; linkedAt: string }[]
}
export const MY_LOGIN_METHODS_QUERY = gql`
  query MyLoginMethods { myLoginMethods }
`
export const LINK_GOOGLE_MUTATION = gql`
  mutation LinkGoogle($input: GoogleLoginInput!) { linkGoogle(input: $input) }
`
export const LINK_FACEBOOK_MUTATION = gql`
  mutation LinkFacebook($input: FacebookLoginInput!) { linkFacebook(input: $input) }
`
export const UNLINK_IDENTITY_MUTATION = gql`
  mutation UnlinkIdentity($provider: String!) { unlinkIdentity(provider: $provider) }
`
