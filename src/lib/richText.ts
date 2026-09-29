import DOMPurify from 'dompurify'
import { markdownToHtml } from './markdown'

// Rich text written with the editor (RichTextEditor): listing and shop
// descriptions, shop news; category and campaign descriptions and the
// legal pages from the back-office. The server keeps a clean allow-list of
// HTML; older values are plain text or, for legal pages, Markdown.

export const looksHtml = (s: string) => /<\/?[a-z][^>]*>/i.test(s)

const ALLOWED_TAGS = ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr']
const ALLOWED_ATTR = ['href', 'target', 'rel', 'style']

// Safe HTML to display, whatever the stored format.
export function richHtml(value: string | null | undefined) {
  const s = value ?? ''
  return DOMPurify.sanitize(toHtml(s), { ALLOWED_TAGS, ALLOWED_ATTR })
}

// What the editor loads: older plain text keeps its paragraphs and lines.
export const toHtml = (value: string | null | undefined) => {
  const s = value ?? ''
  return looksHtml(s) ? s : markdownToHtml(s)
}
