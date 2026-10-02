// Anonymous interests of a visitor who is not signed in: the categories they
// open, kept on this device only (localStorage) so that the home page and
// the « Pertinence » sort can follow them without an account. Nothing
// personal: category slugs with a score that fades over time, no listing,
// no search words, no identifier. Only the 5 strongest slugs are sent, as
// plain parameters (`interestCategories`). This is personalising the
// interface, not audience measurement: it is never sent to an analytics
// tool. A signed-in member uses their profile kept by Dilchap instead, and
// « Personnaliser mon accueil » off (or clearing the history) empties it.
const KEY = 'yupixi_interests'
const OFF_KEY = 'yupixi_personalize_off'
const HALF_LIFE_DAYS = 14
const DAY = 86_400_000

type Stored = { at: number; cats: Record<string, number> }

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    const s = raw ? (JSON.parse(raw) as Stored) : null
    if (s && typeof s.at === 'number' && s.cats && typeof s.cats === 'object') return s
  } catch {
    // storage blocked or corrupted: start again
  }
  return { at: Date.now(), cats: {} }
}

function write(s: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // storage blocked: interests are simply not kept
  }
}

export function personalizationOff(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) === '1'
  } catch {
    return false
  }
}

// One category opened (a listing, a category page, a search in it).
export function noteInterest(slug: string | null | undefined, weight = 1) {
  if (!slug || personalizationOff()) return
  const s = read()
  const now = Date.now()
  const fade = Math.pow(0.5, (now - s.at) / DAY / HALF_LIFE_DAYS)
  const cats: Record<string, number> = {}
  for (const [k, v] of Object.entries(s.cats)) if (v * fade > 0.05) cats[k] = v * fade
  cats[slug] = (cats[slug] ?? 0) + weight
  // At most 12 categories kept.
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 12)
  write({ at: now, cats: Object.fromEntries(top) })
}

// The strongest categories, sent with the home and search queries of a
// visitor who is not signed in (undefined: nothing to send).
export function interestCategories(): string[] | undefined {
  if (personalizationOff()) return undefined
  const top = Object.entries(read().cats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k)
  return top.length ? top : undefined
}

// « Personnaliser mon accueil » off, or the history cleared: forget them.
export function clearInterests(off?: boolean) {
  try {
    localStorage.removeItem(KEY)
    if (off === true) localStorage.setItem(OFF_KEY, '1')
    if (off === false) localStorage.removeItem(OFF_KEY)
  } catch {
    // storage blocked: nothing kept anyway
  }
}
