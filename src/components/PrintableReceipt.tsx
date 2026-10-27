import { createPortal } from 'react-dom'
import Icon from './Icon'
import { thumbnailUrl } from '../lib/media'
import { handoverHeadline, handoverProof } from '../lib/format'
import type { HandoverOrder } from '../graphql/sellerTools'
import { Claim } from '../lib/site'
import { marketForCountry } from '../data/markets'
import { fmtDate as fmtIntlDate, fmtNumber, getLocale, useT } from '../i18n'
import common from '../i18n/ns/common'
import receipts from '../i18n/ns/receipts'

type Props = {
  order: HandoverOrder
  amount: number
  payment: string
  closedAt: string | null | undefined
}

const fmtDate = (d: string | null | undefined, withTime = true) =>
  d ? fmtIntlDate(d, { day: 'numeric', month: 'long', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }) : '—'
// Receipts print the full unit: « F CFA » in French, « CFA F » in English.
const fmtMoney = (n: number, currency: string) => `${fmtNumber(n, 3)} ${currency === 'XOF' ? (getLocale() === 'fr' ? 'F CFA' : 'CFA F') : currency}` // i18n-ignore

// A4 receipt of a concluded hand-over. Rendered in <body> and only shown
// when printing ("Reçu PDF"): the app (sidebar, header…) is hidden then —
// see `.print-doc` in index.css.
export default function PrintableReceipt({ order: o, amount, payment, closedAt }: Props) {
  const t = useT(receipts)
  const tc = useT(common)
  const currency = o.listing.currency
  // Suffix and header: the listing's country.
  const country = marketForCountry(o.listing.countryCode ?? 'CI')
  const ref = `${o.reference}-${country?.code ?? 'CI'}`
  const rows: [string, string, string?][] = [
    [t('print.place'), o.meetup?.place ?? '—', t('print.placeSub')],
    [t('print.date'), fmtDate(closedAt), handoverProof(o.meetup)],
    [t('print.payment'), payment, t('print.paymentSub')],
    [t('print.agreedOn'), fmtDate(o.agreedAt, false)],
  ]
  const offer = o.acceptedOffer && o.listing.price != null && o.acceptedOffer.amount !== o.listing.price

  return createPortal(
    <div className="print-doc" aria-hidden="true">
      <div className="mx-auto max-w-[180mm] font-sans text-[11pt] leading-snug text-[#1f1b1b]">
        {/* Header */}
        <header className="flex items-start justify-between border-0 border-b-2 border-solid border-[#FE0000] pb-4">
          <div>
            <img src="/logo-dilchap.png" alt="Dilchap" className="block h-10 w-auto" />
            <div className="mt-1 text-[9pt] text-[#6b6363]">{t('print.marketplace', { country: country ? (tc as unknown as (k: string) => string)(`countryName.${country.code}`) : t('print.westAfrica') })}</div>
          </div>
          <div className="text-right">
            <div className="text-[16pt] font-extrabold">{t('print.title')}</div>
            <div className="mt-0.5 font-mono text-[10pt]">{t('print.number', { ref })}</div>
            <div className="text-[9pt] text-[#6b6363]">{t('print.issuedOn', { date: fmtDate(new Date().toISOString()) })}</div>
          </div>
        </header>

        {/* Status */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-[#e7f4ec] px-4 py-2.5 text-[#0f6b3a]">
          <span className="flex items-center gap-1.5 text-[11pt] font-bold"><Icon name="verified" size={18} /> {handoverHeadline(o.meetup)}</span>
          <span className="text-[9pt] font-semibold uppercase tracking-wide">{t('print.closed')}</span>
        </div>

        {/* Parties */}
        <section className="mt-5 grid grid-cols-2 gap-4">
          {([[t('print.buyer'), o.buyer], [t('print.seller'), o.seller]] as const).map(([label, p]) => (
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
              <th className="px-3 py-2 font-semibold">{t('print.item')}</th>
              <th className="px-3 py-2 font-semibold">{t('print.category')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('print.listedPrice')}</th>
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
          {offer && <div className="flex justify-between py-1"><span className="text-[#6b6363]">{t('print.acceptedOffer')}</span><span>{fmtMoney(o.acceptedOffer!.amount, currency)}</span></div>}
          <Claim><div className="flex justify-between py-1"><span className="text-[#6b6363]">{t('print.commission')}</span><span>{fmtMoney(0, 'XOF')}</span></div></Claim>
          <Claim><div className="flex justify-between py-1"><span className="text-[#6b6363]">{t('print.connectionFees')}</span><span>{fmtMoney(0, 'XOF')}</span></div></Claim>
          <div className="mt-1 flex items-baseline justify-between border-0 border-t-2 border-solid border-[#1f1b1b] pt-2">
            <span className="font-bold">{t('print.amountPaid')}</span>
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
          <p className="m-0">{t.rich('print.footer', { claim: c => <Claim>{c}</Claim> })}</p>
          <p className="m-0 mt-1">{t.rich('print.footerRef', { ref, mono: c => <span className="font-mono text-[#1f1b1b]">{c}</span> })}</p>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
