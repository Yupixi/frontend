import { useEffect, useRef, useState } from 'react'
import { loadLottiePlayer } from '../AnimatedIcon'
import { useMediaQuery } from '../../lib/useMediaQuery'
import type { CampaignVisual, VisualKind } from '../../graphql/campaigns'

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A Lottie file played in a loop once on screen (paused off screen and for
// "reduce motion", which shows its first frame).
function LottieVisual({ url, className }: { url: string; className: string }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    let anim: { destroy: () => void; play: () => void; pause: () => void } | null = null
    let cancelled = false
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) anim?.play(); else anim?.pause() })
    void Promise.all([loadLottiePlayer(), fetch(url).then(r => r.json())]).then(([lottie, data]) => {
      if (cancelled) return
      const still = reducedMotion()
      anim = lottie.loadAnimation({ container: el, renderer: 'svg', loop: !still, autoplay: false, animationData: data, rendererSettings: { preserveAspectRatio: 'xMidYMid slice' } })
      io.observe(el)
    }).catch(() => undefined)
    return () => { cancelled = true; io.disconnect(); anim?.destroy() }
  }, [url])
  return <div ref={box} className={className} aria-hidden />
}

function Media({ url, kind, alt, className }: { url: string; kind: VisualKind; alt?: string; className: string }) {
  const [still] = useState(reducedMotion)
  if (kind === 'video')
    return <video src={url} autoPlay={!still} muted loop playsInline preload="metadata" aria-label={alt} className={className} />
  if (kind === 'lottie') return <LottieVisual url={url} className={className} />
  return <img src={url} alt={alt ?? ''} loading="lazy" decoding="async" className={className} />
}

// A visual designed by the team for a campaign placement (BO « Visuels »):
// image, looping muted video or Lottie, the mobile variant on phones.
export default function CampaignMedia({ visual, className = 'h-full w-full object-cover' }: { visual: CampaignVisual; className?: string }) {
  const desktop = useMediaQuery('(min-width: 768px)')
  const mobile = !desktop && visual.mobileUrl
  const url = mobile ? visual.mobileUrl! : visual.url
  const kind = mobile ? (visual.mobileKind ?? visual.kind) : visual.kind
  return <Media key={url} url={url} kind={kind} alt={visual.alt} className={className} />
}
