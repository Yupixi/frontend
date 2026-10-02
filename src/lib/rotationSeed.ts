// Random value kept for the visitor's session (this tab): the server
// rotates listings « en vedette » differently from one visitor to another,
// but keeps one order for the whole session so that the pages of a search
// never repeat nor skip a listing. Not personal data: never sent anywhere
// else, gone when the tab is closed.
const KEY = 'yupixi_rotation_seed'
let memory: string | null = null

export function rotationSeed(): string {
  if (memory) return memory
  try {
    const kept = sessionStorage.getItem(KEY)
    if (kept) return (memory = kept)
  } catch {
    // storage blocked: the seed lives in memory only
  }
  memory = Math.random().toString(36).slice(2, 12)
  try {
    sessionStorage.setItem(KEY, memory)
  } catch {
    // idem
  }
  return memory
}
