// Minimal Markdown → HTML for the BO-edited legal pages (headings, bold,
// italic, links, bullet lists, paragraphs). The source is escaped first, so
// no raw HTML from the content can reach the page.
export function renderMarkdown(md: string) {
  const esc = md.replace(/\r/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (s: string) => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
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
