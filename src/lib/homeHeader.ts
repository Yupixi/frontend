import { useEffect, useState, type RefObject } from 'react'

// Phones, home page: the header's magnifier (Layout, `.header-search`) is
// hidden while the home search bar is on screen — two search entries one
// above the other — and comes back once that bar has scrolled under the
// header. No React state: an IntersectionObserver flags <html>
// (data-home-search) and CSS does the rest (index.css), so scrolling never
// re-renders the page.
export function useHomeSearchInView(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current
    const root = document.documentElement
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return
    // The sticky header covers the top 64 px: the bar counts as gone once under it.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) root.dataset.homeSearch = ''
      else delete root.dataset.homeSearch
    }, { rootMargin: '-64px 0px 0px 0px' })
    io.observe(el)
    return () => { io.disconnect(); delete root.dataset.homeSearch }
  }, [ref, enabled])
}

// « 100% P2P • 0% commission » strip of the phone home: closed with its
// cross, it stays closed on this device (localStorage) and, for a member,
// on the account (notificationPreferences.homeStripClosed). The title is
// kept: when the BO changes the strip, it shows again.
const STRIP_KEY = 'dilchap_home_strip_closed'

function readClosed(): string | null {
  try { return localStorage.getItem(STRIP_KEY) } catch { return null }
}

export function useHomeStrip(title: string, accountClosed: unknown) {
  const [closed, setClosed] = useState(readClosed)
  const hidden = closed === title || (typeof accountClosed === 'string' && accountClosed === title)
  const close = () => {
    setClosed(title)
    try { localStorage.setItem(STRIP_KEY, title) } catch { /* no storage */ }
  }
  return { hidden, close }
}
