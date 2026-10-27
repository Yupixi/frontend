import { useState } from 'react'
import Icon from './Icon'
import { useLocale, useT, type Locale } from '../i18n'
import common from '../i18n/ns/common'
import { useChooseLocale, useSiteLocales } from '../i18n/LocaleSync'

// Each language under its own name, whatever the page's language.
const NAMES: Record<Locale, string> = { fr: 'Français', en: 'English' } // i18n-ignore

/**
 * Discreet language switcher (footer, account menu, Paramètres). Renders
 * nothing while the visitor's country only offers one language.
 */
export default function LanguagePicker({ variant = 'footer', className = '' }: { variant?: 'footer' | 'menu' | 'settings'; className?: string }) {
  const t = useT(common)
  const locale = useLocale()
  const { enabled } = useSiteLocales()
  const choose = useChooseLocale()
  const [busy, setBusy] = useState<Locale | null>(null)
  if (enabled.length < 2) return null
  const langs = enabled as Locale[]
  const pick = (l: Locale) => {
    if (l === locale || busy) return
    setBusy(l)
    void choose(l).finally(() => setBusy(null))
  }

  if (variant === 'settings') {
    return (
      <div className={className}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('language')}>
          {langs.map(l => (
            <button key={l} type="button" role="radio" aria-checked={l === locale} lang={l} onClick={() => pick(l)}
              className={`cursor-pointer rounded-full border border-solid px-4 py-2 text-label-md ${l === locale ? 'border-primary bg-primary-fixed text-primary' : 'border-outline-variant bg-surface-lowest text-on-surface hover:bg-surface-container-low'}`}>
              {NAMES[l]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${variant === 'menu' ? 'px-4 py-3' : ''} ${className}`}>
      <Icon name="language" size={variant === 'menu' ? 20 : 16} className="shrink-0 text-on-surface-variant" />
      <span className="sr-only">{t('language')}</span>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={t('language')}>
        {langs.map((l, i) => (
          <span key={l} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden className="text-outline">·</span>}
            <button type="button" role="radio" aria-checked={l === locale} lang={l} onClick={() => pick(l)}
              className={`cursor-pointer border-none bg-transparent p-0 ${variant === 'menu' ? 'text-label-md' : 'text-label-sm'} ${l === locale ? 'font-bold text-on-surface' : 'text-on-surface-variant hover:text-primary'}`}>
              {NAMES[l]}
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
