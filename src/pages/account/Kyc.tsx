import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import SafeImg from '../../components/SafeImg'
import { AccountLayout } from './AccountLayout'
import { FOOTER_SETTINGS_QUERY } from '../../graphql/content'
import { MY_REPUTATION_QUERY } from '../../graphql/sellerHub'
import {
  KYC_DOCS, KYC_REJECT_LABELS, MY_KYC_QUERY, SUBMIT_KYC_MUTATION,
  type KycDocType, type KycPart, type KycSubmission, type MyKyc,
} from '../../graphql/kyc'
import { uploadKycPhoto } from '../../lib/upload'
import type { AuthUser } from '../../graphql/auth'

type Props = {
  onNavigate: (p: any) => void
  currentUser?: AuthUser | null
  onLogout: () => void
  onViewShop?: (sellerId: string) => void
}

type Photo = { preview: string; key?: string; uploading?: boolean; error?: string }
type Step = 'intro' | 'doc' | 'front' | 'back' | 'selfie' | 'photos' | 'review'

const PART_LABEL: Record<KycPart, string> = { FRONT: 'Recto de la pièce', BACK: 'Verso de la pièce', SELFIE: 'Selfie avec la pièce' }

const useDesktop = () => {
  const query = '(min-width: 1024px)'
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return desktop
}

const isoDay = (d: string) => (d ? new Date(`${d}T00:00:00.000Z`).toISOString() : '')
const dayOf = (iso: string) => iso.slice(0, 10)

// Phones/tablets get the native camera through `capture`; desktop browsers
// ignore that attribute, so there the camera button opens the webcam instead.
const touchDevice = () => window.matchMedia('(pointer: coarse)').matches

