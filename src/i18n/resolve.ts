// Which language to show (pure: tests/i18n.test.cjs). Each candidate counts
// only when the language is enabled for the visitor's country (BO
// « Langues »), in this order:
//   ?lang= in the address ▸ the member's choice (User.locale) ▸ the choice
//   remembered on this device ▸ the browser's language ▸ the country's.
export type LocaleInputs = {
  enabled: readonly string[]
  countryDefault: string
  urlLang?: string | null
  userLocale?: string | null
  stored?: string | null
  browser?: readonly string[]
}

export function resolveLocale(input: LocaleInputs): string {
  const enabled = input.enabled.length ? input.enabled : [input.countryDefault || 'fr']
  const ok = (l: string | null | undefined): l is string => !!l && enabled.includes(l)
  const short = (l: string | null | undefined) => l?.trim().toLowerCase().slice(0, 2) || null
  for (const l of [input.urlLang, input.userLocale, input.stored].map(short)) if (ok(l)) return l
  for (const l of (input.browser ?? []).map(short)) if (ok(l)) return l
  return ok(input.countryDefault) ? input.countryDefault : enabled[0]
}
