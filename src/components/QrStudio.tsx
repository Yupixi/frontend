import { useState } from 'react'
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react'
import Icon from './Icon'
import { saveQrFile, type QrFile } from '../graphql/shopQr'
import {
  MIN_QR_CONTRAST, MY_QR_DOWNLOAD, MY_QR_PREVIEW_QUERY, MY_QR_QUERY, MY_QR_STATS_QUERY, MY_QR_VISUALS_QUERY,
  MY_QR_VISUAL_DOWNLOAD, MY_QR_VISUAL_PREVIEW_QUERY, contrastOnWhite,
  type MyQrOverview, type MyQrStats, type MyQrVisual, type QrTarget,
} from '../graphql/memberQr'

// The member's QR studio: preview, downloads for their own designs (SVG,
// PDF, PNG; background, logo, colour), the team's ready-to-print visuals,
// a short printing guide and the scan statistics. Shared by « Mon QR
// code » and « QR code de l'annonce ».

const card = 'rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5'
const chip = (on: boolean) => `inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-none px-3.5 text-label-md ${on ? 'bg-inverse-surface text-surface' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`
const btn = 'flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none px-4 text-label-md disabled:cursor-default disabled:opacity-50'
const fdate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const COLORS = [
  { value: '#000000', label: 'Noir' },
  { value: '#FE0000', label: 'Rouge Dilchap' },
]
const errText = (e: unknown) => {
  const m = (e as { message?: string })?.message
  return m && !/^(Failed to fetch|NetworkError)/.test(m) ? m : 'Téléchargement impossible pour le moment. Réessayez.'
}

