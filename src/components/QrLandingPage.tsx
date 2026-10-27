import { useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from './Icon'
import { LaunchPage } from './LaunchGate'
import { Shell } from './EmailLinkPage'
import { QR_LANDING_QUERY, type QrLanding } from '../graphql/shopQr'
import { useSite } from '../lib/site'
import { fmtDate, useT } from '../i18n'
import appShell from '../i18n/ns/appShell'

// /q/<code>: a printed QR code of an official shop, a member or a listing.
// The storefront's server (Caddyfile → Backend /seo/q/<code>) counts the
// scan and sends an active QR straight to its page; the app only opens here
// for the other cases — before the launch of the QR's country (launch page
// + « … arrive sur Dilchap au lancement »), a QR waiting for its date (in
// a launched country: just the date, no launch wording), a blank QR, a
// profile or listing no longer
// there, a QR no longer active — or when the server couldn't answer (then
// an active QR is forwarded from here).
const codeOf = (pathname: string) => decodeURIComponent(pathname.replace(/^\/q\//, '').replace(/\/+$/, '')).slice(0, 32)

// Never indexed (the server's page says it too).
function useNoIndex(title: string) {
  useEffect(() => {
    document.title = title
    let m = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m) }
    m.content = 'noindex, follow'
  }, [title])
}

const homeBtn = 'mt-6 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-4 text-label-lg text-white no-underline hover:bg-primary-dark'
const ghostBtn = 'mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container-low px-4 text-label-lg text-on-surface no-underline hover:bg-surface-container'

export default function QrLandingPage() {
  const t = useT(appShell)
  const code = codeOf(window.location.pathname)
  const { brand } = useSite()
  const { data, loading, error } = useQuery<{ qrLanding: QrLanding }>(QR_LANDING_QUERY, { variables: { code }, fetchPolicy: 'network-only' })
  const q = data?.qrLanding
  const shopName = q?.shop?.name
  // Who arrives at the launch: the shop, the member, the listing.
  const pendingName = shopName ?? q?.member?.name ?? q?.listing?.title
  // The launch page only while the QR's country is still behind it.
  const atLaunch = q?.state === 'PENDING' && !!q.launch?.active
  useNoIndex(
    `${atLaunch ? (pendingName ? t(q.kind === 'SHOP' ? 'qr.soonShop' : 'qr.soonOther', { name: pendingName }) : t('qr.soonBrand', { brand: brand.name }))
      : q?.state === 'PENDING' ? pendingName ?? t('qr.notActiveYet')
      : q?.state === 'UNASSIGNED' ? t('qr.unassigned')
      : q?.state === 'SHOP_UNAVAILABLE' ? t('qr.shopUnavailable')
      : q?.state === 'MEMBER_UNAVAILABLE' ? t('qr.memberUnavailable')
      : q?.state === 'LISTING_UNAVAILABLE' ? t('qr.listingUnavailable')
      : t('qr.inactive')} | ${brand.name}`,
  )
  // Active (the server was bypassed): on to its page.
  useEffect(() => {
    if (q?.state !== 'ACTIVE') return
    const to = q.path ?? (q.shop?.slug ? `/boutique/${encodeURIComponent(q.shop.slug)}?utm_source=qr&utm_medium=print` : null)
    if (to && to.startsWith('/')) window.location.replace(to)
  }, [q])

  if (loading || q?.state === 'ACTIVE') return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  const date = q?.activateAt ? fmtDate(q.activateAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' }) : null
  const b = (c: React.ReactNode) => <b className="break-words">{c}</b>
  const quoted = (title: string | null | undefined) => (title ? t.rich('qr.quotedTitle', { title, b }) : '')
  if (atLaunch && q.launch) {
    const when = date ? t('qr.onDate', { date }) : t('qr.atLaunch')
    return (
      <LaunchPage
        status={{ ...q.launch, active: true, preview: false, launchAt: q.activateAt ?? q.launch.launchAt }}
        onOpen={() => window.location.reload()}
        notice={
          <p className="m-0 inline-flex max-w-full items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-left text-body-md text-white ring-1 ring-white/15 backdrop-blur">
            {(q.shop?.logoUrl ?? q.member?.avatarUrl ?? q.listing?.photo)
              ? <img src={(q.shop?.logoUrl ?? q.member?.avatarUrl ?? q.listing?.photo)!} alt="" className="h-10 w-10 shrink-0 rounded-xl bg-white object-cover" />
              : <Icon name={q.kind === 'MEMBER' ? 'person' : q.kind === 'LISTING' ? 'sell' : 'storefront'} size={22} className="shrink-0" />}
            <span className="min-w-0">
              {q.kind === 'MEMBER'
                ? t.rich('qr.memberArrives', { who: q.member?.name ? b(q.member.name) : t('qr.thisSeller'), brand: brand.name, when })
                : q.kind === 'LISTING'
                  ? t.rich('qr.listingArrives', { title: quoted(q.listing?.title), seller: q.listing?.sellerName ? t('qr.bySeller', { name: q.listing.sellerName }) : '', brand: brand.name, when })
                  : t.rich('qr.shopOpens', { who: shopName ? t.rich('qr.theShop', { name: shopName, b }) : t('qr.thisShop'), brand: brand.name, when })}
              <span className="block text-body-sm text-white/70">{t('qr.keep')}</span>
            </span>
          </p>
        }
      />
    )
  }

  // Waiting for its date in a launched country: when it opens, nothing more.
  if (q?.state === 'PENDING')
    return (
      <Shell icon="schedule" tone="info" title={t('qr.notActiveYet')}>
        <p className="m-0">
          {q.kind === 'MEMBER'
            ? t.rich('qr.pendingMember', { who: q.member?.name ? b(q.member.name) : t('qr.thisSellerLower'), from: date ? t('qr.fromDate', { date }) : '' })
            : q.kind === 'LISTING'
              ? t.rich('qr.pendingListing', { title: quoted(q.listing?.title), from: date ? t('qr.fromDate', { date }) : '' })
              : t.rich('qr.pendingShop', { who: shopName ? t.rich('qr.theShopLower', { name: shopName, b }) : t('qr.thisShopLower'), from: date ? t('qr.fromDate', { date }) : '' })}
        </p>
        <a href="/" className={homeBtn}><Icon name="home" size={20} /> {t('qr.goTo', { brand: brand.name })}</a>
      </Shell>
    )

  if (q?.state === 'UNASSIGNED')
    return (
      <Shell icon="qr_code_2" tone="info" title={t('qr.unassigned')}>
        <p className="m-0">{t('qr.unassignedText', { brand: brand.name })}</p>
        <a href="/" className={homeBtn}><Icon name="home" size={20} /> {t('qr.goTo', { brand: brand.name })}</a>
      </Shell>
    )

  if (q?.state === 'SHOP_UNAVAILABLE')
    return (
      <Shell icon="storefront" tone="info" title={t('qr.shopUnavailable')}>
        <p className="m-0">{t('qr.shopUnavailableText', { brand: brand.name })}</p>
        <a href="/" className={homeBtn}><Icon name="home" size={20} /> {t('qr.goTo', { brand: brand.name })}</a>
      </Shell>
    )

  if (q?.state === 'MEMBER_UNAVAILABLE')
    return (
      <Shell icon="person_off" tone="info" title={t('qr.memberUnavailable')}>
        <p className="m-0">{t('qr.memberUnavailableText', { brand: brand.name })}</p>
        <a href="/" className={homeBtn}><Icon name="home" size={20} /> {t('qr.goTo', { brand: brand.name })}</a>
      </Shell>
    )

  if (q?.state === 'LISTING_UNAVAILABLE')
    return (
      <Shell icon="sell" tone="info" title={t('qr.listingUnavailable')}>
        <p className="m-0">{t(q.seller ? 'qr.listingRemovedSeller' : 'qr.listingRemoved', { brand: brand.name })}</p>
        {q.seller && q.seller.path.startsWith('/') && <a href={q.seller.path} className={homeBtn}><Icon name="person" size={20} /> {t('qr.sellerListings', { name: q.seller.name })}</a>}
        <a href="/" className={q.seller ? ghostBtn : homeBtn}><Icon name="home" size={20} /> {t('qr.goTo', { brand: brand.name })}</a>
      </Shell>
    )

  return (
    <Shell icon="block" tone="err" title={t('qr.inactive')}>
      <p className="m-0">{error ? t('qr.inactiveError') : t('qr.inactiveText', { brand: brand.name })}</p>
      <a href="/" className={homeBtn}><Icon name="home" size={20} /> {t('qr.goHome')}</a>
    </Shell>
  )
}
