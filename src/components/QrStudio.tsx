import { useState } from 'react'
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react'
import Icon from './Icon'
import { saveQrFile, type QrFile } from '../graphql/shopQr'
import {
  MIN_QR_CONTRAST, MY_QR_DOWNLOAD, MY_QR_PREVIEW_QUERY, MY_QR_QUERY, MY_QR_STATS_QUERY, MY_QR_VISUALS_QUERY,
  MY_QR_VISUAL_DOWNLOAD, MY_QR_VISUAL_PREVIEW_QUERY, contrastOnWhite,
  type MyQrOverview, type MyQrStats, type MyQrVisual, type QrTarget,
} from '../graphql/memberQr'
import { fmtDate, useT } from '../i18n'
import qr from '../i18n/ns/qr'

// The member's QR studio: preview, downloads for their own designs (SVG,
// PDF, PNG; background, logo, colour), the team's ready-to-print visuals,
// a short printing guide and the scan statistics. Shared by « Mon QR
// code » and « QR code de l'annonce ».

const card = 'rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5'
const chip = (on: boolean) => `inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-none px-3.5 text-label-md ${on ? 'bg-inverse-surface text-surface' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`
const btn = 'flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none px-4 text-label-md disabled:cursor-default disabled:opacity-50'
const fdate = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'short', year: 'numeric' })
const COLORS = [
  { value: '#000000', labelKey: 'studio.color.black' },
  { value: '#FE0000', labelKey: 'studio.color.red' },
] as const
const errText = (e: unknown) => {
  const m = (e as { message?: string })?.message
  return m && !/^(Failed to fetch|NetworkError)/.test(m) ? m : qr.t('studio.downloadError')
}

