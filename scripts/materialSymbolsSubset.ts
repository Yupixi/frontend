import fs from 'node:fs'
import path from 'node:path'
import type { HtmlTagDescriptor, Plugin } from 'vite'

// The full Material Symbols variable font is ~2.4 MB and renders with
// `font-display: block` (icons stay invisible until it lands). Google Fonts
// can serve a subset limited to the ligatures we actually use
// (`icon_names=`), plus only the axis values the app sets (opsz 24,
// wght 400/600, FILL 0/1) — a few dozen KB instead.
//
// Every quoted snake_case literal in src/ that is a real Material Symbols
// name goes in: over-inclusion costs a few bytes, a miss shows the raw
// ligature text. Category icons are admin-editable and can be anything, so
// the app loads those on demand (see src/lib/iconFont.ts) and they must use
// the same axes as ICON_FONT_AXES.

export const ICON_FONT_FAMILY = 'Material+Symbols+Outlined'
export const ICON_FONT_AXES = 'opsz,wght,FILL,GRAD@24,400..600,0..1,0'

const NAMES_FILE = path.resolve(__dirname, 'material-symbols-names.txt')

// Icons of the seeded categories (Backend prisma/seed-data/categories.ts):
// they're on every page (nav, category tiles), so they ship in the subset
// rather than as an on-demand extra request.
const CATEGORY_ICONS = [
  'agriculture', 'apartment', 'category', 'chair', 'checkroom', 'child_care', 'construction',
  'directions_car', 'handyman', 'pets', 'smartphone', 'sports_soccer', 'work',
]

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full)
  }
  return out
}

export function collectIconNames(srcDir: string): string[] {
  const known = new Set(fs.readFileSync(NAMES_FILE, 'utf-8').split(/\r?\n/).filter(Boolean))
  const used = new Set<string>(CATEGORY_ICONS)
  const literal = /['"`]([a-z0-9][a-z0-9_]*)['"`]/g
  for (const file of walk(srcDir)) {
    const code = fs.readFileSync(file, 'utf-8')
    for (const m of code.matchAll(literal)) if (known.has(m[1])) used.add(m[1])
  }
  return [...used].sort()
}

export function iconFontCssUrl(names: string[]): string {
  return `https://fonts.googleapis.com/css2?family=${ICON_FONT_FAMILY}:${ICON_FONT_AXES}&icon_names=${names.join(',')}&display=block`
}

const TEXT_FONT_URL = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'

// Font stylesheets as <link>s in the document head (they used to be CSS
// @imports, which the browser only discovers after downloading the app CSS),
// with early connections to both Google Fonts origins.
export function fontLinks(srcDir: string): Plugin {
  return {
    name: 'yupixi-font-links',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        const tags: HtmlTagDescriptor[] = [
          { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' }, injectTo: 'head' },
          { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }, injectTo: 'head' },
          { tag: 'link', attrs: { rel: 'stylesheet', href: iconFontCssUrl(collectIconNames(srcDir)) }, injectTo: 'head' },
          { tag: 'link', attrs: { rel: 'stylesheet', href: TEXT_FONT_URL }, injectTo: 'head' },
        ]
        return tags
      },
    },
  }
}
