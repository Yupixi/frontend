import { CombinedGraphQLErrors } from '@apollo/client/errors'

// « Compte confirmé » (Backend EmailLinksService.assertVerified): publishing,
// contacting a new seller and paying need an account confirmed by its
// number (SMS code) or its e-mail. The API answers EMAIL_NOT_VERIFIED; the
// app then offers « Recevoir un code par SMS » right there and tries the
// action again once the code is typed (SMS first: confirmation e-mails land
// in spam or never arrive).

export const NOT_VERIFIED = 'EMAIL_NOT_VERIFIED'

export function isNotVerifiedError(e: unknown): boolean {
  if (CombinedGraphQLErrors.is(e)) return e.errors.some(x => x.extensions?.code === NOT_VERIFIED)
  const errors = (e as { graphQLErrors?: { extensions?: { code?: unknown } }[] } | null)?.graphQLErrors
  return Array.isArray(errors) && errors.some(x => x.extensions?.code === NOT_VERIFIED)
}

// The account was just confirmed (code, link): App reloads the member so
// banners and cards update everywhere.
export const ACCOUNT_VERIFIED_EVENT = 'dilchap:account-verified'
export const announceAccountVerified = () => window.dispatchEvent(new CustomEvent(ACCOUNT_VERIFIED_EVENT))

// Opens the app-wide « Confirmez votre compte » sheet (AccountVerifySheet);
// `retry` runs once the account is confirmed.
export const VERIFY_REQUEST_EVENT = 'dilchap:verify-request'
export type VerifyRequest = { retry?: () => void }
export const requestAccountVerification = (retry?: () => void) =>
  window.dispatchEvent(new CustomEvent<VerifyRequest>(VERIFY_REQUEST_EVENT, { detail: { retry } }))
