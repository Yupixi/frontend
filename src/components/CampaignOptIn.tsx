import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import BuyCreditsSheet from './BuyCreditsSheet'
import Credits from './Credits'
import { CreditsF } from './boost/BoostKit'
import Icon from './Icon'
import Price from './Price'
import { OPEN_CAMPAIGNS_QUERY, type OpenCampaign } from '../graphql/shops'
import { WALLET_BALANCE_QUERY, type WalletBalance } from '../graphql/payments'
import { applyOffer, offerLabel, usePriceOffers } from '../lib/priceOffers'
import { usePriceVars } from '../lib/countries'
import { campaignBlock } from '../lib/campaignActions'
import { fmtDate, useT } from '../i18n'
import campaignNs from '../i18n/ns/campaign'

// "Vendre pour {campagne}" on the campaign page: the wizard opens with that
// campaign ticked.
export const POST_CAMPAIGN_KEY = 'yupixi_post_campaign'

export type CampaignChoice = { campaign: OpenCampaign; discountPercent: number }

// Credits taken when joining from the wizard: the listing fee, plus the
// entry fee the first time.
export const campaignCost = (c: OpenCampaign) => c.listingFee + (c.entryFeePaid ? 0 : c.entryFee)

const dateFr = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'long' })

// "Participer à une campagne" in the listing wizard: the Dilchap campaigns
// this seller may join, what it costs in credits (taken on publishing), the
// balance, and a way to buy the missing credits without leaving the form.
export default function CampaignOptIn({ price, currency, categoryId, subcategoryId, condition, countryCode, value, onChange, onNavigate, render = body => body }: {
  price: number
  // Category of the listing: category offers (« Offres & gratuités »), and
  // the campaigns accepting it.
  categoryId?: string | null
  subcategoryId?: string | null
  // Condition of the item: campaigns limited to some conditions.
  condition?: string | null
  // Country of the listing: only the campaigns running there.
  countryCode?: string | null
  currency: string
  value: CampaignChoice | null
  onChange: (v: CampaignChoice | null) => void
  // Buttons of a campaign the seller cannot join yet (badge, KYC…): the
  // listing draft is kept meanwhile.
  onNavigate?: (page: any) => void
  // Wraps the block (e.g. in the wizard's card) when there is one to show.
  render?: (body: React.ReactNode) => React.ReactNode
}) {
  const t = useT(campaignNs)
  const { data } = useQuery<{ openShopCampaigns: OpenCampaign[] }>(OPEN_CAMPAIGNS_QUERY, { fetchPolicy: 'cache-and-network' })
  const offers = usePriceOffers()
  // What joining really costs, the live offer applied (as the server does).
  const costOf = (c: OpenCampaign) => applyOffer(offers, 'CAMPAIGN', campaignCost(c), categoryId)
  const { data: wallet, refetch } = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { variables: usePriceVars(), fetchPolicy: 'cache-and-network' })
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
  // The campaigns this listing fits (the server checks every rule again on
  // publishing): running, the listing's country, category, condition and
  // price. Those open to this seller with a place left can be ticked; the
  // others are shown greyed with the server's reason (early access,
  // registration dates, missing status…) rather than silently left out.
  const fits = (c: OpenCampaign) =>
    (!c.categoryIds.length && !c.subcategoryIds.length) || (!!categoryId && c.categoryIds.includes(categoryId)) || (!!subcategoryId && c.subcategoryIds.includes(subcategoryId))
  const matching = (data?.openShopCampaigns ?? []).filter(c => c.state !== 'ENDED'
    && (!countryCode || !c.countryCodes?.length || c.countryCodes.includes(countryCode))
    && fits(c)
    && (!c.conditions.length || (!!condition && c.conditions.includes(condition)))
    && (!price || ((c.minPrice == null || price >= c.minPrice) && (c.maxPrice == null || price <= c.maxPrice))))
  const campaigns = matching.filter(c => !campaignBlock(c, true))
  const blocked = matching.flatMap(c => { const b = campaignBlock(c, true); return b ? [{ c, ...b }] : [] })
  // The listing moved to a country the chosen campaign doesn't run in.
  useEffect(() => {
    if (data && value && !campaigns.some(c => c.id === value.campaign.id)) onChange(null)
  }, [data, value, campaigns, onChange])
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
  if (!matching.length) return null

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
                <span className="block text-label-lg text-on-surface">{t('optin.join', { name: c.name })}</span>
                <span className="block text-body-sm text-on-surface-variant">
                  {c.state === 'LIVE' ? t('optin.liveUntil', { date: dateFr(c.endsAt) }) : t('fromTo', { from: dateFr(c.startsAt), to: dateFr(c.endsAt) })}
                  {c.minDiscountPercent ? ` · ${t('optin.minDiscount', { n: c.minDiscountPercent })}` : ''}
                  {c.minPhotos ? ` · ${t('optin.minPhotos', { n: c.minPhotos })}` : ''}
                </span>
                <span className="mt-1 block text-label-md text-on-surface">
                  {quote.percent > 0 ? t.rich('optin.costOffer', { s: ch => <s className="font-normal text-on-surface-variant">{ch}</s>, base: <Credits n={quote.base} unit={false} />, fee: fee > 0 ? <Credits n={fee} /> : t('optin.free'), offer: <span className="whitespace-nowrap rounded-full bg-tertiary-soft px-1.5 text-label-sm text-tertiary">{offerLabel(quote.percent)}</span> }) : fee > 0 ? <>{t.rich('optin.cost', { fee: <Credits n={fee} /> })}{!c.entryFeePaid && c.entryFee > 0 && c.listingFee > 0 ? <span className="text-body-sm text-on-surface-variant"> {t('optin.feeDetail')}</span> : null}</> : t('fee.free')}
                </span>
              </span>
            </label>
            {!price && <p className="m-0 mt-2 pl-8 text-body-sm text-on-surface-variant">{t('optin.priceFirst')}</p>}
            {on && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 pl-8">
                <label className="flex items-center gap-2 text-label-md text-on-surface">
                  {t('optin.discount')}
                  <span className="flex items-center rounded-lg border border-outline-variant bg-surface-lowest pr-2">
                    <input type="number" min={min} max={90} value={pct} onChange={e => onChange({ campaign: c, discountPercent: Math.min(90, Math.max(0, Math.floor(Number(e.target.value)) || 0)) })} aria-label={t('optin.discountAria')} className="h-9 w-14 border-none bg-transparent text-center text-label-lg text-on-surface outline-none [appearance:textfield]" />
                    %
                  </span>
                </label>
                {promo != null && <span className="text-body-sm text-on-surface-variant">{t.rich('optin.campaignPrice', { b: ch => <b className="text-primary">{ch}</b>, price: <Price amount={promo} currency={currency} /> })}</span>}
                {pct < min && <span className="w-full text-body-sm text-primary">{t('optin.minDiscountError', { n: min })}</span>}
              </div>
            )}
          </div>
        )
      })}
      {blocked.map(({ c, reason, buttons }) => (
        <div key={c.id} className="rounded-xl border-[1.5px] border-dashed border-outline-variant bg-surface-container-low p-3" aria-disabled="true">
          <div className="flex items-start gap-3">
            <Icon name="lock_clock" size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
            <span className="min-w-0 flex-1">
              <span className="block text-label-lg text-on-surface-variant">{t('optin.quoted', { name: c.name })}</span>
              <span className="block text-body-sm text-on-surface-variant">
                {c.state === 'LIVE' ? t('optin.liveUntil', { date: dateFr(c.endsAt) }) : t('fromTo', { from: dateFr(c.startsAt), to: dateFr(c.endsAt) })}
                {c.minDiscountPercent ? ` · ${t('optin.minDiscount', { n: c.minDiscountPercent })}` : ''}
              </span>
              <span className="mt-1.5 block text-body-sm text-on-surface">{reason}</span>
            </span>
          </div>
          {onNavigate && buttons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 pl-8">
              {buttons.map(b => (
                <button key={b.label} type="button" onClick={() => onNavigate(b.page)} className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white"><Icon name={b.icon} size={17} /> {b.label}</button>
              ))}
            </div>
          )}
        </div>
      ))}
      {value && cost > 0 && (
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-body-sm ${missing ? 'bg-primary-fixed text-primary' : 'bg-tertiary-soft text-on-surface'}`}>
          <span className="flex items-center gap-2">
            <Icon name={missing ? 'error' : 'account_balance_wallet'} size={18} />
            {missing
              ? <span>{t.rich('optin.missing', { b: ch => <b>{ch}</b>, missing: <CreditsF n={missing} />, balance: <Credits n={balance} /> })}</span>
              : <span>{t.rich('optin.debited', { b: ch => <b>{ch}</b>, cost: <CreditsF n={cost} />, balance: <Credits n={balance} /> })}</span>}
          </span>
          {missing > 0 && <button type="button" onClick={() => setTopUp(true)} className="cursor-pointer rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white">{t('optin.buyCredits')}</button>}
        </div>
      )}
      <BuyCreditsSheet open={topUp} suggested={missing} onClose={() => setTopUp(false)} onDone={() => { setTopUp(false); void refetch() }} />
    </div>
  )
}
