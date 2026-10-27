import Icon from '../../components/Icon'
import PaymentLogo, { useMobileMethods } from '../../components/PaymentLogo'
import { useNoCommissionClaims } from '../../lib/site'
import { useT } from '../../i18n'
import purchases from '../../i18n/ns/purchases'

// Buyer-side hand-over space (Stitch "Mon code de remise / Reçus & Clôtures /
// Ouvrir un litige / Médiation & Suivi"): desktop tab strip shared by every page.
export const BUYER_TABS = [
  { key: 'buyer-purchases', icon: 'qr_code_2', labelKey: 'tabs.handover', match: ['buyer-purchases', 'buyer-handover'] },
  { key: 'buyer-receipts', icon: 'receipt_long', labelKey: 'tabs.receipts', match: ['buyer-receipts', 'buyer-receipt'] },
  { key: 'buyer-dispute-new', icon: 'report', labelKey: 'tabs.disputeNew', match: ['buyer-dispute-new'] },
  { key: 'buyer-disputes', icon: 'gavel', labelKey: 'tabs.disputes', match: ['buyer-disputes'] },
] as const

export function BuyerTabs({ active, onNavigate }: { active: string; onNavigate: (p: any) => void }) {
  const tr = useT(purchases)
  return (
    <div className="mb-5 hidden items-center gap-1 rounded-2xl bg-surface-lowest p-1.5 shadow-sm md:flex">
      {BUYER_TABS.map(t => {
        const on = (t.match as readonly string[]).includes(active)
        return (
          <button key={t.key} onClick={() => onNavigate(t.key)} className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none px-3 py-2 text-label-md ${on ? 'bg-surface-container-high text-on-surface' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}>
            <Icon name={t.icon} size={17} /> {tr(t.labelKey)}
          </button>
        )
      })}
      <span className="ml-auto hidden items-center gap-1 whitespace-nowrap rounded-full bg-tertiary-soft px-3 py-1 text-label-sm uppercase text-tertiary xl:flex"><Icon name="verified_user" size={15} /> {tr('buyerProtection')}</span>
    </div>
  )
}

export function Breadcrumb({ items, onNavigate }: { items: { label: string; page?: string }[]; onNavigate: (p: any) => void }) {
  return (
    <nav className="mb-3 hidden flex-wrap items-center gap-1 text-label-sm text-on-surface-variant md:flex">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1">
          {i > 0 && <Icon name="chevron_right" size={14} />}
          {it.page ? <button onClick={() => onNavigate(it.page)} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-primary">{it.label}</button>
            : <span className={i === items.length - 1 ? 'text-primary' : 'text-on-surface'}>{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export const TRUST_FOOTER = [
  { icon: 'percent', titleKey: 'trust.commission.title', textKey: 'trust.commission.text', cls: 'bg-tertiary-soft text-tertiary' },
  { icon: 'account_balance_wallet', logos: true, titleKey: 'trust.payment.title', textKey: 'trust.payment.text', cls: 'bg-primary-fixed text-primary' },
  { icon: 'handshake', titleKey: 'trust.secure.title', textKey: 'trust.secure.text', cls: 'bg-tertiary-soft text-tertiary' },
] as const

export function TrustFooter() {
  const mobile = useMobileMethods()
  const noCommission = useNoCommissionClaims()
  const tr = useT(purchases)
  return (
    <section className={`mt-8 hidden gap-4 md:grid ${noCommission ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
      {TRUST_FOOTER.filter(t => noCommission || t.icon !== 'percent').map(t => (
        <div key={t.icon} className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4">
          {'logos' in t ? <span className="flex shrink-0 -space-x-2">{mobile.map(m => <PaymentLogo key={m} method={m} size={32} className="ring-2 ring-surface-lowest" />)}</span> : <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.cls}`}><Icon name={t.icon} size={22} /></span>}
          <div><div className="text-headline-sm text-on-surface">{tr(t.titleKey)}</div><div className="text-body-sm text-on-surface-variant">{tr(t.textKey)}</div></div>
        </div>
      ))}
    </section>
  )
}