// Desktop webcam capture: live preview, one shot encoded to JPEG.
function WebcamDialog({ selfie, title, onShot, onImport, onClose }: {
  selfie: boolean; title: string; onShot: (file: File) => void; onImport: () => void; onClose: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Votre navigateur ne permet pas d’utiliser la caméra. Importez une photo à la place.')
    } else {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: selfie ? 'user' : 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      }).then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return }
        stream = s
        if (video.current) { video.current.srcObject = s; void video.current.play().catch(() => {}) }
      }).catch((e: unknown) => {
        if (cancelled) return
        const name = e instanceof DOMException ? e.name : ''
        setError(name === 'NotAllowedError' || name === 'SecurityError'
          ? 'L’accès à la caméra a été refusé. Autorisez-le depuis la barre d’adresse du navigateur, ou importez une photo.'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'Aucune caméra détectée sur cet ordinateur. Importez une photo prise avec votre téléphone.'
            : name === 'NotReadableError'
              ? 'La caméra est déjà utilisée par une autre application. Fermez-la puis réessayez, ou importez une photo.'
              : 'Impossible d’ouvrir la caméra. Importez une photo à la place.')
      })
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelled = true
      stream?.getTracks().forEach(t => t.stop())
      window.removeEventListener('keydown', onKey)
    }
  }, [selfie])

  const shoot = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d')?.drawImage(v, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      onShot(new File([blob], `${selfie ? 'selfie' : 'piece'}-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      onClose()
    }, 'image/jpeg', 0.92)
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-[640px] rounded-2xl bg-surface-lowest p-4 shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="m-0 min-w-0 truncate text-title-md text-on-surface">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface"><Icon name="close" size={20} /></button>
        </div>
        {error ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-container-low px-4 py-8 text-center">
            <Icon name="videocam_off" size={32} className="text-on-surface-variant" />
            <p className="m-0 max-w-[420px] text-body-md text-on-surface-variant">{error}</p>
            <button type="button" onClick={() => { onClose(); onImport() }} className="flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border-none bg-primary px-5 text-label-lg text-white">
              <Icon name="upload_file" size={19} /> Importer une photo
            </button>
          </div>
        ) : (
          <>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#2a2626]">
              {/* Selfie preview mirrored like a mirror; the saved shot stays unmirrored so the document reads correctly. */}
              <video ref={video} playsInline muted onLoadedData={() => setReady(true)} className={`h-full w-full object-cover ${selfie ? '-scale-x-100' : ''}`} />
              {selfie
                ? <span className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/60" />
                : <span className="pointer-events-none absolute left-1/2 top-1/2 h-[62%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-dashed border-white/60" />}
              {!ready && <span className="absolute inset-0 flex items-center justify-center"><Icon name="progress_activity" size={36} className="animate-spin text-white" /></span>}
            </div>
            <p className="m-0 mt-3 text-body-sm text-on-surface-variant">
              {selfie ? 'Placez votre visage dans l’ovale et tenez la pièce à côté, bien lisible.' : 'Placez la pièce dans le cadre, bien éclairée et sans reflet.'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={onClose} className="flex h-12 cursor-pointer items-center justify-center rounded-xl border-none bg-surface-container text-label-md text-on-surface">Annuler</button>
              <button type="button" onClick={shoot} disabled={!ready} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:cursor-default disabled:opacity-50">
                <Icon name="photo_camera" size={20} /> Capturer
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

// Photo of one piece: take it (camera / webcam) or pick a file, uploaded to
// the private KYC storage right away.
function PhotoCapture({ part, docLabel, photo, onPick, compact }: {
  part: KycPart; docLabel: string; photo?: Photo; onPick: (file: File) => void; compact?: boolean
}) {
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const selfie = part === 'SELFIE'
  const [webcam, setWebcam] = useState(false)
  const [touch] = useState(touchDevice)
  const takePhoto = () => (touch ? camera.current?.click() : setWebcam(true))
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }
  return (
    <div>
      <input ref={camera} type="file" accept="image/*" capture={selfie ? 'user' : 'environment'} hidden onChange={pick} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={pick} />
      <div className={`relative overflow-hidden rounded-2xl bg-[#2a2626] ${compact ? 'aspect-[4/3]' : selfie ? 'aspect-[4/5]' : 'aspect-[16/10]'}`}>
        {photo?.preview ? (
          <img src={photo.preview} alt={PART_LABEL[part]} className={`h-full w-full object-cover ${photo.uploading ? 'opacity-60' : ''}`} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/70">
            {/* Framing guide */}
            {selfie
              ? <span className="h-[62%] w-[48%] rounded-[50%] border-2 border-dashed border-white/50" />
              : <span className="flex h-[70%] w-[82%] items-center justify-center rounded-xl border-2 border-dashed border-white/50 text-label-sm uppercase tracking-wide text-white/60"><Icon name="badge" size={20} /> &nbsp;{docLabel}</span>}
          </div>
        )}
        {['left-3 top-3 border-l-2 border-t-2', 'right-3 top-3 border-r-2 border-t-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'].map(c => (
          <span key={c} className={`absolute h-6 w-6 rounded-sm border-solid border-primary ${c} ${photo?.key ? 'border-tertiary' : ''}`} />
        ))}
        {photo?.uploading && <span className="absolute inset-0 flex items-center justify-center"><Icon name="progress_activity" size={36} className="animate-spin text-white" /></span>}
        {photo?.key && <span className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-surface-lowest/95 px-2.5 py-1 text-label-sm text-tertiary"><Icon name="check_circle" size={15} fill /> {compact ? 'Enregistrée' : 'Photo enregistrée'}</span>}
      </div>
      {photo?.error && <p className="m-0 mt-2 flex items-center gap-1.5 text-body-sm text-primary"><Icon name="error" size={16} /> {photo.error}</p>}
      <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <button type="button" onClick={takePhoto} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white">
          <Icon name={photo?.key ? 'refresh' : 'photo_camera'} size={20} /> {photo?.key ? 'Reprendre' : selfie ? 'Prendre le selfie' : 'Prendre la photo'}
        </button>
        <button type="button" onClick={() => gallery.current?.click()} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container text-label-md text-on-surface">
          <Icon name="upload_file" size={19} /> {touch ? 'Importer depuis la galerie' : 'Importer un fichier'}
        </button>
      </div>
      {webcam && (
        <WebcamDialog selfie={selfie} title={PART_LABEL[part]} onShot={onPick} onImport={() => gallery.current?.click()} onClose={() => setWebcam(false)} />
      )}
    </div>
  )
}

function Tips({ items }: { items: [string, string, string][] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map(([icon, title, text]) => (
        <div key={title} className="flex items-start gap-3 rounded-xl bg-surface-container-low p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-lowest text-primary"><Icon name={icon} size={19} /></span>
          <div><div className="text-label-md text-on-surface">{title}</div><div className="text-body-sm text-on-surface-variant">{text}</div></div>
        </div>
      ))}
    </div>
  )
}

const DOC_TIPS: [string, string, string][] = [
  ['light_mode', 'Bonne lumière', 'Évitez les zones sombres et les ombres portées de votre téléphone.'],
  ['flash_off', 'Sans reflet ni flash', 'Inclinez légèrement la carte si la lumière crée un éblouissement.'],
  ['crop_free', '4 coins visibles', 'La pièce entière doit entrer dans le cadre, sans bord coupé.'],
]
const SELFIE_TIPS: [string, string, string][] = [
  ['face', 'Regardez l’objectif', 'Visage de face, bien éclairé, expression neutre.'],
  ['visibility', 'Visage dégagé', 'Retirez casquette, chapeau, masque et lunettes teintées.'],
  ['badge', 'Pièce à côté du visage', 'Sans cacher votre photo ni vos nom et prénoms avec les doigts.'],
]

// "Vérifier mon identité": intro → document → photos (recto, verso, selfie)
// → information check → status (pending / refused / validated). Mobile: one
// piece per step; desktop: the three photos side by side.
export default function Kyc({ onNavigate, currentUser, onLogout, onViewShop }: Props) {
  const desktop = useDesktop()
  const { data, loading, refetch } = useQuery<{ myKyc: MyKyc }>(MY_KYC_QUERY, { fetchPolicy: 'cache-and-network' })
  const kyc = data?.myKyc
  const [wizard, setWizard] = useState(false)
  const [step, setStep] = useState<Step>('intro')
  const [docType, setDocType] = useState<KycDocType>('CNI')
  const [photos, setPhotos] = useState<Partial<Record<KycPart, Photo>>>({})
  const [form, setForm] = useState({ lastName: '', firstNames: '', birthDate: '', docNumber: '', docExpiry: '', consent: false })
  const [error, setError] = useState<string | null>(null)
  const [submit, { loading: sending }] = useMutation(SUBMIT_KYC_MUTATION)
  const doc = KYC_DOCS.find(d => d.key === docType)!
  const retention = kyc?.retentionDays ?? 30

  useEffect(() => () => Object.values(photos).forEach(p => p?.preview && URL.revokeObjectURL(p.preview)), []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.scrollTo?.(0, 0); document.querySelector('.dashboard-main')?.scrollTo?.(0, 0) }, [step, wizard])

  const steps: Step[] = desktop ? ['doc', 'photos', 'review'] : ['intro', 'doc', 'front', ...(doc.back ? ['back' as const] : []), 'selfie', 'review']
  const current = steps.includes(step) ? step : steps[0]
  const index = steps.indexOf(current)
  const parts: KycPart[] = ['FRONT', ...(doc.back ? ['BACK' as const] : []), 'SELFIE']

  const pickPhoto = (part: KycPart, file: File) => {
    const preview = URL.createObjectURL(file)
    setPhotos(p => { if (p[part]?.preview) URL.revokeObjectURL(p[part]!.preview); return { ...p, [part]: { preview, uploading: true } } })
    uploadKycPhoto(file, file.name || 'photo.jpg')
      .then(key => setPhotos(p => (p[part]?.preview === preview ? { ...p, [part]: { preview, key } } : p)))
      .catch((e: Error) => setPhotos(p => (p[part]?.preview === preview ? { ...p, [part]: { preview, error: e.message } } : p)))
  }

  const start = (from?: KycSubmission | null) => {
    if (from) {
      setDocType(from.docType)
      setForm(f => ({ ...f, lastName: from.lastName, firstNames: from.firstNames, birthDate: dayOf(from.birthDate), docNumber: from.docNumber, docExpiry: dayOf(from.docExpiry) }))
    }
    setPhotos({})
    setError(null)
    setWizard(true)
    setStep(desktop ? 'doc' : from ? 'doc' : 'intro')
  }

  const canNext = (s: Step) =>
    s === 'front' ? !!photos.FRONT?.key
      : s === 'back' ? !!photos.BACK?.key
        : s === 'selfie' ? !!photos.SELFIE?.key
          : s === 'photos' ? parts.every(p => photos[p]?.key)
            : true
  const formOk = form.lastName.trim().length >= 2 && form.firstNames.trim().length >= 2 && !!form.birthDate && form.docNumber.trim().length >= 4 && !!form.docExpiry && form.consent

  const next = () => { if (index < steps.length - 1) setStep(steps[index + 1]) }
  const back = () => (index > 0 ? setStep(steps[index - 1]) : setWizard(false))

  const send = () => {
    setError(null)
    void submit({
      variables: {
        input: {
          docType, frontKey: photos.FRONT?.key, backKey: doc.back ? photos.BACK?.key : undefined, selfieKey: photos.SELFIE?.key,
          lastName: form.lastName.trim(), firstNames: form.firstNames.trim(), birthDate: isoDay(form.birthDate),
          docNumber: form.docNumber.trim(), docExpiry: isoDay(form.docExpiry), consent: form.consent,
        },
      },
    }).then(() => { setWizard(false); void refetch() }).catch((e: Error) => setError(e.message))
  }

  const layout = (children: React.ReactNode, hideNav = false) => (
    <AccountLayout active="buyer-settings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title="Vérification d’identité" hideBottomNav={hideNav} onBack={wizard ? back : undefined}>
      <div className="mx-auto max-w-[1080px] pb-28 lg:pb-8">{children}</div>
    </AccountLayout>
  )

  if (loading && !kyc) return layout(<p className="text-body-md text-on-surface-variant">Chargement…</p>)

  const privacy = (
    <div className="flex items-start gap-3 rounded-2xl bg-tertiary-soft p-4">
      <Icon name="lock" size={22} className="mt-0.5 shrink-0 text-tertiary" />
      <div>
        <div className="text-label-lg text-tertiary">Vos pièces restent confidentielles</div>
        <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Elles sont conservées dans un espace privé, consultées uniquement par l’équipe de vérification Dilchap, jamais affichées aux acheteurs, et supprimées {retention} jours après la décision.</p>
      </div>
    </div>
  )

  // ─── Status screens ──────────────────────────────────────────────────
  if (!wizard) {
    if (kyc?.verified) return layout(<Validated kyc={kyc} currentUser={currentUser} onNavigate={onNavigate} onViewShop={onViewShop} />)
    if (kyc?.latest?.status === 'PENDING') return layout(<Pending sub={kyc.latest} retention={retention} onNavigate={onNavigate} />)
    if (kyc?.latest?.status === 'REJECTED') return layout(<Rejected sub={kyc.latest} onRetry={() => start(kyc.latest)} />)
  }

  const progress = (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-2 text-label-sm uppercase text-primary">
        <span className="flex items-center gap-1.5"><Icon name="shield" size={15} /> Étape {index + 1} sur {steps.length}</span>
        <span className="flex items-center gap-1 normal-case tracking-normal text-on-surface-variant"><Icon name="timer" size={15} /> Environ 2 minutes</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div>
      {desktop && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {['Pièce d’identité', 'Photos & selfie', 'Vérification & envoi'].map((l, i) => (
            <div key={l} className={`rounded-xl px-3 py-2 text-center text-label-md ${i === index ? 'bg-primary text-white' : i < index ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container-low text-on-surface-variant'}`}>{i + 1}. {l}</div>
          ))}
        </div>
      )}
    </div>
  )

  const footer = (label: string, disabled: boolean, onClick: () => void, icon = 'arrow_forward') => (
    <div className="fixed inset-x-0 bottom-0 z-40 border-0 border-t border-solid border-outline-variant bg-surface-lowest/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:mt-6 lg:border-none lg:bg-transparent lg:p-0">
      <div className="mx-auto flex max-w-[1080px] items-center gap-3">
        {desktop && <button onClick={back} className="flex h-12 cursor-pointer items-center gap-2 rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface"><Icon name="arrow_back" size={18} /> {index === 0 ? 'Annuler' : 'Étape précédente'}</button>}
        <button onClick={onClick} disabled={disabled} className="flex h-13 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white shadow-md disabled:cursor-not-allowed disabled:opacity-45 lg:ml-auto lg:max-w-sm">
          {label} <Icon name={icon} size={19} />
        </button>
      </div>
    </div>
  )

  // ─── Wizard ──────────────────────────────────────────────────────────
  if (current === 'intro') return layout(<>
    {progress}
    <h1 className="m-0 text-headline-lg text-on-surface">Obtenez le badge Vendeur certifié</h1>
    <p className="m-0 mt-2 text-body-md text-on-surface-variant">Montrez aux acheteurs que votre identité a été vérifiée par l’équipe Dilchap.</p>
    {currentUser && (
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
        <span className="relative h-14 w-14 shrink-0"><span className="block h-full w-full overflow-hidden rounded-full bg-primary-fixed"><SafeImg src={currentUser.avatarUrl} icon="person" /></span><span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-tertiary text-white ring-2 ring-surface-lowest"><Icon name="verified" size={15} /></span></span>
        <div className="min-w-0"><div className="flex items-center gap-1 text-label-lg text-on-surface">{currentUser.fullName} <Icon name="verified" size={17} className="text-tertiary" /></div><div className="text-label-sm uppercase text-tertiary">Vendeur certifié</div><div className="text-body-sm text-on-surface-variant">Aperçu de votre profil après validation</div></div>
      </div>
    )}
    <div className="mt-5 text-label-md uppercase text-on-surface-variant">Ce que le badge vous apporte</div>
    <div className="mt-2"><Tips items={[
      ['verified', 'Badge sur votre profil et vos annonces', 'Le sceau « Vendeur certifié » apparaît à côté de votre nom partout sur Dilchap.'],
      ['filter_alt', 'Visible avec le filtre « Vendeurs vérifiés »', 'Les acheteurs qui ne veulent voir que des vendeurs vérifiés trouvent vos annonces.'],
      ['handshake', 'Plus de confiance au rendez-vous', 'L’acheteur sait que votre identité a été contrôlée avant de vous rencontrer.'],
    ]} /></div>
    <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
      <div className="flex items-center gap-2 text-label-lg text-on-surface"><Icon name="badge" size={20} className="text-primary" /> Pièces acceptées</div>
      <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Un original en cours de validité :</p>
      <div className="mt-2 grid grid-cols-2 gap-2">{KYC_DOCS.map(d => <span key={d.key} className="flex min-w-0 items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-2 text-label-sm text-on-surface"><Icon name={d.icon} size={16} className="shrink-0 text-on-surface-variant" /> <span className="truncate">{d.label}</span></span>)}</div>
    </div>
    <div className="mt-4">{privacy}</div>
    {footer('Commencer la vérification', false, next)}
  </>, true)

  if (current === 'doc') return layout(<>
    {progress}
    <div className={desktop ? 'grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-6' : ''}>
      {desktop && (
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <div className="flex items-center gap-2 text-label-lg text-on-surface"><Icon name="verified" size={22} className="text-tertiary" /> Badge Vendeur certifié</div>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Affiché sur votre profil et sur chacune de vos annonces, après vérification manuelle de votre pièce par l’équipe Dilchap.</p>
            <div className="mt-3"><Tips items={[
              ['filter_alt', 'Filtre « Vendeurs vérifiés »', 'Vos annonces restent visibles pour les acheteurs qui filtrent.'],
              ['handshake', 'Rendez-vous en confiance', 'L’acheteur sait à qui il a affaire.'],
            ]} /></div>
          </div>
          {privacy}
        </aside>
      )}
      <section>
        <div className="text-label-sm uppercase text-primary">Choix du document</div>
        <h1 className="m-0 mt-1 text-headline-lg text-on-surface">Quel document souhaitez-vous utiliser ?</h1>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">L’original, en cours de validité et en bon état (les photocopies et captures d’écran sont refusées).</p>
        <div role="radiogroup" className={`mt-4 grid gap-3 ${desktop ? 'grid-cols-2' : ''}`}>
          {KYC_DOCS.map(d => {
            const on = d.key === docType
            return (
              <button key={d.key} role="radio" aria-checked={on} onClick={() => setDocType(d.key)} className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-solid p-4 text-left transition-colors ${on ? 'border-primary bg-surface-lowest shadow-sm' : 'border-transparent bg-surface-container-low hover:border-outline-variant'}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-primary-fixed text-primary' : 'bg-surface-lowest text-on-surface-variant'}`}><Icon name={d.icon} size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block pr-7 text-label-lg text-on-surface">{d.label}</span>
                  <span className="block text-label-sm text-on-surface-variant">{d.sub}{d.key === 'CNI' && <span className="ml-1.5 rounded bg-tertiary-soft px-1.5 py-px text-tertiary">Recommandé</span>}</span>
                  <span className="mt-1 block text-body-sm text-on-surface-variant">{d.text}</span>
                  <span className="mt-1.5 flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name={d.back ? 'flip' : 'photo_camera'} size={14} /> {d.back ? 'Recto et verso' : 'Page photo uniquement'}</span>
                </span>
                <span className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-solid ${on ? 'border-primary bg-primary text-white' : 'border-outline-variant'}`}>{on && <Icon name="check" size={15} />}</span>
              </button>
            )
          })}
        </div>
        <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="info" size={18} className="mt-0.5 shrink-0" /> Une pièce expirée est refusée.</p>
        {footer(desktop ? 'Continuer vers les photos' : 'Continuer', false, next)}
      </section>
    </div>
  </>, true)

  if (current === 'front' || current === 'back' || current === 'selfie') {
    const part: KycPart = current === 'front' ? 'FRONT' : current === 'back' ? 'BACK' : 'SELFIE'
    const title = part === 'FRONT' ? `Photographiez le recto de votre ${docType === 'CNI' ? 'CNI' : 'pièce'}` : part === 'BACK' ? 'Photographiez le verso' : 'Prenez un selfie en tenant votre pièce'
    const text = part === 'FRONT' ? (docType === 'PASSPORT' ? 'La page avec votre photo, vos nom et numéro de passeport.' : 'La face avec votre photo, vos nom et numéro de pièce.') : part === 'BACK' ? 'L’autre face de la pièce, en entier et bien lisible.' : 'Tenez la pièce à côté de votre visage, sans cacher vos traits ni les informations de la carte.'
    return layout(<>
      {progress}
      <h1 className="m-0 text-headline-lg text-on-surface">{title}</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">{text}</p>
      <div className="mt-4"><PhotoCapture part={part} docLabel={doc.label} photo={photos[part]} onPick={f => pickPhoto(part, f)} /></div>
      <div className="mt-5 text-label-md uppercase text-on-surface-variant">Conseils pour réussir du premier coup</div>
      <div className="mt-2"><Tips items={part === 'SELFIE' ? SELFIE_TIPS : DOC_TIPS} /></div>
      {part === 'SELFIE' && <div className="mt-4">{privacy}</div>}
      {footer(part === 'FRONT' && doc.back ? 'Valider et passer au verso' : part === 'SELFIE' ? 'Vérifier mes informations' : 'Continuer', !canNext(current), next)}
    </>, true)
  }

  if (current === 'photos') return layout(<>
    {progress}
    <h1 className="m-0 text-headline-lg text-on-surface">Photos de votre {doc.label.toLowerCase()} et selfie</h1>
    <p className="m-0 mt-1 text-body-md text-on-surface-variant">Prenez les photos avec votre téléphone ou importez-les depuis votre ordinateur.</p>
    <div className={`mt-5 grid gap-4 ${parts.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {parts.map((p, i) => (
        <section key={p} className="flex flex-col rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-label-lg text-on-surface"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-fixed text-label-sm text-primary">{i + 1}</span> {PART_LABEL[p]}</div>
          <p className="m-0 mb-3 text-body-sm text-on-surface-variant">{p === 'FRONT' ? 'Face avec votre photo, vos nom et numéro.' : p === 'BACK' ? 'L’autre face, en entier.' : 'Pièce tenue à côté du visage.'}</p>
          <PhotoCapture part={p} docLabel={doc.label} photo={photos[p]} onPick={f => pickPhoto(p, f)} compact />
        </section>
      ))}
    </div>
    <div className="mt-5 grid grid-cols-2 gap-4">
      <div><div className="mb-2 text-label-md uppercase text-on-surface-variant">Pour la pièce</div><Tips items={DOC_TIPS} /></div>
      <div><div className="mb-2 text-label-md uppercase text-on-surface-variant">Pour le selfie</div><Tips items={SELFIE_TIPS} /></div>
    </div>
    {footer('Confirmer les photos et continuer', !canNext('photos'), next)}
  </>, true)

  // Review
  const field = (label: string, key: 'lastName' | 'firstNames' | 'docNumber', placeholder: string, extra = '') => (
    <label className="block rounded-xl bg-surface-lowest px-4 py-2.5 shadow-sm focus-within:outline focus-within:outline-2 focus-within:outline-primary">
      <span className="block text-label-sm text-on-surface-variant">{label}</span>
      <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} autoComplete="off" className={`w-full border-none bg-transparent p-0 text-body-lg text-on-surface outline-none ${extra}`} />
    </label>
  )
  const dateField = (label: string, key: 'birthDate' | 'docExpiry') => (
    <label className="block rounded-xl bg-surface-lowest px-4 py-2.5 shadow-sm focus-within:outline focus-within:outline-2 focus-within:outline-primary">
      <span className="block text-label-sm text-on-surface-variant">{label}</span>
      <input type="date" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full border-none bg-transparent p-0 text-body-lg text-on-surface outline-none" />
    </label>
  )
  const files = (
    <div className={`grid gap-2 ${desktop ? 'grid-cols-1' : 'grid-cols-3'}`}>
      {parts.map(p => (
        <button key={p} type="button" onClick={() => setStep(desktop ? 'photos' : p === 'FRONT' ? 'front' : p === 'BACK' ? 'back' : 'selfie')} className="cursor-pointer overflow-hidden rounded-xl border-none bg-surface-lowest p-0 text-left shadow-sm">
          <span className="relative block aspect-[4/3] bg-surface-container">{photos[p]?.preview && <img src={photos[p]!.preview} alt="" className="h-full w-full object-cover" />}<span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-tertiary text-white"><Icon name="check" size={13} /></span></span>
          <span className="block px-2 py-1.5 text-center text-label-sm text-on-surface">{PART_LABEL[p]}<span className="block text-[11px] text-primary">Reprendre</span></span>
        </button>
      ))}
    </div>
  )
  return layout(<>
    {progress}
    <div className={desktop ? 'grid grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] gap-6' : ''}>
      {desktop && <aside><div className="mb-2 text-label-md uppercase text-on-surface-variant">Photos ({parts.length})</div>{files}</aside>}
      <section>
        <h1 className="m-0 text-headline-lg text-on-surface">Vérifiez vos informations</h1>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">Recopiez-les exactement comme elles figurent sur votre pièce d’identité.</p>
        <div className="mt-4 text-label-md uppercase text-on-surface-variant">Identité</div>
        <div className={`mt-2 grid gap-2 ${desktop ? 'grid-cols-2' : ''}`}>
          {field('Nom de famille', 'lastName', 'Ex : Kouassi', 'uppercase placeholder:normal-case')}
          {field('Prénoms', 'firstNames', 'Ex : Yao Jean')}
          {dateField('Date de naissance', 'birthDate')}
        </div>
        <div className="mt-4 flex items-center justify-between text-label-md uppercase text-on-surface-variant">Pièce d’identité <button type="button" onClick={() => setStep('doc')} className="cursor-pointer border-none bg-transparent p-0 text-label-sm normal-case tracking-normal text-primary">Changer de pièce</button></div>
        <div className={`mt-2 grid gap-2 ${desktop ? 'grid-cols-2' : ''}`}>
          <div className="rounded-xl bg-surface-container-low px-4 py-2.5"><span className="block text-label-sm text-on-surface-variant">Type de document</span><span className="flex items-center gap-1.5 text-body-lg text-on-surface"><Icon name={doc.icon} size={18} className="text-on-surface-variant" /> {doc.label}</span></div>
          {field('Numéro de la pièce', 'docNumber', 'Tel qu’indiqué sur la pièce', 'font-mono uppercase tracking-wide placeholder:font-sans placeholder:normal-case placeholder:tracking-normal')}
          {dateField('Date d’expiration', 'docExpiry')}
        </div>
        {!desktop && <><div className="mt-4 text-label-md uppercase text-on-surface-variant">Photos ({parts.length})</div><div className="mt-2">{files}</div></>}
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <input type="checkbox" checked={form.consent} onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
          <span className="text-body-sm text-on-surface">Je certifie l’exactitude de ces informations et j’autorise Dilchap à vérifier ma pièce d’identité afin d’obtenir le badge <b className="text-tertiary">Vendeur certifié</b>. Mes photos seront supprimées {retention} jours après la décision.</span>
        </label>
        {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
        <p className="m-0 mt-3 flex items-center gap-2 text-body-sm text-on-surface-variant"><Icon name="lock" size={16} /> Vos pièces ne sont jamais affichées aux acheteurs.</p>
        {footer(sending ? 'Envoi…' : 'Envoyer mon dossier', !formOk || sending, send, 'send')}
      </section>
    </div>
  </>, true)
}

// ─── Status screens ──────────────────────────────────────────────────────

function StatusHero({ icon, tone, badge, title, text }: { icon: string; tone: 'wait' | 'bad' | 'good'; badge: string; title: string; text: React.ReactNode }) {
  const t = tone === 'good' ? 'bg-tertiary text-white ring-tertiary-soft' : tone === 'bad' ? 'bg-primary-fixed text-primary ring-primary-fixed/40' : 'bg-primary-fixed/60 text-primary ring-primary-fixed/30'
  return (
    <div className="text-center">
      <span className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ring-8 ${t}`}><Icon name={icon} size={38} /></span>
      <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm uppercase ${tone === 'good' ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-primary'}`}>{badge}</span>
      <h1 className="m-0 mt-2 text-headline-lg text-on-surface">{title}</h1>
      <p className="m-0 mx-auto mt-1 max-w-md text-body-md text-on-surface-variant">{text}</p>
    </div>
  )
}

function Pending({ sub, retention, onNavigate }: { sub: KycSubmission; retention: number; onNavigate: (p: any) => void }) {
  const [copied, setCopied] = useState(false)
  const doc = KYC_DOCS.find(d => d.key === sub.docType)
  return (
    <div className="mx-auto max-w-xl">
      <StatusHero icon="pending_actions" tone="wait" badge="Vérification en cours" title="Dossier transmis" text="Votre demande est entre les mains de l’équipe de vérification Dilchap." />
      <dl className="m-0 mt-5 flex flex-col gap-3 rounded-2xl bg-surface-lowest p-5 text-body-md shadow-sm">
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">Statut</dt><dd className="m-0 flex items-center gap-1.5 rounded-full bg-primary-fixed/60 px-3 py-1 text-label-md text-primary"><Icon name="hourglass_top" size={16} /> En cours d’examen</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">Pièce</dt><dd className="m-0 text-on-surface">{doc?.label}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">Envoyé le</dt><dd className="m-0 text-on-surface">{new Date(sub.submittedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">Réponse</dt><dd className="m-0 text-right text-on-surface">Notification dès la décision</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">Référence</dt><dd className="m-0"><button onClick={() => void navigator.clipboard?.writeText(sub.reference).then(() => setCopied(true))} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-container px-2.5 py-1 font-mono text-label-md text-on-surface">{sub.reference} <Icon name={copied ? 'check' : 'content_copy'} size={15} /></button></dd></div>
      </dl>
      <div className="mt-4 rounded-2xl bg-surface-container-low p-5">
        <div className="flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="help" size={22} className="text-primary" /> Que se passe-t-il ensuite ?</div>
        <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
          {[
            ['Vérification par l’équipe', 'Contrôle de l’authenticité de la pièce et de sa correspondance avec votre selfie.'],
            ['Activation du badge', 'Le sceau « Vendeur certifié » apparaît sur votre profil et vos annonces.'],
            ['Suppression des photos', `Vos photos d’identité sont supprimées ${retention} jours après la décision.`],
          ].map(([t, d], i) => (
            <li key={t} className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-lowest text-label-md text-primary">{i + 1}</span><div><div className="text-label-lg text-on-surface">{t}</div><div className="text-body-sm text-on-surface-variant">{d}</div></div></li>
          ))}
        </ol>
      </div>
      <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-on-surface"><Icon name="storefront" size={18} className="mt-0.5 shrink-0 text-tertiary" /> Vos annonces restent en ligne pendant l’examen.</p>
      <div className="mt-5 grid gap-2">
        <button onClick={() => onNavigate('buyer-dashboard')} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="dashboard" size={19} /> Retour au tableau de bord</button>
        <button onClick={() => onNavigate('seller-listings')} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container text-label-md text-on-surface"><Icon name="inventory_2" size={18} /> Voir mes annonces</button>
      </div>
    </div>
  )
}

function Rejected({ sub, onRetry }: { sub: KycSubmission; onRetry: () => void }) {
  const { data } = useQuery<{ footerSettings: { supportPhone: string | null } | null }>(FOOTER_SETTINGS_QUERY)
  const support = data?.footerSettings?.supportPhone
  const parts: KycPart[] = ['FRONT', ...(sub.hasBack ? ['BACK' as const] : []), 'SELFIE']
  return (
    <div className="mx-auto max-w-xl">
      <StatusHero icon="error" tone="bad" badge="Vérification refusée" title="Votre vérification n’a pas pu aboutir" text="Il s’agit souvent d’une photo peu nette ou d’une information différente de la pièce. Vous pouvez recommencer tout de suite." />
      <div className="mt-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="warning" size={19} /></span>
          <div><div className="text-label-sm uppercase text-primary">Motif</div><div className="text-headline-sm text-on-surface">{sub.rejectReason ? KYC_REJECT_LABELS[sub.rejectReason] : 'Dossier refusé'}</div></div>
        </div>
        {sub.rejectComment && <p className="m-0 mt-3 rounded-xl bg-surface-container-low p-3 text-body-sm italic text-on-surface-variant">« {sub.rejectComment} »</p>}
        {sub.rejectedParts.length > 0 && (
          <>
            <div className="mt-4 text-label-sm uppercase text-on-surface-variant">État des pièces</div>
            <div className="mt-2 flex flex-col gap-2">
              {parts.map(p => {
                const redo = sub.rejectedParts.includes(p)
                return (
                  <div key={p} className={`flex items-center gap-3 rounded-xl p-3 ${redo ? 'bg-primary-fixed/50' : 'bg-surface-container-low'}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${redo ? 'bg-primary' : 'bg-tertiary'}`}><Icon name={redo ? 'close' : 'check'} size={17} /></span>
                    <span className="flex-1 text-label-md text-on-surface">{PART_LABEL[p]}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-label-sm ${redo ? 'bg-primary text-white' : 'bg-tertiary-soft text-tertiary'}`}>{redo ? 'À refaire' : 'Conforme'}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      <div className="mt-4 rounded-2xl bg-surface-container-low p-5">
        <div className="flex items-center gap-2 text-label-lg text-on-surface"><Icon name="lightbulb" size={20} className="text-tertiary" /> 3 conseils pour la prochaine tentative</div>
        <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface">
          {['Posez la pièce sur une surface sombre, bien éclairée, sans flash.', 'Nettoyez l’objectif de votre téléphone avant la photo.', 'Vérifiez que les 4 coins de la pièce sont visibles et le texte lisible.'].map((t, i) => (
            <li key={t} className="flex items-start gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-lowest text-label-sm text-on-surface-variant">{i + 1}</span>{t}</li>
          ))}
        </ol>
      </div>
      <div className="mt-5 grid gap-2">
        <button onClick={onRetry} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="refresh" size={19} /> Recommencer la vérification</button>
        {support && <a href={`https://wa.me/${support.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-surface-container text-label-md text-on-surface no-underline"><Icon name="support_agent" size={19} /> Contacter le support WhatsApp</a>}
      </div>
    </div>
  )
}

function Validated({ kyc, currentUser, onNavigate, onViewShop }: { kyc: MyKyc; currentUser?: AuthUser | null; onNavigate: (p: any) => void; onViewShop?: (id: string) => void }) {
  const { data } = useQuery<{ myReputation: { salesCount: number; averageRating: number; reviewsCount: number } }>(MY_REPUTATION_QUERY)
  const rep = data?.myReputation
  const first = currentUser?.fullName.split(' ')[0] ?? ''
  return (
    <div className="mx-auto max-w-xl">
      <StatusHero icon="workspace_premium" tone="good" badge="Vérification approuvée" title={`Félicitations${first ? ` ${first}` : ''} !`} text={<>Votre identité a été vérifiée. Vous bénéficiez désormais du statut <b className="text-on-surface">Vendeur certifié</b> sur Dilchap.</>} />
      {currentUser && (
        <div className="mt-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative h-16 w-16 shrink-0"><span className="block h-full w-full overflow-hidden rounded-full bg-primary-fixed"><SafeImg src={currentUser.avatarUrl} icon="person" /></span><span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-tertiary text-white ring-2 ring-surface-lowest"><Icon name="verified" size={15} /></span></span>
            <div className="min-w-0">
              <div className="truncate text-headline-sm text-on-surface">{currentUser.fullName}</div>
              {rep && <div className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">{rep.reviewsCount > 0 && <><Icon name="star" size={15} fill className="text-primary" /> {rep.averageRating.toFixed(1)} •</>} {rep.salesCount} vente{rep.salesCount > 1 ? 's' : ''} conclue{rep.salesCount > 1 ? 's' : ''}</div>}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-tertiary-soft p-3">
            <Icon name="verified_user" size={22} className="text-tertiary" />
            <div className="flex-1"><div className="text-label-lg text-tertiary">Vendeur certifié</div>{kyc.verifiedAt && <div className="text-body-sm text-on-surface-variant">Identité vérifiée le {new Date(kyc.verifiedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}</div>
            <Icon name="check_circle" size={22} className="text-tertiary" />
          </div>
        </div>
      )}
      <div className="mt-5 text-label-md uppercase text-on-surface-variant">Vos avantages actifs</div>
      <div className="mt-2"><Tips items={[
        ['verified', 'Badge sur toutes vos annonces', 'Le sceau apparaît à côté de votre nom sur chaque article.'],
        ['filter_alt', 'Visible avec le filtre « Vendeurs vérifiés »', 'Vos annonces apparaissent aux acheteurs qui filtrent sur ce critère.'],
        ['handshake', 'Plus de confiance', 'Les acheteurs savent que votre identité a été contrôlée.'],
      ]} /></div>
      <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="lock" size={17} className="mt-0.5 shrink-0" /> Vos photos d’identité sont supprimées {kyc.retentionDays} jours après la décision.</p>
      <div className="mt-5 grid gap-2">
        {currentUser && onViewShop && <button onClick={() => onViewShop(currentUser.id)} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="account_circle" size={19} /> Voir mon profil certifié</button>}
        <button onClick={() => onNavigate('seller-post')} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container text-label-md text-on-surface"><Icon name="add_circle" size={19} /> Publier une nouvelle annonce</button>
      </div>
    </div>
  )
}
