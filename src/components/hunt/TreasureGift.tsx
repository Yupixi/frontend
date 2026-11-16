import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../Icon'
import { useT } from '../../i18n'
import huntNs from '../../i18n/ns/hunt'
import { useMarketVars } from '../../lib/countries'
import { useAdultModeOn } from '../../lib/adultMode'
import {
  FIND_TREASURE_MUTATION, MY_TREASURE_HUNT_QUERY, TREASURE_ON_LISTING_QUERY, type FindResult, type ListingGift,
} from '../../lib/treasureHunt'

// Where the gift peeks from, per the server's daily `spot` (screen edges,
// never over the action bar or the header).
const SPOTS = [
  'right-0 top-[38%] translate-x-[22%]',
  'left-0 top-[56%] -translate-x-[22%]',
  'right-0 bottom-[130px] translate-x-[22%] lg:bottom-[18%]',
  'left-0 top-[24%] -translate-x-[22%] lg:top-[30%]',
]
const CONFETTI = 18

// « Chasse au trésor »: the gift hidden on a listing page (when the day's
// draw put one here), and the celebration when it is caught.
export default function TreasureGift({ listingId, loggedIn, onLogin, onOpenHunt }: { listingId: string; loggedIn: boolean; onLogin: () => void; onOpenHunt: () => void }) {
  const t = useT(huntNs)
  const vars = useMarketVars()
  const adult = useAdultModeOn()
  const { data, refetch } = useQuery<{ treasureOnListing: ListingGift | null }>(TREASURE_ON_LISTING_QUERY, {
    variables: { listingId, ...vars }, skip: adult, fetchPolicy: 'cache-and-network',
  })
  const [find, { loading }] = useMutation<{ findTreasure: FindResult }>(FIND_TREASURE_MUTATION, { refetchQueries: [MY_TREASURE_HUNT_QUERY] })
  const [result, setResult] = useState<FindResult | null>(null)
  const [error, setError] = useState('')
  const [askLogin, setAskLogin] = useState(false)
  const gift = data?.treasureOnListing?.gift
  const golden = gift?.kind === 'ADVENT'

  const catchIt = () => {
    if (!gift) return
    if (!loggedIn) { setAskLogin(true); return }
    setError('')
    find({ variables: { listingId, token: gift.token, ...vars } })
      .then(({ data: d }) => { if (d) setResult(d.findTreasure); void refetch() })
      .catch((e: Error) => setError(e.message))
  }

  return (
    <>
      {gift && !gift.found && !result && (
        <button type="button" onClick={catchIt} disabled={loading} aria-label={golden ? t('gift.goldLabel') : t('gift.label')}
          className={`hunt-gift fixed z-[90] flex cursor-pointer items-center justify-center rounded-2xl border-none p-0 ${golden ? 'hunt-gift-gold h-16 w-16' : 'h-12 w-12'} ${SPOTS[gift.spot % SPOTS.length]}`}>
          <GiftSvg golden={golden} />
        </button>
      )}
      {error && <Toast text={error} onClose={() => setError('')} />}
      {(result || askLogin) && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4" onClick={() => { setResult(null); setAskLogin(false) }}>
          <div onClick={e => e.stopPropagation()} className="hunt-pop relative w-full max-w-sm overflow-hidden rounded-3xl bg-surface-lowest p-6 text-center shadow-2xl">
            {result && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0">
              {Array.from({ length: CONFETTI }, (_, i) => <span key={i} className={`hunt-confetti hunt-confetti-${i % 4}`} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.08}s` }} />)}
            </span>}
            <div className="mx-auto h-24 w-24"><GiftSvg golden={result ? result.kind === 'ADVENT' : golden} open={!!result} /></div>
            {askLogin ? (
              <>
                <h2 className="m-0 mt-3 text-headline-sm text-on-surface">{t('gift.loginTitle')}</h2>
                <p className="m-0 mt-2 text-body-md text-on-surface-variant">{t('gift.login')}</p>
                <button onClick={() => { setAskLogin(false); onLogin() }} className="mt-5 w-full cursor-pointer rounded-full border-none bg-primary py-3 text-label-lg text-white">{t('gift.loginCta')}</button>
              </>
            ) : result && (
              <>
                <h2 className="m-0 mt-3 text-headline-sm text-on-surface">{result.kind === 'ADVENT' ? t('gift.goldFound') : t('gift.found')}</h2>
                {result.wonPrize && <p className="hunt-won m-0 mt-2 rounded-2xl p-3 text-label-lg font-bold text-[#5a3b00]">{t('gift.won', { prize: result.wonPrize.name })}</p>}
                <p className="m-0 mt-2 text-headline-md font-extrabold" style={{ color: 'var(--fetes-a, #E11D2E)' }}>{t('gift.progress', { found: result.found, total: result.giftsToWin })}</p>
                <div className="mx-auto mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-container-low">
                  <div className="hunt-bar h-full rounded-full" style={{ width: `${Math.min(100, (result.found / result.giftsToWin) * 100)}%` }} />
                </div>
                {result.qualified && <p className="m-0 mt-2 text-label-md text-tertiary">{t('gift.qualified')}</p>}
                {result.voucherPercent ? <p className="m-0 mt-2 rounded-xl bg-tertiary-soft p-2 text-body-sm text-tertiary">{t('gift.voucher', { n: result.voucherPercent })}</p> : null}
                <div className="mt-5 flex gap-2">
                  <button onClick={() => setResult(null)} className="flex-1 cursor-pointer rounded-full border-none bg-surface-container-low py-3 text-label-lg text-on-surface">{t('gift.continue')}</button>
                  <button onClick={() => { setResult(null); onOpenHunt() }} className="flex-1 cursor-pointer rounded-full border-none bg-primary py-3 text-label-lg text-white">{t('gift.see')}</button>
                </div>
              </>
            )}
            <button onClick={() => { setResult(null); setAskLogin(false) }} aria-label={t('gift.close')} className="absolute right-3 top-3 flex cursor-pointer border-none bg-transparent p-1 text-on-surface-variant"><Icon name="close" size={20} /></button>
          </div>
        </div>
      )}
    </>
  )
}

function GiftSvg({ golden, open }: { golden: boolean; open?: boolean }) {
  const box = golden ? '#F5B301' : 'var(--fetes-a, #E11D2E)'
  const ribbon = golden ? '#FFF3C4' : 'var(--fetes-c, #F5B301)'
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" aria-hidden>
      <rect x="10" y="28" width="44" height="30" rx="4" fill={box} />
      <rect x="29" y="28" width="6" height="30" fill={ribbon} />
      <g className={open ? 'hunt-lid-open' : ''}>
        <rect x="7" y="20" width="50" height="10" rx="3" fill={box} />
        <rect x="29" y="20" width="6" height="10" fill={ribbon} />
        <path d="M32 20 C 22 6, 12 14, 24 20 Z M32 20 C 42 6, 52 14, 40 20 Z" fill={ribbon} />
      </g>
      {golden && <path d="M52 8 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#fff" className="hunt-sparkle" />}
    </svg>
  )
}

function Toast({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div role="alert" className="fixed inset-x-4 bottom-24 z-[300] mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-on-surface px-4 py-3 text-body-sm text-surface shadow-xl lg:bottom-8">
      <Icon name="redeem" size={18} className="shrink-0" />
      <span className="flex-1">{text}</span>
      <button onClick={onClose} className="flex cursor-pointer border-none bg-transparent p-0 text-surface"><Icon name="close" size={18} /></button>
    </div>
  )
}
