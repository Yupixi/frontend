import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../Icon'
import { fmtDate, useT } from '../../i18n'
import huntNs from '../../i18n/ns/hunt'
import { MY_HUNT_VOUCHER_QUERY, SET_HUNT_VOUCHER_MUTATION, useHunt } from '../../lib/treasureHunt'

type Finder = { id: string; at: string; kind: 'GIFT' | 'ADVENT'; voucherPercent: number | null; member: { id: string; fullName: string }; listing: { id: string; title: string } }
const CHOICES = [0, 5, 10, 15, 20, 25, 30]

// Seller side of the « Chasse au trésor »: the discount offered to whoever
// finds a gift on their listings, and who found one (to honour it).
export default function SellerHuntCard() {
  const t = useT(huntNs)
  const { hunt } = useHunt()
  const campaignId = hunt?.campaign.id
  const { data, refetch } = useQuery<{ myHuntVoucher: { participating: boolean; percent: number | null }; myHuntFinds: Finder[] }>(MY_HUNT_VOUCHER_QUERY, {
    variables: { campaignId }, skip: !campaignId, fetchPolicy: 'cache-and-network',
  })
  const [save, { loading }] = useMutation(SET_HUNT_VOUCHER_MUTATION)
  const [value, setValue] = useState(0)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const current = data?.myHuntVoucher.percent ?? 0
  useEffect(() => setValue(current), [current])
  if (!hunt || !data) return null
  const v = data.myHuntVoucher
  const finders = data.myHuntFinds
  return (
    <section className="hunt-seller mb-4 overflow-hidden rounded-2xl text-white">
      <div className="flex items-start gap-3 p-4">
        <span className="hunt-pill-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20"><Icon name="redeem" size={22} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-label-lg">{t('seller.title', { name: hunt.title })}</h2>
          <p className="m-0 mt-0.5 text-body-sm text-white/85">{v.participating ? t('seller.in', { campaign: hunt.campaign.name }) : t('seller.out', { campaign: hunt.campaign.name })}</p>
        </div>
      </div>
      {v.participating && (
        <div className="space-y-3 bg-surface-lowest p-4 text-on-surface">
          <div>
            <span className="text-label-md">{t('seller.voucher')}</span>
            <p className="m-0 text-body-sm text-on-surface-variant">{t('seller.voucherHint')}</p>
            <div role="radiogroup" aria-label={t('seller.voucher')} className="mt-2 flex flex-wrap gap-2">
              {CHOICES.map(p => (
                <button key={p} type="button" role="radio" aria-checked={value === p} onClick={() => { setValue(p); setNotice(null) }}
                  className={`min-h-10 cursor-pointer rounded-full border-[1.5px] border-solid px-3.5 text-label-md ${value === p ? 'border-primary bg-primary-fixed text-primary' : 'border-outline-variant bg-transparent text-on-surface'}`}>
                  {p ? `−${p} %` : t('seller.none')}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" disabled={loading || value === current} onClick={() => {
                save({ variables: { campaignId, percent: value || null } })
                  .then(() => { setNotice({ ok: true, text: t('seller.saved') }); void refetch() })
                  .catch((e: Error) => setNotice({ ok: false, text: e.message }))
              }} className="cursor-pointer rounded-full border-none bg-primary px-4 py-2 text-label-md text-white disabled:opacity-50">{t('seller.save')}</button>
              {notice && <span role="status" className={`text-body-sm ${notice.ok ? 'text-tertiary' : 'text-primary'}`}>{notice.text}</span>}
            </div>
          </div>
          <div>
            <span className="text-label-md">{t('seller.finders', { count: finders.length, n: finders.length })}</span>
            {finders.length === 0 ? <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('seller.noFinders')}</p> : (
              <ul className="m-0 mt-2 max-h-64 list-none space-y-1.5 overflow-y-auto p-0">
                {finders.map(f => (
                  <li key={f.id} className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-body-sm">
                    <Icon name="redeem" size={16} className={f.kind === 'ADVENT' ? 'text-[#C98A00]' : 'text-primary'} />
                    <span className="min-w-0 flex-1 truncate"><b>{f.member.fullName}</b> · {f.listing.title}</span>
                    {f.voucherPercent ? <span className="shrink-0 rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary">−{f.voucherPercent} %</span> : null}
                    <span className="shrink-0 text-label-sm text-on-surface-variant">{fmtDate(f.at, { day: 'numeric', month: 'short' })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
