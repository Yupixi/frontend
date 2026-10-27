import { applyLocale, getLocale, isLocale, type Locale } from './core'
import { resolveLocale } from './resolve'

// Language of the storefront: detection at boot, remembered choice and the
// languages enabled per country (query siteLocales, BO « Langues »). While a
// country only has French (the default), nothing changes: no switcher, no
// hreflang, no English chunk.

export type SiteLocales = { default: string; enabled: string[] }
export const FRENCH_ONLY: SiteLocales = { default: 'fr', enabled: ['fr'] }

// Local test of a multilingual country before the API offers it:
// VITE_SITE_LOCALES=fr,en in .env.local.
export const FORCED = (import.meta.env.VITE_SITE_LOCALES as string | undefined)?.split(',').map(s => s.trim()).filter(isLocale)

const CHOICE_KEY = 'yupixi_locale'
const SITE_LOCALES_KEY = 'yupixi_site_locales'

const read = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const write = (key: string, value: string | null) => {
  try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value) } catch { /* private mode */ }
}

export const urlLang = (): string | null => {
  try { return new URLSearchParams(window.location.search).get('lang') } catch { return null }
}
export const storedChoice = () => read(CHOICE_KEY)
export const rememberChoice = (locale: string | null) => write(CHOICE_KEY, locale)

/** Last siteLocales answer per country (the next visit starts in the right language). */
export function cachedSiteLocales(country: string | null | undefined): SiteLocales | null {
  try {
    const all = JSON.parse(read(SITE_LOCALES_KEY) ?? '{}') as Record<string, SiteLocales>
    const v = all[country ?? '*'] ?? all['*']
    return v && Array.isArray(v.enabled) ? v : null
  } catch { return null }
}
export function cacheSiteLocales(country: string | null | undefined, value: SiteLocales) {
  try {
    const all = JSON.parse(read(SITE_LOCALES_KEY) ?? '{}') as Record<string, SiteLocales>
    all[country ?? '*'] = { default: value.default, enabled: value.enabled }
    write(SITE_LOCALES_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

const browserLanguages = () => (typeof navigator !== 'undefined' ? [...(navigator.languages ?? []), navigator.language].filter(Boolean) : [])

export function detectLocale(site: SiteLocales, userLocale?: string | null): Locale {
  const l = resolveLocale({
    enabled: site.enabled,
    countryDefault: site.default,
    urlLang: urlLang(),
    userLocale,
    stored: storedChoice(),
    browser: browserLanguages(),
  })
  return isLocale(l) ? l : 'fr'
}

/**
 * Language of the first render (before any query): from the address, the
 * remembered choice and the last siteLocales answer. English is loaded
 * before the app renders, French renders at once.
 */
export function bootLocale(country: string | null | undefined): Promise<void> {
  const site = FORCED?.length ? { default: 'fr', enabled: FORCED } : cachedSiteLocales(country)
  // ?lang=en on a first visit (search engine result): shown in English
  // right away; siteLocales then confirms it (or falls back to French).
  const fromUrl = urlLang()
  const locale = site ? detectLocale(site) : isLocale(fromUrl) ? fromUrl : 'fr'
  document.documentElement.lang = locale
  if (fromUrl && isLocale(fromUrl)) rememberChoice(fromUrl)
  return locale === 'fr' ? Promise.resolve() : applyLocale(locale).catch(() => undefined)
}

type Switcher = (locale: Locale) => Promise<void>
let switcher: Switcher = applyLocale
/** App wires the switch to its Apollo cache (translated content refetched). */
export const setLocaleSwitcher = (fn: Switcher) => { switcher = fn }
export const switchLocale = (locale: Locale) => (locale === getLocale() ? Promise.resolve() : switcher(locale))
