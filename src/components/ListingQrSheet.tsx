import BottomSheet from './BottomSheet'
import QrStudio from './QrStudio'

// « QR code de l'annonce » (Mes annonces, the listing's page — its owner
// only): a QR leading straight to the listing.
export default function ListingQrSheet({ listing, onClose }: { listing: { id: string; title: string } | null; onClose: () => void }) {
  return (
    <BottomSheet open={!!listing} onClose={onClose} title="QR code de l’annonce" maxHeight="92vh" maxWidth="920px">
      {listing && (
        <div className="pb-4">
          <QrStudio
            target={{ kind: 'LISTING', listingId: listing.id }}
            intro={<p className="m-0 text-body-sm text-on-surface-variant">Un scan ouvre directement « <b className="text-on-surface">{listing.title}</b> ». Vendue ou expirée, l’annonce l’indique et propose des annonces similaires.</p>}
          />
        </div>
      )}
    </BottomSheet>
  )
}
