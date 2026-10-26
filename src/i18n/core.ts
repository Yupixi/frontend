import { createElement, Fragment, useSyncExternalStore, type ReactNode } from 'react'

// Dilchap's own small i18n layer (no runtime library: the storefront's entry
// chunk stays as it was). French is the reference: each namespace's French
// strings are imported by the code that uses them (they ship in that code's
// chunk, lazy pages included); English is one lazy chunk holding every
// namespace, loaded before anything renders in English (lib/i18n/locale).
//
// Strings are flat JSON per domain (src/i18n/locales/<lang>/<ns>.json):
//   « {{name}} »        interpolation (numbers are grouped for the locale)
//   « key_one/_other »  plurals, chosen by `count` (« key_zero » if count is 0)
//   « <b>…</b> »        rich text, rendered by t.rich with a function per tag

export type Locale = 'fr' | 'en'
export const LOCALES: readonly Locale[] = ['fr', 'en']
export const DEFAULT_LOCALE: Locale = 'fr'
export const isLocale = (v: unknown): v is Locale => v === 'fr' || v === 'en'

type Dict = Record<string, string>
type PluralSuffix = 'zero' | 'one' | 'other'
type BaseKey<K extends string> = K extends `${infer B}_${PluralSuffix}` ? B : K
export type Vars = Record<string, string | number | null | undefined>
export type RichVars = Record<string, string | number | ReactNode | ((chunks: ReactNode) => ReactNode)>

export interface TFunction<K extends string> {
  (key: BaseKey<K>, vars?: Vars): string
  /** Same, with `<tag>…</tag>` mapped to elements and ReactNode values. */
  rich: (key: BaseKey<K>, vars?: RichVars) => ReactNode
}

// ── Locale state ─────────────────────────────────────────────────────────
let current: Locale = DEFAULT_LOCALE
let english: Record<string, Dict> | null = null
const listeners = new Set<() => void>()

export const getLocale = () => current
export const subscribeLocale = (fn: () => void) => {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
/** The current language, re-rendering on change. */
export const useLocale = () => useSyncExternalStore(subscribeLocale, getLocale, getLocale)

let englishLoad: Promise<void> | null = null
/** Loads the English strings (one lazy chunk); resolves at once when done. */
export function loadEnglish(): Promise<void> {
  if (english) return Promise.resolve()
  englishLoad ??= import('./locales/en/index').then((m) => { english = m.default }).catch((e) => { englishLoad = null; throw e })
  return englishLoad
}

/** Switches the language; English is loaded first (French stays meanwhile). */
export async function applyLocale(locale: Locale): Promise<void> {
  if (locale === 'en') await loadEnglish()
  if (locale === current) return
  current = locale
  document.documentElement.lang = locale
  listeners.forEach((fn) => fn())
}

// ── Formatting of interpolated numbers ───────────────────────────────────
// Integers are grouped by hand (no ICU load on first render, see
// lib/intl): « 12 500 » in French (U+00A0, the font has no U+202F),
// « 12,500 » in English.
export function groupNumber(n: number, locale: Locale = current): string {
  if (!Number.isFinite(n)) return String(n)
  const [int, dec] = String(Math.abs(n)).split('.')
  const sep = locale === 'fr' ? ' ' : ','
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
  const decimals = dec ? (locale === 'fr' ? ',' : '.') + dec : ''
  return (n < 0 ? '-' : '') + grouped + decimals
}

// French: 0 and 1 are singular; English: only 1.
const pluralOf = (n: number, locale: Locale): PluralSuffix =>
  (locale === 'fr' ? Math.abs(n) < 2 : Math.abs(n) === 1) ? 'one' : 'other'

function pick(dict: Dict | undefined, key: string, count: unknown, locale: Locale): string | undefined {
  if (!dict) return undefined
  if (typeof count === 'number') {
    if (count === 0 && dict[`${key}_zero`] != null) return dict[`${key}_zero`]
    const p = dict[`${key}_${pluralOf(count, locale)}`]
    if (p != null) return p
  }
  return dict[key]
}

function lookup(ns: string, fr: Dict, key: string, count: unknown): string {
  if (current !== 'fr') {
    const s = pick(english?.[ns], key, count, current)
    if (s != null) return s
  }
  const s = pick(fr, key, count, 'fr')
  if (s != null) return s
  if (import.meta.env.DEV) console.warn(`[i18n] missing key ${ns}:${key}`)
  return key
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g
const show = (v: unknown) => (v == null ? '' : typeof v === 'number' ? groupNumber(v) : String(v))

function interpolate(s: string, vars?: Vars): string {
  if (!vars || !s.includes('{{')) return s
  return s.replace(PLACEHOLDER, (m, name: string) => (name in vars ? show(vars[name]) : m))
}

// « Vous avez <b>{{n}}</b> crédits, <link>voir</link> » → nodes. Tags don't
// nest (none of our strings need it); an unknown tag renders its content.
const TOKEN = /<(\w+)>([\s\S]*?)<\/\1>|<(\w+)\s*\/>|\{\{\s*(\w+)\s*\}\}/g
function richNodes(s: string, vars: RichVars = {}): ReactNode {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of s.matchAll(TOKEN)) {
    if (m.index! > last) out.push(s.slice(last, m.index))
    last = m.index! + m[0].length
    const [, tag, inner, selfTag, name] = m
    const key = `i${i++}`
    if (tag) {
      const fn = vars[tag]
      const content = richNodes(inner, vars)
      out.push(typeof fn === 'function' ? createElement(Fragment, { key }, (fn as (c: ReactNode) => ReactNode)(content)) : createElement(Fragment, { key }, content))
    } else if (selfTag) {
      const fn = vars[selfTag]
      out.push(createElement(Fragment, { key }, typeof fn === 'function' ? (fn as (c: ReactNode) => ReactNode)(null) : null))
    } else {
      const v = vars[name]
      out.push(createElement(Fragment, { key }, typeof v === 'number' ? groupNumber(v) : (v as ReactNode) ?? ''))
    }
  }
  if (last < s.length) out.push(s.slice(last))
  return out.length === 1 && typeof out[0] === 'string' ? out[0] : createElement(Fragment, null, ...out)
}

// ── Namespaces ───────────────────────────────────────────────────────────
export interface Namespace<K extends string> {
  name: string
  t: TFunction<K>
}

/** Declares a domain's strings: `export default defineNamespace('auth', fr)`. */
export function defineNamespace<D extends Dict>(name: string, fr: D): Namespace<Extract<keyof D, string>> {
  const t = Object.assign(
    (key: string, vars?: Vars) => interpolate(lookup(name, fr, key, vars?.count), vars),
    { rich: (key: string, vars?: RichVars) => richNodes(lookup(name, fr, key, vars?.count), vars) },
  ) as unknown as TFunction<Extract<keyof D, string>>
  return { name, t }
}

/** A namespace's `t`, re-rendering the component when the language changes. */
export function useT<K extends string>(ns: Namespace<K>): TFunction<K> {
  useLocale()
  return ns.t
}
