import { useEffect, useRef, useState } from 'react'
import BottomSheet from './BottomSheet'
import AccountVerifyPanel from './AccountVerifyPanel'
import { VERIFY_REQUEST_EVENT, type VerifyRequest } from '../lib/accountVerify'

// App-wide « Confirmez votre compte » sheet: opened when contacting a
// seller or paying fails because the account isn't confirmed (or from the
// top banner). Once the SMS code is typed, the action that failed runs
// again by itself.
export default function AccountVerifySheet({ onAddPhone }: { onAddPhone?: () => void }) {
  const [open, setOpen] = useState(false)
  const retry = useRef<(() => void) | undefined>(undefined)
  useEffect(() => {
    const onRequest = (e: Event) => {
      retry.current = (e as CustomEvent<VerifyRequest>).detail?.retry
      setOpen(true)
    }
    window.addEventListener(VERIFY_REQUEST_EVENT, onRequest)
    return () => window.removeEventListener(VERIFY_REQUEST_EVENT, onRequest)
  }, [])
  const close = () => { retry.current = undefined; setOpen(false) }
  // Above the app's banners (install, update): the member is acting now.
  return (
    <div className="relative z-[10000]">
    <BottomSheet open={open} onClose={close} title="Confirmez votre compte" maxWidth="520px">
      {open && (
        <div className="pb-2">
          <AccountVerifyPanel
            tone="plain"
            heading={false}
            intro="Cette action demande un compte confirmé. Recevez un code par SMS : l’action reprend dès que le code est validé."
            onAddPhone={onAddPhone ? () => { close(); onAddPhone() } : undefined}
            onVerified={() => {
              const again = retry.current
              retry.current = undefined
              window.setTimeout(() => { setOpen(false); again?.() }, 900)
            }}
          />
        </div>
      )}
    </BottomSheet>
    </div>
  )
}
