import { useEffect, useState, type MouseEvent } from 'react'
import { useQuery } from '@apollo/client/react'
import { ANALYTICS_CONFIG_QUERY } from '../graphql/content'
import {
  TOOL_NAMES, acceptAnalytics, bannerTexts, closeConsentWindow, needsConsent, purposeGranted, purposesOf, refuseAnalytics, reopenConsent,
  saveConsent, setAnalyticsConfig, useAnalyticsState, type AnalyticsConfig, type Purpose,
} from '../lib/analytics'
import { countryVars, useMarketCode } from '../lib/countries'
import BottomSheet from './BottomSheet'

// Both choices look the same: refusing is as easy as accepting.
const choiceBtn = 'min-h-10 cursor-pointer whitespace-nowrap rounded-xl border border-solid border-outline-variant bg-surface-lowest px-4 py-2 text-label-md text-on-surface hover:bg-surface-container-low'
// The consent window's buttons share the width on a phone.
const windowBtn = `${choiceBtn} min-h-11 flex-1 px-5 sm:flex-none`
const linkBtn = 'cursor-pointer border-none bg-transparent p-0 text-label-md text-primary underline underline-offset-2'

/** The consent banner or window is on screen (other bottom banners wait). */
export function useConsentOpen() {
  const { config, pending, managing } = useAnalyticsState()
  return needsConsent(config) && (pending || managing)
}

