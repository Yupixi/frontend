import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import SafeImg from '../../components/SafeImg'
import { AccountLayout } from './AccountLayout'
import { MY_REPUTATION_QUERY } from '../../graphql/sellerHub'
import {
  KYC_DOCS, KYC_REJECT_LABELS, MY_KYC_QUERY, SUBMIT_KYC_MUTATION,
  type KycDocType, type KycPart, type KycSubmission, type MyKyc,
} from '../../graphql/kyc'
import { uploadKycPhoto } from '../../lib/upload'
import { useSupportPhone } from '../../lib/site'
import type { AuthUser } from '../../graphql/auth'
import { fmtDate, useT } from '../../i18n'
import common from '../../i18n/ns/common'
import kycNs from '../../i18n/ns/kyc'

type Props = {
  onNavigate: (p: any) => void
  currentUser?: AuthUser | null
  onLogout: () => void
  onViewShop?: (sellerId: string) => void
}

type Photo = { preview: string; key?: string; uploading?: boolean; error?: string }
type Step = 'intro' | 'doc' | 'front' | 'back' | 'selfie' | 'photos' | 'review'

const PART_LABEL: Record<KycPart, string> = {
  get FRONT() { return kycNs.t('part.FRONT') },
  get BACK() { return kycNs.t('part.BACK') },
  get SELFIE() { return kycNs.t('part.SELFIE') },
}

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
  const t = useT(kycNs)
  const tc = useT(common)
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(kycNs.t('cam.unsupported'))
    } else {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: selfie ? 'user' : 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      }).then(s => {
        if (cancelled) { s.getTracks().forEach(tr => tr.stop()); return }
        stream = s
        if (video.current) { video.current.srcObject = s; void video.current.play().catch(() => {}) }
      }).catch((e: unknown) => {
        if (cancelled) return
        const name = e instanceof DOMException ? e.name : ''
        setError(name === 'NotAllowedError' || name === 'SecurityError'
          ? kycNs.t('cam.denied')
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? kycNs.t('cam.notFound')
            : name === 'NotReadableError'
              ? kycNs.t('cam.busy')
              : kycNs.t('cam.failed'))
      })
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelled = true
      stream?.getTracks().forEach(tr => tr.stop())
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
          <button type="button" onClick={onClose} aria-label={tc('close')} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface"><Icon name="close" size={20} /></button>
        </div>
        {error ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-container-low px-4 py-8 text-center">
            <Icon name="videocam_off" size={32} className="text-on-surface-variant" />
            <p className="m-0 max-w-[420px] text-body-md text-on-surface-variant">{error}</p>
            <button type="button" onClick={() => { onClose(); onImport() }} className="flex h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border-none bg-primary px-5 text-label-lg text-white">
              <Icon name="upload_file" size={19} /> {t('cam.import')}
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
              {selfie ? t('cam.selfieHint') : t('cam.docHint')}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={onClose} className="flex h-12 cursor-pointer items-center justify-center rounded-xl border-none bg-surface-container text-label-md text-on-surface">{tc('cancel')}</button>
              <button type="button" onClick={shoot} disabled={!ready} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:cursor-default disabled:opacity-50">
                <Icon name="photo_camera" size={20} /> {t('cam.capture')}
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
  const t = useT(kycNs)
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
              : <span className="flex h-[70%] w-[82%] items-center justify-center rounded-xl border-2 border-dashed border-white/50 text-label-sm uppercase tracking-wide text-white/60"><Icon name="badge" size={20} /> &nbsp;{docLabel}</span>}{/* i18n-ignore */}
          </div>
        )}
        {['left-3 top-3 border-l-2 border-t-2', 'right-3 top-3 border-r-2 border-t-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'].map(c => (
          <span key={c} className={`absolute h-6 w-6 rounded-sm border-solid border-primary ${c} ${photo?.key ? 'border-tertiary' : ''}`} />
        ))}
        {photo?.uploading && <span className="absolute inset-0 flex items-center justify-center"><Icon name="progress_activity" size={36} className="animate-spin text-white" /></span>}
        {photo?.key && <span className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-surface-lowest/95 px-2.5 py-1 text-label-sm text-tertiary"><Icon name="check_circle" size={15} fill /> {compact ? t('photo.savedShort') : t('photo.saved')}</span>}
      </div>
      {photo?.error && <p className="m-0 mt-2 flex items-center gap-1.5 text-body-sm text-primary"><Icon name="error" size={16} /> {photo.error}</p>}
      <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <button type="button" onClick={takePhoto} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white">
          <Icon name={photo?.key ? 'refresh' : 'photo_camera'} size={20} /> {photo?.key ? t('photo.retake') : selfie ? t('photo.takeSelfie') : t('photo.take')}
        </button>
        <button type="button" onClick={() => gallery.current?.click()} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container text-label-md text-on-surface">
          <Icon name="upload_file" size={19} /> {touch ? t('photo.fromGallery') : t('photo.fromFile')}
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

const docTips = (): [string, string, string][] => [
  ['light_mode', kycNs.t('tip.light.title'), kycNs.t('tip.light.text')],
  ['flash_off', kycNs.t('tip.glare.title'), kycNs.t('tip.glare.text')],
  ['crop_free', kycNs.t('tip.corners.title'), kycNs.t('tip.corners.text')],
]
const selfieTips = (): [string, string, string][] => [
  ['face', kycNs.t('tip.lens.title'), kycNs.t('tip.lens.text')],
  ['visibility', kycNs.t('tip.face.title'), kycNs.t('tip.face.text')],
  ['badge', kycNs.t('tip.idBeside.title'), kycNs.t('tip.idBeside.text')],
]

// "Vérifier mon identité": intro → document → photos (recto, verso, selfie)
// → information check → status (pending / refused / validated). Mobile: one
// piece per step; desktop: the three photos side by side.
export default function Kyc({ onNavigate, currentUser, onLogout, onViewShop }: Props) {
  const t = useT(kycNs)
  const tc = useT(common)
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
    <AccountLayout active="buyer-settings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title={t('pageTitle')} hideBottomNav={hideNav} onBack={wizard ? back : undefined}>
      <div className="mx-auto max-w-[1080px] pb-28 lg:pb-8">{children}</div>
    </AccountLayout>
  )

  if (loading && !kyc) return layout(<p className="text-body-md text-on-surface-variant">{tc('loading')}</p>)

  const privacy = (
    <div className="flex items-start gap-3 rounded-2xl bg-tertiary-soft p-4">
      <Icon name="lock" size={22} className="mt-0.5 shrink-0 text-tertiary" />
      <div>
        <div className="text-label-lg text-tertiary">{t('privacy.title')}</div>
        <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('privacy.text', { days: retention })}</p>
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
        <span className="flex items-center gap-1.5"><Icon name="shield" size={15} /> {t('progress.step', { n: index + 1, total: steps.length })}</span>
        <span className="flex items-center gap-1 normal-case tracking-normal text-on-surface-variant"><Icon name="timer" size={15} /> {t('progress.duration')}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div>
      {desktop && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[t('progress.doc'), t('progress.photos'), t('progress.review')].map((l, i) => (
            <div key={l} className={`rounded-xl px-3 py-2 text-center text-label-md ${i === index ? 'bg-primary text-white' : i < index ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container-low text-on-surface-variant'}`}>{i + 1}. {l}</div>
          ))}
        </div>
      )}
    </div>
  )

  const footer = (label: string, disabled: boolean, onClick: () => void, icon = 'arrow_forward') => (
    <div className="fixed inset-x-0 bottom-0 z-40 border-0 border-t border-solid border-outline-variant bg-surface-lowest/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:static lg:mt-6 lg:border-none lg:bg-transparent lg:p-0">
      <div className="mx-auto flex max-w-[1080px] items-center gap-3">
        {desktop && <button onClick={back} className="flex h-12 cursor-pointer items-center gap-2 rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface"><Icon name="arrow_back" size={18} /> {index === 0 ? tc('cancel') : t('nav.prevStep')}</button>}
        <button onClick={onClick} disabled={disabled} className="flex h-13 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 text-label-lg text-white shadow-md disabled:cursor-not-allowed disabled:opacity-45 lg:ml-auto lg:max-w-sm">
          {label} <Icon name={icon} size={19} />
        </button>
      </div>
    </div>
  )

  // ─── Wizard ──────────────────────────────────────────────────────────
  if (current === 'intro') return layout(<>
    {progress}
    <h1 className="m-0 text-headline-lg text-on-surface">{t('intro.title')}</h1>
    <p className="m-0 mt-2 text-body-md text-on-surface-variant">{t('intro.text')}</p>
    {currentUser && (
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
        <span className="relative h-14 w-14 shrink-0"><span className="block h-full w-full overflow-hidden rounded-full bg-primary-fixed"><SafeImg src={currentUser.avatarUrl} icon="person" /></span><span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-verified text-white ring-2 ring-surface-lowest"><Icon name="verified" size={15} /></span></span>
        <div className="min-w-0"><div className="flex items-center gap-1 text-label-lg text-on-surface">{currentUser.fullName} <Icon name="verified" size={17} fill className="text-verified" /></div><div className="text-label-sm uppercase text-verified">{t('intro.verifiedAccount')}</div><div className="text-body-sm text-on-surface-variant">{t('intro.preview')}</div></div>
      </div>
    )}
    <div className="mt-5 text-label-md uppercase text-on-surface-variant">{t('intro.unlocks')}</div>
    <div className="mt-2"><Tips items={[
      ['verified', t('intro.badges.title'), t('intro.badges.text')],
      ['storefront', t('intro.shop.title'), t('intro.shop.text')],
      ['handshake', t('intro.trust.title'), t('intro.trust.text')],
    ]} /></div>
    <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
      <div className="flex items-center gap-2 text-label-lg text-on-surface"><Icon name="badge" size={20} className="text-primary" /> {t('intro.accepted')}</div>
      <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('intro.acceptedHint')}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">{KYC_DOCS.map(d => <span key={d.key} className="flex min-w-0 items-center gap-1.5 rounded-lg bg-surface-lowest px-2.5 py-2 text-label-sm text-on-surface"><Icon name={d.icon} size={16} className="shrink-0 text-on-surface-variant" /> <span className="truncate">{d.label}</span></span>)}</div>
    </div>
    <div className="mt-4">{privacy}</div>
    {footer(t('intro.start'), false, next)}
  </>, true)

  if (current === 'doc') return layout(<>
    {progress}
    <div className={desktop ? 'grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-6' : ''}>
      {desktop && (
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <div className="flex items-center gap-2 text-label-lg text-on-surface"><Icon name="verified" size={22} fill className="text-verified" /> {t('doc.badges')}</div>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('doc.badgesText')}</p>
            <div className="mt-3"><Tips items={[
              ['filter_alt', t('doc.filter.title'), t('doc.filter.text')],
              ['handshake', t('doc.meetup.title'), t('doc.meetup.text')],
            ]} /></div>
          </div>
          {privacy}
        </aside>
      )}
      <section>
        <div className="text-label-sm uppercase text-primary">{t('doc.kicker')}</div>
        <h1 className="m-0 mt-1 text-headline-lg text-on-surface">{t('doc.title')}</h1>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('doc.text')}</p>
        <div role="radiogroup" className={`mt-4 grid gap-3 ${desktop ? 'grid-cols-2' : ''}`}>
          {KYC_DOCS.map(d => {
            const on = d.key === docType
            return (
              <button key={d.key} role="radio" aria-checked={on} onClick={() => setDocType(d.key)} className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-solid p-4 text-left transition-colors ${on ? 'border-primary bg-surface-lowest shadow-sm' : 'border-transparent bg-surface-container-low hover:border-outline-variant'}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-primary-fixed text-primary' : 'bg-surface-lowest text-on-surface-variant'}`}><Icon name={d.icon} size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block pr-7 text-label-lg text-on-surface">{d.label}</span>
                  <span className="block text-label-sm text-on-surface-variant">{d.sub}{d.key === 'CNI' && <span className="ml-1.5 rounded bg-tertiary-soft px-1.5 py-px text-tertiary">{t('doc.recommended')}</span>}</span>
                  <span className="mt-1 block text-body-sm text-on-surface-variant">{d.text}</span>
                  <span className="mt-1.5 flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name={d.back ? 'flip' : 'photo_camera'} size={14} /> {d.back ? t('doc.bothSides') : t('doc.photoPageOnly')}</span>
                </span>
                <span className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-solid ${on ? 'border-primary bg-primary text-white' : 'border-outline-variant'}`}>{on && <Icon name="check" size={15} />}</span>
              </button>
            )
          })}
        </div>
        <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="info" size={18} className="mt-0.5 shrink-0" /> {t('doc.expired')}</p>
        {footer(desktop ? t('doc.toPhotos') : tc('continue'), false, next)}
      </section>
    </div>
  </>, true)

  if (current === 'front' || current === 'back' || current === 'selfie') {
    const part: KycPart = current === 'front' ? 'FRONT' : current === 'back' ? 'BACK' : 'SELFIE'
    const title = part === 'FRONT' ? (docType === 'CNI' ? t('shot.frontCni') : t('shot.front')) : part === 'BACK' ? t('shot.back') : t('shot.selfie')
    const text = part === 'FRONT' ? (docType === 'PASSPORT' ? t('shot.frontPassportText') : t('shot.frontText')) : part === 'BACK' ? t('shot.backText') : t('shot.selfieText')
    return layout(<>
      {progress}
      <h1 className="m-0 text-headline-lg text-on-surface">{title}</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">{text}</p>
      <div className="mt-4"><PhotoCapture part={part} docLabel={doc.label} photo={photos[part]} onPick={f => pickPhoto(part, f)} /></div>
      <div className="mt-5 text-label-md uppercase text-on-surface-variant">{t('shot.tips')}</div>
      <div className="mt-2"><Tips items={part === 'SELFIE' ? selfieTips() : docTips()} /></div>
      {part === 'SELFIE' && <div className="mt-4">{privacy}</div>}
      {footer(part === 'FRONT' && doc.back ? t('shot.toBack') : part === 'SELFIE' ? t('shot.toReview') : tc('continue'), !canNext(current), next)}
    </>, true)
  }

  if (current === 'photos') return layout(<>
    {progress}
    <h1 className="m-0 text-headline-lg text-on-surface">{t('photos.title', { doc: doc.label.toLowerCase() })}</h1>
    <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('photos.text')}</p>
    <div className={`mt-5 grid gap-4 ${parts.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {parts.map((p, i) => (
        <section key={p} className="flex flex-col rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-label-lg text-on-surface"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-fixed text-label-sm text-primary">{i + 1}</span> {PART_LABEL[p]}</div>
          <p className="m-0 mb-3 text-body-sm text-on-surface-variant">{p === 'FRONT' ? t('photos.frontHint') : p === 'BACK' ? t('photos.backHint') : t('photos.selfieHint')}</p>
          <PhotoCapture part={p} docLabel={doc.label} photo={photos[p]} onPick={f => pickPhoto(p, f)} compact />
        </section>
      ))}
    </div>
    <div className="mt-5 grid grid-cols-2 gap-4">
      <div><div className="mb-2 text-label-md uppercase text-on-surface-variant">{t('photos.forDoc')}</div><Tips items={docTips()} /></div>
      <div><div className="mb-2 text-label-md uppercase text-on-surface-variant">{t('photos.forSelfie')}</div><Tips items={selfieTips()} /></div>
    </div>
    {footer(t('photos.confirm'), !canNext('photos'), next)}
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
          <span className="relative block aspect-[4/3] overflow-hidden bg-surface-container">{photos[p]?.preview && <img src={photos[p]!.preview} alt="" className="h-full w-full object-cover" />}<span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-tertiary text-white"><Icon name="check" size={13} /></span></span>
          <span className="block px-2 py-1.5 text-center text-label-sm text-on-surface">{PART_LABEL[p]}<span className="block text-[11px] text-primary">{t('photo.retake')}</span></span>
        </button>
      ))}
    </div>
  )
  return layout(<>
    {progress}
    <div className={desktop ? 'grid grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] gap-6' : ''}>
      {desktop && <aside><div className="mb-2 text-label-md uppercase text-on-surface-variant">{t('review.photos', { n: parts.length })}</div>{files}</aside>}
      <section>
        <h1 className="m-0 text-headline-lg text-on-surface">{t('review.title')}</h1>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('review.text')}</p>
        <div className="mt-4 text-label-md uppercase text-on-surface-variant">{t('review.identity')}</div>
        <div className={`mt-2 grid gap-2 ${desktop ? 'grid-cols-2' : ''}`}>
          {field(t('review.lastName'), 'lastName', t('review.lastNamePh'), 'uppercase placeholder:normal-case')}
          {field(t('review.firstNames'), 'firstNames', t('review.firstNamesPh'))}
          {dateField(t('review.birthDate'), 'birthDate')}
        </div>
        <div className="mt-4 flex items-center justify-between text-label-md uppercase text-on-surface-variant">{t('review.idDoc')} <button type="button" onClick={() => setStep('doc')} className="cursor-pointer border-none bg-transparent p-0 text-label-sm normal-case tracking-normal text-primary">{t('review.changeDoc')}</button></div>
        <div className={`mt-2 grid gap-2 ${desktop ? 'grid-cols-2' : ''}`}>
          <div className="rounded-xl bg-surface-container-low px-4 py-2.5"><span className="block text-label-sm text-on-surface-variant">{t('review.docType')}</span><span className="flex items-center gap-1.5 text-body-lg text-on-surface"><Icon name={doc.icon} size={18} className="text-on-surface-variant" /> {doc.label}</span></div>
          {field(t('review.docNumber'), 'docNumber', t('review.docNumberPh'), 'font-mono uppercase tracking-wide placeholder:font-sans placeholder:normal-case placeholder:tracking-normal')}
          {dateField(t('review.docExpiry'), 'docExpiry')}
        </div>
        {!desktop && <><div className="mt-4 text-label-md uppercase text-on-surface-variant">{t('review.photos', { n: parts.length })}</div><div className="mt-2">{files}</div></>}
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <input type="checkbox" checked={form.consent} onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
          <span className="text-body-sm text-on-surface">{t.rich('review.consent', { days: retention, b: c => <b className="text-on-surface">{c}</b> })}</span>
        </label>
        {error && <p className="m-0 mt-3 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
        <p className="m-0 mt-3 flex items-center gap-2 text-body-sm text-on-surface-variant"><Icon name="lock" size={16} /> {t('review.neverShown')}</p>
        {footer(sending ? t('review.sending') : t('review.send'), !formOk || sending, send, 'send')}
      </section>
    </div>
  </>, true)
}

