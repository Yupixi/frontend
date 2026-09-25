// The icon font is a subset of the ligatures quoted in src/ (see
// scripts/materialSymbolsSubset.ts). Category icons come from the database
// (BO-editable, any Material Symbols name), so the ones outside that subset
// are fetched here on demand, batched into one extra font file.

declare const __ICON_NAMES__: string[]
declare const __ICON_FONT_AXES__: string

const bundled = new Set(__ICON_NAMES__)
const requested = new Set<string>()
let pending: string[] = []

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
    .map(n => `@font-face{font-family:'${extraIconFamily(n)}';font-display:block;font-weight:400 600;src:${src}}.ms-x[data-ms="${n}"]{visibility:visible}`)
    .join('\n')
  document.head.appendChild(style)
}
