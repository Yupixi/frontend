import Icon from '../../components/Icon'
import SellerBadge from '../../components/SellerBadge'
import SupportCenter from '../../components/SupportCenter'
import { AccountLayout } from './AccountLayout'
import { BADGE_LABEL } from '../../graphql/badges'
import type { AuthUser } from '../../graphql/auth'
import { delayText, useRules } from '../../lib/rules'
import { useMemberCountryCode } from '../../lib/countries'
import { useEffect, useState } from 'react'
import { OPEN_SUPPORT_EVENT, requestOpenHelp, type SupportAbout } from '../../lib/navigation'

type Props = { onNavigate: (p: any) => void; focusTicketId?: string | null; currentUser?: AuthUser | null; onLogout: () => void }

const card = 'rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5'
// "Aide & support": requests to the Dilchap team, answered in the BO. The
// response target depends on the paid badge.
export default function Support({ onNavigate, focusTicketId, currentUser, onLogout }: Props) {
  const badge = currentUser?.badge ?? null
  // Response target from « Règles de la marketplace », of the member's
  // account country.
  const rules = useRules(useMemberCountryCode())
  const hours = badge === 'CERTIFIED' ? rules.SUPPORT_SLA_URGENT_HOURS : badge ? rules.SUPPORT_SLA_HIGH_HOURS : rules.SUPPORT_SLA_NORMAL_HOURS
  // The floating tab is hidden here: this page takes the « Contacter le
  // support à propos de… » requests itself.
  const [about, setAbout] = useState<(SupportAbout & { nonce: number }) | null>(null)
  useEffect(() => {
    const onRequest = (e: Event) => { const d = (e as CustomEvent<SupportAbout>).detail; if (d) setAbout({ ...d, nonce: Date.now() }) }
    window.addEventListener(OPEN_SUPPORT_EVENT, onRequest)
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onRequest)
  }, [])
  return (
    <AccountLayout active="support" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title="Aide & support">
      <h1 className="m-0 text-headline-lg text-on-surface">Aide & support</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">Écrivez à l’équipe Dilchap comme dans une messagerie : réponse ici et par notification. L’onglet « Support » est aussi disponible sur toutes les pages.</p>

      {/* The guides often answer before the team does. */}
      <a
        href="/aide"
        onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); requestOpenHelp('') }}
        className={`${card} mt-4 flex items-center gap-3 no-underline transition-shadow hover:shadow-md`}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="menu_book" size={24} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-label-lg text-on-surface">Centre d’aide</span>
          <span className="block text-body-sm text-on-surface-variant">Des guides pas à pas pour vendre, acheter, payer et se retrouver.</span>
        </span>
        <Icon name="chevron_right" size={20} className="shrink-0 text-on-surface-variant" />
      </a>

      <section className={`${card} mt-4 flex flex-col gap-3 sm:flex-row sm:items-center`}>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${badge === 'CERTIFIED' ? 'bg-tertiary-soft text-tertiary' : badge ? 'bg-verified-soft text-verified' : 'bg-surface-container text-on-surface-variant'}`}><Icon name="support_agent" size={26} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-label-lg text-on-surface">Délai de réponse : {delayText(hours)} {badge && <SellerBadge tier={badge} variant="pill" short />}</div>
          <div className="text-body-sm text-on-surface-variant">{badge === 'CERTIFIED' ? 'Support ultra-prioritaire inclus dans votre badge Vendeur certifié.' : badge ? `Support prioritaire inclus dans votre badge ${BADGE_LABEL[badge]}.` : `Avec un badge : réponse en ${delayText(rules.SUPPORT_SLA_HIGH_HOURS)} (Compte vérifié) ou ${delayText(rules.SUPPORT_SLA_URGENT_HOURS)} (Vendeur certifié).`}</div>
        </div>
        {!badge && <button onClick={() => onNavigate('seller-badge')} className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="verified" size={17} fill className="text-verified" /> Voir les badges</button>}
      </section>

      {/* The same conversations as the « Support » tab of every page. */}
      <section className="mt-4 h-[min(720px,calc(100dvh-12rem))] min-h-[480px] overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
        <SupportCenter currentUser={currentUser} focusTicketId={focusTicketId} about={about} />
      </section>
    </AccountLayout>
  )
}