// ─── Status screens ──────────────────────────────────────────────────────

function StatusHero({ icon, tone, badge, title, text }: { icon: string; tone: 'wait' | 'bad' | 'good'; badge: string; title: string; text: React.ReactNode }) {
  const toneCls = tone === 'good' ? 'bg-tertiary text-white ring-tertiary-soft' : tone === 'bad' ? 'bg-primary-fixed text-primary ring-primary-fixed/40' : 'bg-primary-fixed/60 text-primary ring-primary-fixed/30'
  return (
    <div className="text-center">
      <span className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ring-8 ${toneCls}`}><Icon name={icon} size={38} /></span>
      <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm uppercase ${tone === 'good' ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-primary'}`}>{badge}</span>
      <h1 className="m-0 mt-2 text-headline-lg text-on-surface">{title}</h1>
      <p className="m-0 mx-auto mt-1 max-w-md text-body-md text-on-surface-variant">{text}</p>
    </div>
  )
}

function Pending({ sub, retention, onNavigate }: { sub: KycSubmission; retention: number; onNavigate: (p: any) => void }) {
  const t = useT(kycNs)
  const [copied, setCopied] = useState(false)
  const doc = KYC_DOCS.find(d => d.key === sub.docType)
  return (
    <div className="mx-auto max-w-xl">
      <StatusHero icon="pending_actions" tone="wait" badge={t('pending.badge')} title={t('pending.title')} text={t('pending.text')} />
      <dl className="m-0 mt-5 flex flex-col gap-3 rounded-2xl bg-surface-lowest p-5 text-body-md shadow-sm">
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">{t('pending.status')}</dt><dd className="m-0 flex items-center gap-1.5 rounded-full bg-primary-fixed/60 px-3 py-1 text-label-md text-primary"><Icon name="hourglass_top" size={16} /> {t('pending.inReview')}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">{t('pending.doc')}</dt><dd className="m-0 text-on-surface">{doc?.label}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">{t('pending.sentOn')}</dt><dd className="m-0 text-on-surface">{fmtDate(sub.submittedAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">{t('pending.answer')}</dt><dd className="m-0 text-right text-on-surface">{t('pending.answerText')}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">{t('pending.reference')}</dt><dd className="m-0"><button onClick={() => void navigator.clipboard?.writeText(sub.reference).then(() => setCopied(true))} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-container px-2.5 py-1 font-mono text-label-md text-on-surface">{sub.reference} <Icon name={copied ? 'check' : 'content_copy'} size={15} /></button></dd></div>
      </dl>
      <div className="mt-4 rounded-2xl bg-surface-container-low p-5">
        <div className="flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="help" size={22} className="text-primary" /> {t('pending.next')}</div>
        <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
          {[
            [t('pending.step1.title'), t('pending.step1.text')],
            [t('pending.step2.title'), t('pending.step2.text')],
            [t('pending.step3.title'), t('pending.step3.text', { days: retention })],
          ].map(([title, d], i) => (
            <li key={title} className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-lowest text-label-md text-primary">{i + 1}</span><div><div className="text-label-lg text-on-surface">{title}</div><div className="text-body-sm text-on-surface-variant">{d}</div></div></li>
          ))}
        </ol>
      </div>
      <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-on-surface"><Icon name="storefront" size={18} className="mt-0.5 shrink-0 text-tertiary" /> {t('pending.listingsOnline')}</p>
      <div className="mt-5 grid gap-2">
        <button onClick={() => onNavigate('buyer-dashboard')} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="dashboard" size={19} /> {t('pending.toDashboard')}</button>
        <button onClick={() => onNavigate('seller-listings')} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container text-label-md text-on-surface"><Icon name="inventory_2" size={18} /> {t('pending.myListings')}</button>
      </div>
    </div>
  )
}

