// In-app prices and balances are in credits ("12 crédits"), the only
// currency of the app; only buying credits is in F CFA (see <Price>).
export const creditsLabel = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} crédit${Math.abs(n) > 1 ? 's' : ''}`

export default function Credits({ n, unit = true }: { n: number | null | undefined; unit?: boolean }) {
  const v = n ?? 0
  const [num, word] = [creditsLabel(v).replace(/ crédits?$/, ''), Math.abs(v) > 1 ? 'crédits' : 'crédit']
  return <>{num}{unit && <span className="price-unit">{word}</span>}</>
}
