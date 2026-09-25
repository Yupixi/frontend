import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

type Option = { value: string, label: string, disabled?: boolean }

function text(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(text).join('')
  if (isValidElement(node)) return text((node.props as { children?: ReactNode }).children)
  return ''
}

// Reads the same <option> children a native <select> takes, so pages keep
// their markup and only swap the tag.
function readOptions(children: ReactNode): Option[] {
  const out: Option[] = []
  Children.forEach(children, child => {
    if (!isValidElement(child)) return
    const el = child as ReactElement<{ value?: string | number, children?: ReactNode, disabled?: boolean }>
    if (el.type === 'option') {
      const label = text(el.props.children)
      out.push({ value: el.props.value != null ? String(el.props.value) : label, label, disabled: el.props.disabled })
    } else {
      out.push(...readOptions(el.props.children))
    }
  })
  return out
}

// Design-system dropdown replacing the browser's native <select> list.
// The list is portalled with fixed positioning so cards with
// overflow-hidden never clip it, and opens upward near the bottom edge.
export default function Select({ value, onChange, children, className = '', disabled, 'aria-label': ariaLabel }: {
  value: string
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  'aria-label'?: string
}) {
  const options = readOptions(children)
  const selected = options.find(o => o.value === String(value)) ?? options[0]
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ left: number, top?: number, bottom?: number, width: number, maxHeight: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const id = useId()

  const place = () => {
    const r = trigger.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom - 8
    const above = r.top - 8
    const up = below < 220 && above > below
    const width = Math.max(r.width, 180)
    const left = Math.min(r.left, window.innerWidth - width - 8)
    setPos(up
      ? { left, bottom: window.innerHeight - r.top + 4, width, maxHeight: Math.min(320, above) }
      : { left, top: r.bottom + 4, width, maxHeight: Math.min(320, below) })
  }

  const show = () => {
    if (disabled) return
    place()
    setActive(Math.max(0, options.indexOf(selected)))
    setOpen(true)
  }

  const pick = (o: Option) => {
    if (o.disabled) return
    setOpen(false)
    trigger.current?.focus()
    if (o.value !== String(value)) onChange({ target: { value: o.value }, currentTarget: { value: o.value } } as ChangeEvent<HTMLSelectElement>)
  }

  useLayoutEffect(() => {
    // Scroll the list only — scrollIntoView would also scroll the page,
    // which closes the list.
    const ul = list.current
    const li = ul?.querySelector<HTMLElement>(`[data-i="${active}"]`)
    if (!open || !ul || !li) return
    if (li.offsetTop < ul.scrollTop) ul.scrollTop = li.offsetTop
    else if (li.offsetTop + li.offsetHeight > ul.scrollTop + ul.clientHeight) ul.scrollTop = li.offsetTop + li.offsetHeight - ul.clientHeight
  }, [open, active])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!list.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false)
    }
    const onScroll = (e: Event) => { if (!list.current?.contains(e.target as Node)) setOpen(false) }
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show() }
      return
    }
    const step = (d: number) => {
      let i = active
      for (let n = 0; n < options.length; n++) {
        i = (i + d + options.length) % options.length
        if (!options[i].disabled) break
      }
      setActive(i)
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); step(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[active]) pick(options[active]) }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false)
    else if (e.key.length === 1) {
      const i = options.findIndex(o => o.label.toLowerCase().startsWith(e.key.toLowerCase()))
      if (i >= 0) setActive(i)
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={e => { e.preventDefault(); if (open) setOpen(false); else show() }}
        onKeyDown={onKey}
        className={`inline-flex min-w-0 cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span className="min-w-0 truncate">{selected?.label ?? ''}</span>
        <Icon name="expand_more" size={20} className={`shrink-0 text-on-surface-variant transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && createPortal(
        <ul
          ref={list}
          id={id}
          role="listbox"
          className="fixed z-[10050] m-0 list-none overflow-y-auto rounded-xl border border-solid border-outline-variant bg-surface-lowest p-1 shadow-float"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxWidth: 'calc(100vw - 16px)', maxHeight: pos.maxHeight }}
        >
          {options.map((o, i) => {
            const on = o.value === selected?.value
            return (
              <li
                key={`${o.value}-${i}`}
                data-i={i}
                role="option"
                aria-selected={on}
                aria-disabled={o.disabled}
                onMouseEnter={() => setActive(i)}
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(o)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-body-md ${o.disabled ? 'cursor-default opacity-40' : ''} ${i === active ? 'bg-surface-container-low' : ''} ${on ? 'font-semibold text-primary' : 'text-on-surface'}`}
              >
                <span className="truncate">{o.label}</span>
                {on && <Icon name="check" size={18} className="shrink-0" />}
              </li>
            )
          })}
        </ul>,
        document.body,
      )}
    </>
  )
}
