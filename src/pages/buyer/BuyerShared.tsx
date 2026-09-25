import Icon from '../../components/Icon'

// Buyer-side hand-over space (Stitch "Mon code de remise / Reçus & Clôtures /
// Ouvrir un litige / Médiation & Suivi"): desktop tab strip shared by every page.
export const BUYER_TABS = [
  { key: 'buyer-purchases', icon: 'qr_code_2', label: 'Mon code remise', match: ['buyer-purchases', 'buyer-handover'] },
  { key: 'buyer-receipts', icon: 'receipt_long', label: 'Reçus & Clôtures', match: ['buyer-receipts', 'buyer-receipt'] },
  { key: 'buyer-dispute-new', icon: 'report', label: 'Ouvrir un litige', match: ['buyer-dispute-new'] },
  { key: 'buyer-disputes', icon: 'gavel', label: 'Médiation & Suivi', match: ['buyer-disputes'] },
]

export function BuyerTabs({ active, onNavigate }: { active: string; onNavigate: (p: any) => void }) {
  return (
    <div className="mb-5 hidden items-center gap-1 rounded-2xl bg-surface-lowest p-1.5 shadow-sm md:flex">
      {BUYER_TABS.map(t => {
        const on = t.match.includes(active)
        return (
          <button key={t.key} onClick={() => onNavigate(t.key)} className={`flex cursor-pointer items-center gap-1.5 rounded-xl border-none px-3 py-2 text-label-md ${on ? 'bg-surface-container-high text-on-surface' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}>
            <Icon name={t.icon} size={17} /> {t.label}
          </button>
        )
      })}
      <span className="ml-auto flex items-center gap-1 rounded-full bg-tertiary-soft px-3 py-1 text-label-sm uppercase text-tertiary"><Icon name="verified_user" size={15} /> Protection acheteur</span>
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
  { icon: 'percent', title: '0% Commission', text: 'Achetez et vendez sans frais cachés en remise directe.', cls: 'bg-tertiary-soft text-tertiary' },
  { icon: 'account_balance_wallet', title: 'Wave & Orange Money', text: 'Vous ne payez le vendeur qu’après avoir vérifié l’article sur place.', cls: 'bg-primary-fixed text-primary' },
  { icon: 'handshake', title: 'Remise Sécurisée', text: "Contrôle physique de l'article avant confirmation définitive.", cls: 'bg-tertiary-soft text-tertiary' },
]

export function TrustFooter() {
  return (
    <section className="mt-8 hidden gap-4 md:grid md:grid-cols-3">
      {TRUST_FOOTER.map(t => (
        <div key={t.title} className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.cls}`}><Icon name={t.icon} size={22} /></span>
          <div><div className="text-headline-sm text-on-surface">{t.title}</div><div className="text-body-sm text-on-surface-variant">{t.text}</div></div>
        </div>
      ))}
    </section>
  )
}
