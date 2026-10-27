import { useState } from 'react'
import { useApolloClient, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import WalletPaySheet from '../../components/WalletPaySheet'
import { AccountLayout } from './AccountLayout'
import { ME_QUERY, type AuthUser } from '../../graphql/auth'
import Credits from '../../components/Credits'
import OfferCredits from '../../components/OfferCredits'
import { BADGE_LABEL, MY_BADGE_QUERY, type BadgePlan, type BadgeTier, type MyBadge } from '../../graphql/badges'
import { delayText, useRules, type MarketplaceRules } from '../../lib/rules'
import { useMemberCountryCode, usePriceVars } from '../../lib/countries'
import { fmtDate, fmtNumber, useT } from '../../i18n'
import badge from '../../i18n/ns/badge'

type Props = { onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void; onProfileUpdated: (u: AuthUser) => void }

const fdate = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'long', year: 'numeric' })
const card = 'rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5'

// Support delays from « Règles de la marketplace ».
const tiers = (r: MarketplaceRules): { tier: BadgeTier, tone: string, soft: string, perks: string[] }[] => [
  {
    tier: 'VERIFIED', tone: 'text-verified', soft: 'bg-verified-soft',
    perks: [badge.t('verified.perk1'), badge.t('verified.perk2', { delay: delayText(r.SUPPORT_SLA_HIGH_HOURS) }), badge.t('verified.perk3')],
  },
  {
    tier: 'CERTIFIED', tone: 'text-tertiary', soft: 'bg-tertiary-soft',
    perks: [badge.t('certified.perk1'), badge.t('certified.perk2', { delay: delayText(r.SUPPORT_SLA_URGENT_HOURS) }), badge.t('certified.perk3'), badge.t('certified.perk4'), badge.t('certified.perk5')],
  },
]

