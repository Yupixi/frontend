import { useRef, useState } from 'react'
import BottomSheet from './BottomSheet'
import Icon from './Icon'
import { thumbnailUrl } from '../lib/media'
import { VoicePlayer } from './VoiceMessage'
import { messagePreview, type RemoteMessage } from '../graphql/messaging'

type Props = {
  message: RemoteMessage
  mine: boolean
  // Name shown on a quote ("Vous" or the other person's first name).
  quoteAuthor: (senderId: string) => string
  onReply: () => void
  onOpenPhotos: (photos: string[], index: number) => void
  onJumpTo: (messageId: string) => void
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g

// Links in a message open in a new tab; the rest stays plain text.
function Linkified({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((p, i) => i % 2
        ? <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" onClick={e => e.stopPropagation()} className={`break-all underline ${mine ? 'text-white' : 'text-primary'}`}>{p}</a>
        : p)}
    </>
  )
}

function PhotoGrid({ photos, onOpen }: { photos: string[]; onOpen: (i: number) => void }) {
  const shown = photos.slice(0, 4)
  const extra = photos.length - shown.length
  return (
    <div className={`grid gap-1 overflow-hidden rounded-xl ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {shown.map((src, i) => (
        <button key={src + i} type="button" onClick={e => { e.stopPropagation(); onOpen(i) }} aria-label={`Voir la photo ${i + 1}`} className={`relative cursor-zoom-in overflow-hidden border-none bg-surface-container p-0 ${photos.length === 1 ? 'h-auto max-h-72 w-60 max-w-full' : 'h-28 w-28 sm:h-32 sm:w-32'} ${photos.length === 3 && i === 0 ? 'col-span-2 w-full' : ''}`}>
          <img src={photos.length === 1 ? src : thumbnailUrl(src)} alt="" loading="lazy" decoding="async" className="block h-full max-h-72 w-full object-cover" />
          {extra > 0 && i === shown.length - 1 && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-headline-sm text-white">+{extra}</span>}
        </button>
      ))}
    </div>
  )
}

// A text / photo message of the thread, with its quoted reply and actions
// (hover buttons on desktop, long-press sheet on touch screens).
export default function ChatBubble({ message: m, mine, quoteAuthor, onReply, onOpenPhotos, onJumpTo }: Props) {
  const [menu, setMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const press = useRef<number | null>(null)
  const pressAt = useRef({ x: 0, y: 0 })
  const longPressed = useRef(false)
  const photos = m.attachments ?? []

  const startPress = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    longPressed.current = false
    pressAt.current = { x: e.clientX, y: e.clientY }
    press.current = window.setTimeout(() => { press.current = null; longPressed.current = true; navigator.vibrate?.(15); setMenu(true) }, 450)
  }
  // Scrolling the thread is not a long press.
  const movePress = (e: React.PointerEvent) => {
    if (press.current && Math.hypot(e.clientX - pressAt.current.x, e.clientY - pressAt.current.y) > 10) cancelPress()
  }
  const cancelPress = () => { if (press.current) { window.clearTimeout(press.current); press.current = null } }
  const copy = () => {
    void navigator.clipboard?.writeText(m.body).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) }).catch(() => undefined)
    setMenu(false)
  }

  const quote = m.replyTo && (
    <button type="button" onClick={e => { e.stopPropagation(); onJumpTo(m.replyTo!.id) }} className={`mb-1.5 flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl border-none px-2.5 py-1.5 text-left ${mine ? 'bg-white/15' : 'bg-surface-container'}`}>
      <span className={`w-0.5 self-stretch rounded-full ${mine ? 'bg-white' : 'bg-primary'}`} />
      {m.replyTo.attachments[0] && <img src={thumbnailUrl(m.replyTo.attachments[0])} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />}
      <span className="min-w-0">
        <span className={`block text-label-sm normal-case tracking-normal ${mine ? 'text-white' : 'text-primary'}`}>{quoteAuthor(m.replyTo.senderId)}</span>
        <span className={`block truncate text-body-sm ${mine ? 'text-white/80' : 'text-on-surface-variant'}`}>{messagePreview(m.replyTo)}</span>
      </span>
    </button>
  )

  return (
    <div className={`group/msg flex max-w-full items-center gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
      <div
        onPointerDown={startPress}
        onPointerMove={movePress}
        onPointerUp={cancelPress}
        // The tap that ends a long press must not also open a photo / quote.
        onClickCapture={e => { if (longPressed.current) { longPressed.current = false; e.preventDefault(); e.stopPropagation() } }}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={e => { if (!window.matchMedia('(hover: hover)').matches) e.preventDefault() }}
        className={`min-w-0 max-w-full select-text rounded-2xl text-body-md shadow-sm ${photos.length && !m.body && !m.replyTo ? 'p-1' : 'px-3.5 py-2.5'} ${mine ? 'rounded-tr-sm bg-primary text-white' : 'rounded-tl-sm bg-surface-lowest text-on-surface'}`}
      >
        {quote}
        {m.audioUrl && <VoicePlayer src={m.audioUrl} duration={m.audioDuration ?? 0} mine={mine} seed={m.id} />}
        {photos.length > 0 && <div className={m.body ? 'mb-2' : ''}><PhotoGrid photos={photos} onOpen={i => onOpenPhotos(photos, i)} /></div>}
        {m.body && <div className="whitespace-pre-wrap break-words"><Linkified text={m.body} mine={mine} /></div>}
      </div>
      {/* Desktop hover actions */}
      <div className="hidden shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100 [@media(hover:hover)]:flex">
        <button type="button" onClick={onReply} title="Répondre" aria-label="Répondre" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface-variant hover:bg-surface-container"><Icon name="reply" size={18} /></button>
        {m.body && <button type="button" onClick={copy} title="Copier" aria-label="Copier le texte" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface-variant hover:bg-surface-container"><Icon name={copied ? 'check' : 'content_copy'} size={17} /></button>}
      </div>

      <BottomSheet open={menu} onClose={() => setMenu(false)}>
        <div className="flex flex-col gap-1 pt-1">
          <button type="button" onClick={() => { setMenu(false); onReply() }} className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent px-3 text-left text-body-lg text-on-surface hover:bg-surface-container-low"><Icon name="reply" size={22} /> Répondre</button>
          {m.body && <button type="button" onClick={copy} className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent px-3 text-left text-body-lg text-on-surface hover:bg-surface-container-low"><Icon name="content_copy" size={22} /> Copier le texte</button>}
          {photos.length > 0 && <button type="button" onClick={() => { setMenu(false); onOpenPhotos(photos, 0) }} className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent px-3 text-left text-body-lg text-on-surface hover:bg-surface-container-low"><Icon name="photo_library" size={22} /> Voir {photos.length > 1 ? 'les photos' : 'la photo'}</button>}
        </div>
      </BottomSheet>
    </div>
  )
}
