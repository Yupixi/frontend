// Intl formatters are expensive to build (ICU data lookup): one per price on
// a card grid measurably slowed page renders on phones. `toLocaleString(…,
// options)` builds a fresh one on every call too. These are built once per
// locale + options and reused.
const numberFormats = new Map<string, Intl.NumberFormat>()
const dateFormats = new Map<string, Intl.DateTimeFormat>()

export function numberFormat(locale: string, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = locale + JSON.stringify(options)
  let f = numberFormats.get(key)
  if (!f) numberFormats.set(key, (f = new Intl.NumberFormat(locale, options)))
  return f
}

export function dateFormat(locale: string, options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(options)
  let f = dateFormats.get(key)
  if (!f) dateFormats.set(key, (f = new Intl.DateTimeFormat(locale, options)))
  return f
}