export function QrGuide({ open = false }: { open?: boolean }) {
  return (
    <details open={open} className={`${card} group`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-title-sm text-on-surface [&::-webkit-details-marker]:hidden">
        <Icon name="lightbulb" size={20} className="text-primary" /> <span className="flex-1">Bien imprimer son QR code</span>
        <Icon name="expand_more" size={20} className="transition-transform group-open:rotate-180" />
      </summary>
      <ul className="m-0 mt-3 space-y-2 pl-5 text-body-sm text-on-surface">
        <li><b>Taille</b> : au moins <b>2 × 2 cm</b> pour le code, <b>3 cm conseillé</b>. Plus grand sur une affiche vue de loin (environ 1 cm par 10 cm de distance).</li>
        <li><b>Contraste</b> : un code foncé sur un fond clair. Une couleur trop claire ne se scanne pas.</li>
        <li><b>Ne pas déformer</b> : gardez le code carré, redimensionnez-le par un coin, sans l’étirer ni le recadrer.</li>
        <li><b>Laisser la marge</b> : la bande blanche autour du code fait partie du QR ; rien dessus.</li>
        <li><b>Tester avant d’imprimer en quantité</b> : imprimez un exemplaire et scannez-le avec deux téléphones.</li>
        <li>Pour vos visuels (Canva, Illustrator, Word) : prenez le <b>SVG</b> ou le <b>PDF</b> (nets à toutes les tailles), avec <b>fond transparent</b> sur un fond clair.</li>
      </ul>
    </details>
  )
}

function Stats({ id }: { id: string }) {
  const { data } = useQuery<{ myQrStats: MyQrStats }>(MY_QR_STATS_QUERY, { variables: { id, days: 30 }, fetchPolicy: 'cache-and-network' })
  const s = data?.myQrStats
  if (!s) return null
  const max = Math.max(1, ...s.stats.days.map(d => d.scans))
  return (
    <section className={card}>
      <h2 className="m-0 flex items-center gap-2 text-title-md text-on-surface"><Icon name="bar_chart" size={20} className="text-primary" /> Scans</h2>
      <dl className="m-0 mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><dt className="text-label-sm uppercase text-on-surface-variant">Total</dt><dd className="m-0 text-headline-sm font-bold text-on-surface">{s.scanCount}</dd></div>
        <div><dt className="text-label-sm uppercase text-on-surface-variant">Avant lancement</dt><dd className="m-0 text-headline-sm font-bold text-on-surface">{s.prelaunchScanCount}</dd></div>
        <div><dt className="text-label-sm uppercase text-on-surface-variant">Premier scan</dt><dd className="m-0 text-body-md text-on-surface">{s.firstScanAt ? fdate(s.firstScanAt) : '—'}</dd></div>
        <div><dt className="text-label-sm uppercase text-on-surface-variant">Dernier scan</dt><dd className="m-0 text-body-md text-on-surface">{s.lastScanAt ? fdate(s.lastScanAt) : '—'}</dd></div>
      </dl>
      {s.stats.days.some(d => d.scans) ? (
        <div className="mt-4">
          <div className="flex h-24 items-end gap-[2px]" role="img" aria-label="Scans par jour sur 30 jours">
            {s.stats.days.map(d => <div key={d.day} title={`${fdate(d.day)} : ${d.scans}`} className="min-w-0 flex-1 rounded-t-sm bg-primary" style={{ height: `${(d.scans / max) * 100}%`, minHeight: d.scans ? 2 : 0 }} />)}
          </div>
          <p className="m-0 mt-1 flex justify-between text-label-sm text-on-surface-variant"><span>il y a 30 jours</span><span>aujourd’hui</span></p>
        </div>
      ) : <p className="m-0 mt-3 text-body-sm text-on-surface-variant">Aucun scan ces 30 derniers jours.</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="m-0 mb-1 text-label-sm uppercase text-on-surface-variant">Pays (approximatif)</p>
          {s.stats.countries.length ? s.stats.countries.slice(0, 5).map(c => <p key={c.country} className="m-0 flex justify-between text-body-sm text-on-surface"><span>{c.country === 'XX' ? 'Inconnu' : c.country}</span><b>{c.scans}</b></p>) : <p className="m-0 text-body-sm text-on-surface-variant">—</p>}
        </div>
        <div>
          <p className="m-0 mb-1 text-label-sm uppercase text-on-surface-variant">Appareil</p>
          {s.stats.devices.length ? s.stats.devices.map(d => <p key={d.device} className="m-0 flex justify-between text-body-sm text-on-surface"><span className="flex items-center gap-1"><Icon name={d.device === 'MOBILE' ? 'smartphone' : 'laptop_mac'} size={16} /> {d.device === 'MOBILE' ? 'Mobile' : 'Ordinateur'}</span><b>{d.scans}</b></p>) : <p className="m-0 text-body-sm text-on-surface-variant">—</p>}
        </div>
      </div>
      <p className="m-0 mt-3 text-body-sm text-on-surface-variant">Aucune donnée sur les personnes qui scannent : seulement des compteurs par jour.</p>
    </section>
  )
}

function VisualCard({ v, target, disabled, onDone }: { v: MyQrVisual; target: QrTarget; disabled: boolean; onDone: () => void }) {
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
        {f ? <img src={`data:${f.mimeType};base64,${f.base64}`} alt={`Aperçu : ${v.name}`} className="max-h-full max-w-full rounded shadow-sm" /> : <div className="h-full w-full animate-pulse rounded bg-surface-container-high" />}
      </div>
      <p className="m-0 text-label-lg text-on-surface">{v.name}</p>
      <p className="m-0 text-body-sm text-on-surface-variant">{v.widthMm} × {v.heightMm} mm</p>
      {v.sheetable && (
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-body-sm text-on-surface">
          <input type="checkbox" checked={sheet} onChange={e => setSheet(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" /> Planche A4 (plusieurs par page)
        </label>
      )}
      <button disabled={disabled || st.loading} onClick={download} className={`${btn} mt-auto bg-primary text-white`}><Icon name="picture_as_pdf" size={18} /> {st.loading ? 'Préparation…' : 'Télécharger le PDF'}</button>
      {error && <p role="alert" className="m-0 rounded-lg bg-primary-fixed px-3 py-2 text-body-sm text-primary">{error}</p>}
    </li>
  )
}

export default function QrStudio({ target, intro }: { target: QrTarget; intro?: React.ReactNode }) {
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

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[220px]">
            <div className={`relative aspect-square overflow-hidden rounded-xl ring-1 ring-outline-variant ${transparent ? 'bg-[conic-gradient(#e5e5e5_25%,#fff_0_50%,#e5e5e5_0_75%,#fff_0)] bg-[length:16px_16px]' : 'bg-white'}`}>
              {preview ? <img src={`data:image/svg+xml;utf8,${encodeURIComponent(preview.svg)}`} alt={q ? `QR code ${q.code}` : 'Aperçu du QR code'} className="block h-full w-full" /> : <div className="h-full w-full animate-pulse bg-surface-container-low" />}
              {preview?.sample && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-label-sm text-white">Aperçu : votre code sera créé au 1er téléchargement</span>}
            </div>
          </div>
          <div className="min-w-0 space-y-3">
            {intro}
            {q && (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-title-md tracking-wider text-on-surface">{q.codeSpaced}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm ${q.state === 'ACTIVE' ? 'bg-tertiary-soft text-tertiary' : pending ? 'bg-surface-container text-on-surface-variant' : 'bg-primary-fixed text-primary'}`}>
                    <Icon name={q.state === 'ACTIVE' ? 'check_circle' : pending ? 'schedule' : 'block'} size={14} /> {pending ? 'Actif au lancement' : q.stateLabel}
                  </span>
                </div>
                <p className="m-0 break-all text-body-sm text-on-surface-variant">{q.url.replace(/^https?:\/\//, '')} • {q.scanCount} scan{q.scanCount > 1 ? 's' : ''}</p>
                {pending && <p className="m-0 text-body-sm text-on-surface-variant">Avant le lancement, un scan affiche la page de lancement de Dilchap ; il mènera tout seul à {target.kind === 'MEMBER' ? 'votre page' : 'l’annonce'} dès l’ouverture. Vous pouvez imprimer dès maintenant.</p>}
              </div>
            )}
            {o && !o.eligible && <p className="m-0 flex items-start gap-2 rounded-xl bg-primary-fixed/60 p-3 text-body-sm text-primary"><Icon name="info" size={18} className="mt-0.5 shrink-0" /> {o.reason}</p>}
            <div className="space-y-2">
              <p className="m-0 text-label-md text-on-surface">Couleur</p>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map(c => <button key={c.value} aria-pressed={color === c.value} onClick={() => setColor(c.value)} className={chip(color === c.value)}><span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: c.value }} /> {c.label}</button>)}
                <label className={chip(!COLORS.some(c => c.value === color))}>
                  <input type="color" value={color} onChange={e => setColor(e.target.value.toUpperCase())} aria-label="Couleur libre" className="h-5 w-6 cursor-pointer border-none bg-transparent p-0" /> Autre
                </label>
              </div>
              {lowContrast && <p role="alert" className="m-0 rounded-lg bg-primary-fixed px-3 py-2 text-body-sm text-primary">Couleur trop claire pour être scannée (contraste {contrastOnWhite(color).toFixed(1)}:1, il faut au moins {MIN_QR_CONTRAST}:1). Choisissez une couleur plus foncée.</p>}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <div className="space-y-1.5">
                <p className="m-0 text-label-md text-on-surface">Fond</p>
                <div className="flex gap-1.5">
                  <button aria-pressed={!transparent} onClick={() => setTransparent(false)} className={chip(!transparent)}>Blanc</button>
                  <button aria-pressed={transparent} onClick={() => setTransparent(true)} className={chip(transparent)}>Transparent</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="m-0 text-label-md text-on-surface">Logo Dilchap au centre</p>
                <div className="flex gap-1.5">
                  <button aria-pressed={logo} onClick={() => setLogo(true)} className={chip(logo)}>Avec</button>
                  <button aria-pressed={!logo} onClick={() => setLogo(false)} className={chip(!logo)}>Sans</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 border-0 border-t border-solid border-outline-variant/60 pt-4 sm:grid-cols-3">
          <button disabled={!can || lowContrast || !!busy || left === 0} onClick={() => void download('SVG')} className={`${btn} bg-primary text-white`}><Icon name="download" size={18} /> {busy === 'SVG' ? 'Préparation…' : 'SVG (vectoriel)'}</button>
          <button disabled={!can || lowContrast || !!busy || left === 0} onClick={() => void download('PDF')} className={`${btn} bg-surface-container-low text-on-surface`}><Icon name="picture_as_pdf" size={18} /> {busy === 'PDF' ? 'Préparation…' : 'PDF (vectoriel)'}</button>
          <span className="flex">
            <select value={size} onChange={e => setSize(Number(e.target.value))} aria-label="Taille du PNG" className="h-11 rounded-l-xl border-none bg-surface-container px-2 text-label-md text-on-surface">
              {(o?.pngSizes ?? [1024, 2048, 4096]).map(s => <option key={s} value={s}>{s} px</option>)}
            </select>
            <button disabled={!can || lowContrast || !!busy || left === 0} onClick={() => void download('PNG')} className={`${btn} flex-1 rounded-l-none bg-surface-container-low text-on-surface`}><Icon name="image" size={18} /> {busy === 'PNG' ? '…' : 'PNG'}</button>
          </span>
        </div>
        {error && <p role="alert" className="m-0 mt-3 rounded-lg bg-primary-fixed px-3 py-2 text-body-sm text-primary">{error}</p>}
        {o && <p className="m-0 mt-3 text-body-sm text-on-surface-variant">{o.usedToday} / {o.dailyMax} téléchargement{o.dailyMax > 1 ? 's' : ''} aujourd’hui{left === 0 ? ' : limite atteinte, réessayez demain.' : '.'} Nom du fichier : explicite (ex. {target.kind === 'MEMBER' ? 'dilchap-qr-membre-…' : 'dilchap-qr-annonce-…'}-{size}.png).</p>}
      </section>

      {visuals.length > 0 && (
        <section className={card}>
          <h2 className="m-0 text-title-md text-on-surface">Visuels prêts à imprimer</h2>
          <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Créés par l’équipe Dilchap, remplis avec {target.kind === 'MEMBER' ? 'votre nom' : 'votre annonce'} et votre QR code. Imprimez à 100 % (sans « ajuster à la page »). Jamais votre téléphone ni votre e-mail.</p>
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
