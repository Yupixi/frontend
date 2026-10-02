import { AccountLayout } from './AccountLayout'
import QrStudio from '../../components/QrStudio'
import type { AuthUser } from '../../graphql/auth'

type Props = { onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void }

// « Mon compte › Mon QR code »: a personal QR leading to the member's
// seller page (dilchap.com/@pseudo), for their own posters and cards.
export default function MyQrPage({ onNavigate, currentUser, onLogout }: Props) {
  const address = currentUser?.handle ? `dilchap.com/@${currentUser.handle}` : 'votre page vendeur'
  return (
    <AccountLayout active="seller-qr" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title="Mon QR code">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="hidden lg:block">
          <h1 className="m-0 text-headline-md text-on-surface">Mon QR code</h1>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">Un QR code qui mène à {address}, à ajouter à vos affiches, flyers, cartes ou autocollants.</p>
        </div>
        <QrStudio
          target={{ kind: 'MEMBER' }}
          intro={<p className="m-0 text-body-sm text-on-surface-variant lg:hidden">Un QR code qui mène à {address}, à ajouter à vos affiches, flyers, cartes ou autocollants.</p>}
        />
      </div>
    </AccountLayout>
  )
}
