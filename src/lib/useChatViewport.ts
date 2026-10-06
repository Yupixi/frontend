import { useEffect } from 'react'

// iOS Safari keeps 100dvh when the keyboard opens and scrolls the page
// instead: while a conversation is open on a phone, the layout height
// follows the visual viewport (--chat-vh) so the composer stays right above
// the keyboard and the thread keeps its last message in view. Event-driven
// (no timer); removed when the thread closes.
export function useChatViewport(active: boolean) {
  useEffect(() => {
    const vv = window.visualViewport
    if (!active || !vv) return
    const root = document.documentElement
    let frame = 0
    const apply = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--chat-vh', `${Math.round(vv.height)}px`)
        // The page itself must not scroll under the keyboard.
        if (window.scrollY) window.scrollTo(0, 0)
      })
    }
    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      root.style.removeProperty('--chat-vh')
    }
  }, [active])
}
