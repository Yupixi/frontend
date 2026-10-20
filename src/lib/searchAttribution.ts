import { gql } from '@apollo/client'
import { apolloClient } from './apollo'
import { searchKey } from './searchText'

// Whether a search worked: a listing opened from its results (CLICK), then
// a contact on that listing (CONTACT, « Contacter », « Appeler », « Faire
// une offre »). Counted once per search and session, aggregated by the
// server per day and market (no visitor data, like the searches
// themselves): the most successful searches are proposed first while
// typing, and teach « Vouliez-vous dire … ? ».
const RECORD_SEARCH_OUTCOME = gql`
  mutation RecordSearchOutcome($term: String!, $outcome: String!, $countryCode: String) {
    recordSearchOutcome(term: $term, outcome: $outcome, countryCode: $countryCode)
  }
`
const OPENED_KEY = 'dilchap_search_opened'
const DONE_KEY = 'dilchap_search_outcomes'

type Opened = Record<string, { term: string; cc: string | null }>

const read = <T,>(key: string, empty: T): T => {
  try { return JSON.parse(sessionStorage.getItem(key) ?? '') as T } catch { return empty }
}
const write = (key: string, value: unknown) => {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
}

function send(term: string, cc: string | null, outcome: 'CLICK' | 'CONTACT') {
  const key = searchKey(term)
  if (key.length < 2 || key.length > 60) return
  const done = read<string[]>(DONE_KEY, [])
  const tag = `${outcome}|${cc ?? ''}|${key}`
  if (done.includes(tag)) return
  write(DONE_KEY, [...done, tag].slice(-200))
  void apolloClient.mutate({ mutation: RECORD_SEARCH_OUTCOME, variables: { term: term.trim(), outcome, countryCode: cc } }).catch(() => undefined)
}

// A result of the search `term` opened.
export function noteSearchOpen(listingId: string, term: string, countryCode: string | null | undefined) {
  if (!term.trim()) return
  const opened = read<Opened>(OPENED_KEY, {})
  opened[listingId] = { term: term.trim(), cc: countryCode ?? null }
  // The 50 latest only.
  write(OPENED_KEY, Object.fromEntries(Object.entries(opened).slice(-50)))
  send(term, countryCode ?? null, 'CLICK')
}

// A contact on a listing: a success for the search it was opened from.
export function noteSearchContact(listingId: string) {
  const o = read<Opened>(OPENED_KEY, {})[listingId]
  if (o) send(o.term, o.cc, 'CONTACT')
}
