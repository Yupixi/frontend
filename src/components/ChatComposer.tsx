import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'
import AnimatedIcon from './AnimatedIcon'
import { uploadImages } from '../lib/upload'
import { thumbnailUrl } from '../lib/media'

export const MAX_PHOTOS = 6
const MAX_LENGTH = 2000
const MAX_HEIGHT = 136 // ~5 lines, then the field scrolls

export type ComposerReply = { id: string; author: string; preview: string; photo?: string }
export type ComposerHandle = { focus: () => void }

type Photo = { key: string; preview: string; url?: string; error?: boolean }

type Props = {
  value: string
  onChange: (text: string) => void
  onSend: (msg: { body: string; attachments: string[]; replyToId?: string }) => Promise<unknown> | void
  placeholder: string
  replyTo?: ComposerReply | null
  onCancelReply?: () => void
  onTyping?: () => void
  disabled?: boolean
}

// Hardware keyboard + mouse: Enter sends, Shift+Enter breaks the line.
// Touch keyboards keep Enter for new lines (the send button sends).
const enterSends = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

// Messaging field: auto-growing multi-line text, photos (picker, paste,
// drag & drop — uploaded right away, previewed with remove), quoted reply,
// Enter to send on desktop.
const ChatComposer = forwardRef<ComposerHandle, Props>(function ChatComposer({ value, onChange, onSend, placeholder, replyTo, onCancelReply, onTyping, disabled }, ref) {
  const field = useRef<HTMLTextAreaElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [dragging, setDragging] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentCount, setSentCount] = useState(0)

  useImperativeHandle(ref, () => ({ focus: () => field.current?.focus() }), [])

  // Grow with the text up to ~5 lines.
  useLayoutEffect(() => {
    const el = field.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  useEffect(() => { if (replyTo) field.current?.focus() }, [replyTo])
  useEffect(() => () => photos.forEach(p => URL.revokeObjectURL(p.preview)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) { setError(`${MAX_PHOTOS} photos maximum par message.`); return }
    if (files.length > room) setError(`${MAX_PHOTOS} photos maximum par message.`)
    else setError(null)
    const added = files.slice(0, room).map(f => ({ key: `${f.name}-${f.size}-${Math.random()}`, preview: URL.createObjectURL(f), file: f }))
    setPhotos(p => [...p, ...added.map(({ key, preview }) => ({ key, preview }))])
    added.forEach(({ key, file }) => {
      uploadImages([file])
        .then(([url]) => setPhotos(p => p.map(x => (x.key === key ? { ...x, url } : x))))
        .catch(() => setPhotos(p => p.map(x => (x.key === key ? { ...x, error: true } : x))))
    })
  }
  const removePhoto = (key: string) => setPhotos(p => {
    const gone = p.find(x => x.key === key)
    if (gone) URL.revokeObjectURL(gone.preview)
    return p.filter(x => x.key !== key)
  })

  const uploading = photos.some(p => !p.url && !p.error)
  const ready = photos.filter(p => p.url).map(p => p.url!)
  const canSend = !disabled && !sending && !uploading && (!!value.trim() || ready.length > 0)

  const send = async () => {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      await onSend({ body: value.trim(), attachments: ready, replyToId: replyTo?.id })
      photos.forEach(p => URL.revokeObjectURL(p.preview))
      setPhotos([])
      setSentCount(c => c + 1)
      onCancelReply?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message non envoyé, réessayez.')
    } finally {
      setSending(false)
      field.current?.focus()
    }
  }

  return (
    <div
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { if (e.dataTransfer.files.length) { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) } }}
      className={`relative rounded-3xl transition-colors ${dragging ? 'bg-primary-fixed/40 outline-2 outline-dashed outline-primary' : ''}`}
    >
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-2xl bg-surface-container-low py-2 pl-3 pr-2 animate-[slideDown_0.2s_ease-out]">
          <span className="w-1 self-stretch rounded-full bg-primary" />
          {replyTo.photo && <img src={thumbnailUrl(replyTo.photo)} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <div className="text-label-sm normal-case tracking-normal text-primary">Réponse à {replyTo.author}</div>
            <div className="truncate text-body-sm text-on-surface-variant">{replyTo.preview}</div>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Annuler la réponse" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface-variant hover:bg-surface-container"><Icon name="close" size={18} /></button>
        </div>
      )}

      {photos.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {photos.map(p => (
            <div key={p.key} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container">
              <img src={p.preview} alt="" className={`h-full w-full object-cover ${p.url ? '' : 'opacity-60'}`} />
              {!p.url && !p.error && <span className="absolute inset-0 flex items-center justify-center"><Icon name="progress_activity" size={22} className="animate-spin text-white drop-shadow" /></span>}
              {p.error && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white"><Icon name="error" size={22} /></span>}
              <button type="button" onClick={() => removePhoto(p.key)} aria-label="Retirer la photo" className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-black/60 p-0 text-white"><Icon name="close" size={14} /></button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" onClick={() => picker.current?.click()} aria-label="Ajouter une photo" className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-transparent text-on-surface-variant"><Icon name="add" size={22} /></button>
          )}
        </div>
      )}

      {error && <p className="m-0 mb-2 flex items-center gap-1.5 text-body-sm text-primary"><Icon name="error" size={16} /> {error}</p>}

      <form onSubmit={e => { e.preventDefault(); void send() }} className="flex items-end gap-2">
        <input ref={picker} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
        <button type="button" disabled={disabled || photos.length >= MAX_PHOTOS} onClick={() => picker.current?.click()} aria-label="Joindre des photos" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-primary disabled:opacity-40">
          <Icon name="add_photo_alternate" size={22} />
        </button>
        <div className="flex min-h-11 min-w-0 flex-1 items-center rounded-3xl bg-surface-container px-4 py-2 transition-colors focus-within:bg-surface-container-high">
          <textarea
            ref={field}
            rows={1}
            value={value}
            maxLength={MAX_LENGTH}
            disabled={disabled}
            placeholder={placeholder}
            enterKeyHint={enterSends() ? 'send' : 'enter'}
            aria-label="Votre message"
            onChange={e => { onChange(e.target.value); onTyping?.() }}
            onPaste={e => { if (e.clipboardData.files.length) { e.preventDefault(); addFiles(e.clipboardData.files) } }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && enterSends()) { e.preventDefault(); void send() }
            }}
            className="block max-h-[136px] w-full resize-none border-none bg-transparent p-0 text-body-md leading-6 text-on-surface outline-none placeholder:text-on-surface-variant"
          />
        </div>
        <button type="submit" disabled={!canSend} aria-label="Envoyer le message" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-primary text-white shadow-md transition-transform active:scale-90 disabled:opacity-45 disabled:shadow-none">
          {sending ? <Icon name="progress_activity" size={20} className="animate-spin" /> : <AnimatedIcon name="send" fallback="send" size={19} trigger={sentCount} />}
        </button>
      </form>
      {value.length > MAX_LENGTH - 200 && <div className="mt-1 text-right text-label-sm normal-case tracking-normal text-on-surface-variant">{value.length} / {MAX_LENGTH}</div>}
    </div>
  )
})

export default ChatComposer
