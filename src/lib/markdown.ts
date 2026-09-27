import DOMPurify from 'dompurify'

// Minimal Markdown → HTML for the BO-edited legal pages (headings, bold,
// italic, links, bullet lists, paragraphs). Kept identical to the Backoffice
// preview (Backoffice src/lib/markdown.ts).
//
// Defence in depth: the source is fully escaped first (quotes included),
// link targets must be http(s) URLs or same-site paths, and the result
// goes through DOMPurify with a tag/attribute allow-list.

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const UNESCAPES: Record<string, string> = Object.fromEntries(Object.entries(ESCAPES).map(([k, v]) => [v, k]))

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c])
const unescapeHtml = (s: string) => s.replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => UNESCAPES[e])

// `href` value (already HTML-escaped) for a link target, or null when the
// target isn't an absolute http(s) URL or a same-site path (`/…` but not
// `//…` / `/\…`, which browsers read as another host).
export function safeHref(escaped: string): string | null {
  const raw = unescapeHtml(escaped)
  // Quotes and angle brackets have no business in a link target.
  if (/["'<>`]/.test(raw)) return null
  if (/^\/(?![/\\])/.test(raw)) return escapeHtml(raw)
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? escapeHtml(url.href) : null
  } catch {
    return null
  }
}

const emphasis = (s: string) => s
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.+?)\*/g, '<em>$1</em>')

// Links are cut out first so bold/italic markers can't rewrite a URL.
function inline(s: string) {
  const links: string[] = []
  const text = s.replace(/\[(.+?)\]\(([^\s)]+)\)/g, (_, label: string, target: string) => {
    const href = safeHref(target)
    links.push(href ? `<a href="${href}" target="_blank" rel="noreferrer">${emphasis(label)}</a>` : emphasis(label))
    return `\u0000${links.length - 1}\u0000`
  })
  return emphasis(text).replace(/\u0000(\d+)\u0000/g, (_, i: string) => links[Number(i)])
}

const ALLOWED_TAGS = ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'li', 'a']
const ALLOWED_ATTR = ['href', 'target', 'rel']

export function markdownToHtml(md: string) {
  const esc = escapeHtml(md.replace(/\r|\u0000/g, ''))
  const out: string[] = []
  let para: string[] = []
  let list: string[] = []
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join('<br/>'))}</p>`)
    if (list.length) out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`)
    para = []
    list = []
  }
  for (const line of esc.split('\n')) {
    const t = line.trim()
    const h = /^(#{1,3})\s+(.*)$/.exec(t)
    if (!t) flush()
    else if (h) { flush(); out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`) }
    else if (/^[-*]\s/.test(t)) { if (para.length) flush(); list.push(t.replace(/^[-*]\s/, '')) }
    else { if (list.length) flush(); para.push(t) }
  }
  flush()
  return out.join('')
}

export function renderMarkdown(md: string) {
  return DOMPurify.sanitize(markdownToHtml(md), { ALLOWED_TAGS, ALLOWED_ATTR })
}
