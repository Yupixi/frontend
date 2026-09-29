// Photos picked in the listing wizard, kept on this device until the listing
// is published (or the draft reset): a refresh or a closed tab no longer
// asks for them again. localStorage holds the text draft but can't take
// images (a few MB each); IndexedDB stores the files as they are.
const DB = 'dilchap_drafts'
const STORE = 'files'
const KEY = 'listing_photos'

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
  return run<unknown>('readwrite', s => (rows.length ? s.put(rows, KEY) : s.delete(KEY)) as IDBRequest<unknown>).then(() => undefined, () => undefined)
}

export function loadDraftPhotos(): Promise<File[]> {
  return run<Stored[] | undefined>('readonly', s => s.get(KEY)).then(
    rows => (rows ?? []).map(r => new File([r.blob], r.name, { type: r.type, lastModified: r.lastModified })),
    () => [],
  )
}

export function clearDraftPhotos(): Promise<void> {
  return saveDraftPhotos([])
}
