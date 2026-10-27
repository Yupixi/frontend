import { groupNumber, useT } from '../i18n/core'
import wallet from '../i18n/ns/wallet'

// In-app prices and balances are in credits ("12 crédits"), the only
// currency of the app; only buying credits is in F CFA (see <Price>).
export const creditsLabel = (n: number) => wallet.t('credits', { count: n })

export default function Credits({ n, unit = true }: { n: number | null | undefined; unit?: boolean }) {
  const t = useT(wallet)
  const v = n ?? 0
  const [num, word] = [groupNumber(v), t('creditUnit', { count: v })]
  return <>{num}{unit && <span className="price-unit">{word}</span>}</>
}
