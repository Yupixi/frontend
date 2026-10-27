// Every English namespace in one lazy chunk (core.loadEnglish): only
// visitors reading in English download it.
const files = import.meta.glob<Record<string, string>>('./*.json', { eager: true, import: 'default' })

const dicts: Record<string, Record<string, string>> = {}
for (const [path, dict] of Object.entries(files)) dicts[path.slice(2, -5)] = dict
export default dicts
