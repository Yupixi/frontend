import { createContext, createElement, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { GRAPHQL_URL } from './apollo'
import { RECORD_IMPRESSIONS_MUTATION, type ImpressionPlacement, type ImpressionSlot } from '../graphql/visibility'
import type { PromotedPlace } from '../graphql/listings'

// « Affichages »: a listing card counts once it has been at least half on
// screen for a second, once per page view and place — re-renders, scrolling
// back and forth or a list refetch never count it again. Cards register a
// DOM node with one shared IntersectionObserver (no React state, nothing per
// card on the network); the seen cards are sent in one batch every few
// seconds, and when the page is hidden or left. Robots, link previews and
// the seller's own cards are never counted. The API stores aggregates only
// (listing × day × place × kind of place), never who saw what.

type Item = { listingId: string; placement: ImpressionPlacement; slot: ImpressionSlot }

const VISIBLE_MS = 1000
const FLUSH_MS = 8000
const MAX_BATCH = 100
const ROBOT = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit/i

const enabled = typeof window !== 'undefined' && 'IntersectionObserver' in window && !ROBOT.test(navigator.userAgent)

let pageView = 0
const counted = new Set<string>()
let queue: Item[] = []
const items = new WeakMap<Element, Item>()
const timers = new WeakMap<Element, number>()
let observer: IntersectionObserver | null = null
let flushTimer = 0

/** A new page of the app (App navigation, back / forward): cards count again. */
export function newImpressionPageView() {
  pageView += 1
  counted.clear()
}

function send(batch: Item[], leaving: boolean) {
  if (!batch.length) return
  try {
    void fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: RECORD_IMPRESSIONS_MUTATION, variables: { items: batch } }),
      // No cookie nor token: the counters never know who saw a card.
      credentials: 'omit',
      keepalive: leaving,
    }).catch(() => undefined)
  } catch { /* best-effort */ }
}

export function flushImpressions(leaving = false) {
  if (flushTimer) { window.clearTimeout(flushTimer); flushTimer = 0 }
  while (queue.length) send(queue.splice(0, MAX_BATCH), leaving)
}

function schedule() {
  if (!flushTimer) flushTimer = window.setTimeout(() => { flushTimer = 0; flushImpressions() }, FLUSH_MS)
}

function seen(el: Element) {
  timers.delete(el)
  const it = items.get(el)
  if (!it || document.visibilityState !== 'visible') return
  const key = `${pageView}|${it.listingId}|${it.placement}`
  if (counted.has(key)) return
  counted.add(key)
  queue.push(it)
  if (queue.length >= MAX_BATCH) flushImpressions()
  else schedule()
}

function getObserver() {
  if (observer) return observer
  observer = new IntersectionObserver(entries => {
    for (const e of entries) {
      const t = timers.get(e.target)
      if (e.isIntersecting && e.intersectionRatio >= 0.5) {
        if (t === undefined) timers.set(e.target, window.setTimeout(() => seen(e.target), VISIBLE_MS))
      } else if (t !== undefined) {
        window.clearTimeout(t)
        timers.delete(e.target)
      }
    }
  }, { threshold: [0, 0.5] })
  const leave = () => { if (document.visibilityState === 'hidden') flushImpressions(true) }
  document.addEventListener('visibilitychange', leave)
  window.addEventListener('pagehide', () => flushImpressions(true))
  return observer
}

function watch(el: Element, it: Item) {
  items.set(el, it)
  getObserver().observe(el)
}

function unwatch(el: Element) {
  const t = timers.get(el)
  if (t !== undefined) window.clearTimeout(t)
  timers.delete(el)
  items.delete(el)
  observer?.unobserve(el)
}

/** The paid places of a list result (`promoted`, absent from older types). */
export const promotedOf = (list: unknown) => (list as { promoted?: PromotedPlace[] | null } | null | undefined)?.promoted ?? null

// Where the cards of a list are shown, and which ones a paid formula placed
// there (`promoted` from the API).
type Scope = { placement: ImpressionPlacement; slots: Map<string, ImpressionSlot> }
const ScopeContext = createContext<Scope | null>(null)

export function ImpressionScope({ placement, promoted, children }: { placement: ImpressionPlacement; promoted?: PromotedPlace[] | null; children: ReactNode }) {
  const key = (promoted ?? []).map(p => `${p.listingId}:${p.slot}`).join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo<Scope>(() => ({ placement, slots: new Map((promoted ?? []).map(p => [p.listingId, p.slot])) }), [placement, key])
  return createElement(ScopeContext.Provider, { value }, children)
}

/** Ref for a card's root: counted when seen, in the place of its list. */
export function useImpressionRef(listingId: string, sellerId: string, currentUserId?: string | null) {
  const scope = useContext(ScopeContext)
  const placement = scope?.placement
  const slot = scope?.slots.get(listingId) ?? 'ORGANIC'
  const own = !!currentUserId && currentUserId === sellerId
  return useCallback((el: HTMLElement | null) => {
    if (!enabled || !placement || own) return
    if (el) watch(el, { listingId, placement, slot })
    // React calls the previous ref with null before a new one.
    return () => { if (el) unwatch(el) }
  }, [listingId, placement, slot, own])
}
