import { Suspense, useEffect, useRef, useState } from 'react'
import { useQuery, useSubscription } from '@apollo/client/react'
import Icon from './Icon'
import type { AuthUser } from '../graphql/auth'
import { MY_SUPPORT_UNREAD_QUERY, SUPPORT_TICKET_UPDATED_SUBSCRIPTION } from '../graphql/support'
import { useSupportPhone } from '../lib/site'
import { lazyPage } from '../lib/lazyPage'
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import { OPEN_SUPPORT_EVENT, type SupportAbout } from '../lib/navigation'
import ErrorBoundary, { ErrorScreen } from './ErrorBoundary'
import { useT } from '../i18n'
import common from '../i18n/ns/common'
import supportNs from '../i18n/ns/support'

// Only the panel is lazy: the tab itself (unread badge) is in every page.
const SupportCenter = lazyPage(() => import('./SupportCenter'))

// Pages where the tab would sit on a form's own bottom bar, or is the page.
const HIDDEN = new Set(['reels', 'support', 'auth', 'seller-post', 'seller-edit'])

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
  const t = useT(supportNs)
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

  const desktop = useMediaQuery(DESKTOP_QUERY)
  const hidden = HIDDEN.has(page)
  const dock = usePhoneDock(!desktop && !hidden && !open, `${page}|${member ? 1 : 0}`)

  if (hidden) return null
  return (
    <>
      {!open && !desktop && (
        // Phone: a small round button on the right edge, above any fixed
        // bar of the page (bottom menu, Contacter / Offre, seller bar,
        // payment), slid away while the page scrolls or a field is being
        // typed in. Also in Compte › Aide & support.
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={unread ? t('tab.unreadAria', { n: unread }) : t('tab.writeAria')}
          data-support-dock=""
          style={{ bottom: dock.bottom == null ? 'calc(1rem + env(safe-area-inset-bottom))' : dock.bottom }}
          className={`fixed right-2 z-[290] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-none bg-on-surface text-surface-lowest shadow-lg transition-[transform,opacity] duration-200 ${dock.away ? 'pointer-events-none translate-x-[calc(100%+0.75rem)] opacity-0' : ''} ${page === 'buyer-messages' ? 'hidden' : ''}`}
        >
          <Icon name="support_agent" size={21} />
          {unread > 0 && <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white ring-2 ring-surface-lowest">{unread}</span>}
        </button>
      )}
      {!open && desktop && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={unread ? t('tab.unreadAria', { n: unread }) : t('tab.writeAria')}
          className="fixed right-0 top-[55%] z-[290] flex cursor-pointer flex-col items-center gap-1.5 rounded-l-xl border-none bg-on-surface py-3 pl-2 pr-1.5 text-surface-lowest shadow-lg transition-[padding] hover:pr-2.5"
        >
          <Icon name="support_agent" size={19} />
          <span className="text-label-sm tracking-wide [writing-mode:vertical-rl] rotate-180">{t('tab.label')}</span>
          {unread > 0 && <span className="absolute -left-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white ring-2 ring-surface-lowest">{unread}</span>}
        </button>
      )}
      {open && (
        <div data-clarity-mask="True" className="fixed inset-0 z-[10001] lg:inset-auto lg:bottom-4 lg:right-4" role="dialog" aria-modal="true" aria-label={t('center.title')}>
          <div className="absolute inset-0 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
          <div className="safe-pt relative flex h-full w-full flex-col overflow-hidden bg-surface-lowest lg:h-[min(680px,calc(100dvh-2rem))] lg:w-[400px] lg:rounded-2xl lg:border lg:border-solid lg:border-outline-variant/60 lg:shadow-2xl animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]">
            {member
              ? (
                // A panel that fails (chunk gone after a deploy…) stays inside
                // the panel: the page and the tab keep working.
                <ErrorBoundary fallback={<SupportError onClose={() => setOpen(false)} />}>
                  <Suspense fallback={<p className="m-auto text-body-sm text-on-surface-variant">{common.t('loading')}</p>}><SupportCenter currentUser={currentUser} onClose={() => setOpen(false)} about={about} /></Suspense>
                </ErrorBoundary>
              )
              : <LoggedOut onClose={() => setOpen(false)} onLogin={() => onNavigate('auth')} />}
          </div>
        </div>
      )}
    </>
  )
}

