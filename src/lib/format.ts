export function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Il y a ${days} jour${days > 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `Il y a ${months} mois`
  const years = Math.floor(months / 12)
  return `Il y a ${years} an${years > 1 ? 's' : ''}`
}

// fr-FR number grouping uses U+202F, which Plus Jakarta Sans has no glyph
// for — swap it for a regular no-break space ("1 815", "22,8").
export function formatNumber(n: number, maximumFractionDigits = 1): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits }).replace(/ /g, ' ')
}
