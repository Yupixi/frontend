import { AccountLayout } from './AccountLayout'
import QrStudio from '../../components/QrStudio'
import type { AuthUser } from '../../graphql/auth'
import { useT } from '../../i18n'
import qr from '../../i18n/ns/qr'

type Props = { onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void }

// « Mon compte › Mon QR code »: a personal QR leading to the member's
// seller page (dilchap.com/@pseudo), for their own posters and cards.
export default function MyQrPage({ onNavigate, currentUser, onLogout }: Props) {
  const t = useT(qr)
  const address = currentUser?.handle ? `dilchap.com/@${currentUser.handle}` : t('myQr.yourSellerPage')
  return (
    <AccountLayout active="seller-qr" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title={t('myQr.title')}>
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="hidden lg:block">
          <h1 className="m-0 text-headline-md text-on-surface">{t('myQr.title')}</h1>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('myQr.intro', { address })}</p>
        </div>
        <QrStudio
          target={{ kind: 'MEMBER' }}
          intro={<p className="mt-0 text-body-sm text-on-surface-variant lg:hidden">{t('myQr.intro', { address })}</p>}
        />
      </div>
    </AccountLayout>
  )
}
