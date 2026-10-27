#!/usr/bin/env node
// i18n checks (pnpm i18n:check), run by CI:
//   1. keys   — every namespace has the same keys in fr and en (plural
//               forms aside: « _zero » is optional, English and French
//               each need their « _one » / « _other »), the same
//               {{placeholders}} and <tags>, and no empty string.
//   2. hard-coded text — French left in the code: JSX text, visible
//               attributes (placeholder, aria-label, title, alt, label…)
//               and string literals that read as French. A line can opt out
//               with « i18n-ignore » in a comment on it or on the line above
//               (technical strings, member content samples, brand names).
//
// Usage: node scripts/i18n-check.mjs [--keys] [--text] [--list] [file…]
//   no flag = both; --list prints every hard-coded string found; files
//   restrict the text scan (default: all of src/).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = path.join(root, 'src/i18n/locales')
const args = process.argv.slice(2)
const flags = new Set(args.filter(a => a.startsWith('--')))
const files = args.filter(a => !a.startsWith('--'))
const doKeys = flags.has('--keys') || !flags.has('--text')
const doText = flags.has('--text') || !flags.has('--keys')

let failed = false
const fail = (msg) => { failed = true; console.error(msg) }

// ── 1. key parity ──────────────────────────────────────────────────────
export function compareLocales(fr, en, ns = '') {
  const problems = []
  const base = (k) => k.replace(/_(zero|one|other)$/, '')
  const placeholders = (s) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).sort().join(',')
  const tags = (s) => [...s.matchAll(/<(\w+)\s*\/?>/g)].map(m => m[1]).sort().join(',')
  for (const [a, b, la, lb] of [[fr, en, 'fr', 'en'], [en, fr, 'en', 'fr']]) {
    for (const k of Object.keys(a)) {
      if (typeof a[k] !== 'string') { problems.push(`${ns}${k}: ${la} value is not a string`); continue }
      if (!a[k].trim()) problems.push(`${ns}${k}: empty in ${la}`)
      if (k.endsWith('_zero')) continue
      const plural = /_(one|other)$/.test(k)
      const present = plural ? (k in b || `${base(k)}_other` in b || base(k) in b) : (k in b || `${k}_other` in b)
      if (!present) problems.push(`${ns}${k}: in ${la}, missing in ${lb}`)
    }
  }
  // Same placeholders / tags for each key (all plural forms of a base pooled).
  const pool = (d) => {
    const m = new Map()
    for (const [k, v] of Object.entries(d)) {
      if (typeof v !== 'string') continue
      const b = base(k)
      const e = m.get(b) ?? { ph: new Set(), tg: new Set() }
      placeholders(v).split(',').filter(Boolean).forEach(x => e.ph.add(x))
      tags(v).split(',').filter(Boolean).forEach(x => e.tg.add(x))
      m.set(b, e)
    }
    return m
  }
  const pf = pool(fr), pe = pool(en)
  for (const [k, e] of pf) {
    const o = pe.get(k)
    if (!o) continue
    const ph = (s) => [...s].filter(x => x !== 'count').sort().join(',')
    if (ph(e.ph) !== ph(o.ph)) problems.push(`${ns}${k}: placeholders differ (fr: ${[...e.ph]} / en: ${[...o.ph]})`)
    if ([...e.tg].sort().join() !== [...o.tg].sort().join()) problems.push(`${ns}${k}: tags differ (fr: ${[...e.tg]} / en: ${[...o.tg]})`)
  }
  return problems
}

