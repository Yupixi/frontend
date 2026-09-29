import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { RESEND_VERIFICATION_MUTATION } from '../graphql/auth'
import { VerifyEmailBanner } from './AppBanners'

const KEY = 'dilchap_verify_email_later'

// "Plus tard" lasts for this visit (the tab): the prompt comes back on the
// next one until the address is confirmed.
export const verifyPromptDismissed = () => {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

export default function EmailVerifyPrompt({ email, onDismiss }: { email: string; onDismiss: () => void }) {
  const [resend, { loading, data, error }] = useMutation<{ resendVerificationEmail: boolean }>(RESEND_VERIFICATION_MUTATION)
  const [sent, setSent] = useState(false)
  return (
    <VerifyEmailBanner
      email={email}
      sending={loading}
      sent={sent || !!data?.resendVerificationEmail}
      error={error?.message}
      onResend={() => void resend().then(() => setSent(true)).catch(() => undefined)}
      onDismiss={() => {
        try { sessionStorage.setItem(KEY, '1') } catch { /* private mode */ }
        onDismiss()
      }}
    />
  )
}