function Rejected({ sub, onRetry }: { sub: KycSubmission; onRetry: () => void }) {
  const t = useT(kycNs)
  const support = useSupportPhone()
  const parts: KycPart[] = ['FRONT', ...(sub.hasBack ? ['BACK' as const] : []), 'SELFIE']
  return (
    <div className="mx-auto max-w-xl">
      <StatusHero icon="error" tone="bad" badge={t('rejected.badge')} title={t('rejected.title')} text={t('rejected.text')} />
      <div className="mt-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="warning" size={19} /></span>
          <div><div className="text-label-sm uppercase text-primary">{t('rejected.reason')}</div><div className="text-headline-sm text-on-surface">{sub.rejectReason ? KYC_REJECT_LABELS[sub.rejectReason] : t('rejected.generic')}</div></div>
        </div>
        {sub.rejectComment && <p className="m-0 mt-3 rounded-xl bg-surface-container-low p-3 text-body-sm italic text-on-surface-variant">« {sub.rejectComment} »</p>}
        {sub.rejectedParts.length > 0 && (
          <>
            <div className="mt-4 text-label-sm uppercase text-on-surface-variant">{t('rejected.parts')}</div>
            <div className="mt-2 flex flex-col gap-2">
              {parts.map(p => {
                const redo = sub.rejectedParts.includes(p)
                return (
                  <div key={p} className={`flex items-center gap-3 rounded-xl p-3 ${redo ? 'bg-primary-fixed/50' : 'bg-surface-container-low'}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${redo ? 'bg-primary' : 'bg-tertiary'}`}><Icon name={redo ? 'close' : 'check'} size={17} /></span>
                    <span className="flex-1 text-label-md text-on-surface">{PART_LABEL[p]}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-label-sm ${redo ? 'bg-primary text-white' : 'bg-tertiary-soft text-tertiary'}`}>{redo ? t('rejected.redo') : t('rejected.ok')}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      <div className="mt-4 rounded-2xl bg-surface-container-low p-5">
        <div className="flex items-center gap-2 text-label-lg text-on-surface"><Icon name="lightbulb" size={20} className="text-tertiary" /> {t('rejected.tipsTitle')}</div>
        <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface">
          {[t('rejected.tip1'), t('rejected.tip2'), t('rejected.tip3')].map((tip, i) => (
            <li key={tip} className="flex items-start gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-lowest text-label-sm text-on-surface-variant">{i + 1}</span>{tip}</li>
          ))}
        </ol>
      </div>
      <div className="mt-5 grid gap-2">
        <button onClick={onRetry} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="refresh" size={19} /> {t('rejected.retry')}</button>
        {support && <a href={`https://wa.me/${support.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-surface-container text-label-md text-on-surface no-underline"><Icon name="support_agent" size={19} /> {t('rejected.support')}</a>}
      </div>
    </div>
  )
}

function Validated({ kyc, currentUser, onNavigate, onViewShop }: { kyc: MyKyc; currentUser?: AuthUser | null; onNavigate: (p: any) => void; onViewShop?: (id: string) => void }) {
  const t = useT(kycNs)
  const { data } = useQuery<{ myReputation: { salesCount: number; averageRating: number; reviewsCount: number } }>(MY_REPUTATION_QUERY)
  const rep = data?.myReputation
  const first = currentUser?.fullName.split(' ')[0] ?? ''
  return (
    <div className="mx-auto max-w-xl">
      <StatusHero icon="workspace_premium" tone="good" badge={t('validated.badge')} title={first ? t('validated.congratsName', { name: first }) : t('validated.congrats')} text={t.rich('validated.text', { b: c => <b className="text-on-surface">{c}</b> })} />
      {currentUser && (
        <div className="mt-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative h-16 w-16 shrink-0"><span className="block h-full w-full overflow-hidden rounded-full bg-primary-fixed"><SafeImg src={currentUser.avatarUrl} icon="person" /></span><span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-tertiary text-white ring-2 ring-surface-lowest"><Icon name="verified" size={15} /></span></span>
            <div className="min-w-0">
              <div className="truncate text-headline-sm text-on-surface">{currentUser.fullName}</div>
              {rep && <div className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">{rep.reviewsCount > 0 && <><Icon name="star" size={15} fill className="text-primary" /> {rep.averageRating.toFixed(1)} •</>} {t('validated.sales', { count: rep.salesCount })}</div>}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-tertiary-soft p-3">
            <Icon name="verified_user" size={22} className="text-tertiary" />
            <div className="min-w-0 flex-1"><div className="text-label-lg text-tertiary">{t('validated.verified')}</div>{kyc.verifiedAt && <div className="text-body-sm text-on-surface-variant">{t('validated.on', { date: fmtDate(kyc.verifiedAt, { day: 'numeric', month: 'long', year: 'numeric' }) })}</div>}</div>
            <Icon name="check_circle" size={22} className="text-tertiary" />
          </div>
          <button onClick={() => onNavigate('seller-badge')} className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="verified" size={19} fill /> {currentUser.badge ? t('validated.manageBadge') : t('validated.activateBadge')}</button>
        </div>
      )}
      <div className="mt-5 text-label-md uppercase text-on-surface-variant">{t('validated.withBadge')}</div>
      <div className="mt-2"><Tips items={[
        ['verified', t('validated.tick.title'), t('validated.tick.text')],
        ['filter_alt', t('validated.filter.title'), t('validated.filter.text')],
        ['handshake', t('validated.trust.title'), t('validated.trust.text')],
      ]} /></div>
      <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="lock" size={17} className="mt-0.5 shrink-0" /> {t('validated.deletion', { days: kyc.retentionDays })}</p>
      <div className="mt-5 grid gap-2">
        {currentUser && onViewShop && <button onClick={() => onViewShop(currentUser.id)} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="account_circle" size={19} /> {t('validated.viewProfile')}</button>}
        <button onClick={() => onNavigate('seller-post')} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container text-label-md text-on-surface"><Icon name="add_circle" size={19} /> {t('validated.post')}</button>
      </div>
    </div>
  )
}