function checkKeys() {
  const list = (lang) => fs.readdirSync(path.join(localesDir, lang)).filter(f => f.endsWith('.json')).sort()
  const fr = list('fr'), en = list('en')
  for (const f of fr) if (!en.includes(f)) fail(`[keys] ${f}: no English file`)
  for (const f of en) if (!fr.includes(f)) fail(`[keys] ${f}: no French file`)
  let count = 0
  for (const f of fr.filter(x => en.includes(x))) {
    const a = JSON.parse(fs.readFileSync(path.join(localesDir, 'fr', f), 'utf8'))
    const b = JSON.parse(fs.readFileSync(path.join(localesDir, 'en', f), 'utf8'))
    count += Object.keys(a).length
    for (const p of compareLocales(a, b, `${f.replace(/\.json$/, '')}:`)) fail(`[keys] ${p}`)
  }
  // Every namespace used in code is declared once, with a matching file.
  const nsDir = path.join(root, 'src/i18n/ns')
  if (fs.existsSync(nsDir)) {
    for (const f of fs.readdirSync(nsDir)) {
      const src = fs.readFileSync(path.join(nsDir, f), 'utf8')
      const m = src.match(/defineNamespace\('([\w-]+)'/)
      const imp = src.match(/locales\/fr\/([\w-]+)\.json/)
      if (m && imp && m[1] !== imp[1]) fail(`[keys] src/i18n/ns/${f}: namespace '${m[1]}' reads ${imp[1]}.json`)
    }
  }
  if (!failed) console.log(`[keys] ${fr.length} namespaces, ${count} French strings, all present in English.`)
}

// ── 2. hard-coded French ───────────────────────────────────────────────
const VISIBLE_ATTRS = new Set(['placeholder', 'aria-label', 'title', 'alt', 'label', 'aria-description', 'aria-valuetext', 'aria-placeholder', 'aria-roledescription', 'emptyLabel', 'fallback', 'subtitle', 'description', 'text', 'hint', 'confirmLabel', 'cancelLabel', 'heading', 'message'])
const SKIP_ATTRS = new Set(['className', 'class', 'key', 'id', 'name', 'type', 'href', 'src', 'role', 'data-tour', 'rel', 'target', 'autoComplete', 'inputMode', 'lang', 'dir', 'viewBox', 'd', 'fill', 'stroke', 'transform', 'enterKeyHint', 'accept', 'capture', 'pattern', 'method', 'htmlFor', 'form', 'loading', 'decoding', 'fetchPriority', 'referrerPolicy', 'crossOrigin', 'sizes', 'srcSet', 'preload', 'mode', 'variant', 'size', 'tone', 'icon', 'name'])
// Words that make a literal French text (accents aside).
const FRENCH_WORDS = /\b(le|la|les|des|du|une?|et|vous|votre|vos|pour|avec|sur|pas|dans|est|sont|aucune?|mon|ma|mes|ton|ta|tes|cette|ces|ce|qui|que|ou|au|aux|en|par|plus|déjà|ici|voir|annonces?|vendeur|acheteur|compte|prix|crédits?|erreur|impossible|réessayez|connexion|envoyer|enregistrer|annuler|fermer|retour|suivant|modifier|supprimer|ajouter|rechercher|boutique|réglages|paramètres|merci|bienvenue|bonjour)\b/i
const ACCENTS = /[àâäçéèêëîïôöùûüÿœæÀÂÇÉÈÊËÎÏÔÖÙÛÜŸŒ«»’]/
const IGNORE = /i18n-ignore/
// Literals that are never copy: CSS classes, ids, URLs, paths, keys…
const looksTechnical = (s) =>
  /^[a-z0-9_\-.:/#?&=%@+*]+$/i.test(s) || // single token: ids, slugs, urls
  /^(https?:|mailto:|tel:|\/|\.\/|data:)/.test(s) ||
  /^[a-z-]+(:[a-z-]+)?(\s+[a-z0-9:\-[\]/.%#()!_]+)*$/.test(s) && /-/.test(s) && !ACCENTS.test(s) // tailwind class lists
const readsFrench = (s) => {
  const t = s.trim()
  if (t.length < 2 || !/[a-zA-ZÀ-ÿ]{2}/.test(t)) return false
  if (looksTechnical(t)) return false
  return ACCENTS.test(t) || (FRENCH_WORDS.test(t) && /\s/.test(t))
}

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8')
  // A data file of proper nouns (cities, districts…): « i18n-ignore-file ».
  if (/i18n-ignore-file/.test(text.slice(0, 2000))) return []
  const lines = text.split('\n')
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const found = []
  const ignored = (node) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line
    return IGNORE.test(lines[line] ?? '') || IGNORE.test(lines[line - 1] ?? '')
  }
  const report = (node, value) => {
    if (ignored(node)) return
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf))
    found.push({ file: path.relative(root, file).replace(/\\/g, '/'), line: line + 1, text: value.replace(/\s+/g, ' ').trim().slice(0, 90) })
  }
  const attrName = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isJsxAttribute(p)) return p.name.getText(sf)
      if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isBlock(p)) return null
    }
    return null
  }
  const skipped = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true
      if (ts.isTaggedTemplateExpression(p) && /gql|graphql|css/.test(p.tag.getText(sf))) return true
      if (ts.isCallExpression(p)) {
        const callee = p.expression.getText(sf)
        // Diagnostics and keys: never shown as copy.
        if (/^console\.|^(t|\w+\.t|t\.rich|\w+\.t\.rich|track\w*|trackEvent|logEvent|new Error|Error|querySelector\w*|getElementById|addEventListener|removeEventListener|setAttribute|getItem|setItem|removeItem|matchMedia|require|import)$/.test(callee)) return true
      }
      if (ts.isNewExpression(p) && /Error$/.test(p.expression.getText(sf))) return true
      if (ts.isJsxAttribute(p) && SKIP_ATTRS.has(p.name.getText(sf))) return true
      if (ts.isPropertyAssignment(p) && /^(className|id|key|icon|tourId|page|event|target|type|slug|variant|kind|tone|code|value|name)$/.test(p.name.getText(sf))) return true
      if (p === node.parent && (ts.isCaseClause(p) || ts.isBinaryExpression(p) && /^[=!]==?$/.test(p.operatorToken.getText(sf)))) return true
    }
    return false
  }
  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const v = node.getText(sf)
      if (/[a-zA-ZÀ-ÿ]{2}/.test(v) && v.trim()) report(node, v)
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!skipped(node)) {
        const attr = attrName(node)
        if (attr && VISIBLE_ATTRS.has(attr) && /[a-zA-ZÀ-ÿ]{2}/.test(node.text) && !looksTechnical(node.text)) report(node, node.text)
        else if (readsFrench(node.text)) report(node, node.text)
      }
    } else if (ts.isTemplateExpression(node)) {
      if (!skipped(node)) {
        const parts = [node.head.text, ...node.templateSpans.map(s => s.literal.text)].join(' … ')
        if (readsFrench(parts)) report(node, parts)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'i18n') out.push(...walk(p)) }
    else if (/\.(tsx?|mts)$/.test(e.name) && !/\.d\.ts$|iconsaxGlyphs\.ts$|\.test\.|\.stories\./.test(e.name)) out.push(p)
  }
  return out
}

function checkText() {
  const targets = files.length ? files.map(f => path.resolve(root, f)) : walk(path.join(root, 'src'))
  const found = targets.flatMap(scanFile)
  if (flags.has('--list')) for (const f of found) console.log(`${f.file}:${f.line}: ${f.text}`)
  const byFile = new Map()
  for (const f of found) byFile.set(f.file, (byFile.get(f.file) ?? 0) + 1)
  if (found.length) {
    if (!flags.has('--list')) {
      for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) console.error(`  ${String(n).padStart(4)}  ${f}`)
      for (const f of found.slice(0, 40)) console.error(`${f.file}:${f.line}: ${f.text}`)
      if (found.length > 40) console.error(`… (${found.length - 40} more, --list for all)`)
    }
    fail(`[text] ${found.length} hard-coded French string(s) in ${byFile.size} file(s): move them to src/i18n/locales (or mark a technical string « i18n-ignore »).`)
  } else console.log(`[text] no hard-coded French in ${targets.length} files.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (doKeys) checkKeys()
  if (doText) checkText()
  process.exit(failed ? 1 : 0)
}
