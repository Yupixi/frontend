// The icon font is a subset of the ligatures quoted in src/ (see
// scripts/materialSymbolsSubset.ts). Category icons come from the database
// (BO-editable, any Material Symbols name), so the ones outside that subset
// are fetched here on demand, batched into one extra font file.

declare const __ICON_NAMES__: string[]
declare const __ICON_FONT_AXES__: string

const bundled = new Set(__ICON_NAMES__)
const requested = new Set<string>()
let pending: string[] = []
// Names that are no Material Symbol (« pommade » typed in the Backoffice):
// the font would draw their letters; CategoryIcon shows a default instead.
const missing = new Set<string>()
const listeners = new Set<() => void>()
export const isMissingIcon = (name: string) => missing.has(name)
export function onMissingIcons(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function isBundledIcon(name: string) {
  return bundled.has(name)
}

// Each extra icon gets its own family name pointing at the shared batch file,
// so a later batch can't shadow an earlier one. `.ms-x` spans stay hidden
// until their face is declared (no raw ligature text flashing).
export function extraIconFamily(name: string) {
  return `ms-x-${name}`
}

export function ensureIcon(name: string) {
  if (bundled.has(name) || requested.has(name)) return
  requested.add(name)
  pending.push(name)
  if (pending.length === 1) queueMicrotask(flush)
}

async function flush() {
  const names = pending.sort()
  pending = []
  const url = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:${__ICON_FONT_AXES__}&icon_names=${names.join(',')}&display=block`
  let src: string | undefined
  try {
    const css = await (await fetch(url)).text()
    src = css.match(/src:\s*(url\([^)]+\)\s*format\([^)]+\))/)?.[1]
  } catch {
    // offline: the spans simply stay hidden
  }
  if (!src) return
  const style = document.createElement('style')
  style.textContent = names
    .map(n => `@font-face{font-family:'${extraIconFamily(n)}';font-display:block;font-weight:400 600;src:${src}}`)
    .join('\n')
  document.head.appendChild(style)
  // A ligature draws one square glyph; a name the font does not know draws
  // its letters, far wider: those stay hidden and get the default icon.
  const ctx = document.createElement('canvas').getContext('2d')
  const shown: string[] = []
  for (const n of names) {
    let known = true
    try {
      await document.fonts.load(`24px '${extraIconFamily(n)}'`, n)
      if (ctx) {
        ctx.font = `24px '${extraIconFamily(n)}'`
        known = ctx.measureText(n).width <= 36
      }
    } catch { /* kept: shown as before */ }
    if (known) shown.push(n)
    else missing.add(n)
  }
  const visible = document.createElement('style')
  visible.textContent = shown.map(n => `.ms-x[data-ms="${n}"]{visibility:visible}`).join('\n')
  document.head.appendChild(visible)
  if (shown.length < names.length) listeners.forEach(fn => fn())
}
