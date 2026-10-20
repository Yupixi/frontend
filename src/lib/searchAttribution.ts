import { gql } from '@apollo/client'
import { apolloClient } from './apollo'
import { searchKey } from './searchText'

// Whether a list worked: a listing opened from it (CLICK), then a contact
// on that listing (CONTACT, « Contacter », « Appeler », « Faire une
// offre »). Counted once per search (or listing) and session, aggregated by
// the server per day and market (no visitor data, like the searches
// themselves):
// - a search's success ranks the suggestions while typing and teaches
//   « Vouliez-vous dire … ? »;
// - the ranking group of a « Pertinence » page (SMART / LEGACY) measures
//   the algorithm (Backoffice « Classement › Algorithme », A/B).
const RECORD_SEARCH_OUTCOME = gql`
  mutation RecordSearchOutcome($term: String!, $outcome: String!, $countryCode: String) {
    recordSearchOutcome(term: $term, outcome: $outcome, countryCode: $countryCode)
  }
`
const RECORD_RANKING_OUTCOME = gql`
  mutation RecordRankingOutcome($variant: String!, $placement: String!, $outcome: String!, $countryCode: String) {
    recordRankingOutcome(variant: $variant, placement: $placement, outcome: $outcome, countryCode: $countryCode)
  }
`
const OPENED_KEY = 'dilchap_search_opened'
const DONE_KEY = 'dilchap_search_outcomes'

type Opened = Record<string, { term: string; cc: string | null; variant?: string | null; placement?: string | null }>
type Outcome = 'CLICK' | 'CONTACT'

const read = <T,>(key: string, empty: T): T => {
  try { return JSON.parse(sessionStorage.getItem(key) ?? '') as T } catch { return empty }
}
const write = (key: string, value: unknown) => {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
}
// Once per tag and session.
const once = (tag: string) => {
  const done = read<string[]>(DONE_KEY, [])
  if (done.includes(tag)) return false
  write(DONE_KEY, [...done, tag].slice(-300))
  return true
}

function sendSearch(term: string, cc: string | null, outcome: Outcome) {
  const key = searchKey(term)
  if (key.length < 2 || key.length > 60 || !once(`${outcome}|${cc ?? ''}|${key}`)) return
  void apolloClient.mutate({ mutation: RECORD_SEARCH_OUTCOME, variables: { term: term.trim(), outcome, countryCode: cc } }).catch(() => undefined)
}

function sendRanking(listingId: string, o: Opened[string], outcome: Outcome) {
  if (!o.variant || !o.placement || !once(`R|${outcome}|${listingId}`)) return
  void apolloClient.mutate({ mutation: RECORD_RANKING_OUTCOME, variables: { variant: o.variant, placement: o.placement, outcome, countryCode: o.cc } }).catch(() => undefined)
}

// A result opened: of the search `term` (may be empty: a category page),
// from a « Pertinence » page served with `variant`.
export function noteResultOpen(listingId: string, o: { term: string; countryCode: string | null | undefined; variant?: string | null; placement?: 'SEARCH' | 'CATEGORY' }) {
  const entry = { term: o.term.trim(), cc: o.countryCode ?? null, variant: o.variant ?? null, placement: o.placement ?? null }
  if (!entry.term && !entry.variant) return
  const opened = read<Opened>(OPENED_KEY, {})
  opened[listingId] = entry
  // The 50 latest only.
  write(OPENED_KEY, Object.fromEntries(Object.entries(opened).slice(-50)))
  if (entry.term) sendSearch(entry.term, entry.cc, 'CLICK')
  sendRanking(listingId, entry, 'CLICK')
}

// A contact on a listing: a success for the search / the list it was
// opened from.
export function noteSearchContact(listingId: string) {
  const o = read<Opened>(OPENED_KEY, {})[listingId]
  if (!o) return
  if (o.term) sendSearch(o.term, o.cc, 'CONTACT')
  sendRanking(listingId, o, 'CONTACT')
}
