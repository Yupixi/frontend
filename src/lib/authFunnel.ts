import { track, type FunnelEvent } from './analytics'
import { clarityEvent } from './clarity'

// Steps of the sign-in / sign-up funnel, for Google Analytics 4 (after
// consent: lib/analytics) and Microsoft Clarity smart events (a name only).
// Method (password, sms, google, facebook, email, phone), country and the
// reason of a failure — never who.
export function funnel(step: FunnelEvent | 'login' | 'sign_up', params: { method?: string; country?: string; reason?: string | null } = {}) {
  track(step, { method: params.method, country: params.country, reason: params.reason ?? undefined })
  clarityEvent(params.method ? `${step}_${params.method}` : step)
}
