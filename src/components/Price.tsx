type PriceProps = {
  amount: number | null | undefined
  fallback?: string
}

// Renders an amount with the FCFA unit visually de-emphasized (smaller,
// lighter) via .price-unit — sized in em so it stays proportional no matter
// what font-size the surrounding price-tag/heading uses.
export default function Price({ amount, fallback = 'Prix sur demande' }: PriceProps) {
  if (amount == null) return <>{fallback}</>
  return (
    <>
      {new Intl.NumberFormat('fr-CI').format(amount)}
      <span className="price-unit">FCFA</span>
    </>
  )
}