export function QrGuide({ open = false }: { open?: boolean }) {
  const t = useT(qr)
  return (
    <details open={open} className={`${card} group`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-title-sm text-on-surface [&::-webkit-details-marker]:hidden">
        <Icon name="lightbulb" size={20} className="text-primary" /> <span className="flex-1">{t('guide.title')}</span>
        <Icon name="expand_more" size={20} className="transition-transform group-open:rotate-180" />
      </summary>
      <ul className="m-0 mt-3 space-y-2 pl-5 text-body-sm text-on-surface">
        <li>{t.rich('guide.size', { b: c => <b>{c}</b> })}</li>
        <li>{t.rich('guide.contrast', { b: c => <b>{c}</b> })}</li>
        <li>{t.rich('guide.noDistort', { b: c => <b>{c}</b> })}</li>
        <li>{t.rich('guide.margin', { b: c => <b>{c}</b> })}</li>
        <li>{t.rich('guide.test', { b: c => <b>{c}</b> })}</li>
        <li>{t.rich('guide.formats', { b: c => <b>{c}</b> })}</li>
      </ul>
    </details>
  )
}

function Stats({ id }: { id: string }) {
  const t = useT(qr)
  const { data } = useQuery<{ myQrStats: MyQrStats }>(MY_QR_STATS_QUERY, { variables: { id, days: 30 }, fetchPolicy: 'cache-and-network' })
  const s = data?.myQrStats
  if (!s) return null
  const max = Math.max(1, ...s.stats.days.map(d => d.scans))
  return (
    <section className={card}>
      <h2 className="m-0 flex items-center gap-2 text-title-md text-on-surface"><Icon name="bar_chart" size={20} className="text-primary" /> {t('stats.title')}</h2>
      <dl className={`m-0 mt-3 grid grid-cols-2 gap-3 ${s.launchActive !== false ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <div><dt className="text-label-sm uppercase text-on-surface-variant">{t('stats.total')}</dt><dd className="m-0 text-headline-sm font-bold text-on-surface">{s.scanCount}</dd></div>
        {s.launchActive !== false && <div><dt className="text-label-sm uppercase text-on-surface-variant">{t('stats.prelaunch')}</dt><dd className="m-0 text-headline-sm font-bold text-on-surface">{s.prelaunchScanCount}</dd></div>}
        <div><dt className="text-label-sm uppercase text-on-surface-variant">{t('stats.first')}</dt><dd className="m-0 text-body-md text-on-surface">{s.firstScanAt ? fdate(s.firstScanAt) : '—'}</dd></div>
        <div><dt className="text-label-sm uppercase text-on-surface-variant">{t('stats.last')}</dt><dd className="m-0 text-body-md text-on-surface">{s.lastScanAt ? fdate(s.lastScanAt) : '—'}</dd></div>
      </dl>
      {s.stats.days.some(d => d.scans) ? (
        <div className="mt-4">
          <div className="flex h-24 items-end gap-[2px]" role="img" aria-label={t('stats.chartAria')}>
            {s.stats.days.map(d => <div key={d.day} title={t('stats.barTitle', { day: fdate(d.day), n: String(d.scans) })} className="min-w-0 flex-1 rounded-t-sm bg-primary" style={{ height: `${(d.scans / max) * 100}%`, minHeight: d.scans ? 2 : 0 }} />)}
          </div>
          <p className="m-0 mt-1 flex justify-between text-label-sm text-on-surface-variant"><span>{t('stats.from')}</span><span>{t('stats.to')}</span></p>
        </div>
      ) : <p className="m-0 mt-3 text-body-sm text-on-surface-variant">{t('stats.empty')}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="m-0 mb-1 text-label-sm uppercase text-on-surface-variant">{t('stats.countries')}</p>
          {s.stats.countries.length ? s.stats.countries.slice(0, 5).map(c => <p key={c.country} className="m-0 flex justify-between text-body-sm text-on-surface"><span>{c.country === 'XX' ? t('stats.unknown') : c.country}</span><b>{c.scans}</b></p>) : <p className="m-0 text-body-sm text-on-surface-variant">—</p>}
        </div>
        <div>
          <p className="m-0 mb-1 text-label-sm uppercase text-on-surface-variant">{t('stats.device')}</p>
          {s.stats.devices.length ? s.stats.devices.map(d => <p key={d.device} className="m-0 flex justify-between text-body-sm text-on-surface"><span className="flex items-center gap-1"><Icon name={d.device === 'MOBILE' ? 'smartphone' : 'laptop_mac'} size={16} /> {d.device === 'MOBILE' ? t('stats.mobile') : t('stats.computer')}</span><b>{d.scans}</b></p>) : <p className="m-0 text-body-sm text-on-surface-variant">—</p>}
        </div>
      </div>
      <p className="m-0 mt-3 text-body-sm text-on-surface-variant">{t('stats.privacy')}</p>
    </section>
  )
}

function VisualCard({ v, target, disabled, onDone }: { v: MyQrVisual; target: QrTarget; disabled: boolean; onDone: () => void }) {
  const t = useT(qr)
  const { data } = useQuery<{ myQrVisualPreview: QrFile }>(MY_QR_VISUAL_PREVIEW_QUERY, { variables: { target, visualId: v.id }, fetchPolicy: 'cache-first' })
  const [run, st] = useMutation<{ myQrVisualDownload: QrFile }>(MY_QR_VISUAL_DOWNLOAD)
  const [sheet, setSheet] = useState(v.sheetable)
  const [error, setError] = useState('')
  const f = data?.myQrVisualPreview
  const download = () => {
    setError('')
    void run({ variables: { input: { ...target, visualId: v.id, sheet: v.sheetable && sheet, cropMarks: true } } })
      .then(r => { if (r.data) { saveQrFile(r.data.myQrVisualDownload); onDone() } })
      .catch(e => setError(errText(e)))
  }
  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-3">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-surface-container p-2">
        {f ? <img src={`data:${f.mimeType};base64,${f.base64}`} alt={t('visual.previewAlt', { name: v.name })} className="max-h-full max-w-full rounded shadow-sm" /> : <div className="h-full w-full animate-pulse rounded bg-surface-container-high" />}
      </div>
      <p className="m-0 text-label-lg text-on-surface">{v.name}</p>
      <p className="m-0 text-body-sm text-on-surface-variant">{v.widthMm} × {v.heightMm} mm{/* i18n-ignore */}</p>
      {v.sheetable && (
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-body-sm text-on-surface">
          <input type="checkbox" checked={sheet} onChange={e => setSheet(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" /> {t('visual.sheet')}
        </label>
      )}
      <button disabled={disabled || st.loading} onClick={download} className={`${btn} mt-auto bg-primary text-white`}><Icon name="picture_as_pdf" size={18} /> {st.loading ? t('studio.preparing') : t('visual.download')}</button>
      {error && <p role="alert" className="m-0 rounded-lg bg-primary-fixed px-3 py-2 text-body-sm text-primary">{error}</p>}
    </li>
  )
}

export default function QrStudio({ target, intro }: { target: QrTarget; intro?: React.ReactNode }) {
  const t = useT(qr)
  const client = useApolloClient()
  const { data, refetch } = useQuery<{ myQr: MyQrOverview }>(MY_QR_QUERY, { variables: { target }, fetchPolicy: 'cache-and-network' })
  const o = data?.myQr
  const [color, setColor] = useState('#000000')
  const [transparent, setTransparent] = useState(false)
  const [logo, setLogo] = useState(true)
  const [size, setSize] = useState(2048)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const lowContrast = contrastOnWhite(color) < MIN_QR_CONTRAST
  const preview = useQuery<{ myQrPreview: { svg: string; sample: boolean } }>(MY_QR_PREVIEW_QUERY, {
    variables: { target, color: lowContrast ? '#000000' : color, transparent, logo },
    skip: !o,
  }).data?.myQrPreview
  const visuals = useQuery<{ myQrVisuals: MyQrVisual[] }>(MY_QR_VISUALS_QUERY, { variables: { target }, fetchPolicy: 'cache-and-network' }).data?.myQrVisuals ?? []
  const can = !!o?.eligible
  const left = o ? Math.max(0, o.dailyMax - o.usedToday) : 0
  const download = async (format: 'PNG' | 'SVG' | 'PDF') => {
    setBusy(format)
    setError('')
    try {
      const r = await client.mutate<{ myQrDownload: QrFile }>({ mutation: MY_QR_DOWNLOAD, variables: { input: { ...target, format, size: format === 'PNG' ? size : undefined, color, transparent, logo } } })
      if (r.data) saveQrFile(r.data.myQrDownload)
      // Made on this first download: the real code replaces the example.
      void refetch()
      void client.refetchQueries({ include: ['MyQrPreview', 'MyQrVisualPreview', 'MyQrStats'] })
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(null)
    }
  }
  const q = o?.qr
  const pending = q?.state === 'PENDING'
  // Waiting for its date (any country), or for the launch of a country
  // still behind its launch page.
  const scheduled = pending && q?.activation === 'SCHEDULED' && !!q.activateAt
  const atLaunch = pending && !scheduled && q?.launchActive !== false

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[220px]">
            <div className={`relative aspect-square overflow-hidden rounded-xl ring-1 ring-outline-variant ${transparent ? 'bg-[conic-gradient(#e5e5e5_25%,#fff_0_50%,#e5e5e5_0_75%,#fff_0)] bg-[length:16px_16px]' : 'bg-white'}`}>
              {preview ? <img src={`data:image/svg+xml;utf8,${encodeURIComponent(preview.svg)}`} alt={q ? t('studio.qrAlt', { code: q.code }) : t('studio.previewAlt')} className="block h-full w-full" /> : <div className="h-full w-full animate-pulse bg-surface-container-low" />}
              {preview?.sample && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-label-sm text-white">{t('studio.sample')}</span>}
            </div>
          </div>
          <div className="min-w-0 space-y-3">
            {intro}
            {q && (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-title-md tracking-wider text-on-surface">{q.codeSpaced}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm ${q.state === 'ACTIVE' ? 'bg-tertiary-soft text-tertiary' : pending ? 'bg-surface-container text-on-surface-variant' : 'bg-primary-fixed text-primary'}`}>
                    <Icon name={q.state === 'ACTIVE' ? 'check_circle' : pending ? 'schedule' : 'block'} size={14} /> {scheduled ? t('studio.activeOn', { date: fdate(q.activateAt!) }) : atLaunch ? t('studio.activeAtLaunch') : q.stateLabel}
                  </span>
                </div>
                <p className="m-0 break-all text-body-sm text-on-surface-variant">{q.url.replace(/^https?:\/\//, '')} • {t('studio.scans', { count: q.scanCount, n: String(q.scanCount) })}</p>
                {q.assignedByTeam && (
                  <p className="m-0 flex items-start gap-2 rounded-xl bg-tertiary-soft/70 p-3 text-body-sm text-on-surface">
                    <Icon name="verified" size={18} className="mt-0.5 shrink-0 text-tertiary" />
                    <span>{t.rich(target.kind === 'MEMBER' ? 'studio.assigned.member' : 'studio.assigned.listing', { b: c => <b>{c}</b> })}</span>
                  </p>
                )}
                {atLaunch && <p className="m-0 text-body-sm text-on-surface-variant">{t(target.kind === 'MEMBER' ? 'studio.atLaunch.member' : 'studio.atLaunch.listing')}</p>}
                {scheduled && <p className="m-0 text-body-sm text-on-surface-variant">{t(target.kind === 'MEMBER' ? 'studio.scheduled.member' : 'studio.scheduled.listing')}</p>}
              </div>
            )}
            {o && !o.eligible && <p className="m-0 flex items-start gap-2 rounded-xl bg-primary-fixed/60 p-3 text-body-sm text-primary"><Icon name="info" size={18} className="mt-0.5 shrink-0" /> {o.reason}</p>}
            <div className="space-y-2">
              <p className="m-0 text-label-md text-on-surface">{t('studio.color')}</p>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map(c => <button key={c.value} aria-pressed={color === c.value} onClick={() => setColor(c.value)} className={chip(color === c.value)}><span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: c.value }} /> {t(c.labelKey)}</button>)}
                <label className={chip(!COLORS.some(c => c.value === color))}>
                  <input type="color" value={color} onChange={e => setColor(e.target.value.toUpperCase())} aria-label={t('studio.color.customAria')} className="h-5 w-6 cursor-pointer border-none bg-transparent p-0" /> {t('studio.color.other')}
                </label>
              </div>
              {lowContrast && <p role="alert" className="m-0 rounded-lg bg-primary-fixed px-3 py-2 text-body-sm text-primary">{t('studio.lowContrast', { ratio: contrastOnWhite(color).toFixed(1), min: String(MIN_QR_CONTRAST) })}</p>}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <div className="space-y-1.5">
                <p className="m-0 text-label-md text-on-surface">{t('studio.background')}</p>
                <div className="flex gap-1.5">
                  <button aria-pressed={!transparent} onClick={() => setTransparent(false)} className={chip(!transparent)}>{t('studio.white')}</button>
                  <button aria-pressed={transparent} onClick={() => setTransparent(true)} className={chip(transparent)}>{t('studio.transparent')}</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="m-0 text-label-md text-on-surface">{t('studio.logo')}</p>
                <div className="flex gap-1.5">
                  <button aria-pressed={logo} onClick={() => setLogo(true)} className={chip(logo)}>{t('studio.with')}</button>
                  <button aria-pressed={!logo} onClick={() => setLogo(false)} className={chip(!logo)}>{t('studio.without')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 border-0 border-t border-solid border-outline-variant/60 pt-4 sm:grid-cols-3">
          <button disabled={!can || lowContrast || !!busy || left === 0} onClick={() => void download('SVG')} className={`${btn} bg-primary text-white`}><Icon name="download" size={18} /> {busy === 'SVG' ? t('studio.preparing') : t('studio.svg')}</button>
          <button disabled={!can || lowContrast || !!busy || left === 0} onClick={() => void download('PDF')} className={`${btn} bg-surface-container-low text-on-surface`}><Icon name="picture_as_pdf" size={18} /> {busy === 'PDF' ? t('studio.preparing') : t('studio.pdf')}</button>
          <span className="flex">
            <select value={size} onChange={e => setSize(Number(e.target.value))} aria-label={t('studio.pngSize')} className="h-11 rounded-l-xl border-none bg-surface-container px-2 text-label-md text-on-surface">
              {(o?.pngSizes ?? [1024, 2048, 4096]).map(s => <option key={s} value={s}>{s} px{/* i18n-ignore */}</option>)}
            </select>
            <button disabled={!can || lowContrast || !!busy || left === 0} onClick={() => void download('PNG')} className={`${btn} flex-1 rounded-l-none bg-surface-container-low text-on-surface`}><Icon name="image" size={18} /> {busy === 'PNG' ? '…' : 'PNG'}</button>
          </span>
        </div>
        {error && <p role="alert" className="m-0 mt-3 rounded-lg bg-primary-fixed px-3 py-2 text-body-sm text-primary">{error}</p>}
        {o && <p className="m-0 mt-3 text-body-sm text-on-surface-variant">{t(left === 0 ? 'studio.quotaReached' : 'studio.quota', { count: o.dailyMax, used: String(o.usedToday), max: String(o.dailyMax) })} {t('studio.fileName', { file: target.kind === 'MEMBER' ? 'dilchap-qr-membre-…' : 'dilchap-qr-annonce-…', size: String(size) })}</p>}
      </section>

      {visuals.length > 0 && (
        <section className={card}>
          <h2 className="m-0 text-title-md text-on-surface">{t('visuals.title')}</h2>
          <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t(target.kind === 'MEMBER' ? 'visuals.intro.member' : 'visuals.intro.listing')}</p>
          <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {visuals.map(v => <VisualCard key={v.id} v={v} target={target} disabled={!can || left === 0} onDone={() => { void refetch(); void client.refetchQueries({ include: ['MyQrPreview', 'MyQrVisualPreview'] }) }} />)}
          </ul>
        </section>
      )}

      <QrGuide />
      {q && <Stats id={q.id} />}
    </div>
  )
}
