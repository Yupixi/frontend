import { useEffect, useState, type ReactNode } from 'react'
import DilchapLogo from './DilchapLogo'
import Icon from './Icon'
import { useLaunch, type LaunchStatus } from '../lib/launch'
import { useClarityHold } from '../lib/clarity'
import Flag from './Flag'
import Select from './Select'
import { useSite } from '../lib/site'
import { marketForCountry } from '../data/markets'
import { setStoredLocation } from '../lib/location'
import { setMarketState, useCountries, useMarketCode } from '../lib/countries'

// Before the launch date (BO › Contenu › Lancement) visitors see the launch
// page; the team's secret link shows the site with a reminder banner. If
// the API can't answer, the site is shown: never lock visitors out by error.
// The launch can differ per country: the status follows the visitor's
// market (useLaunch), so switching country shows or lifts the page.
export default function LaunchGate({ children }: { children: ReactNode }) {
  const { status, loading, refetch } = useLaunch()
  // Microsoft Clarity never records the launch page nor the team preview
  // (the page's manifest link carries the preview key there).
  useClarityHold(!!status?.active)
  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
  if (status?.active && !status.preview) return <LaunchPage status={status} onOpen={() => void refetch()} />
  return (
    <>
      {status?.active && status.preview && (
        // Above the mobile bottom bar (z-300, ~62px), bottom-left from md.
        <div role="status" className="pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-[400] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1.5 rounded-full bg-on-surface/90 px-3 py-1.5 text-label-sm text-surface-lowest shadow-lg md:bottom-4 md:left-4 md:translate-x-0">
          <Icon name="visibility" size={14} /> <span className="truncate">Aperçu équipe : site pas encore ouvert au public</span>
        </div>
      )}
      {children}
    </>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!target) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [target])
  if (!target) return null
  const left = Math.max(0, Date.parse(target) - now)
  return {
    left,
    days: Math.floor(left / 86_400_000),
    hours: Math.floor(left / 3_600_000) % 24,
    minutes: Math.floor(left / 60_000) % 60,
    seconds: Math.floor(left / 1000) % 60,
  }
}

// `notice`: a line above the title — a printed QR code's shop (QrLandingPage).
export function LaunchPage({ status, onOpen, notice }: { status: LaunchStatus, onOpen: () => void, notice?: ReactNode }) {
  const site = useSite()
  const market = useMarketCode()
  const countries = useCountries()
  const c = useCountdown(status.launchAt)
  // The date is reached: ask again, the site opens.
  useEffect(() => { if (c && c.left === 0) onOpen() }, [c?.left === 0]) // eslint-disable-line react-hooks/exhaustive-deps
  const date = status.launchAt
    ? new Date(status.launchAt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: marketForCountry(market)?.timeZone ?? 'Africa/Abidjan' })
    : null
  const socials = (['facebook', 'instagram', 'tiktok', 'youtube', 'whatsapp'] as const).filter(k => site.socials[k])
  // Another country may already be open: the choice is kept as the
  // visitor's pick, like the site's country picker, and the gate asks again.
  const pickCountry = (code: string) => {
    const countryCode = code || null
    setStoredLocation({ countryCode, city: null, source: 'manual' })
    setMarketState({ market: countryCode })
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#0f0d0d] px-4 py-10 text-center text-white">
      {status.image
        ? <img src={status.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        : <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="launch-glow-a absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#FE0000] opacity-30 blur-[140px]" />
            <div className="launch-glow-b absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full bg-[#FF5A1F] opacity-30 blur-[90px]" />
            <div className="launch-glow-c absolute -bottom-40 -left-32 h-[380px] w-[380px] rounded-full bg-[#B80000] opacity-25 blur-[90px]" />
          </div>}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/45" />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center" style={{ animation: 'fadeIn .8s ease both' }}>
        {/* The official logo (public/logo-dilchap.png), straight on the background. */}
        <DilchapLogo size="xl" style={{ height: 64, filter: 'drop-shadow(0 6px 24px rgba(254,0,0,.35))' }} />
        {notice && <div className="mt-8 w-full max-w-xl">{notice}</div>}
        <h1 className={`m-0 ${notice ? 'mt-6' : 'mt-8'} text-[clamp(1.9rem,6vw,3.2rem)] font-extrabold leading-tight`}>{status.title}</h1>
        {status.text && <p className="m-0 mt-4 max-w-xl text-body-lg text-white/80">{status.text}</p>}

        {c && (
          <div className="mt-10 grid w-full max-w-md grid-cols-4 gap-2 sm:gap-3" aria-live="off" aria-label="Compte à rebours avant le lancement">
            {[['Jours', c.days], ['Heures', c.hours], ['Minutes', c.minutes], ['Secondes', c.seconds]].map(([label, v]) => (
              <div key={label} className="rounded-2xl bg-white/10 px-1 py-3 ring-1 ring-white/15 backdrop-blur">
                <div className="text-[clamp(1.6rem,7vw,2.6rem)] font-extrabold tabular-nums leading-none">{label === 'Jours' ? v : pad(v as number)}</div>
                <div className="mt-1.5 text-label-sm uppercase tracking-wide text-white/65">{label}</div>
              </div>
            ))}
          </div>
        )}
        {date && <p className="m-0 mt-4 text-label-md text-white/70">Ouverture le {date}</p>}

        {socials.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <span className="w-full text-label-sm text-white/60">Suivez-nous en attendant</span>
            {socials.map(k => (
              <a key={k} href={site.socials[k]} target="_blank" rel="noopener noreferrer" aria-label={k}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white no-underline ring-1 ring-white/15 hover:bg-[#FE0000]">
                <Icon name={`brand_${k}`} size={20} />
              </a>
            ))}
          </div>
        )}
      </div>
      {/* Not on a QR code's page: it is about one shop. */}
      {countries.length > 1 && !notice && (
        <div className="relative z-10 mt-10 flex items-center gap-2 text-label-sm text-white/60">
          {market ? <Flag code={market} size={16} /> : <Icon name="public" size={16} />}
          <Select value={market ?? ''} onChange={e => pickCountry(e.target.value)} aria-label="Pays"
            className="h-9 max-w-[220px] rounded-full border-none bg-white/10 px-3.5 text-label-md text-white ring-1 ring-white/15">
            <option value="">Tous les pays</option>
            {countries.map(ct => <option key={ct.code} value={ct.code}>{ct.name}</option>)}
          </Select>
        </div>
      )}
      <p className="relative z-10 m-0 mt-8 text-label-sm text-white/45">© {new Date().getFullYear()} {site.brand.name}</p>
    </main>
  )
}
