import Icon from '../components/Icon'
import { fmtDate, useT } from '../i18n'
import huntNs from '../i18n/ns/hunt'
import { useHunt, useMyHunt, type Hunt, type HuntDay, type HuntPrize, type MyHunt } from '../lib/treasureHunt'

type Props = {
  onNavigate: (page: 'home' | 'auth') => void
  onOpenCampaign: (slug: string) => void
  onSelectListing: (id: string) => void
  isLoggedIn: boolean
}

// « Chasse au trésor »: rules, my progress, advent calendar, prizes.
// Animations are CSS (index.css « .hunt-* », frozen under reduce motion).
export default function TreasureHunt({ onNavigate, onOpenCampaign, onSelectListing, isLoggedIn }: Props) {
  const t = useT(huntNs)
  const { hunt, loading } = useHunt()
  const { mine } = useMyHunt(isLoggedIn && !!hunt)
  if (!hunt) {
    if (loading) return <div className="min-h-[60vh]" />
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant"><Icon name="redeem" size={30} /></span>
        <h1 className="m-0 text-headline-md text-on-surface">{t('none.title')}</h1>
        <p className="m-0 text-body-md text-on-surface-variant">{t('none.text')}</p>
        <button onClick={() => onNavigate('home')} className="mt-2 cursor-pointer rounded-full border-none bg-primary px-5 py-2.5 text-label-lg text-white">{t('none.back')}</button>
      </div>
    )
  }
  const start = () => onOpenCampaign(hunt.campaign.slug)
  return (
    <div className="pb-16">
      <Hero hunt={hunt} mine={mine} isLoggedIn={isLoggedIn} onStart={start} onLogin={() => onNavigate('auth')} />
      <div className="mx-auto max-w-[1200px] space-y-10 px-4 pt-8 lg:px-12">
        <HowTo hunt={hunt} />
        {hunt.calendar.length > 0 && <Advent days={hunt.calendar} onSelectListing={onSelectListing} />}
        {hunt.prizes.length > 0 && <Prizes prizes={hunt.prizes} />}
        {isLoggedIn ? mine && <Mine mine={mine} onSelectListing={onSelectListing} /> : (
          <section className="flex flex-col items-center gap-2 rounded-3xl bg-surface-container-low p-6 text-center">
            <h2 className="m-0 text-headline-sm text-on-surface">{t('mine.loginTitle')}</h2>
            <p className="m-0 text-body-md text-on-surface-variant">{t('mine.loginText')}</p>
            <button onClick={() => onNavigate('auth')} className="mt-1 cursor-pointer rounded-full border-none bg-primary px-5 py-2.5 text-label-lg text-white">{t('hero.ctaLogin')}</button>
          </section>
        )}
      </div>
    </div>
  )
}