// Consent banner of the « Mesure d'audience » (BO): shown while the
// visitor's country has something on that the visitor hasn't answered
// about (lib/analytics isPending: asked once). Compact: one short text with
// the link to the policy, and the buttons — a thin strip at the bottom of
// a computer screen, a small block above the bottom bar on a phone (never
// over it nor over the page's own bottom buttons). Not a wall: the page
// stays usable, and nothing goes to Google, Microsoft or Meta before an
// answer. Two modes (BO):
// - « choice »: « Refuser » and « Accepter », alike (refusing is as easy as
//   accepting), and « Personnaliser » (the consent window);
// - « ok »: « OK » (accepts what is on for the country) and a discreet
//   « Paramétrer » (the consent window, to refuse or choose).
// The tools are named by the policy and the window, not here.
export default function ConsentBanner({ onOpenLegal }: { onOpenLegal: (slug: string) => void }) {
  const market = useMarketCode()
  const { data } = useQuery<{ analyticsConfig: AnalyticsConfig }>(ANALYTICS_CONFIG_QUERY, { variables: countryVars(market), fetchPolicy: 'cache-first' })
  const config = data?.analyticsConfig
  useEffect(() => { if (config) setAnalyticsConfig(config) }, [config])
  const { config: c, pending, managing } = useAnalyticsState()
  if (!needsConsent(c)) return null
  if (managing) return <ConsentWindow config={c} onOpenLegal={onOpenLegal} />
  if (!pending) return null
  const b = c.banner
  const t = bannerTexts(b)
  const okMode = c.bannerMode === 'ok'
  const legal = /^\/legal\/([\w-]+)$/.exec(c.policyPath)?.[1]
  const openPolicy = (e: MouseEvent) => {
    if (!legal || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    onOpenLegal(legal)
  }
  // An older long text (before the compact banner) is folded.
  const long = b.text.length > 160
  return (
    <section
      role="region" aria-label={b.title || 'Cookies'}
      className="tour-hide fixed inset-x-2 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-[9998] mx-auto max-w-2xl lg:inset-x-0 lg:bottom-0 lg:max-w-none"
    >
      <div className={`flex gap-x-4 gap-y-2 rounded-xl border border-solid border-outline-variant bg-surface-lowest px-3 py-2.5 shadow-float sm:items-center sm:px-4 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:px-[max(1.5rem,calc((100%-1280px)/2+1.5rem))] lg:py-2 lg:shadow-[0_-2px_12px_rgba(0,0,0,0.06)] ${okMode ? 'items-center' : 'flex-col sm:flex-row'}`}>
        <p className="m-0 min-w-0 flex-1 text-body-sm text-on-surface-variant">
          <span className={long ? 'line-clamp-2 lg:line-clamp-1' : ''}>{b.text}</span>{' '}
          <a href={c.policyPath} onClick={openPolicy} className="whitespace-nowrap font-semibold text-on-surface underline underline-offset-2">{b.policyLabel}</a>
          {okMode && <>{' · '}<button type="button" onClick={reopenConsent} className={linkBtn}>{t.settings}</button></>}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {okMode ? (
            <button type="button" onClick={() => acceptAnalytics('ok')} className={`${choiceBtn} min-w-16`}>{t.ok}</button>
          ) : (
            <>
              <button type="button" onClick={reopenConsent} className={`${linkBtn} mr-auto whitespace-nowrap sm:mr-1`}>{t.customize}</button>
              <button type="button" onClick={() => refuseAnalytics('choice')} className={choiceBtn}>{b.refuse}</button>
              <button type="button" onClick={() => acceptAnalytics('choice')} className={choiceBtn}>{b.accept}</button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// « Gérer les cookies »: one switch per purpose on for the country, off
// until the visitor turns it on (never pre-ticked); « Refuser » and
// « Accepter » stay one tap away.
function ConsentWindow({ config, onOpenLegal }: { config: AnalyticsConfig; onOpenLegal: (slug: string) => void }) {
  const b = config.banner
  const legal = /^\/legal\/([\w-]+)$/.exec(config.policyPath)?.[1]
  const openPolicy = (e: MouseEvent) => {
    if (!legal || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    closeConsentWindow()
    onOpenLegal(legal)
  }
  const t = bannerTexts(b)
  const purposes = purposesOf(config)
  const [on, setOn] = useState<Record<Purpose, boolean>>(() => ({ analytics: purposeGranted('analytics'), ads: purposeGranted('ads') }))
  const label: Record<Purpose, [string, string]> = { analytics: [t.analyticsLabel, t.analyticsText], ads: [t.adsLabel, t.adsText] }
  return (
    <BottomSheet
      open
      onClose={closeConsentWindow}
      title={b.manage}
      maxWidth="560px"
      footer={(
        <div className="flex flex-col gap-2 border-t border-solid border-outline-variant px-4 pb-4 pt-3 sm:flex-row-reverse">
          <button type="button" onClick={() => saveConsent(on)} className={`${windowBtn} w-full sm:w-auto`}>{t.save}</button>
          <div className="flex gap-2 sm:mr-auto">
            <button type="button" onClick={() => refuseAnalytics('window')} className={windowBtn}>{b.refuse}</button>
            <button type="button" onClick={() => acceptAnalytics('window')} className={windowBtn}>{b.accept}</button>
          </div>
        </div>
      )}
    >
      <p className="m-0 text-body-sm text-on-surface-variant">
        Choisissez ce que vous acceptez. Ni votre nom, ni votre e-mail, ni votre téléphone ne sont transmis.{' '}
        <a href={config.policyPath} onClick={openPolicy} className="font-semibold text-on-surface underline underline-offset-2">{b.policyLabel}</a>
      </p>
      <ul className="m-0 mt-3 list-none space-y-2 p-0">
        {purposes.map(({ purpose, tools }) => {
          const [title, text] = label[purpose]
          const id = `consent-${purpose}`
          return (
            <li key={purpose} className="flex items-start gap-3 rounded-2xl border border-solid border-outline-variant bg-surface-lowest p-3.5">
              <div className="min-w-0 flex-1">
                <p id={id} className="m-0 text-label-lg text-on-surface">{title}</p>
                <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">{text}</p>
                <p className="m-0 mt-1 text-label-sm text-on-surface-variant">{tools.map((x) => TOOL_NAMES[x]).join(', ')}</p>
              </div>
              <button
                type="button" role="switch" aria-checked={on[purpose]} aria-labelledby={id}
                onClick={() => setOn((v) => ({ ...v, [purpose]: !v[purpose] }))}
                className={`relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full border-none p-0 transition-colors ${on[purpose] ? 'bg-tertiary' : 'bg-surface-container-high'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on[purpose] ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </li>
          )
        })}
      </ul>
    </BottomSheet>
  )
}
