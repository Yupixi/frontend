import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
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
// Names drawn as Iconsax SVG instead (see src/components/Icon.tsx) don't
// need the font at all.
const ICONSAX_MAP_FILE = path.resolve(__dirname, 'iconsax-map.txt')

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
  const iconsax = new Set(fs.readFileSync(ICONSAX_MAP_FILE, 'utf-8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split(/\s+/)[0]))
  const used = new Set<string>(CATEGORY_ICONS)
  const literal = /['"`]([a-z0-9][a-z0-9_]*)['"`]/g
  for (const file of walk(srcDir)) {
    const code = fs.readFileSync(file, 'utf-8')
    for (const m of code.matchAll(literal)) if (known.has(m[1])) used.add(m[1])
  }
  return [...used].filter(n => !iconsax.has(n)).sort()
}

export function iconFontCssUrl(names: string[]): string {
  return `https://fonts.googleapis.com/css2?family=${ICON_FONT_FAMILY}:${ICON_FONT_AXES}&icon_names=${names.join(',')}&display=block`
}

const TEXT_FONT_URL = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
// Unicode subsets of the text font the storefront ships (French: latin;
// latin-ext only downloads for a page that has such a character).
const TEXT_SUBSETS = ['latin', 'latin-ext'] as const
// A local font reshaped to Plus Jakarta Sans' metrics (measured: average
// advance of regular + semibold French text vs Arial, hhea ascent and
// descent): the page doesn't move when the real font swaps in.
const TEXT_FALLBACK_FACE = "@font-face{font-family:'Jakarta Fallback';src:local('Arial'),local('ArialMT'),local('Roboto'),local('Helvetica');size-adjust:103%;ascent-override:100.8%;descent-override:21.6%;line-gap-override:0%}"

// Full font committed in public/ — used only when the subset can't be
// fetched at build time (offline build).
const FULL_FONT_HREF = '/fonts/material-symbols-outlined.woff2'
const DEV_SUBSET_HREF = '/fonts/material-symbols-subset.woff2'

// Google only returns woff2 to a browser user agent.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

type TextFont = { subset: (typeof TEXT_SUBSETS)[number]; range: string; buf: Buffer; href: string }

// The text font's latin files (one variable font per subset, every weight),
// from the same Google CSS the storefront used to link.
async function fetchTextFont(): Promise<TextFont[] | null> {
  try {
    const css = await (await fetch(TEXT_FONT_URL, { headers: { 'user-agent': BROWSER_UA } })).text()
    const out: TextFont[] = []
    for (const subset of TEXT_SUBSETS) {
      const block = css.split(`/* ${subset} */`)[1]?.split('}')[0] ?? ''
      const url = block.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/)?.[1]
      const range = block.match(/unicode-range:\s*([^;]+);/)?.[1]
      if (!url || !range) return null
      const res = await fetch(url, { headers: { 'user-agent': BROWSER_UA } })
      if (!res.ok) return null
      const buf = Buffer.from(await res.arrayBuffer())
      const hash = createHash('sha256').update(buf).digest('hex').slice(0, 8)
      out.push({ subset, range, buf, href: `/fonts/jakarta-${subset}-${hash}.woff2` })
    }
    return out
  } catch {
    return null
  }
}

async function fetchSubsetFont(names: string[]): Promise<Buffer | null> {
  try {
    const css = await (await fetch(iconFontCssUrl(names), { headers: { 'user-agent': BROWSER_UA } })).text()
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/)?.[1]
    if (!url) return null
    const res = await fetch(url, { headers: { 'user-agent': BROWSER_UA } })
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null
  } catch {
    return null
  }
}

// The icon subset is downloaded once at build (dev: at server start) and
// served from our own origin — no third-party request on the critical path,
// ~65 KB instead of the 2.4 MB full font. Offline builds fall back to the
// committed full font.
// The text font (Plus Jakarta Sans, latin + latin-ext) is self-hosted the
// same way in builds: no render-blocking stylesheet from fonts.googleapis.com
// and no second origin before the first paint on a phone (~1.3 s on slow
// 4G). Its latin file is preloaded, it swaps in (font-display: swap) over a
// metric-matched local fallback. Dev servers and offline builds keep the
// Google Fonts link.
export function fontLinks(srcDir: string): Plugin {
  let font: Promise<Buffer | null> | null = null
  let builtHref: string | null = null
  let text: Promise<TextFont[] | null> | null = null
  const load = () => (font ??= fetchSubsetFont(collectIconNames(srcDir)))
  const loadText = () => (text ??= fetchTextFont())
  const googleTextFont: HtmlTagDescriptor[] = [
    { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'stylesheet', href: TEXT_FONT_URL }, injectTo: 'head' },
    { tag: 'style', children: TEXT_FALLBACK_FACE, injectTo: 'head-prepend' },
  ]
  const selfHostedTextFont = (files: TextFont[]): HtmlTagDescriptor[] => [
    { tag: 'link', attrs: { rel: 'preload', href: files[0].href, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head-prepend' },
    {
      tag: 'style',
      children: files.map(f => `@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:400 800;font-display:swap;src:url('${f.href}') format('woff2');unicode-range:${f.range}}`).join('') + TEXT_FALLBACK_FACE,
      injectTo: 'head-prepend',
    },
  ]

  const fontTags = (href: string, subset: boolean): HtmlTagDescriptor[] => [
    { tag: 'link', attrs: { rel: 'preload', href, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head-prepend' },
    {
      tag: 'style',
      children: `@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:${subset ? '400 600' : '300 700'};font-display:block;src:url('${href}') format('woff2')}`,
      injectTo: 'head-prepend',
    },
  ]

  return {
    name: 'yupixi-font-links',
    configureServer(server) {
      void load()
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== DEV_SUBSET_HREF) return next()
        const buf = await load()
        if (!buf) return next()
        res.setHeader('Content-Type', 'font/woff2')
        res.end(buf)
      })
    },
    async buildStart() {
      if (this.meta.watchMode) return
      const buf = await load()
      if (!buf) {
        this.warn('Material Symbols subset unavailable (offline?) — shipping the full icon font')
        return
      }
      const hash = createHash('sha256').update(buf).digest('hex').slice(0, 8)
      builtHref = `/fonts/material-symbols-${hash}.woff2`
    },
    async generateBundle() {
      const buf = await load()
      if (buf && builtHref) this.emitFile({ type: 'asset', fileName: builtHref.slice(1), source: buf })
      const files = await loadText()
      if (!files) this.warn('Plus Jakarta Sans unavailable (offline?) — linking it from Google Fonts')
      for (const f of files ?? []) this.emitFile({ type: 'asset', fileName: f.href.slice(1), source: f.buf })
    },
    // 'post': after Vite's own HTML asset processing, which would otherwise
    // try (and fail) to resolve the not-yet-emitted font URL.
    transformIndexHtml: {
      order: 'post',
      async handler(_html, ctx) {
        const dev = !!ctx.server
        const subsetHref = dev ? ((await load()) ? DEV_SUBSET_HREF : null) : builtHref
        const textFiles = dev ? null : await loadText()
        return [
          ...fontTags(subsetHref ?? FULL_FONT_HREF, !!subsetHref),
          ...(textFiles ? selfHostedTextFont(textFiles) : googleTextFont),
        ]
      },
    },
  }
}
