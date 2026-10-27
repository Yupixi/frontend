import BottomSheet from './BottomSheet'
import QrStudio from './QrStudio'
import { useT } from '../i18n'
import listingNs from '../i18n/ns/listing'

// « QR code de l'annonce » (Mes annonces, the listing's page — its owner
// only): a QR leading straight to the listing.
export default function ListingQrSheet({ listing, onClose }: { listing: { id: string; title: string } | null; onClose: () => void }) {
  const t = useT(listingNs)
  return (
    <BottomSheet open={!!listing} onClose={onClose} title={t('qr.title')} maxHeight="92vh" maxWidth="920px">
      {listing && (
        <div className="pb-4">
          <QrStudio
            target={{ kind: 'LISTING', listingId: listing.id }}
            intro={<p className="mt-0 text-body-sm text-on-surface-variant">{t.rich('qr.intro', { title: listing.title, b: c => <b className="text-on-surface">{c}</b> })}</p>}
          />
        </div>
      )}
    </BottomSheet>
  )
}
