import type { ReactNode } from 'react'
import { reopenConsent, useAnalyticsState } from '../lib/analytics'

/**
 * « Gérer les cookies »: shows the consent banner again (lib/analytics).
 * Rendered only while the « Mesure d'audience » of the visitor's country is
 * on. Places reachable on a phone (no footer there): the account menu, the
 * help centre and the sign-in screen (where visitors land from « Compte »).
 */
export default function ManageCookies({ className, icon, onDone }: { className: string; icon?: ReactNode; onDone?: () => void }) {
  const { config } = useAnalyticsState()
  if (!config?.enabled || !config.measurementId) return null
  return (
    <button type="button" onClick={() => { onDone?.(); reopenConsent() }} className={className}>
      {icon}{config.banner.manage}
    </button>
  )
}