// Paid badges, "like Facebook": identity check first, then a monthly or
// yearly subscription paid in credits.
export default function MyBadgePage({ onNavigate, currentUser, onLogout, onProfileUpdated }: Props) {
  const tb = useT(badge)
  // Support targets of the member's account country.
  const rules = useRules(useMemberCountryCode())
  const client = useApolloClient()
  const { data, refetch } = useQuery<{ myBadge: MyBadge }>(MY_BADGE_QUERY, { variables: usePriceVars(), fetchPolicy: 'cache-and-network' })
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [paying, setPaying] = useState<BadgePlan | null>(null)
  const [paidMsg, setPaidMsg] = useState('')
  const b = data?.myBadge
  const layout = (body: React.ReactNode) => (
    <AccountLayout active="seller-badge" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title={tb('pageTitle')}>{body}</AccountLayout>
  )
  if (!b) return layout(<div className="h-64 animate-pulse rounded-2xl bg-surface-container" />)

  const plan = (tier: BadgeTier) => b.plans.find(p => p.tier === tier && p.period === period)!
  const monthly = (tier: BadgeTier) => b.plans.find(p => p.tier === tier && p.period === 'MONTHLY')!
  const yearly = b.plans.find(p => p.tier === 'VERIFIED' && p.period === 'YEARLY')!
  const yearlySaving = Math.round(12 - yearly.price / monthly('VERIFIED').price)
  const active = b.tier && !b.trial ? b.tier : null
  const paid = () => {
    setPaying(null)
    setPaidMsg(badge.t('paid'))
    void refetch()
    void client.query<{ me: AuthUser }>({ query: ME_QUERY, fetchPolicy: 'network-only' }).then(r => r.data?.me && onProfileUpdated(r.data.me))
  }
  const criteria = [
    { ok: b.identityVerified, label: tb('crit.identity'), value: b.identityVerified ? tb('crit.validated') : tb('crit.todo') },
    { ok: b.sales >= b.criteria.minSales, label: tb('crit.sales', { n: b.criteria.minSales }), value: `${b.sales} / ${b.criteria.minSales}` },
    { ok: b.reviews >= b.criteria.minReviews, label: tb('crit.reviews', { n: b.criteria.minReviews }), value: `${b.reviews} / ${b.criteria.minReviews}` },
    { ok: b.reviews > 0 && b.rating >= b.criteria.minRating, label: tb('crit.rating', { rating: fmtNumber(b.criteria.minRating, 3) }), value: b.reviews ? `${b.rating.toFixed(1)} / 5` : '—' },
    { ok: b.penalties === 0, label: tb('crit.penalties'), value: b.penalties ? `${b.penalties}` : tb('crit.none') },
  ]

  const cta = (tier: BadgeTier) => {
    if (!b.identityVerified) return { label: tb('cta.verifyFirst'), disabled: false, action: () => onNavigate('seller-kyc') }
    if (tier === 'CERTIFIED' && !b.certifiedEligible) return { label: tb('cta.notEligible'), disabled: true, action: () => {} }
    if (tier === 'VERIFIED' && active === 'CERTIFIED') return { label: tb('cta.included'), disabled: true, action: () => {} }
    const label = active === tier ? tb('cta.extend') : tier === 'CERTIFIED' && active === 'VERIFIED' ? tb('cta.upgrade') : tb('cta.subscribe')
    return { label, disabled: false, action: () => setPaying(plan(tier)) }
  }

  const PERKS: [string, string | boolean, string | boolean][] = [
            [tb('perk.publicBadge'), tb('perk.blue'), tb('perk.green')],
            [tb('perk.identity'), true, true],
            [tb('perk.everywhere'), true, true],
            [tb('perk.trustCard'), true, true],
            [tb('perk.reviews'), true, true],
            [tb('perk.stats'), tb('perk.basic'), tb('perk.advanced')],
            [tb('perk.support'), tb('perk.priority'), tb('perk.ultraPriority')],
            [tb('perk.supportDelay'), `< ${rules.SUPPORT_SLA_HIGH_HOURS} h`, `< ${rules.SUPPORT_SLA_URGENT_HOURS} h`],
            [tb('perk.disputeHelp'), tb('perk.standard'), tb('perk.priority')],
            [tb('perk.recovery'), tb('perk.priority'), tb('perk.priorityPlus')],
            [tb('perk.falseReports'), tb('perk.reinforced'), tb('perk.priorityReview')],
            [tb('perk.credits'), false, tb('perk.creditsValue', { n: String(b.monthlyCredits) })],
            [tb('perk.market'), false, true],
            [tb('perk.sellerPage'), false, true],
            [tb('perk.featured'), false, true],
            [tb('perk.earlyAccess'), false, tb('perk.earlyAccessValue', { n: String(b.earlyAccessHours) })],
          ]
  return layout(<>
    <h1 className="m-0 text-headline-lg text-on-surface">{tb('title')}</h1>
    <p className="m-0 mt-1 text-body-md text-on-surface-variant">{tb('intro')}</p>

    {paidMsg && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-tertiary-soft px-3 py-2 text-body-sm text-tertiary"><Icon name="check_circle" size={17} /> {paidMsg}</p>}

    {/* Current status */}
    <section className={`${card} mt-4 flex flex-col gap-3 sm:flex-row sm:items-center`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${b.tier === 'CERTIFIED' ? 'bg-tertiary-soft text-tertiary' : b.tier ? 'bg-verified-soft text-verified' : 'bg-surface-container text-on-surface-variant'}`}><Icon name="verified" size={26} fill={!!b.tier} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-label-lg text-on-surface">{b.tier ? tb('status.active', { badge: BADGE_LABEL[b.tier] }) : tb('status.none')}</div>
        <div className="text-body-sm text-on-surface-variant">
          {b.tier && b.until
            ? b.trial ? tb('status.trialUntil', { date: fdate(b.until) }) : tb('status.until', { date: fdate(b.until) })
            : b.identityVerified ? tb('status.verified') : tb('status.startKyc')}
        </div>
      </div>
      {!b.identityVerified && <button onClick={() => onNavigate('seller-kyc')} className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="badge" size={18} /> {tb('verifyIdentity')}</button>}
    </section>

    {/* Period */}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
      <h2 className="m-0 text-headline-sm text-on-surface">{tb('choose')}</h2>
      <div className="flex gap-1 rounded-xl bg-surface-container p-1">
        {([['MONTHLY', tb('monthly')], ['YEARLY', tb('yearly')]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setPeriod(k)} className={`flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none px-3 text-label-md ${period === k ? 'bg-surface-lowest text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>
            {l}{k === 'YEARLY' && yearlySaving > 0 && <span className="rounded bg-primary-fixed px-1 text-label-sm text-primary">{tb('monthsFree', { count: yearlySaving })}</span>}
          </button>
        ))}
      </div>
    </div>

    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
      {tiers(rules).map(t => {
        const p = plan(t.tier)
        const c = cta(t.tier)
        const current = b.tier === t.tier
        return (
          <section key={t.tier} className={`${card} flex flex-col ${current ? `ring-2 ${t.tier === 'CERTIFIED' ? 'ring-tertiary' : 'ring-verified'}` : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`flex items-center gap-1.5 text-headline-sm ${t.tone}`}><Icon name="verified" size={24} fill /> <span className="text-on-surface">{BADGE_LABEL[t.tier]}</span></span>
              {current && <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${t.soft} ${t.tone}`}>{b.trial ? tb('offered') : tb('active')}</span>}
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="whitespace-nowrap text-headline-lg font-extrabold text-on-surface"><OfferCredits op="BADGE" n={p.price} /></span>
              <span className="text-body-sm text-on-surface-variant">{period === 'MONTHLY' ? tb('perMonth') : tb('perYear')}</span>
            </div>
            {period === 'YEARLY' && <div className="text-body-sm text-on-surface-variant">{tb.rich('perMonthEq', { credits: <Credits n={Math.round(p.price / 12)} /> })}</div>}
            <ul className="m-0 mt-4 flex flex-1 list-none flex-col gap-2 p-0">
              {t.perks.map(x => <li key={x} className="flex items-start gap-2 text-body-sm text-on-surface"><Icon name="check" size={18} className={`shrink-0 ${t.tone}`} /> {x}</li>)}
            </ul>
            <button disabled={c.disabled} onClick={c.action} className={`mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none text-label-lg disabled:cursor-default ${c.disabled ? 'bg-surface-container text-on-surface-variant' : 'bg-primary text-white'}`}>{c.label}</button>
          </section>
        )
      })}
    </div>

    {/* Perks, side by side */}
    <section className={`${card} mt-4 overflow-hidden p-0`}>
      <h2 className="m-0 px-4 pt-4 text-headline-sm text-on-surface md:px-5 md:pt-5">{tb('whatsIncluded')}</h2>
      <table className="mt-3 hidden w-full table-fixed border-collapse text-body-sm md:table">
        <thead>
          <tr className="bg-surface-container-low text-label-md text-on-surface">
            <th className="w-[44%] px-3 py-2.5 text-left font-semibold md:px-5">{tb('colPerk')}</th>
            <th className="px-2 py-2.5 text-left font-semibold"><span className="flex items-center gap-1"><Icon name="verified" size={16} fill className="shrink-0 text-verified" /> <span className="truncate">{tb('colVerified')}</span></span></th>
            <th className="px-2 py-2.5 text-left font-semibold md:pr-5"><span className="flex items-center gap-1"><Icon name="verified" size={16} fill className="shrink-0 text-tertiary" /> <span className="truncate">{tb('colCertified')}</span></span></th>
          </tr>
        </thead>
        <tbody>
          {PERKS.map(([label, v, c]) => (
            <tr key={label} className="border-0 border-t border-solid border-outline-variant/60 align-top">
              <td className="px-3 py-2.5 text-on-surface md:px-5">{label}</td>
              {[v, c].map((x, i) => (
                <td key={i} className={`px-2 py-2.5 ${i ? 'md:pr-5' : ''}`}>
                  {x === true ? <Icon name="check" size={18} className={i ? 'text-tertiary' : 'text-verified'} /> : x === false ? <span className="text-outline">—</span> : <span className={`font-semibold ${i ? 'text-tertiary' : 'text-on-surface'}`}>{x}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Phones: one perk per block, the two values side by side. */}
      <ul className="m-0 mt-3 list-none p-0 md:hidden">
        {PERKS.map(([label, v, c]) => (
          <li key={label} className="border-0 border-t border-solid border-outline-variant/60 px-4 py-2.5">
            <div className="text-label-md text-on-surface">{label}</div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-body-sm">
              {[v, c].map((x, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1 whitespace-nowrap">
                  <Icon name="verified" size={14} fill className={`shrink-0 ${i ? 'text-tertiary' : 'text-verified'}`} />
                  {x === true ? <Icon name="check" size={17} className={i ? 'text-tertiary' : 'text-verified'} /> : x === false ? <span className="text-outline">—</span> : <span className={`truncate font-semibold ${i ? 'text-tertiary' : 'text-on-surface'}`}>{x}</span>}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>

    {/* Certified requirements */}
    <section className={`${card} mt-4`}>
      <h2 className="m-0 flex items-center gap-2 whitespace-nowrap text-headline-sm text-on-surface"><Icon name="checklist" size={22} className="shrink-0 text-tertiary" /> <span className="sm:hidden">{tb('conditionsShort')}</span><span className="hidden sm:inline">{tb('conditions')}</span></h2>
      <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{tb('conditionsHint')}</p>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {criteria.map(x => (
          <li key={x.label} className="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2.5">
            <Icon name={x.ok ? 'check_circle' : 'radio_button_unchecked'} size={20} fill={x.ok} className={`shrink-0 ${x.ok ? 'text-tertiary' : 'text-outline'}`} />
            <span className="min-w-0 flex-1 text-body-sm text-on-surface">{x.label}</span>
            <span className={`shrink-0 whitespace-nowrap text-label-md ${x.ok ? 'text-tertiary' : 'text-on-surface-variant'}`}>{x.value}</span>
          </li>
        ))}
      </ul>
    </section>

    <p className="m-0 mt-4 flex items-start gap-2 rounded-2xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="info" size={18} className="mt-0.5 shrink-0 text-primary" /> {tb('footnote')}</p>

    <WalletPaySheet
      open={!!paying}
      title={paying ? tb(paying.period === 'MONTHLY' ? 'pay.month' : 'pay.year', { badge: BADGE_LABEL[paying.tier] }) : ''}
      amount={paying?.price ?? 0}
      request={paying ? { kind: 'BADGE_SUBSCRIPTION', product: paying.product } : null}
      onClose={() => setPaying(null)}
      onPaid={paid}
    />
  </>)
}
