// Photos picked in the listing wizard, kept on this device until the listing
// is published (or the draft reset): a refresh or a closed tab no longer
// asks for them again. localStorage holds the text draft but can't take
// images (a few MB each); IndexedDB stores the files as they are.
import { sessionUserId } from './auth'

const DB = 'dilchap_drafts'
const STORE = 'files'
// Drafts belong to the account that wrote them (a shared phone: the next
// member never sees, nor publishes, someone else's text and photos).
const LEGACY_PHOTOS_KEY = 'listing_photos'
const LEGACY_TEXT_KEY = 'dilchap_listing_draft'
const owner = () => sessionUserId() ?? 'anonymous'
const photosKey = () => `${LEGACY_PHOTOS_KEY}:${owner()}`
// localStorage key of the text draft (see PostListing).
export const listingDraftKey = () => `${LEGACY_TEXT_KEY}:${owner()}`

type Stored = { name: string; type: string; lastModified: number; blob: Blob }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => { db.close(); resolve(req.result) }
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error) }
  }))
}

// Unavailable storage (private mode, quota) only means photos aren't kept.
export function saveDraftPhotos(files: File[]): Promise<void> {
  const rows: Stored[] = files.map(f => ({ name: f.name, type: f.type, lastModified: f.lastModified, blob: f }))
  const key = photosKey()
  return run<unknown>('readwrite', s => (rows.length ? s.put(rows, key) : s.delete(key)) as IDBRequest<unknown>).then(() => undefined, () => undefined)
}

export function loadDraftPhotos(): Promise<File[]> {
  dropLegacyDraft()
  return run<Stored[] | undefined>('readonly', s => s.get(photosKey())).then(
    rows => (rows ?? []).map(r => new File([r.blob], r.name, { type: r.type, lastModified: r.lastModified })),
    () => [],
  )
}

export function clearDraftPhotos(): Promise<void> {
  return saveDraftPhotos([])
}

// Drafts saved before they were per account: nobody can tell whose they are.
let legacyDropped = false
function dropLegacyDraft() {
  if (legacyDropped) return
  legacyDropped = true
  try { localStorage.removeItem(LEGACY_TEXT_KEY) } catch { /* storage blocked */ }
  void run<unknown>('readwrite', s => s.delete(LEGACY_PHOTOS_KEY) as IDBRequest<unknown>).catch(() => undefined)
}
