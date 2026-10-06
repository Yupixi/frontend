import { useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from './Icon'
import { LaunchPage } from './LaunchGate'
import { Shell } from './EmailLinkPage'
import { QR_LANDING_QUERY, type QrLanding } from '../graphql/shopQr'
import { useSite } from '../lib/site'

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
    atLaunch ? `${pendingName ? `${pendingName} ${q.kind === 'SHOP' ? 'ouvre' : 'arrive'} bientôt` : `${brand.name} arrive bientôt`} | ${brand.name}`
      : q?.state === 'PENDING' ? `${pendingName ?? 'QR code pas encore actif'} | ${brand.name}`
      : q?.state === 'UNASSIGNED' ? `QR code pas encore attribué | ${brand.name}`
      : q?.state === 'SHOP_UNAVAILABLE' ? `Boutique indisponible | ${brand.name}`
      : q?.state === 'MEMBER_UNAVAILABLE' ? `Ce profil n’est plus disponible | ${brand.name}`
      : q?.state === 'LISTING_UNAVAILABLE' ? `Cette annonce n’est plus disponible | ${brand.name}`
      : `Ce QR code n’est plus actif | ${brand.name}`,
  )
  // Active (the server was bypassed): on to its page.
  useEffect(() => {
    if (q?.state !== 'ACTIVE') return
    const to = q.path ?? (q.shop?.slug ? `/boutique/${encodeURIComponent(q.shop.slug)}?utm_source=qr&utm_medium=print` : null)
    if (to && to.startsWith('/')) window.location.replace(to)
  }, [q])

  if (loading || q?.state === 'ACTIVE') return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  const date = q?.activateAt ? new Date(q.activateAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' }) : null
  if (atLaunch && q.launch) {
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
                ? <>{q.member?.name ? <b className="break-words">{q.member.name}</b> : 'Ce vendeur'} arrive sur {brand.name} {date ? `le ${date}` : 'au lancement'}.</>
                : q.kind === 'LISTING'
                  ? <>L’annonce {q.listing?.title ? <b className="break-words">« {q.listing.title} »</b> : ''}{q.listing?.sellerName ? <> de {q.listing.sellerName}</> : null} arrive sur {brand.name} {date ? `le ${date}` : 'au lancement'}.</>
                  : <>{shopName ? <>La boutique <b className="break-words">{shopName}</b></> : 'Cette boutique'} ouvre sur {brand.name} {date ? `le ${date}` : 'au lancement'}.</>}
              <span className="block text-body-sm text-white/70">Gardez ce QR code : il vous y mènera directement.</span>
            </span>
          </p>
        }
      />
    )
  }

  // Waiting for its date in a launched country: when it opens, nothing more.
  if (q?.state === 'PENDING')
    return (
      <Shell icon="schedule" tone="info" title="QR code pas encore actif">
        <p className="m-0">
          {q.kind === 'MEMBER'
            ? <>Ce QR code mènera à la page de {q.member?.name ? <b className="break-words">{q.member.name}</b> : 'ce vendeur'}</>
            : q.kind === 'LISTING'
              ? <>Ce QR code mènera à l’annonce {q.listing?.title ? <b className="break-words">« {q.listing.title} »</b> : ''}</>
              : <>Ce QR code mènera à {shopName ? <>la boutique <b className="break-words">{shopName}</b></> : 'cette boutique'}</>}
          {date ? <> à partir du {date}</> : null}. Gardez-le : il vous y mènera directement.
        </p>
        <a href="/" className={homeBtn}><Icon name="home" size={20} /> Aller sur {brand.name}</a>
      </Shell>
    )

  if (q?.state === 'UNASSIGNED')
    return (
      <Shell icon="qr_code_2" tone="info" title="QR code pas encore attribué">
        <p className="m-0">Ce QR code {brand.name} n’est pas encore relié à une boutique. Il le sera bientôt : revenez le scanner plus tard.</p>
        <a href="/" className={homeBtn}><Icon name="home" size={20} /> Aller sur {brand.name}</a>
      </Shell>
    )

  if (q?.state === 'SHOP_UNAVAILABLE')
    return (
      <Shell icon="storefront" tone="info" title="Boutique indisponible">
        <p className="m-0">Cette boutique n’est pas disponible sur {brand.name} pour le moment.</p>
        <a href="/" className={homeBtn}><Icon name="home" size={20} /> Aller sur {brand.name}</a>
      </Shell>
    )

  if (q?.state === 'MEMBER_UNAVAILABLE')
    return (
      <Shell icon="person_off" tone="info" title="Ce profil n’est plus disponible">
        <p className="m-0">Ce vendeur n’est plus présent sur {brand.name}. Découvrez les autres annonces près de chez vous.</p>
        <a href="/" className={homeBtn}><Icon name="home" size={20} /> Aller sur {brand.name}</a>
      </Shell>
    )

  if (q?.state === 'LISTING_UNAVAILABLE')
    return (
      <Shell icon="sell" tone="info" title="Cette annonce n’est plus disponible">
        <p className="m-0">Elle a été retirée de {brand.name}.{q.seller ? ' Le vendeur a peut-être d’autres annonces.' : ''}</p>
        {q.seller && q.seller.path.startsWith('/') && <a href={q.seller.path} className={homeBtn}><Icon name="person" size={20} /> Voir les annonces de {q.seller.name}</a>}
        <a href="/" className={q.seller ? ghostBtn : homeBtn}><Icon name="home" size={20} /> Aller sur {brand.name}</a>
      </Shell>
    )

  return (
    <Shell icon="block" tone="err" title="Ce QR code n’est plus actif">
      <p className="m-0">{error ? 'Impossible de vérifier ce QR code pour le moment. Réessayez dans un instant.' : `Ce QR code ne mène plus à une page ${brand.name}.`}</p>
      <a href="/" className={homeBtn}><Icon name="home" size={20} /> Aller à l’accueil</a>
    </Shell>
  )
}