// Where the phone button sits: above the fixed bars at the bottom of the
// right edge, found by looking at what is under that spot (no list of bars
// to keep up to date), measured again when the page changes, when the
// scroll stops and when the window is resized. Away while scrolling and
// while a field has the focus (keyboard open).
function usePhoneDock(active: boolean, page: string) {
  // `page`: the page and whether a member is signed in (their bars differ).
  // px above the bottom edge; null: no bar (safe area + 1rem).
  const [bottom, setBottom] = useState<number | null>(88)
  const [scrolling, setScrolling] = useState(false)
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    if (!active) return
    const GAP = 12
    const measure = () => {
      const h = window.innerHeight
      const x = window.innerWidth - 24
      let top = h
      // A bar can sit on another (seller bar over the bottom menu).
      for (let i = 0; i < 4; i++) {
        const y = top - 4
        if (y < h * 0.5) break
        const bar = document.elementsFromPoint(x, y).map(fixedBar).find(Boolean)
        if (!bar) break
        const r = bar.getBoundingClientRect()
        if (r.top >= top) break
        top = r.top
      }
      setBottom(top === h ? null : Math.round(h - top + GAP))
    }
    const fixedBar = (el: Element): HTMLElement | null => {
      for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
        if (!(n instanceof HTMLElement) || n.dataset.supportDock !== undefined) continue
        if (getComputedStyle(n).position !== 'fixed') continue
        const r = n.getBoundingClientRect()
        // A bar: touches the bottom, not a full-screen layer (sheet, menu).
        return r.bottom >= window.innerHeight - 2 && r.height < window.innerHeight * 0.4 ? n : null
      }
      return null
    }
    let stop: number | undefined
    const onScroll = () => {
      setScrolling(true)
      window.clearTimeout(stop)
      stop = window.setTimeout(() => { setScrolling(false); measure() }, 450)
    }
    const field = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !/^(checkbox|radio|range|button|submit)$/.test((t as HTMLInputElement).type)))
    const onFocusIn = (e: FocusEvent) => { if (field(e.target)) setTyping(true) }
    const onFocusOut = () => { setTyping(false); onTap() }
    // The page's bars appear with its data: measured again a little later,
    // and after a tap (a bar opens, a sheet closes).
    const timers = [50, 400, 1200, 3000].map(ms => window.setTimeout(measure, ms))
    let tap: number | undefined
    const onTap = () => { window.clearTimeout(tap); tap = window.setTimeout(measure, 350) }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', measure)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('click', onTap, true)
    return () => {
      window.clearTimeout(stop); window.clearTimeout(tap); timers.forEach(t => window.clearTimeout(t))
      document.removeEventListener('click', onTap, true)
      document.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', measure)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [active, page])
  return { bottom, away: scrolling || typing }
}

function SupportError({ onClose }: { onClose: () => void }) {
  const t = useT(supportNs)
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-0 border-b border-solid border-outline-variant/60 px-4 py-3">
        <span className="flex items-center gap-1.5 text-label-lg text-on-surface"><Icon name="support_agent" size={20} className="text-primary" /> {t('center.title')}</span>
        <button type="button" onClick={onClose} aria-label={t('center.closeAria')} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface-variant"><Icon name="close" size={19} /></button>
      </div>
      <div className="flex-1"><ErrorScreen error={null} compact /></div>
    </div>
  )
}

function LoggedOut({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const t = useT(supportNs)
  const phone = useSupportPhone()
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-0 border-b border-solid border-outline-variant/60 px-4 py-3">
        <span className="flex items-center gap-1.5 text-label-lg text-on-surface"><Icon name="support_agent" size={20} className="text-primary" /> {t('center.title')}</span>
        <button type="button" onClick={onClose} aria-label={t('center.closeAria')} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface-variant"><Icon name="close" size={19} /></button>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="forum" size={28} /></span>
        <p className="m-0 text-headline-sm text-on-surface">{t('tab.loggedOut.title')}</p>
        <p className="m-0 text-body-md text-on-surface-variant">{t('tab.loggedOut.text')}</p>
        <button type="button" onClick={onLogin} className="mt-2 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="login" size={19} /> {t('tab.loggedOut.signIn')}</button>
        <button type="button" onClick={onLogin} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-solid border-outline-variant bg-surface-lowest text-label-lg text-on-surface"><Icon name="lock_reset" size={19} /> {t('tab.loggedOut.cantSignIn')}</button>
        {phone && <a href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="mt-1 text-label-md text-primary no-underline">{t('tab.loggedOut.whatsapp', { phone })}</a>}
      </div>
    </div>
  )
}