function Hero({ hunt, mine, isLoggedIn, onStart, onLogin }: { hunt: Hunt; mine: MyHunt | null; isLoggedIn: boolean; onStart: () => void; onLogin: () => void }) {
  const t = useT(huntNs)
  const found = mine?.found ?? 0
  const total = hunt.giftsToWin
  const pct = Math.min(100, Math.round((found / total) * 100))
  return (
    <section className="hunt-hero relative overflow-hidden px-4 pb-10 pt-8 text-white lg:px-12 lg:pb-14 lg:pt-12">
      <span aria-hidden className="hunt-stars pointer-events-none absolute inset-0" />
      {[0, 1, 2, 3, 4].map(i => <span key={i} aria-hidden className={`hunt-float hunt-float-${i} pointer-events-none absolute`}><Icon name="redeem" size={22 + i * 4} /></span>)}
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-label-sm font-bold uppercase tracking-wide">
            <Icon name="celebration" size={15} /> {t('hero.eyebrow')}
          </span>
          <h1 className="hunt-title m-0 mt-3 text-[34px] font-extrabold leading-tight lg:text-[52px]">{hunt.title}</h1>
          {hunt.intro && <p className="m-0 mt-3 max-w-xl whitespace-pre-line text-body-lg text-white/90">{hunt.intro}</p>}
          <p className="m-0 mt-2 text-label-md text-white/80">{hunt.campaign.name} · {t('hero.endsIn', { date: fmtDate(hunt.campaign.endsAt, { day: 'numeric', month: 'long' }) })}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={onStart} className="hunt-cta cursor-pointer rounded-full border-none bg-white px-6 py-3 text-label-lg font-bold text-[#B5121B] shadow-lg">
              {t('hero.cta')}
            </button>
            {!isLoggedIn && <button onClick={onLogin} className="cursor-pointer rounded-full border-[1.5px] border-solid border-white/70 bg-transparent px-6 py-3 text-label-lg font-bold text-white">{t('hero.ctaLogin')}</button>}
          </div>
        </div>
        <div className="relative mx-auto flex w-full max-w-[380px] flex-col items-center">
          <Chest />
          {isLoggedIn && (
            <div className="mt-4 w-full rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div className="flex items-baseline justify-between text-label-md">
                <span>{t('progress.label')}</span>
                <span className="text-headline-sm font-extrabold">{found} / {total}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/25">
                <div className="hunt-bar h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="m-0 mt-2 text-body-sm text-white/90">{found >= total ? t('progress.qualified') : t('progress.left', { count: total - found, n: total - found })}</p>
              {mine && <p className="m-0 mt-1 text-label-sm text-white/75">{t('progress.today', { n: mine.today, max: mine.dailyFindLimit })}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// Treasure chest drawn in SVG: the lid bobs, coins glint.
function Chest() {
  return (
    <svg aria-hidden viewBox="0 0 200 170" className="hunt-chest h-44 w-52 drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] lg:h-56 lg:w-64">
      <ellipse cx="100" cy="160" rx="70" ry="8" fill="rgba(0,0,0,0.25)" />
      <g className="hunt-glow"><circle cx="100" cy="78" r="46" fill="#FFE27A" opacity="0.55" /></g>
      <rect x="30" y="80" width="140" height="74" rx="10" fill="#8B4A1C" />
      <rect x="30" y="80" width="140" height="16" fill="#6E3914" />
      <rect x="92" y="80" width="16" height="74" fill="#F5B301" />
      <rect x="30" y="112" width="140" height="10" fill="#F5B301" />
      <rect x="88" y="104" width="24" height="26" rx="4" fill="#FFD54A" stroke="#8B5E00" strokeWidth="2" />
      <circle cx="100" cy="117" r="3.5" fill="#8B5E00" />
      <g className="hunt-coins">
        <circle cx="72" cy="78" r="9" fill="#FFD54A" stroke="#C98A00" strokeWidth="2" />
        <circle cx="96" cy="70" r="9" fill="#FFD54A" stroke="#C98A00" strokeWidth="2" />
        <circle cx="122" cy="76" r="9" fill="#FFD54A" stroke="#C98A00" strokeWidth="2" />
        <path d="M140 66 l6 -12 l6 12 l-6 6 z" fill="#E11D2E" />
      </g>
      <g className="hunt-lid">
        <path d="M28 82 C 28 40, 172 40, 172 82 Z" fill="#A65A23" />
        <path d="M92 47 h16 v35 h-16 z" fill="#F5B301" />
        <path d="M28 82 C 28 40, 172 40, 172 82" fill="none" stroke="#6E3914" strokeWidth="4" />
      </g>
      <g className="hunt-sparkle"><path d="M160 30 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="#fff" /></g>
      <g className="hunt-sparkle hunt-sparkle-2"><path d="M40 40 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill="#fff" /></g>
    </svg>
  )
}

function HowTo({ hunt }: { hunt: Hunt }) {
  const t = useT(huntNs)
  const steps = [
    { icon: 'local_offer', title: t('how.1.title'), text: t('how.1.text', { campaign: hunt.campaign.name }) },
    { icon: 'redeem', title: t('how.2.title'), text: t('how.2.text') },
    { icon: 'emoji_events', title: t('how.3.title'), text: t('how.3.text', { n: hunt.giftsToWin }) },
  ]
  return (
    <section>
      <h2 className="m-0 text-headline-md text-on-surface">{t('how.title')}</h2>
      <ol className="m-0 mt-4 grid list-none gap-3 p-0 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={i} className="relative rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <span className="absolute right-4 top-3 text-[44px] font-extrabold leading-none text-primary/10">{i + 1}</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name={s.icon} size={22} /></span>
            <h3 className="m-0 mt-3 text-label-lg text-on-surface">{s.title}</h3>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Advent({ days, onSelectListing }: { days: HuntDay[]; onSelectListing: (id: string) => void }) {
  const t = useT(huntNs)
  const today = days.find(d => d.state === 'today')
  return (
    <section>
      <h2 className="m-0 flex items-center gap-2 text-headline-md text-on-surface"><Icon name="calendar_month" size={24} className="text-primary" /> {t('advent.title')}</h2>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('advent.sub')}</p>
      {today && (
        <div className="hunt-today mt-4 rounded-3xl p-5 text-white">
          <div className="flex flex-wrap items-center gap-2 text-label-sm font-bold uppercase tracking-wide">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5">{t('advent.today')} · {fmtDate(today.date, { day: 'numeric', month: 'long' })}</span>
            {today.prize && <span className="rounded-full bg-[#F5B301] px-2.5 py-0.5 text-[#5a3b00]">{t('advent.prize', { prize: today.prize.name })}</span>}
          </div>
          <p className="m-0 mt-3 text-headline-sm font-bold">« {today.hint} »</p>
          <p className="m-0 mt-1 text-body-sm text-white/85">{t('advent.winners', { count: today.winnersMax, n: today.winnersMax })}</p>
        </div>
      )}
      <ol className="m-0 mt-4 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4 lg:grid-cols-6">
        {days.map(d => {
          const day = Number(d.date.slice(8, 10))
          return (
            <li key={d.date} className={`hunt-door relative flex aspect-square flex-col overflow-hidden rounded-2xl p-2 ${d.state === 'today' ? 'hunt-door-today text-white' : d.state === 'past' ? 'bg-surface-lowest shadow-sm' : 'hunt-door-locked text-white'}`}>
              <span className={`text-[26px] font-extrabold leading-none ${d.state === 'past' ? 'text-on-surface-variant' : ''}`}>{day}</span>
              {d.state === 'locked' && <span className="mt-auto flex items-center gap-1 text-label-sm text-white/85"><Icon name="lock" size={14} /> {t('advent.locked')}</span>}
              {d.state === 'today' && <span className="mt-auto flex items-center gap-1 text-label-sm font-bold"><Icon name="redeem" size={15} /> {t('advent.today')}</span>}
              {d.state === 'past' && (d.answer ? (
                <button onClick={() => onSelectListing(d.answer!.id)} className="mt-auto flex min-w-0 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-left" title={d.answer.title}>
                  {d.answer.image ? <img src={d.answer.image} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" loading="lazy" /> : <Icon name="redeem" size={16} className="text-on-surface-variant" />}
                  <span className="min-w-0 truncate text-label-sm text-on-surface-variant">{t('advent.answer')}</span>
                </button>
              ) : <span className="mt-auto text-label-sm text-on-surface-variant">—</span>)}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Prizes({ prizes }: { prizes: HuntPrize[] }) {
  const t = useT(huntNs)
  return (
    <section>
      <h2 className="m-0 flex items-center gap-2 text-headline-md text-on-surface"><Icon name="emoji_events" size={24} className="text-[#C98A00]" /> {t('prizes.title')}</h2>
      <ul className="m-0 mt-4 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 lg:grid-cols-4">
        {prizes.map(p => (
          <li key={p.id} className="hunt-prize overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
            <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#FFF3C4] to-[#FFD54A]">
              {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon name="emoji_events" size={48} className="text-[#C98A00]" />}
              <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-label-sm text-white">{p.kind === 'DRAW' ? t('prizes.draw') : t('prizes.advent')}</span>
              {p.quantity > 1 && <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-label-sm font-bold text-on-surface">{t('prizes.qty', { n: p.quantity })}</span>}
            </div>
            <div className="p-3">
              <h3 className="m-0 text-label-lg text-on-surface">{p.name}</h3>
              {p.description && <p className="m-0 mt-0.5 line-clamp-2 text-body-sm text-on-surface-variant">{p.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Mine({ mine, onSelectListing }: { mine: MyHunt; onSelectListing: (id: string) => void }) {
  const t = useT(huntNs)
  return (
    <section className="space-y-4">
      {mine.wins.length > 0 && (
        <div className="hunt-wins rounded-3xl p-5 text-[#5a3b00]">
          <h2 className="m-0 flex items-center gap-2 text-headline-sm"><Icon name="emoji_events" size={22} /> {t('mine.wins')}</h2>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
            {mine.wins.map(w => <li key={w.id} className="rounded-full bg-white/80 px-3 py-1.5 text-label-md font-bold">{w.prize.name} <span className="font-normal opacity-75">· {t('mine.won', { date: fmtDate(w.at, { day: 'numeric', month: 'long' }) })}</span></li>)}
          </ul>
        </div>
      )}
      <h2 className="m-0 text-headline-md text-on-surface">{t('mine.title')}</h2>
      {mine.finds.length === 0 ? <p className="m-0 rounded-2xl bg-surface-container-low p-5 text-body-md text-on-surface-variant">{t('mine.empty')}</p> : (
        <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
          {mine.finds.map(f => (
            <li key={f.id}>
              <button onClick={() => onSelectListing(f.listing.id)} className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border-none bg-surface-lowest p-3 text-left shadow-sm">
                {f.listing.image ? <img src={f.listing.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-container-low"><Icon name="redeem" size={22} /></span>}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-label-sm font-bold" style={{ color: f.kind === 'ADVENT' ? '#C98A00' : 'var(--fetes-a, #E11D2E)' }}><Icon name="redeem" size={14} /> {f.kind === 'ADVENT' ? t('mine.golden') : t('mine.gift')} · {fmtDate(f.day, { day: 'numeric', month: 'short' })}</span>
                  <span className="block truncate text-label-md text-on-surface">{f.listing.title}</span>
                  {f.voucherPercent ? <span className="mt-0.5 block text-body-sm text-tertiary" title={t('mine.voucherHint')}>{t('mine.voucher', { n: f.voucherPercent, seller: f.listing.seller.fullName })}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
