import { gql } from '@apollo/client'
import { apolloClient } from './apollo'

// The search reads words like the server (Backend listings/search-text.ts):
// lower-case, without accents, the little words of a sentence left out,
// a final s / x dropped. Used here to highlight matches, compare recent
// searches and categories, and count a search once per session.

export function fold(text: string | null | undefined): string {
  return (text ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/g, 'o')
    .replace(/['’`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP = new Set(('a au aux avec c ca ce ces cet cette chez d dans de des du elle elles en est et il ils j je l la le les leur leurs m ma me mes moi mon n ne nos notre nous on ou par pas pour qu que qui quoi s sa sans se ses son sont sur suis t ta te tes toi ton tu un une vos votre vous y '
  + 'veux voudrais voudrai aimerais souhaite souhaiterais cherche recherche besoin acheter achete trouver trouve avoir svp stp bonjour bonsoir salut merci please want need buy the for of and').split(' '))

const stem = (w: string) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w)

export function searchTokens(query: string | null | undefined): string[] {
  const words = fold(query).split(/[^a-z0-9+]+/).filter(Boolean)
  const kept = words.filter(w => !STOP.has(w))
  return [...new Set((kept.length ? kept : words).filter(w => w.length > 1 || /\d/.test(w)).map(stem))].slice(0, 8)
}

// Whether every word of the query is in `text` (accents, plural ignored).
export function matchesAll(text: string, query: string): boolean {
  const t = fold(text)
  const tokens = searchTokens(query)
  return tokens.length > 0 && tokens.every(w => t.includes(w))
}

// `text` cut into plain and matched parts, for <b> highlighting.
export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  const tokens = searchTokens(query).filter(t => t.length > 1)
  if (!tokens.length) return [{ text, hit: false }]
  // fold() keeps one character per character for Latin letters (œ/æ
  // aside): map positions on a simple accent-stripped copy.
  const simple = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (simple.length !== text.length) return [{ text, hit: false }]
  const marks = new Array<boolean>(text.length).fill(false)
  for (const t of tokens) {
    let i = simple.indexOf(t)
    while (i >= 0) { for (let k = i; k < i + t.length; k++) marks[k] = true; i = simple.indexOf(t, i + t.length) }
  }
  const out: { text: string; hit: boolean }[] = []
  for (let i = 0; i < text.length; i++) {
    const last = out[out.length - 1]
    if (last && last.hit === marks[i]) last.text += text[i]
    else out.push({ text: text[i], hit: marks[i] })
  }
  return out
}

export const searchKey = (term: string) => fold(term).replace(/[^a-z0-9+ ]+/g, ' ').replace(/\s+/g, ' ').trim()

const RECORD_SEARCH = gql`
  mutation RecordSearch($term: String!, $countryCode: String) { recordSearch(term: $term, countryCode: $countryCode) }
`
const SESSION_KEY = 'dilchap_searches_counted'

// A real search (Enter, « Voir les résultats », a recent or popular term,
// the results page once settled): counted once per term and session for
// « Recherches populaires ». Typing is never counted.
export function recordFinalSearch(term: string, countryCode: string | null | undefined) {
  const key = searchKey(term)
  if (key.length < 2 || key.length > 60) return
  let done: string[] = []
  try { done = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]') as string[] } catch { /* private mode */ }
  const tag = `${countryCode ?? ''}|${key}`
  if (done.includes(tag)) return
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify([...done, tag].slice(-100))) } catch { /* private mode */ }
  void apolloClient.mutate({ mutation: RECORD_SEARCH, variables: { term: term.trim(), countryCode: countryCode ?? null } }).catch(() => undefined)
}
