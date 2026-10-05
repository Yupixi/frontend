import { Suspense, useEffect, useRef, useState } from 'react'
import { useQuery, useSubscription } from '@apollo/client/react'
import Icon from './Icon'
import type { AuthUser } from '../graphql/auth'
import { MY_SUPPORT_UNREAD_QUERY, SUPPORT_TICKET_UPDATED_SUBSCRIPTION } from '../graphql/support'
import { useSupportPhone } from '../lib/site'
import { lazyPage } from '../lib/lazyPage'
import { OPEN_SUPPORT_EVENT, type SupportAbout } from '../lib/navigation'
import ErrorBoundary, { ErrorScreen } from './ErrorBoundary'

// Only the panel is lazy: the tab itself (unread badge) is in every page.
const SupportCenter = lazyPage(() => import('./SupportCenter'))

// Pages where the tab would sit on a form's own bottom bar, or is the page.
const HIDDEN = new Set(['support', 'auth', 'seller-post', 'seller-edit'])

type Props = {
  page: string
  isLoggedIn: boolean
  currentUser: AuthUser | null
  onNavigate: (page: any) => void
}

// « Support »: a tab on the right edge of every page, to write to the
// Dilchap team at any time. Each conversation is a ticket in the BO (see
// SupportCenter). Desktop: a panel over the bottom-right corner; phone:
// full screen, closed by the back button like the other sheets.
export default function SupportTab({ page, isLoggedIn, currentUser, onNavigate }: Props) {
  const [open, setOpen] = useState(false)
  // « Contacter le support à propos de… » (listing, purchase, receipt,
  // payment, dispute): opens the tab on a new conversation about it.
  const [about, setAbout] = useState<(SupportAbout & { nonce: number }) | null>(null)
  useEffect(() => {
    const onRequest = (e: Event) => {
      const detail = (e as CustomEvent<SupportAbout>).detail
      if (!detail) return
      setAbout({ ...detail, nonce: Date.now() })
      setOpen(true)
    }
    window.addEventListener(OPEN_SUPPORT_EVENT, onRequest)
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onRequest)
  }, [])
  const member = isLoggedIn && !currentUser?.isGuest
  const { data, refetch } = useQuery<{ mySupportUnread: number }>(MY_SUPPORT_UNREAD_QUERY, { skip: !member, pollInterval: 120_000 })
  useSubscription(SUPPORT_TICKET_UPDATED_SUBSCRIPTION, { skip: !member, onData: () => void refetch() })
  const unread = member ? data?.mySupportUnread ?? 0 : 0

  // Back button / Escape close the panel first.
  const closedByBack = useRef(false)
  useEffect(() => {
    if (!open) return
    closedByBack.current = false
    window.history.pushState({ __yupixiSheetMarker: true }, '')
    const onPop = () => { closedByBack.current = true; setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
      if (!closedByBack.current && window.history.state?.__yupixiSheetMarker) window.history.back()
    }
  }, [open])
  // Leaving the page (a link in a reply…) closes it.
  useEffect(() => { setOpen(false); setAbout(null) }, [page])

  if (HIDDEN.has(page)) return null
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={unread ? `Support : ${unread} nouvelle(s) réponse(s)` : 'Écrire au support'}
          className={`fixed right-0 z-[290] flex cursor-pointer flex-col items-center gap-1.5 rounded-l-xl border-none bg-on-surface py-3 pl-2 pr-1.5 text-surface-lowest shadow-lg transition-[padding] hover:pr-2.5 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] lg:bottom-auto lg:top-[55%] ${page === 'buyer-messages' ? 'max-lg:hidden' : ''}`}
        >
          <Icon name="support_agent" size={19} />
          <span className="text-label-sm tracking-wide [writing-mode:vertical-rl] rotate-180">Support</span>
          {unread > 0 && <span className="absolute -left-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white ring-2 ring-surface-lowest">{unread}</span>}
        </button>
      )}
      {open && (
        <div data-clarity-mask="True" className="fixed inset-0 z-[10001] lg:inset-auto lg:bottom-4 lg:right-4" role="dialog" aria-modal="true" aria-label="Support Dilchap">
          <div className="absolute inset-0 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
          <div className="safe-pt relative flex h-full w-full flex-col overflow-hidden bg-surface-lowest lg:h-[min(680px,calc(100dvh-2rem))] lg:w-[400px] lg:rounded-2xl lg:border lg:border-solid lg:border-outline-variant/60 lg:shadow-2xl animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]">
            {member
              ? (
                // A panel that fails (chunk gone after a deploy…) stays inside
                // the panel: the page and the tab keep working.
                <ErrorBoundary fallback={<SupportError onClose={() => setOpen(false)} />}>
                  <Suspense fallback={<p className="m-auto text-body-sm text-on-surface-variant">Chargement…</p>}><SupportCenter currentUser={currentUser} onClose={() => setOpen(false)} about={about} /></Suspense>
                </ErrorBoundary>
              )
              : <LoggedOut onClose={() => setOpen(false)} onLogin={() => onNavigate('auth')} />}
          </div>
        </div>
      )}
    </>
  )
}

function SupportError({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-0 border-b border-solid border-outline-variant/60 px-4 py-3">
        <span className="flex items-center gap-1.5 text-label-lg text-on-surface"><Icon name="support_agent" size={20} className="text-primary" /> Support Dilchap</span>
        <button type="button" onClick={onClose} aria-label="Fermer le support" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface-variant"><Icon name="close" size={19} /></button>
      </div>
      <div className="flex-1"><ErrorScreen error={null} compact /></div>
    </div>
  )
}

function LoggedOut({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const phone = useSupportPhone()
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-0 border-b border-solid border-outline-variant/60 px-4 py-3">
        <span className="flex items-center gap-1.5 text-label-lg text-on-surface"><Icon name="support_agent" size={20} className="text-primary" /> Support Dilchap</span>
        <button type="button" onClick={onClose} aria-label="Fermer le support" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface-variant"><Icon name="close" size={19} /></button>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="forum" size={28} /></span>
        <p className="m-0 text-headline-sm text-on-surface">Une question ? Écrivez-nous</p>
        <p className="m-0 text-body-md text-on-surface-variant">Connectez-vous pour discuter avec l’équipe Dilchap et suivre ses réponses.</p>
        <button type="button" onClick={onLogin} className="mt-2 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="login" size={19} /> Se connecter</button>
        <button type="button" onClick={onLogin} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-solid border-outline-variant bg-surface-lowest text-label-lg text-on-surface"><Icon name="lock_reset" size={19} /> Je n’arrive pas à me connecter</button>
        {phone && <a href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="mt-1 text-label-md text-primary no-underline">Ou par WhatsApp : {phone}</a>}
      </div>
    </div>
  )
}
