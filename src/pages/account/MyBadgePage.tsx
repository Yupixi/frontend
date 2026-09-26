import { useState } from 'react'
import { useApolloClient, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import PaymentSheet from '../../components/PaymentSheet'
import { AccountLayout } from './AccountLayout'
import { ME_QUERY, type AuthUser } from '../../graphql/auth'
import { BADGE_LABEL, MY_BADGE_QUERY, type BadgePlan, type BadgeTier, type MyBadge } from '../../graphql/badges'

type Props = { onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void; onProfileUpdated: (u: AuthUser) => void }

const fdate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const card = 'rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5'

const TIERS: { tier: BadgeTier, tone: string, soft: string, perks: string[] }[] = [
  {
    tier: 'VERIFIED', tone: 'text-verified', soft: 'bg-verified-soft',
    perks: ['Coche bleue à côté de votre nom', 'Sur votre profil, vos annonces et la messagerie', 'Visible avec le filtre « Vendeurs vérifiés »'],
  },
  {
    tier: 'CERTIFIED', tone: 'text-tertiary', soft: 'bg-tertiary-soft',
    perks: ['Coche verte « Vendeur certifié »', 'Sur votre profil, vos annonces et la messagerie', 'Visible avec le filtre « Vendeurs vérifiés »', 'Réservé aux vendeurs au bon historique'],
  },
]

// Paid badges, "like Facebook": identity check first, then a monthly or
// yearly subscription paid by Mobile Money.
export default function MyBadgePage({ onNavigate, currentUser, onLogout, onProfileUpdated }: Props) {
  const client = useApolloClient()
  const { data, refetch } = useQuery<{ myBadge: MyBadge }>(MY_BADGE_QUERY, { fetchPolicy: 'cache-and-network' })
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [paying, setPaying] = useState<BadgePlan | null>(null)
  const [paidMsg, setPaidMsg] = useState('')
  const b = data?.myBadge
  const layout = (body: React.ReactNode) => (
    <AccountLayout active="seller-badge" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title="Mon badge">{body}</AccountLayout>
  )
  if (!b) return layout(<div className="h-64 animate-pulse rounded-2xl bg-surface-container" />)

  const plan = (tier: BadgeTier) => b.plans.find(p => p.tier === tier && p.period === period)!
  const monthly = (tier: BadgeTier) => b.plans.find(p => p.tier === tier && p.period === 'MONTHLY')!
  const yearly = b.plans.find(p => p.tier === 'VERIFIED' && p.period === 'YEARLY')!
  const yearlySaving = Math.round(12 - yearly.price / monthly('VERIFIED').price)
  const active = b.tier && !b.trial ? b.tier : null
  const paid = () => {
    setPaying(null)
    setPaidMsg('Paiement confirmé : votre badge est actif.')
    void refetch()
    void client.query<{ me: AuthUser }>({ query: ME_QUERY, fetchPolicy: 'network-only' }).then(r => r.data?.me && onProfileUpdated(r.data.me))
  }
  const criteria = [
    { ok: b.identityVerified, label: 'Identité vérifiée par Dilchap', value: b.identityVerified ? 'Validée' : 'À faire' },
    { ok: b.sales >= b.criteria.minSales, label: `Au moins ${b.criteria.minSales} ventes conclues`, value: `${b.sales} / ${b.criteria.minSales}` },
    { ok: b.reviews >= b.criteria.minReviews, label: `Au moins ${b.criteria.minReviews} avis d’acheteurs`, value: `${b.reviews} / ${b.criteria.minReviews}` },
    { ok: b.reviews > 0 && b.rating >= b.criteria.minRating, label: `Note moyenne d’au moins ${b.criteria.minRating.toLocaleString('fr-FR')} / 5`, value: b.reviews ? `${b.rating.toFixed(1)} / 5` : '—' },
    { ok: b.penalties === 0, label: 'Aucune pénalité de litige', value: b.penalties ? `${b.penalties}` : 'Aucune' },
  ]

  const cta = (tier: BadgeTier) => {
    if (!b.identityVerified) return { label: 'Vérifier mon identité d’abord', disabled: false, action: () => onNavigate('seller-kyc') }
    if (tier === 'CERTIFIED' && !b.certifiedEligible) return { label: 'Conditions non remplies', disabled: true, action: () => {} }
    if (tier === 'VERIFIED' && active === 'CERTIFIED') return { label: 'Inclus dans votre badge', disabled: true, action: () => {} }
    const label = active === tier ? 'Prolonger' : tier === 'CERTIFIED' && active === 'VERIFIED' ? 'Passer à Vendeur certifié' : 'S’abonner'
    return { label, disabled: false, action: () => setPaying(plan(tier)) }
  }

  return layout(<>
    <h1 className="m-0 text-headline-lg text-on-surface">Badges Dilchap</h1>
    <p className="m-0 mt-1 text-body-md text-on-surface-variant">Affichez une coche à côté de votre nom pour rassurer les acheteurs. La vérification d’identité est le prérequis ; le badge s’active par abonnement.</p>

    {paidMsg && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-tertiary-soft px-3 py-2 text-body-sm text-tertiary"><Icon name="check_circle" size={17} /> {paidMsg}</p>}

    {/* Current status */}
    <section className={`${card} mt-4 flex flex-col gap-3 sm:flex-row sm:items-center`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${b.tier === 'CERTIFIED' ? 'bg-tertiary-soft text-tertiary' : b.tier ? 'bg-verified-soft text-verified' : 'bg-surface-container text-on-surface-variant'}`}><Icon name="verified" size={26} fill={!!b.tier} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-label-lg text-on-surface">{b.tier ? `Badge ${BADGE_LABEL[b.tier]} actif` : 'Aucun badge actif'}</div>
        <div className="text-body-sm text-on-surface-variant">
          {b.tier && b.until
            ? b.trial ? `Offert jusqu’au ${fdate(b.until)}, puis sur abonnement.` : `Jusqu’au ${fdate(b.until)}.`
            : b.identityVerified ? 'Votre identité est vérifiée : choisissez une formule ci-dessous.' : 'Commencez par vérifier votre identité.'}
        </div>
      </div>
      {!b.identityVerified && <button onClick={() => onNavigate('seller-kyc')} className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="badge" size={18} /> Vérifier mon identité</button>}
    </section>

    {/* Period */}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
      <h2 className="m-0 text-headline-sm text-on-surface">Choisissez votre formule</h2>
      <div className="flex gap-1 rounded-xl bg-surface-container p-1">
        {([['MONTHLY', 'Mensuel'], ['YEARLY', 'Annuel']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setPeriod(k)} className={`flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none px-3 text-label-md ${period === k ? 'bg-surface-lowest text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>
            {l}{k === 'YEARLY' && yearlySaving > 0 && <span className="rounded bg-primary-fixed px-1 text-label-sm text-primary">{yearlySaving} mois offerts</span>}
          </button>
        ))}
      </div>
    </div>

    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
      {TIERS.map(t => {
        const p = plan(t.tier)
        const c = cta(t.tier)
        const current = b.tier === t.tier
        return (
          <section key={t.tier} className={`${card} flex flex-col ${current ? `ring-2 ${t.tier === 'CERTIFIED' ? 'ring-tertiary' : 'ring-verified'}` : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`flex items-center gap-1.5 text-headline-sm ${t.tone}`}><Icon name="verified" size={24} fill /> <span className="text-on-surface">{BADGE_LABEL[t.tier]}</span></span>
              {current && <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${t.soft} ${t.tone}`}>{b.trial ? 'Offert' : 'Actif'}</span>}
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-headline-lg font-extrabold text-on-surface"><Price amount={p.price} /></span>
              <span className="text-body-sm text-on-surface-variant">/ {period === 'MONTHLY' ? 'mois' : 'an'}</span>
            </div>
            {period === 'YEARLY' && <div className="text-body-sm text-on-surface-variant">soit <Price amount={Math.round(p.price / 12)} /> par mois</div>}
            <ul className="m-0 mt-4 flex flex-1 list-none flex-col gap-2 p-0">
              {t.perks.map(x => <li key={x} className="flex items-start gap-2 text-body-sm text-on-surface"><Icon name="check" size={18} className={`shrink-0 ${t.tone}`} /> {x}</li>)}
            </ul>
            <button disabled={c.disabled} onClick={c.action} className={`mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none text-label-lg disabled:cursor-default ${c.disabled ? 'bg-surface-container text-on-surface-variant' : 'bg-primary text-white'}`}>{c.label}</button>
          </section>
        )
      })}
    </div>

    {/* Certified requirements */}
    <section className={`${card} mt-4`}>
      <h2 className="m-0 flex items-center gap-2 whitespace-nowrap text-headline-sm text-on-surface"><Icon name="checklist" size={22} className="shrink-0 text-tertiary" /> <span className="sm:hidden">Conditions « Certifié »</span><span className="hidden sm:inline">Conditions du badge Vendeur certifié</span></h2>
      <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Vérifiées au moment de l’abonnement et de chaque renouvellement.</p>
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

    <p className="m-0 mt-4 flex items-start gap-2 rounded-2xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="info" size={18} className="mt-0.5 shrink-0 text-primary" /> Paiement par Mobile Money (Wave, Orange, MTN, Moov). Sans renouvellement, le badge disparaît à la date de fin ; votre identité reste vérifiée.</p>

    <PaymentSheet
      open={!!paying}
      title={paying ? `Badge ${BADGE_LABEL[paying.tier]} — ${paying.period === 'MONTHLY' ? '1 mois' : '1 an'}` : ''}
      amount={paying?.price ?? 0}
      request={paying ? { kind: 'BADGE_SUBSCRIPTION', product: paying.product } : null}
      onClose={() => setPaying(null)}
      onPaid={paid}
    />
  </>)
}
