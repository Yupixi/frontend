import { createPortal } from 'react-dom'
import Icon from './Icon'
import { thumbnailUrl } from '../lib/media'
import { handoverProof } from '../lib/format'
import type { HandoverOrder } from '../graphql/sellerTools'

type Props = {
  order: HandoverOrder
  amount: number
  payment: string
  closedAt: string | null | undefined
}

const fmtDate = (d: string | null | undefined, withTime = true) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }) : '—'
// fr-FR groups thousands with a narrow no-break space the font lacks.
const fmtMoney = (n: number, currency: string) => `${n.toLocaleString('fr-FR').replace(/ /g, ' ')} ${currency === 'XOF' ? 'F CFA' : currency}`

// A4 receipt of a concluded hand-over. Rendered in <body> and only shown
// when printing ("Reçu PDF"): the app (sidebar, header…) is hidden then —
// see `.print-doc` in index.css.
export default function PrintableReceipt({ order: o, amount, payment, closedAt }: Props) {
  const currency = o.listing.currency
  const ref = `${o.reference}-CI`
  const rows: [string, string, string?][] = [
    ['Lieu de remise', o.meetup?.place ?? '—', 'Lieu public convenu entre les deux parties'],
    ['Date de la remise', fmtDate(closedAt), handoverProof(o.meetup)],
    ['Mode de règlement', payment, 'Payé directement au vendeur, à la remise'],
    ['Accord conclu le', fmtDate(o.agreedAt, false)],
  ]
  const offer = o.acceptedOffer && o.listing.price != null && o.acceptedOffer.amount !== o.listing.price

  return createPortal(
    <div className="print-doc" aria-hidden="true">
      <div className="mx-auto max-w-[180mm] font-sans text-[11pt] leading-snug text-[#1f1b1b]">
        {/* Header */}
        <header className="flex items-start justify-between border-0 border-b-2 border-solid border-[#FE0000] pb-4">
          <div>
            <img src="/logo-dilchap.png" alt="Dilchap" className="block h-10 w-auto" />
            <div className="mt-1 text-[9pt] text-[#6b6363]">Marketplace de seconde main — Côte d’Ivoire</div>
          </div>
          <div className="text-right">
            <div className="text-[16pt] font-extrabold">Reçu de remise</div>
            <div className="mt-0.5 font-mono text-[10pt]">N° {ref}</div>
            <div className="text-[9pt] text-[#6b6363]">Émis le {fmtDate(new Date().toISOString())}</div>
          </div>
        </header>

        {/* Status */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-[#e7f4ec] px-4 py-2.5 text-[#0f6b3a]">
          <span className="flex items-center gap-1.5 text-[11pt] font-bold"><Icon name="verified" size={18} /> Remise validée par code sécurisé</span>
          <span className="text-[9pt] font-semibold uppercase tracking-wide">Transaction clôturée</span>
        </div>

        {/* Parties */}
        <section className="mt-5 grid grid-cols-2 gap-4">
          {([['Acheteur', o.buyer], ['Vendeur', o.seller]] as const).map(([label, p]) => (
            <div key={label} className="rounded-lg border border-solid border-[#e3dcdc] px-4 py-3">
              <div className="text-[8.5pt] font-semibold uppercase tracking-wide text-[#6b6363]">{label}</div>
              <div className="mt-1 flex items-center gap-1 text-[12pt] font-bold">{p.fullName}{p.badge && <Icon name="verified" size={15} className={p.badge === 'CERTIFIED' ? 'text-[#0f6b3a]' : 'text-[#1877F2]'} />}</div>
              {p.city && <div className="text-[9.5pt] text-[#6b6363]">{p.city}</div>}
            </div>
          ))}
        </section>

        {/* Item */}
        <table className="mt-5 w-full border-collapse text-[10.5pt]">
          <thead>
            <tr className="bg-[#f6f1f1] text-left text-[8.5pt] uppercase tracking-wide text-[#6b6363]">
              <th className="px-3 py-2 font-semibold">Article</th>
              <th className="px-3 py-2 font-semibold">Catégorie</th>
              <th className="px-3 py-2 text-right font-semibold">Prix affiché</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-0 border-b border-solid border-[#e3dcdc]">
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  {o.listing.coverImageUrl && <img src={thumbnailUrl(o.listing.coverImageUrl)} alt="" className="h-14 w-14 rounded-md object-cover" />}
                  <div>
                    <div className="font-bold">{o.listing.title}</div>
                    <div className="text-[9pt] text-[#6b6363]">{[o.listing.brand, o.listing.condition && o.listing.condition !== 'N/A' ? o.listing.condition : null, o.listing.size, o.listing.city].filter(Boolean).join(' • ')}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">{o.listing.category.name}</td>
              <td className="px-3 py-3 text-right">{o.listing.price != null ? fmtMoney(o.listing.price, currency) : '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <section className="mt-3 ml-auto w-[80mm] text-[10.5pt]">
          {offer && <div className="flex justify-between py-1"><span className="text-[#6b6363]">Offre acceptée</span><span>{fmtMoney(o.acceptedOffer!.amount, currency)}</span></div>}
          <div className="flex justify-between py-1"><span className="text-[#6b6363]">Commission Dilchap</span><span>0 F CFA</span></div>
          <div className="flex justify-between py-1"><span className="text-[#6b6363]">Frais de mise en relation</span><span>0 F CFA</span></div>
          <div className="mt-1 flex items-baseline justify-between border-0 border-t-2 border-solid border-[#1f1b1b] pt-2">
            <span className="font-bold">Montant réglé</span>
            <span className="text-[16pt] font-extrabold text-[#FE0000]">{fmtMoney(amount, currency)}</span>
          </div>
        </section>

        {/* Details */}
        <section className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-solid border-[#e3dcdc] px-4 py-3.5">
          {rows.map(([label, value, sub]) => (
            <div key={label}>
              <div className="text-[8.5pt] font-semibold uppercase tracking-wide text-[#6b6363]">{label}</div>
              <div className="font-semibold">{value}</div>
              {sub && <div className="text-[9pt] text-[#6b6363]">{sub}</div>}
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-8 border-0 border-t border-solid border-[#e3dcdc] pt-3 text-[8.5pt] leading-relaxed text-[#6b6363]">
          <p className="m-0">Ce reçu atteste d’une remise en main propre enregistrée sur Dilchap. Le paiement a été effectué directement entre l’acheteur et le vendeur : Dilchap n’encaisse aucun fonds et ne prélève aucune commission sur cette vente.</p>
          <p className="m-0 mt-1">Référence de la transaction : <span className="font-mono text-[#1f1b1b]">{ref}</span> — Assistance : via votre espace Dilchap, rubrique « Mes achats ».</p>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
