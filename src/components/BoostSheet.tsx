import { createPortal } from 'react-dom'
import BoostPicker from './boost/BoostPicker'

type Props = {
  open: boolean
  onClose: () => void
  listing: { id: string; title: string; coverImageUrl?: string | null; status?: string }
  onBumped?: () => void
}

// "Booster cette annonce" from a listing card or page: every formula as a
// short card, paid in credits (missing credits bought in the same sheet).
export default function BoostSheet({ open, onClose, listing, onBumped }: Props) {
  // Portalled: listing cards clip their content (overflow: hidden).
  return createPortal(
    <BoostPicker open={open} onClose={onClose} listing={listing} onDone={() => onBumped?.()} />,
    document.body,
  )
}
