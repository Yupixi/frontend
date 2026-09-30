import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { richHtml } from '../lib/richText'
import { isTour } from '../lib/tours'
import type { Announcement } from '../graphql/help'

// « Nouveau »: a feature announcement from the BO, once per member. A sheet
// from the bottom on phones, a centred dialog from md. No history entry of
// its own: « Découvrir » may open another page right away.
export default function AnnouncementDialog({ announcement, onLater, onDiscover }: { announcement: Announcement, onLater: () => void, onDiscover: () => void }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasTour = isTour(announcement.tourId)
  const primary = useRef<HTMLButtonElement>(null)
  const laterRef = useRef(onLater)
  laterRef.current = onLater

  useEffect(() => {
    primary.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') laterRef.current() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-labelledby="announcement-title">
      <div className="absolute inset-0 bg-black/45 animate-[fadeIn_0.2s_ease-out]" onClick={onLater} />
      <div className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface-lowest pb-[env(safe-area-inset-bottom)] shadow-modal animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] md:max-w-[440px] md:rounded-3xl md:pb-0">
        <div className="flex justify-center pb-0.5 pt-2.5 md:hidden"><span className="h-1 w-10 rounded-full bg-outline-variant" /></div>
        <button onClick={onLater} aria-label="Fermer" className="absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest/90 text-on-surface-variant shadow-sm">
          <Icon name="close" size={18} />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {announcement.imageUrl && !imageFailed && (
            <div className="px-4 pt-3 md:px-0 md:pt-0">
              <img src={announcement.imageUrl} alt="" onError={() => setImageFailed(true)} className="block aspect-[16/9] w-full rounded-2xl bg-surface-container-low object-cover md:rounded-none" />
            </div>
          )}
          <div className="px-5 pb-2 pt-4 md:px-6 md:pt-5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5 text-label-sm uppercase text-primary"><Icon name="auto_awesome" size={13} /> Nouveau</span>
            <h2 id="announcement-title" className="m-0 mt-2 pr-8 text-headline-sm text-on-surface">{announcement.title}</h2>
            {announcement.body && <div className="rich-text mt-2 text-body-md leading-relaxed text-on-surface-variant [&_p]:my-2" dangerouslySetInnerHTML={{ __html: richHtml(announcement.body) }} />}
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-3 md:px-6">
          {hasTour && (
            <button onClick={onLater} className="h-12 flex-1 cursor-pointer whitespace-nowrap rounded-xl border-none bg-surface-container-low text-label-lg text-on-surface hover:bg-surface-container">Plus tard</button>
          )}
          <button ref={primary} onClick={hasTour ? onDiscover : onLater} className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary text-label-lg text-white hover:bg-primary-dark">
            {hasTour ? <>Découvrir <Icon name="arrow_forward" size={18} /></> : 'J’ai compris'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
