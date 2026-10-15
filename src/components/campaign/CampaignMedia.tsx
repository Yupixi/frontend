import { useEffect, useRef, useState } from 'react'
import { loadLottiePlayer } from '../AnimatedIcon'
import { useMediaQuery } from '../../lib/useMediaQuery'
import type { CampaignVisual, VisualKind } from '../../graphql/campaigns'

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export type MediaFit = 'cover' | 'contain'

// A Lottie file played in a loop once on screen (paused off screen and for
// "reduce motion", which shows its first frame).
function LottieVisual({ url, className, fit }: { url: string; className: string; fit: MediaFit }) {
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
      anim = lottie.loadAnimation({ container: el, renderer: 'svg', loop: !still, autoplay: false, animationData: data, rendererSettings: { preserveAspectRatio: fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice' } })
      io.observe(el)
    }).catch(() => undefined)
    return () => { cancelled = true; io.disconnect(); anim?.destroy() }
  }, [url, fit])
  return <div ref={box} className={className} aria-hidden />
}

function Media({ url, kind, alt, className, fit }: { url: string; kind: VisualKind; alt?: string; className: string; fit: MediaFit }) {
  const [still] = useState(reducedMotion)
  if (kind === 'video')
    return <video src={url} autoPlay={!still} muted loop playsInline preload="metadata" aria-label={alt} className={className} />
  if (kind === 'lottie') return <LottieVisual url={url} className={className} fit={fit} />
  return <img src={url} alt={alt ?? ''} loading="lazy" decoding="async" className={className} />
}

// A visual designed by the team for a campaign placement (BO « Visuels »):
// image, looping muted video or Lottie, the mobile variant on phones.
// `contain`: the whole visual, never cropped (its text stays readable) —
// the box behind it shows the campaign's colour where the ratios differ.
export default function CampaignMedia({ visual, fit = 'cover', className = `h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}` }: { visual: CampaignVisual; fit?: MediaFit; className?: string }) {
  const desktop = useMediaQuery('(min-width: 768px)')
  const mobile = !desktop && visual.mobileUrl
  const url = mobile ? visual.mobileUrl! : visual.url
  const kind = mobile ? (visual.mobileKind ?? visual.kind) : visual.kind
  return <Media key={url} url={url} kind={kind} alt={visual.alt} className={className} fit={fit} />
}
