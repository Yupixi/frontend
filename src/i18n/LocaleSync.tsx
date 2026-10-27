import { useEffect } from 'react'
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react'
import { SELLER_BADGE_NAMES_QUERY, setSellerBadgeNames } from '../graphql/badges'
import { countryVars, useMarketCode } from '../lib/countries'
import { getAccessToken } from '../lib/auth'
import { MY_LOCALE_QUERY, SITE_LOCALES_QUERY, UPDATE_MY_LOCALE_MUTATION } from '../graphql/locale'
import { getLocale, isLocale, useLocale, type Locale } from './core'
import { cacheSiteLocales, cachedSiteLocales, detectLocale, FORCED, FRENCH_ONLY, rememberChoice, switchLocale, urlLang, type SiteLocales } from './locale'


/** Languages offered in the visitor's country (last known answer while loading). */
export function useSiteLocales(): SiteLocales {
  const market = useMarketCode()
  const { data, previousData, error } = useQuery<{ siteLocales: SiteLocales }>(SITE_LOCALES_QUERY, {
    variables: countryVars(market),
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  })
  const live = (data ?? previousData)?.siteLocales
  const site = live ?? (error ? FRENCH_ONLY : cachedSiteLocales(market) ?? FRENCH_ONLY)
  if (FORCED?.length) return { default: FORCED.includes(site.default as Locale) ? site.default : FORCED[0], enabled: FORCED }
  return { default: site.default, enabled: site.enabled.filter(isLocale) }
}

const LANG_PARAM = 'lang'
const ALTERNATE = 'link[rel="alternate"][hreflang]'

/** The current address in a given language (hreflang, language links). */
export function urlInLocale(locale: string | null): string {
  const url = new URL(window.location.href)
  url.hash = ''
  if (locale) url.searchParams.set(LANG_PARAM, locale)
  else url.searchParams.delete(LANG_PARAM)
  return url.toString()
}

/** Keeps `?lang=` on an address the app writes when the visitor came with one. */
export function withLangParam(path: string): string {
  const lang = urlLang()
  if (!lang) return path
  const url = new URL(path, window.location.origin)
  url.searchParams.set(LANG_PARAM, lang)
  return url.pathname + url.search
}

/**
 * <link rel="alternate" hreflang> for the page shown (fr = the address
 * without ?lang, en = ?lang=en, x-default = French), only while the country
 * offers several languages. Called after each address change.
 */
export function updateAlternates(enabled: readonly string[] = currentEnabled) {
  currentEnabled = enabled
  const head = document.head
  head.querySelectorAll(ALTERNATE).forEach(el => el.remove())
  if (enabled.length < 2) return
  const add = (hreflang: string, href: string) => {
    const link = document.createElement('link')
    link.rel = 'alternate'
    link.hreflang = hreflang
    link.href = href
    head.appendChild(link)
  }
  for (const l of enabled) add(l, urlInLocale(l === 'fr' ? null : l))
  add('x-default', urlInLocale(null))
  const og = head.querySelector<HTMLMetaElement>('meta[property="og:locale"]')
  if (og) og.content = getLocale() === 'en' ? 'en_GB' : 'fr_FR'
}
let currentEnabled: readonly string[] = ['fr']

/**
 * Applies the detected language once the country's languages (and the
 * member's own choice) are known, and keeps <html lang> / hreflang right.
 */
export function useLocaleSync(signedIn: boolean) {
  const site = useSiteLocales()
  const market = useMarketCode()
  const locale = useLocale()
  const token = signedIn && !!getAccessToken()
  // The paid badges' names in this language (set in the Backoffice).
  const [loadBadgeNames] = useLazyQuery<{ sellerBadgeNames: Record<string, string> }>(SELLER_BADGE_NAMES_QUERY, { fetchPolicy: 'network-only' })
  useEffect(() => {
    void loadBadgeNames().then(r => { if (r.data?.sellerBadgeNames) setSellerBadgeNames(locale, r.data.sellerBadgeNames) }).catch(() => undefined)
  }, [locale, loadBadgeNames])
  const { data: me } = useQuery<{ me: { id: string; locale: string | null } | null }>(MY_LOCALE_QUERY, {
    skip: !token,
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  })
  const userLocale = token ? me?.me?.locale ?? null : null
  const enabledKey = site.enabled.join(',')

  useEffect(() => {
    if (!FORCED?.length) cacheSiteLocales(market, site)
    // The member's own choice is remembered on this device too.
    if (userLocale && isLocale(userLocale)) rememberChoice(userLocale)
    const want = detectLocale(site, userLocale)
    if (want !== getLocale()) void switchLocale(want).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, enabledKey, site.default, userLocale])

  useEffect(() => {
    document.documentElement.lang = locale
    updateAlternates(site.enabled)
  }, [locale, enabledKey])
}

/** Saves the visitor's choice (device + account) and switches. */
export function useChooseLocale() {
  const [save] = useMutation(UPDATE_MY_LOCALE_MUTATION, { errorPolicy: 'all' })
  return async (locale: Locale) => {
    rememberChoice(locale)
    // The address no longer forces a language.
    if (urlLang()) window.history.replaceState(window.history.state, '', urlInLocale(null).replace(window.location.origin, ''))
    if (getAccessToken()) await save({ variables: { locale } }).catch(() => undefined)
    await switchLocale(locale)
  }
}
