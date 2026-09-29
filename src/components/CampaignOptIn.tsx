import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import BuyCreditsSheet from './BuyCreditsSheet'
import Credits from './Credits'
import Icon from './Icon'
import Price from './Price'
import { OPEN_CAMPAIGNS_QUERY, type OpenCampaign } from '../graphql/shops'
import { WALLET_BALANCE_QUERY, type WalletBalance } from '../graphql/payments'
import { applyOffer, offerLabel, usePriceOffers } from '../lib/priceOffers'

// "Vendre pour {campagne}" on the campaign page: the wizard opens with that
// campaign ticked.
export const POST_CAMPAIGN_KEY = 'yupixi_post_campaign'

export type CampaignChoice = { campaign: OpenCampaign; discountPercent: number }

// Credits taken when joining from the wizard: the listing fee, plus the
// entry fee the first time.
export const campaignCost = (c: OpenCampaign) => c.listingFee + (c.entryFeePaid ? 0 : c.entryFee)

const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

// "Participer à une campagne" in the listing wizard: the Dilchap campaigns
// this seller may join, what it costs in credits (taken on publishing), the
// balance, and a way to buy the missing credits without leaving the form.
export default function CampaignOptIn({ price, currency, categoryId, value, onChange, render = body => body }: {
  price: number
  // Category of the listing: category offers (« Offres & gratuités »).
  categoryId?: string | null
  currency: string
  value: CampaignChoice | null
  onChange: (v: CampaignChoice | null) => void
  // Wraps the block (e.g. in the wizard's card) when there is one to show.
  render?: (body: React.ReactNode) => React.ReactNode
}) {
  const { data } = useQuery<{ openShopCampaigns: OpenCampaign[] }>(OPEN_CAMPAIGNS_QUERY, { fetchPolicy: 'cache-and-network' })
  const offers = usePriceOffers()
  // What joining really costs, the live offer applied (as the server does).
  const costOf = (c: OpenCampaign) => applyOffer(offers, 'CAMPAIGN', campaignCost(c), categoryId)
  const { data: wallet, refetch } = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { fetchPolicy: 'cache-and-network' })
  const [topUp, setTopUp] = useState(false)
  // Credits bought by Mobile Money land once the payment is confirmed,
  // usually while the seller is in the payment app: re-read the balance
  // when they come back to the form.
  useEffect(() => {
    const again = () => { if (document.visibilityState === 'visible') void refetch() }
    window.addEventListener('focus', again)
    document.addEventListener('visibilitychange', again)
    return () => { window.removeEventListener('focus', again); document.removeEventListener('visibilitychange', again) }
  }, [refetch])
  const campaigns = (data?.openShopCampaigns ?? []).filter(c => c.canJoin && c.state !== 'ENDED')
  const preselect = useRef<string | null>(null)
  if (preselect.current === null) {
    try { preselect.current = sessionStorage.getItem(POST_CAMPAIGN_KEY) ?? ''; sessionStorage.removeItem(POST_CAMPAIGN_KEY) } catch { preselect.current = '' }
  }
  useEffect(() => {
    const c = preselect.current && campaigns.find(x => x.id === preselect.current)
    if (!c || value) return
    preselect.current = ''
    onChange({ campaign: c, discountPercent: Math.max(c.minDiscountPercent ?? 1, 10) })
  }, [campaigns, value, onChange])
  if (!campaigns.length) return null

  const balance = wallet?.myWallet.credits ?? 0
  const cost = value ? costOf(value.campaign).price : 0
  const missing = Math.max(0, cost - balance)

  return render(
    <div className="flex flex-col gap-3">
      {campaigns.map(c => {
        const on = value?.campaign.id === c.id
        const min = c.minDiscountPercent ?? 1
        const pct = on ? value!.discountPercent : Math.max(min, 10)
        const promo = price > 0 ? Math.round(price * (1 - pct / 100)) : null
        const quote = costOf(c)
        const fee = quote.price
        return (
          <div key={c.id} className={`rounded-xl border-[1.5px] border-solid p-3 ${on ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant bg-surface-container-low'}`}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={on} disabled={!price} onChange={e => onChange(e.target.checked ? { campaign: c, discountPercent: pct } : null)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
              <span className="min-w-0 flex-1">
                <span className="block text-label-lg text-on-surface">Participer à « {c.name} »</span>
                <span className="block text-body-sm text-on-surface-variant">
                  {c.state === 'LIVE' ? `En cours jusqu’au ${dateFr(c.endsAt)}` : `Du ${dateFr(c.startsAt)} au ${dateFr(c.endsAt)}`}
                  {c.minDiscountPercent ? ` · remise minimale ${c.minDiscountPercent} %` : ''}
                </span>
                <span className="mt-1 block text-label-md text-on-surface">
                  {quote.percent > 0 ? <>Coût : <s className="font-normal text-on-surface-variant"><Credits n={quote.base} unit={false} /></s> {fee > 0 ? <Credits n={fee} /> : 'gratuit'} <span className="whitespace-nowrap rounded-full bg-tertiary-soft px-1.5 text-label-sm text-tertiary">{offerLabel(quote.percent)}</span></> : fee > 0 ? <>Coût : <Credits n={fee} />{!c.entryFeePaid && c.entryFee > 0 && c.listingFee > 0 ? <span className="text-body-sm text-on-surface-variant"> (frais d’entrée + article)</span> : null}</> : 'Participation gratuite'}
                </span>
              </span>
            </label>
            {!price && <p className="m-0 mt-2 pl-8 text-body-sm text-on-surface-variant">Indiquez d’abord un prix de vente.</p>}
            {on && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 pl-8">
                <label className="flex items-center gap-2 text-label-md text-on-surface">
                  Remise
                  <span className="flex items-center rounded-lg border border-outline-variant bg-surface-lowest pr-2">
                    <input type="number" min={min} max={90} value={pct} onChange={e => onChange({ campaign: c, discountPercent: Math.min(90, Math.max(0, Math.floor(Number(e.target.value)) || 0)) })} aria-label="Remise en pourcentage" className="h-9 w-14 border-none bg-transparent text-center text-label-lg text-on-surface outline-none [appearance:textfield]" />
                    %
                  </span>
                </label>
                {promo != null && <span className="text-body-sm text-on-surface-variant">Prix en campagne : <b className="text-primary"><Price amount={promo} currency={currency} /></b></span>}
                {pct < min && <span className="w-full text-body-sm text-primary">Remise minimale : {min} %</span>}
              </div>
            )}
          </div>
        )
      })}
      {value && cost > 0 && (
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-body-sm ${missing ? 'bg-primary-fixed text-primary' : 'bg-tertiary-soft text-on-surface'}`}>
          <span className="flex items-center gap-2">
            <Icon name={missing ? 'error' : 'account_balance_wallet'} size={18} />
            {missing
              ? <span>Crédits insuffisants : il vous manque <b><Credits n={missing} /></b> (solde <Credits n={balance} />).</span>
              : <span><Credits n={cost} /> seront débités de votre solde (<Credits n={balance} />) à la publication.</span>}
          </span>
          {missing > 0 && <button type="button" onClick={() => setTopUp(true)} className="cursor-pointer rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white">Acheter des crédits</button>}
        </div>
      )}
      <BuyCreditsSheet open={topUp} suggested={missing} onClose={() => setTopUp(false)} onDone={() => { setTopUp(false); void refetch() }} />
    </div>
  )
}
