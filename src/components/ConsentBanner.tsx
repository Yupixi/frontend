import { useEffect, type MouseEvent } from 'react'
import { useQuery } from '@apollo/client/react'
import { ANALYTICS_CONFIG_QUERY } from '../graphql/content'
import { acceptAnalytics, refuseAnalytics, setAnalyticsConfig, useAnalyticsState, type AnalyticsConfig } from '../lib/analytics'
import { countryVars, useMarketCode } from '../lib/countries'

// Both choices look the same: refusing is as easy as accepting.
const choiceBtn = 'min-h-11 flex-1 cursor-pointer whitespace-nowrap rounded-xl border border-solid border-outline-variant bg-surface-lowest px-5 py-2.5 text-label-md text-on-surface hover:bg-surface-container-low sm:flex-none'

/** The consent banner is on screen (other bottom banners wait). */
export function useConsentOpen() {
  const { config, choice, reopened } = useAnalyticsState()
  return !!config?.enabled && !!config.measurementId && (choice === null || reopened)
}

// Consent banner of the « Mesure d'audience » (BO): shown while the
// visitor's country has it on and the visitor hasn't chosen (or chose more
// than the BO's duration ago, or opened « Gérer les cookies »). Not a wall:
// the page stays usable, and nothing goes to Google without « Accepter ».
export default function ConsentBanner({ onOpenLegal }: { onOpenLegal: (slug: string) => void }) {
  const market = useMarketCode()
  const { data } = useQuery<{ analyticsConfig: AnalyticsConfig }>(ANALYTICS_CONFIG_QUERY, { variables: countryVars(market), fetchPolicy: 'cache-first' })
  const config = data?.analyticsConfig
  useEffect(() => { if (config) setAnalyticsConfig(config) }, [config])
  const open = useConsentOpen()
  const { config: c } = useAnalyticsState()
  if (!open || !c) return null
  const b = c.banner
  const legal = /^\/legal\/([\w-]+)$/.exec(c.policyPath)?.[1]
  const openPolicy = (e: MouseEvent) => {
    if (!legal || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    onOpenLegal(legal)
  }
  return (
    <section role="region" aria-label={b.title} className="tour-hide fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-[9998] mx-auto max-w-2xl lg:bottom-4">
      <div className="rounded-2xl border border-solid border-outline-variant bg-surface-lowest p-3.5 shadow-float sm:flex sm:items-end sm:gap-4 sm:p-4">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-label-lg text-on-surface">{b.title}</h2>
          <p className="m-0 mt-1 text-body-sm text-on-surface-variant">
            {b.text}{' '}
            <a href={c.policyPath} onClick={openPolicy} className="font-semibold text-on-surface underline underline-offset-2">{b.policyLabel}</a>
          </p>
        </div>
        <div className="mt-2.5 flex gap-2 sm:mt-0 sm:shrink-0">
          <button type="button" onClick={refuseAnalytics} className={choiceBtn}>{b.refuse}</button>
          <button type="button" onClick={acceptAnalytics} className={choiceBtn}>{b.accept}</button>
        </div>
      </div>
    </section>
  )
}
