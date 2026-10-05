import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { RESEND_VERIFICATION_MUTATION } from '../graphql/auth'
import { VerifyAccountBanner, VerifyEmailBanner } from './AppBanners'
import { formatIntl } from '../lib/dialing'
import { requestAccountVerification } from '../lib/accountVerify'

const KEY = 'dilchap_verify_email_later'
const SMS_AVAILABLE = gql`query PhoneVerificationAvailable { phoneVerificationAvailable }`

// "Plus tard" lasts for this visit (the tab): the prompt comes back on the
// next one until the account is confirmed.
export const verifyPromptDismissed = () => {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

// An account confirmed by neither its e-mail nor its phone. SMS first: with
// a number and SMS available, a code by SMS; else the confirmation e-mail
// again.
export default function EmailVerifyPrompt({ email, phone, onDismiss }: { email: string | null; phone: string | null; onDismiss: () => void }) {
  const { data } = useQuery<{ phoneVerificationAvailable: boolean }>(SMS_AVAILABLE)
  const [resend, { loading, data: resent, error }] = useMutation<{ resendVerificationEmail: boolean }>(RESEND_VERIFICATION_MUTATION)
  const [sent, setSent] = useState(false)
  const dismiss = () => {
    try { sessionStorage.setItem(KEY, '1') } catch { /* private mode */ }
    onDismiss()
  }
  if (phone && data?.phoneVerificationAvailable)
    return <VerifyAccountBanner phone={formatIntl(phone)} onSms={() => requestAccountVerification()} onDismiss={dismiss} />
  if (!email || !data) return null
  return (
    <VerifyEmailBanner
      email={email}
      sending={loading}
      sent={sent || !!resent?.resendVerificationEmail}
      error={error?.message}
      onResend={() => void resend().then(() => setSent(true)).catch(() => undefined)}
      onDismiss={dismiss}
    />
  )
}
