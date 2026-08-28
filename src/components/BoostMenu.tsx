import { useMutation } from '@apollo/client/react'
import Price from './Price'
import { CREATE_BOOST_MUTATION, BOOST_TIERS } from '../graphql/promotions'

type BoostMenuProps = {
  listingId: string
  onDone: () => void
  // 'dropdown' floats under a trigger button (SellerListings, ListingDetail).
  // 'inline' sits directly in the page flow (the post-publish upsell, where
  // it IS the content rather than something popping out from a button).
  variant?: 'dropdown' | 'inline'
}

// No payment step yet (see BoostsService — Mobile Money is deferred), so
// choosing a tier activates the boost immediately.
export default function BoostMenu({ listingId, onDone, variant = 'dropdown' }: BoostMenuProps) {
  const [createBoost, { loading }] = useMutation(CREATE_BOOST_MUTATION)

  const pick = (tier: string) =>
    void createBoost({ variables: { input: { listingId, tier } } }).then(() => onDone())

  return (
    <div style={variant === 'dropdown'
      ? { position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6, zIndex: 20, width: 200 }
      : { border: '1px solid var(--border)', borderRadius: 10, padding: 6 }
    }>
      {BOOST_TIERS.map(t => (
        <button key={t.tier} disabled={loading} onClick={() => pick(t.tier)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 10px', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--fg)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span>{t.label}</span>
          <span style={{ color: 'var(--primary)' }}><Price amount={t.price} /></span>
        </button>
      ))}
    </div>
  )
}
