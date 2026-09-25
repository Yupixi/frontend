import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  CheckCircle2, Check, X, Upload, Tag, MapPin, Handshake, ShieldCheck, Percent, Wallet, MessageSquare, Lightbulb, Rocket, Truck, Info, Loader2,
} from '../../components/icons'
import Icon, { CategoryIcon } from '../../components/Icon'
import Price from '../../components/Price'
import RichTextEditor from '../../components/RichTextEditor'
import BoostMenu from '../../components/BoostMenu'
import ConfirmSheet from '../../components/ConfirmSheet'
import { AccountLayout } from '../account/AccountLayout'
import { MARKETS, marketForCountry } from '../../data/markets'
import { CATEGORIES_QUERY, type RemoteCategory } from '../../graphql/categories'
import {
  ATTACH_LISTING_MEDIA_MUTATION, CREATE_LISTING_MUTATION, DELETE_LISTING_MEDIA_MUTATION, MY_LISTING_QUERY,
  SUBMIT_LISTING_FOR_REVIEW_MUTATION, UPDATE_LISTING_MUTATION, PRICE_RANGE_QUERY, type MyListingDetail, type PriceRange,
} from '../../graphql/listings'
import { getAccessToken } from '../../lib/auth'
import { uploadImages } from '../../lib/upload'
import type { AuthUser } from '../../graphql/auth'
import Select from '../../components/Select'

const MAX_PHOTOS = 8
const TITLE_MAX = 80
const DRAFT_KEY = 'dilchap_listing_draft'

const CONDITIONS = [
  { value: 'Neuf', hint: 'Jamais utilisé, avec emballage d’origine', icon: 'new_releases' },
  { value: 'Très bon état', hint: 'Peu utilisé, micro-traces éventuelles', icon: 'thumb_up' },
  { value: 'Bon état', hint: 'Traces d’usage normales, fonctionnel', icon: 'check' },
  { value: 'Pour pièces', hint: 'Défaut technique ou à restaurer', icon: 'build' },
]

// Mockup groups mobile wallets; each group maps to backend payment codes.
const PAYMENT_GROUPS = [
  { label: 'Espèces en main propre', icon: 'payments', codes: ['CASH'] },
  { label: 'Wave / Orange Money', icon: 'phone_iphone', codes: ['WAVE', 'ORANGE_MONEY'] },
  { label: 'MTN MoMo / Moov', icon: 'account_balance_wallet', codes: ['MTN_MOMO', 'MOOV_MONEY'] },
]

// Categories where clothing/shoe size is meaningful.
const SIZED_CATEGORIES = ['mode', 'famille']

type Form = {
  categoryId: string
  subcategoryId: string
  title: string
  condition: string
  brand: string
  modelName: string
  size: string
  description: string
  price: string
  originalPrice: string
  negotiable: boolean
  minOfferPrice: string
  countryCode: string
  currency: string
  city: string
  locationLabel: string
  meetupSpot: string
  paymentMethods: string[]
  deliveryAvailable: boolean
  attributes: Record<string, string>
}

const EMPTY: Form = {
  categoryId: '', subcategoryId: '', title: '', condition: '', brand: '', modelName: '', size: '', description: '',
  price: '', originalPrice: '', negotiable: true, minOfferPrice: '', countryCode: 'CI', currency: 'XOF',
  city: 'Abidjan', locationLabel: '', meetupSpot: '', paymentMethods: ['CASH', 'WAVE', 'ORANGE_MONEY'], deliveryAvailable: false, attributes: {},
}

function loadDraft(): { form: Form, savedAt: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function Card({ icon, title, subtitle, children, aside, className = '' }: { icon: string, title: string, subtitle?: string, children: React.ReactNode, aside?: React.ReactNode, className?: string }) {
  return (
    <section className={`rounded-2xl border border-outline-variant bg-surface-lowest p-4 md:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name={icon} size={24} className="text-primary" /> {title}</h2>
          {subtitle && <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Field({ label, required, hint, children, right }: { label: string, required?: boolean, hint?: React.ReactNode, children: React.ReactNode, right?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-label-md text-on-surface">
        <span>{label}{required && <span className="text-primary"> *</span>}</span>
        {right}
      </span>
      {children}
      {hint && <span className="mt-1 block text-body-sm text-on-surface-variant">{hint}</span>}
    </label>
  )
}

const inputBase = 'w-full rounded-lg border bg-surface-container-low px-3 py-2.5 text-body-md text-on-surface outline-none focus:border-on-surface focus:bg-surface-lowest'
const inputCls = `${inputBase} border-outline-variant`
// Missing required field after a failed "Suivant" / "Publier".
const inputBad = `${inputBase} border-primary border-[1.5px]`

function FieldError({ show, children }: { show: boolean, children: React.ReactNode }) {
  if (!show) return null
  return <span className="mt-1 flex items-center gap-1 text-body-sm text-primary"><Icon name="error" size={15} /> {children}</span>
}

type FieldKey = 'title' | 'category' | 'condition' | 'description' | 'price' | 'city'
const FIELD_LABELS: Record<FieldKey, string> = {
  title: 'le titre', category: 'la catégorie', condition: 'l’état de l’objet', description: 'la description', price: 'le prix', city: 'la ville',
}
// Mobile wizard step -> required fields it holds, in on-screen order.
const STEP_FIELDS: Record<number, FieldKey[]> = { 1: ['title', 'category', 'condition', 'description'], 2: ['price'], 3: ['city'] }

// Abidjan quick picks for the mockup's "Zone de remise" chips.
const ABIDJAN_ZONES = ['Cocody', 'Marcory', 'Plateau', 'Yopougon', 'Treichville', 'Koumassi']
const ABIDJAN_SPOTS = ['Playce Marcory', 'Cap Sud', 'Sococé Deux-Plateaux']

// "Déposer une annonce" mockup: one guided form (photos → infos → prix →
// modalités d'échange) with a sticky earnings/preview column.
export default function PostListing({ onNavigate, currentUser, onLogout, listingId }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void, listingId?: string }) {
  const isEditing = !!listingId
  useEffect(() => { if (!getAccessToken()) onNavigate('auth') }, [onNavigate])

  const draft = useRef(isEditing ? null : loadDraft())
  const [form, setForm] = useState<Form>(() => ({ ...EMPTY, ...(draft.current?.form ?? {}) }))
  const [savedAt, setSavedAt] = useState<string | null>(draft.current?.savedAt ?? null)
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({ ...f, [key]: value }))

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingMedia, setExistingMedia] = useState<{ id: string; url: string }[]>([])
  const [prefilled, setPrefilled] = useState(false)
  const initialForm = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ id: string, submitted: boolean } | null>(null)
  const [boosted, setBoosted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const categories = categoriesData?.categories ?? []
  const category = categories.find(c => c.id === form.categoryId)
  const subcategory = category?.subcategories.find(s => s.id === form.subcategoryId)
  const requiresPrice = category?.requiresPrice ?? true
  const isAbidjan = form.countryCode === 'CI' && /abidjan/i.test(form.city)

  const { data: existingData, loading: loadingExisting } = useQuery<{ myListing: MyListingDetail }>(MY_LISTING_QUERY, { variables: { id: listingId }, skip: !isEditing })
  const { data: rangeData } = useQuery<{ priceRange: PriceRange | null }>(PRICE_RANGE_QUERY, {
    variables: { categoryId: form.categoryId, subcategoryId: form.subcategoryId || undefined, countryCode: form.countryCode },
    skip: !form.categoryId,
  })
  const range = rangeData?.priceRange

  const [createListing, { loading: creating }] = useMutation<{ createListing: { id: string } }>(CREATE_LISTING_MUTATION)
  const [updateListing, { loading: updating }] = useMutation(UPDATE_LISTING_MUTATION)
  const [attachMedia, { loading: attaching }] = useMutation(ATTACH_LISTING_MEDIA_MUTATION)
  const [deleteMedia] = useMutation(DELETE_LISTING_MEDIA_MUTATION)
  const [submitForReview, { loading: submitting }] = useMutation(SUBMIT_LISTING_FOR_REVIEW_MUTATION)
  const busy = creating || updating || attaching || submitting || uploading

  useEffect(() => {
    if (prefilled || !isEditing) return
    const l = existingData?.myListing
    if (!l) return
    const loaded: Form = {
      categoryId: l.category.id, subcategoryId: l.subcategory?.id ?? '', title: l.title, condition: l.condition ?? '',
      brand: l.brand ?? '', modelName: l.modelName ?? '', size: l.size ?? '', description: l.description,
      price: l.price != null ? String(l.price) : '', originalPrice: l.originalPrice != null ? String(l.originalPrice) : '',
      negotiable: l.negotiable, minOfferPrice: l.minOfferPrice != null ? String(l.minOfferPrice) : '',
      countryCode: l.countryCode, currency: l.currency, city: l.city, locationLabel: l.locationLabel ?? '', meetupSpot: l.meetupSpot ?? '',
      paymentMethods: l.paymentMethods ?? [], deliveryAvailable: l.deliveryAvailable, attributes: (l.attributes ?? {}) as Record<string, string>,
    }
    setForm(loaded)
    initialForm.current = JSON.stringify(loaded)
    setExistingMedia(l.media)
    setPrefilled(true)
  }, [existingData, isEditing, prefilled])

  // Auto-save a draft of a new listing (photos excepted) every change.
  useEffect(() => {
    if (isEditing || result) return
    const t = setTimeout(() => {
      try {
        const at = new Date().toISOString()
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, savedAt: at }))
        setSavedAt(at)
      } catch { /* storage unavailable */ }
    }, 800)
    return () => clearTimeout(t)
  }, [form, isEditing, result])

  const photoCount = existingMedia.length + imageFiles.length
  const addFiles = (files: FileList | null) => {
    if (!files) return
    const picked = Array.from(files).slice(0, MAX_PHOTOS - photoCount)
    setImageFiles(p => [...p, ...picked])
    setImagePreviews(p => [...p, ...picked.map(f => URL.createObjectURL(f))])
  }
  const removeNew = (i: number) => { setImageFiles(p => p.filter((_, x) => x !== i)); setImagePreviews(p => p.filter((_, x) => x !== i)) }
  const removeExisting = (id: string) => { setExistingMedia(p => p.filter(m => m.id !== id)); void deleteMedia({ variables: { mediaId: id } }).catch(() => undefined) }
  const allPhotos = [...existingMedia.map(m => ({ key: m.id, url: m.url, remove: () => removeExisting(m.id) })), ...imagePreviews.map((url, i) => ({ key: url, url, remove: () => removeNew(i) }))]

  const togglePayment = (codes: string[]) => {
    const on = codes.every(c => form.paymentMethods.includes(c))
    set('paymentMethods', on ? form.paymentMethods.filter(c => !codes.includes(c)) : [...new Set([...form.paymentMethods, ...codes])])
  }

  const wordCount = form.description.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  const priceNum = Number(form.price) || 0
  const steps = [
    { title: 'Photos & Aperçu', done: photoCount > 0, sub: photoCount ? `${photoCount} photo${photoCount > 1 ? 's' : ''} prête${photoCount > 1 ? 's' : ''}` : 'Ajoutez vos photos' },
    { title: 'Description & État', done: !!form.title.trim() && !!form.categoryId && wordCount > 3, sub: category ? category.name : 'Catégorie & détails' },
    { title: 'Prix & Échange', done: (!requiresPrice || priceNum > 0) && !!form.city, sub: priceNum ? `${priceNum.toLocaleString('fr-FR')} F` : 'Prix et rencontre' },
  ]
  // Mobile only: the form becomes a wizard, one card per screen, driven by
  // a sticky Précédent / Suivant bar. Desktop keeps the single long page.
  const [step, setStep] = useState(0)
  const MOBILE_STEPS = ['Photos', 'Détails', 'Prix', 'Rencontre', 'Aperçu']
  // A job offer (no price) has no "état" either.
  const needsCondition = requiresPrice
  const isMissing: Record<FieldKey, boolean> = {
    title: !form.title.trim(),
    category: !form.categoryId,
    condition: needsCondition && !form.condition,
    description: wordCount < 1,
    price: requiresPrice && !priceNum,
    city: !form.city.trim(),
  }
  // Field-level errors only show after a failed attempt, then clear live as
  // the seller fills each field.
  const [showErrors, setShowErrors] = useState(false)
  const bad = (k: FieldKey) => showErrors && isMissing[k]
  const flagMissing = (keys: FieldKey[]) => {
    setShowErrors(true)
    requestAnimationFrame(() => document.querySelector(`[data-field="${keys[0]}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  }
  const stepMissing = (i: number) => (STEP_FIELDS[i] ?? []).filter(k => isMissing[k])
  // Set when "Publier" sends the seller back to an earlier step: keep the
  // errors visible there and scroll to the field instead of the top.
  const pendingField = useRef<FieldKey | null>(null)
  const goStep = (i: number) => {
    setError(null)
    setStep(i)
    const f = pendingField.current
    pendingField.current = null
    if (f) requestAnimationFrame(() => document.querySelector(`[data-field="${f}"]`)?.scrollIntoView({ block: 'center' }))
    else {
      setShowErrors(false)
      document.querySelector('.dashboard-main')?.scrollTo({ top: 0 })
    }
  }
  // Each step — step 0 included — is a history entry, so the phone's back
  // button walks the wizard. Popping past step 0 lands on the page's own
  // entry (no wizardStep): that's the user leaving, which asks first when
  // photos/changes would be lost (see `unsavedRef` / `leavingRef` below).
  const [quitOpen, setQuitOpen] = useState(false)
  const unsavedRef = useRef(false)
  const leavingRef = useRef(false)
  useEffect(() => {
    if (typeof window.history.state?.wizardStep !== 'number') {
      window.history.pushState({ ...(window.history.state ?? {}), wizardStep: 0 }, '')
    }
    const onPop = (e: PopStateEvent) => {
      const st = e.state as { wizardStep?: number; __yupixiSheetMarker?: boolean } | null
      if (st?.__yupixiSheetMarker) return
      if (typeof st?.wizardStep === 'number') { goStep(st.wizardStep); return }
      if (unsavedRef.current && !leavingRef.current) {
        // Stay on step 0 and ask.
        window.history.pushState({ ...(window.history.state ?? {}), wizardStep: 0 }, '')
        goStep(0)
        setQuitOpen(true)
        return
      }
      // Leaving for real: step off the page's own entry as well.
      window.history.back()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const pushStep = (i: number) => {
    window.history.pushState({ ...(window.history.state ?? {}), wizardStep: i }, '')
    goStep(i)
  }
  // Going back a step pops the entries pushed on the way forward.
  const backTo = (i: number) => { if (i < step) window.history.go(i - step) }
  const next = () => {
    const m = stepMissing(step)
    if (m.length) { flagMissing(m); return }
    pushStep(step + 1)
  }
  const only = (i: number) => (step === i ? '' : 'max-lg:hidden')

  const missing = (['title', 'category', 'condition', 'description', 'price', 'city'] as FieldKey[]).filter(k => isMissing[k])

  const save = async (submit: boolean) => {
    setError(null)
    if (submit && missing.length) {
      setError(`Complétez ${missing.map(k => FIELD_LABELS[k]).join(', ')}.`)
      flagMissing(missing)
      // Mobile: jump back to the first step holding a missing field.
      const at = Number(Object.keys(STEP_FIELDS).find(i => STEP_FIELDS[Number(i)].includes(missing[0])))
      if (at < step) { pendingField.current = missing[0]; window.history.go(at - step) }
      return
    }
    if (!category) { setError('Choisissez une catégorie.'); return }
    try {
      const input = {
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId || undefined,
        title: form.title.trim() || 'Brouillon',
        description: form.description || '<p>Description à compléter</p>',
        price: requiresPrice && priceNum ? priceNum : undefined,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        currency: form.currency,
        countryCode: form.countryCode,
        city: form.city.trim(),
        locationLabel: form.locationLabel.trim() || undefined,
        meetupSpot: form.meetupSpot.trim() || undefined,
        condition: form.condition || undefined,
        brand: form.brand.trim() || undefined,
        modelName: form.modelName.trim() || undefined,
        size: form.size.trim() || undefined,
        negotiable: form.negotiable,
        minOfferPrice: form.negotiable && form.minOfferPrice ? Number(form.minOfferPrice) : undefined,
        paymentMethods: form.paymentMethods,
        deliveryAvailable: form.deliveryAvailable,
        attributes: form.attributes,
      }
      let id = listingId
      if (id) await updateListing({ variables: { id, input } })
      else {
        const { data } = await createListing({ variables: { input } })
        id = data?.createListing.id
        if (!id) throw new Error('La création a échoué')
      }
      if (imageFiles.length) {
        setUploading(true)
        const urls = await uploadImages(imageFiles)
        setUploading(false)
        await attachMedia({ variables: { listingId: id, urls } })
      }
      if (submit && !isEditing) await submitForReview({ variables: { id } })
      if (!isEditing) { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }
      setResult({ id, submitted: submit })
    } catch (err) {
      setUploading(false)
      setError(err instanceof Error ? err.message : 'L’enregistrement a échoué. Réessayez.')
    }
  }

  // New listings keep their text in the local draft; only picked photos (and
  // an edit's changes) are lost when leaving.
  const unsaved = imageFiles.length > 0 || (isEditing && initialForm.current != null && JSON.stringify(form) !== initialForm.current)
  unsavedRef.current = unsaved && !result
  // Shell back arrow (mobile) = the phone's back button: history.back()
  // walks the steps, and leaving from step 0 goes through the popstate
  // guard above.
  const shellBack = () => {
    if (window.history.length > 1) window.history.back()
    else onNavigate('buyer-dashboard')
  }
  const leave = () => {
    leavingRef.current = true
    // One traversal over the sheet's marker and step 0 (the sheet closes on
    // that popstate); the guard then sees `leavingRef` and steps off the
    // page's own entry too.
    window.history.go(-2)
  }

  const reset = () => {
    setForm(EMPTY); setImageFiles([]); setImagePreviews([]); setExistingMedia([]); setResult(null); setBoosted(false)
  }

  const cover = allPhotos[0]?.url
  const hhmm = savedAt ? new Date(savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h') : null
  const active = isEditing ? 'seller-listings' : 'seller-post'

  if (isEditing && loadingExisting && !prefilled) {
    return <AccountLayout active={active} onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}><p className="p-12 text-center text-on-surface-variant">Chargement de l'annonce…</p></AccountLayout>
  }

  if (result) {
    return (
      <AccountLayout active={active} onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
        <div className="mx-auto max-w-lg py-10 text-center">
          <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><CheckCircle2 size={40} /></span>
          <h1 className="m-0 text-headline-lg text-on-surface">{isEditing ? 'Annonce mise à jour !' : result.submitted ? 'Annonce envoyée !' : 'Brouillon enregistré'}</h1>
          <p className="m-0 mt-2 text-body-md text-on-surface-variant">
            {isEditing ? 'Vos modifications sont enregistrées.' : result.submitted
              ? 'Notre équipe la vérifie : elle sera visible des acheteurs dès son approbation.'
              : 'Retrouvez-le dans « Mes annonces » pour le compléter et le publier.'}
          </p>
          {result.submitted && !isEditing && (
            <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-lowest p-5 text-left">
              {boosted ? (
                <p className="m-0 flex items-center gap-2 text-label-md text-tertiary"><CheckCircle2 size={18} /> Boost enregistré — actif dès l'approbation.</p>
              ) : (
                <>
                  <div className="mb-1 flex items-center gap-2 text-headline-sm text-on-surface"><Rocket size={20} className="text-primary" /> Boostez votre annonce</div>
                  <p className="m-0 mb-3 text-body-sm text-on-surface-variant">Remontées, mise en vedette ou badge Urgent : choisissez une formule.</p>
                  <BoostMenu variant="inline" listingId={result.id} onDone={() => setBoosted(true)} />
                </>
              )}
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => onNavigate('seller-listings')} className="cursor-pointer rounded-lg border-none bg-primary px-5 py-3 text-label-lg text-white">Voir mes annonces</button>
            {!isEditing && <button onClick={reset} className="cursor-pointer rounded-lg border-[1.5px] border-solid border-on-surface bg-surface-lowest px-5 py-3 text-label-lg text-on-surface">Publier une autre annonce</button>}
          </div>
        </div>
      </AccountLayout>
    )
  }

  return (
    <AccountLayout active={active} onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} onBack={shellBack}>
      <ConfirmSheet open={quitOpen} title="Quitter le dépôt ?" confirmLabel="Quitter" tone="danger" onConfirm={leave} onClose={() => setQuitOpen(false)}>
        {imageFiles.length > 0
          ? <>{imageFiles.length > 1 ? `Vos ${imageFiles.length} photos ne seront pas conservées.` : 'Votre photo ne sera pas conservée.'}{!isEditing && ' Le texte reste enregistré en brouillon sur cet appareil.'}</>
          : 'Vos modifications non enregistrées seront perdues.'}
      </ConfirmSheet>
      <div className="mx-auto max-w-[1160px] pb-6">
        {/* Heading */}
        <div className="mb-5 hidden flex-wrap items-end justify-between gap-3 lg:flex">
          <div>
            <div className="mb-1 hidden items-center gap-2 text-label-sm uppercase lg:flex">
              <span className="rounded bg-primary-fixed px-1.5 py-0.5 text-primary">Création guidée</span>
              {!isEditing && <span className="flex items-center gap-1 text-tertiary"><span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> Enregistrement auto activé</span>}
            </div>
            <h1 className="m-0 hidden text-headline-lg text-on-surface lg:block">{isEditing ? "Modifier l'annonce" : 'Déposer une annonce'}</h1>
            <p className="m-0 mt-1 hidden text-body-md text-on-surface-variant lg:block">Vendez vos articles rapidement, sans commission cachée, et recevez l'intégralité de vos gains.</p>
          </div>
          {hhmm && !isEditing && (
            <span className="hidden items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-2 text-label-md text-on-surface lg:flex"><Icon name="bookmark" size={17} /> Brouillon sauvegardé ({hhmm})</span>
          )}
        </div>

        {/* Stepper */}
        <div className="mb-4 lg:hidden">
          <div className="mb-2 flex items-center justify-between text-label-md">
            <span className="text-on-surface">Étape {step + 1} / {MOBILE_STEPS.length} · <span className="text-primary">{MOBILE_STEPS[step]}</span></span>
            {hhmm && !isEditing && <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name="bookmark" size={14} /> Brouillon enregistré à {hhmm}</span>}
          </div>
          {/* 24px-high hit area around each 6px bar, so past steps are tappable. */}
          <div className="flex gap-1.5">
            {MOBILE_STEPS.map((label, i) => (
              <button key={label} type="button" aria-label={`Étape ${i + 1} : ${label}`} onClick={() => backTo(i)} disabled={i >= step} className={`flex h-6 flex-1 items-center border-none bg-transparent p-0 ${i < step ? 'cursor-pointer' : 'cursor-default'}`}>
                <span className={`h-1.5 w-full rounded-full ${i <= step ? 'bg-primary' : 'bg-surface-container-high'}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="mb-6 hidden grid-cols-3 gap-2 rounded-2xl lg:grid border border-outline-variant bg-surface-lowest p-3">
          {steps.map((s, i) => (
            <div key={s.title} className="flex items-center gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-md ${s.done ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>{i + 1}</span>
              <div className="min-w-0">
                <div className="truncate text-label-md text-on-surface">{s.title}</div>
                <div className={`hidden items-center gap-1 truncate text-body-sm sm:flex ${s.done ? 'text-tertiary' : 'text-on-surface-variant'}`}>{s.done && <Check size={13} />}{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
          <div className={`flex min-w-0 flex-col gap-5 ${step === 4 ? 'max-lg:hidden' : ''}`}>
            {/* Photos */}
            <Card className={only(0)} icon="add_a_photo" title="Photographies de l'article" subtitle={`Jusqu'à ${MAX_PHOTOS} photos gratuites. Montrez les détails et d'éventuels défauts pour rassurer l'acheteur.`}
              aside={<span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface-variant">{photoCount} / {MAX_PHOTOS} ajoutées</span>}>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {allPhotos.map((p, i) => (
                  <div key={p.key} className="relative aspect-square overflow-hidden rounded-xl bg-surface-container-low">
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">Photo de couverture</span>}
                    <button onClick={p.remove} className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-black/55 text-white" aria-label="Retirer"><X size={15} /></button>
                  </div>
                ))}
                {photoCount < MAX_PHOTOS && (
                  <button
                    onClick={() => fileInput.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
                    className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low p-2 text-center text-body-sm text-on-surface-variant hover:border-primary"
                  >
                    <Upload size={24} className="text-primary" />
                    <span className="font-semibold text-on-surface lg:hidden">Ajouter</span>
                    <span className="font-semibold text-on-surface max-lg:hidden">Glisser ou Parcourir</span>
                    <span className="text-[11px] max-lg:hidden">JPG, PNG, WEBP</span>
                  </button>
                )}
              </div>
              <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
            </Card>

            {/* Infos */}
            <Card className={only(1)} icon="edit_note" title="Informations sur l'article" subtitle="Donnez un maximum de précisions pour remonter dans les résultats de recherche.">
              <div className="flex flex-col gap-4">
                <Field label="Titre de l'annonce" required right={<span className="text-body-sm text-on-surface-variant">{form.title.length} / {TITLE_MAX} car.</span>} hint={bad('title') ? undefined : 'Mentionnez la marque, le modèle précis et la particularité majeure.'}>
                  <input data-field="title" aria-invalid={bad('title')} className={bad('title') ? inputBad : inputCls} maxLength={TITLE_MAX} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex : Appareil photo argentique Olympus OM-1 + Zuiko 50mm" />
                  <FieldError show={bad('title')}>Indiquez un titre.</FieldError>
                </Field>

                <div data-field="category">
                <Field label="Catégorie" required>
                  {/* Mobile: category cards, as in the mockup; desktop keeps the select. */}
                  <div className="mb-2 grid grid-cols-2 gap-2 lg:hidden" role="radiogroup" aria-label="Catégorie">
                    {categories.map(c => {
                      const on = c.id === form.categoryId
                      return (
                        <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setForm(f => (f.categoryId === c.id ? f : { ...f, categoryId: c.id, subcategoryId: '', attributes: {} }))}
                          className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-solid p-2.5 text-left ${on ? 'border-on-surface bg-on-surface text-surface-lowest' : bad('category') ? 'border-primary bg-surface-lowest text-on-surface' : 'border-outline-variant bg-surface-lowest text-on-surface'}`}>
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-white/15' : 'bg-surface-container-low text-primary'}`}><CategoryIcon icon={c.icon} size={20} /></span>
                          <span className="min-w-0 truncate text-label-md" title={c.name}>{c.name}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="relative max-lg:hidden">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary">{category ? <CategoryIcon icon={category.icon} size={20} /> : <Tag size={18} />}</span>
                      <Select className={`${bad('category') ? inputBad : inputCls} pl-10`} value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value, subcategoryId: '', attributes: {} }))}>
                        <option value="">Choisir une catégorie…</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                    </div>
                    <div className={category ? '' : 'max-lg:hidden'}>
                      <Select className={inputCls} value={form.subcategoryId} disabled={!category} onChange={e => set('subcategoryId', e.target.value)}>
                        <option value="">{category ? 'Sous-catégorie…' : '—'}</option>
                        {category?.subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </Select>
                    </div>
                  </div>
                  {category && (
                    <span className="mt-2 flex items-center gap-1 text-body-sm text-on-surface-variant">
                      <CategoryIcon icon={category.icon} size={15} /> {category.name}{subcategory && <> › <b className="text-primary">{subcategory.name}</b></>}
                    </span>
                  )}
                  <FieldError show={bad('category')}>Choisissez une catégorie.</FieldError>
                </Field>
                </div>

                {needsCondition && <div data-field="condition">
                  <span className="mb-1.5 block text-label-md text-on-surface">État de l'objet <span className="text-primary">*</span></span>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="radiogroup" aria-label="État de l'objet">
                    {CONDITIONS.map(c => {
                      const on = form.condition === c.value
                      return (
                        <button key={c.value} type="button" role="radio" aria-checked={on} onClick={() => set('condition', c.value)} className={`cursor-pointer rounded-xl border-[1.5px] border-solid p-3 text-left ${on ? 'border-primary bg-primary-fixed/40' : bad('condition') ? 'border-primary bg-surface-container-low' : 'border-outline-variant bg-surface-container-low hover:bg-surface-container'}`}>
                          <span className="flex items-center justify-between text-label-md text-on-surface">{c.value} <Icon name={c.icon} size={17} className={on ? 'text-primary' : 'text-on-surface-variant'} /></span>
                          <span className="mt-1 block text-body-sm text-on-surface-variant">{c.hint}</span>
                        </button>
                      )
                    })}
                  </div>
                  <FieldError show={bad('condition')}>Précisez l’état de l’objet.</FieldError>
                </div>}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Marque"><input className={inputCls} value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Ex : Olympus" /></Field>
                  <Field label="Modèle précis"><input className={inputCls} value={form.modelName} onChange={e => set('modelName', e.target.value)} placeholder="Ex : OM-1 Black/Chrome" /></Field>
                  {category && SIZED_CATEGORIES.includes(category.slug) && (
                    <Field label="Taille"><input className={inputCls} value={form.size} onChange={e => set('size', e.target.value)} placeholder="Ex : M, 38, 43" /></Field>
                  )}
                  {category?.attributes.map(a => (
                    <Field key={a.key} label={a.label} required={a.required}>
                      {a.type === 'SELECT' ? (
                        <Select className={inputCls} value={form.attributes[a.key] ?? ''} onChange={e => set('attributes', { ...form.attributes, [a.key]: e.target.value })}>
                          <option value="">—</option>
                          {a.options.map(o => <option key={o}>{o}</option>)}
                        </Select>
                      ) : (
                        <input className={inputCls} type={a.type === 'NUMBER' ? 'number' : 'text'} value={form.attributes[a.key] ?? ''} onChange={e => set('attributes', { ...form.attributes, [a.key]: e.target.value })} />
                      )}
                    </Field>
                  ))}
                </div>

                <div data-field="description">
                  <span className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-label-md text-on-surface">
                    <span>Description complète <span className="text-primary">*</span></span>
                    <span className="flex items-center gap-1 text-body-sm text-tertiary"><Lightbulb size={14} /> Conseil : une description détaillée (20 mots et plus) rassure les acheteurs</span>
                  </span>
                  <div className={bad('description') ? 'rounded-xl outline outline-[1.5px] outline-primary' : ''}>
                    <RichTextEditor content={form.description} onChange={v => set('description', v)} placeholder="État esthétique, fonctionnement, accessoires fournis, raison de la vente…" />
                  </div>
                  <FieldError show={bad('description')}>Décrivez votre article.</FieldError>
                </div>
              </div>
            </Card>

            {/* Price */}
            <Card className={only(2)} icon="sell" title="Fixation du prix & Recommandation Dilchap" subtitle="Fixez votre prix en toute liberté. Vente 100% sans commission entre particuliers.">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Field label={`Votre prix de vente (${form.currency === 'XOF' || form.currency === 'XAF' ? 'F' : form.currency})`} required={requiresPrice}>
                    <div data-field="price" className={`flex items-center rounded-xl border bg-surface-container-low px-4 ${bad('price') ? 'border-[1.5px] border-primary' : 'border-outline-variant'}`}>
                      <input type="number" min={0} disabled={!requiresPrice} aria-invalid={bad('price')} className="w-full min-w-0 border-none bg-transparent py-3 text-[40px] font-extrabold leading-none text-primary outline-none" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" />
                      <span className="text-headline-sm text-on-surface-variant">F</span>
                    </div>
                    <FieldError show={bad('price')}>Indiquez un prix.</FieldError>
                  </Field>
                  <p className="m-0 mt-2 flex items-center gap-1 text-body-sm font-semibold text-tertiary"><CheckCircle2 size={14} /> 0 F de commission : 100% du montant vous revient.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Field label="Prix neuf (optionnel)"><input type="number" min={0} className={inputCls} value={form.originalPrice} onChange={e => set('originalPrice', e.target.value)} placeholder="Barré sur l'annonce" /></Field>
                    <Field label="Pays">
                      <Select className={inputCls} value={form.countryCode} onChange={e => setForm(f => ({ ...f, countryCode: e.target.value, currency: marketForCountry(e.target.value)?.currency ?? f.currency }))}>
                        {MARKETS.map(m => <option key={m.countryCode} value={m.countryCode}>{m.country}</option>)}
                      </Select>
                    </Field>
                  </div>
                </div>
                <div className="rounded-xl bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-label-sm uppercase text-on-surface-variant">Fourchette recommandée</span>
                    {range && <span className="text-label-sm text-tertiary">Prix conseillé (<Price amount={range.median} currency={form.currency} />)</span>}
                  </div>
                  {range ? (
                    <>
                      <div className="mt-1 text-headline-sm font-extrabold text-on-surface"><Price amount={range.low} currency={form.currency} /> — <Price amount={range.high} currency={form.currency} /></div>
                      <div className="relative mt-3 h-1.5 rounded-full bg-gradient-to-r from-tertiary via-amber-400 to-primary">
                        {priceNum > 0 && (
                          <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-solid border-white bg-on-surface shadow"
                            style={{ left: `${Math.max(0, Math.min(100, ((priceNum - range.low * 0.5) / (range.high * 1.5 - range.low * 0.5)) * 100))}%` }} />
                        )}
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] text-on-surface-variant"><span>Vente express</span><span className="text-tertiary">Prix conseillé</span><span>Prix haut</span></div>
                      <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Basé sur {range.sampleSize} annonces comparables en ligne.</p>
                    </>
                  ) : (
                    <p className="m-0 mt-2 flex items-start gap-1.5 text-body-sm text-on-surface-variant"><Info size={15} className="mt-0.5 shrink-0" /> {form.categoryId ? 'Pas encore assez d’annonces comparables pour suggérer un prix.' : 'Choisissez une catégorie pour voir les prix constatés.'}</p>
                  )}
                </div>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-surface-container-low p-4">
                <input type="checkbox" checked={form.negotiable} onChange={e => set('negotiable', e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                <span className="flex-1">
                  <span className="block text-label-md text-on-surface">Accepter les propositions de prix dans le chat</span>
                  <span className="text-body-sm text-on-surface-variant">Autoriser les acheteurs à vous faire une proposition de négociation raisonnable.</span>
                </span>
                {form.negotiable && (
                  <span className="flex shrink-0 items-center gap-2 text-body-sm text-on-surface-variant">
                    Prix plancher :
                    <input type="number" min={0} value={form.minOfferPrice} onChange={e => set('minOfferPrice', e.target.value)} className="w-24 rounded-lg border border-outline-variant bg-surface-lowest px-2 py-1.5 text-label-md text-on-surface outline-none" placeholder="Optionnel" />
                  </span>
                )}
              </label>
            </Card>

            {/* Exchange */}
            <Card className={only(3)} icon="handshake" title="Modalités d'échange et de rencontre" subtitle="Aucun transporteur obligatoire : convenez directement du lieu de remise et du mode de règlement avec l'acheteur.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ville & Commune" required>
                  <div className="relative"><Icon name="location_city" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input data-field="city" aria-invalid={bad('city')} className={`${bad('city') ? inputBad : inputCls} pl-10`} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Abidjan" /></div>
                  <FieldError show={bad('city')}>Indiquez la ville.</FieldError>
                </Field>
                <Field label="Quartier">
                  <div className="relative"><MapPin size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input className={`${inputCls} pl-10`} value={form.locationLabel} onChange={e => set('locationLabel', e.target.value)} placeholder="Cocody (Angré 8e Tranche)" /></div>
                  {isAbidjan && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {ABIDJAN_ZONES.map(z => {
                        const on = form.locationLabel.trim() === z
                        return <button key={z} type="button" aria-pressed={on} onClick={() => set('locationLabel', on ? '' : z)} className={`h-9 cursor-pointer rounded-lg border border-solid px-3 text-label-md ${on ? 'border-on-surface bg-on-surface text-surface-lowest' : 'border-outline-variant bg-surface-lowest text-on-surface'}`}>{z}</button>
                      })}
                    </span>
                  )}
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Lieu de rendez-vous suggéré" hint="Un lieu public et fréquenté : centre commercial, station-service…">
                    <div className="relative"><Icon name="storefront" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input className={`${inputCls} pl-10`} value={form.meetupSpot} onChange={e => set('meetupSpot', e.target.value)} placeholder="Ex : Playce Marcory / Cap Sud" /></div>
                  </Field>
                  {isAbidjan && (
                    <div className="mt-2 rounded-xl bg-tertiary-soft/60 p-3">
                      <span className="mb-2 flex items-center gap-1.5 text-label-sm uppercase text-tertiary"><ShieldCheck size={14} /> Lieux publics et fréquentés</span>
                      <span className="flex flex-wrap gap-1.5">
                        {ABIDJAN_SPOTS.map(p => (
                          <button key={p} type="button" aria-pressed={form.meetupSpot === p} onClick={() => set('meetupSpot', form.meetupSpot === p ? '' : p)} className={`flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-solid px-2.5 text-label-md ${form.meetupSpot === p ? 'border-on-surface bg-on-surface text-surface-lowest' : 'border-outline-variant bg-surface-lowest text-on-surface'}`}>
                            <Icon name="storefront" size={15} /> {p}
                          </button>
                        ))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <span className="mb-1.5 block text-label-md text-on-surface">Moyens de règlement acceptés lors de la rencontre</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PAYMENT_GROUPS.map(g => {
                    const on = g.codes.every(c => form.paymentMethods.includes(c))
                    return (
                      <label key={g.label} className={`flex cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-solid p-3 ${on ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant bg-surface-container-low'}`}>
                        <Icon name={g.icon} size={19} className="text-primary" />
                        <span className="flex-1 text-label-md text-on-surface">{g.label}</span>
                        <input type="checkbox" checked={on} onChange={() => togglePayment(g.codes)} className="h-4 w-4 accent-[var(--primary)]" />
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 rounded-xl bg-surface-container-low p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked readOnly className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                  <span><span className="block text-label-md text-on-surface">Prêt à échanger par le chat intégré de Dilchap</span><span className="text-body-sm text-on-surface-variant">Recevez instantanément les messages et propositions des acheteurs.</span></span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={form.deliveryAvailable} onChange={e => set('deliveryAvailable', e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                  <span><span className="flex items-center gap-1 text-label-md text-on-surface"><Truck size={15} /> Livraison possible</span><span className="text-body-sm text-on-surface-variant">En plus de la remise en main propre, à convenir avec l'acheteur.</span></span>
                </label>
              </div>
            </Card>

            {error && <p className="m-0 hidden rounded-xl bg-primary-fixed p-3 text-body-sm text-primary lg:block">{error}</p>}
            <div className="hidden flex-wrap items-center justify-between gap-3 lg:flex">
              {!isEditing ? (
                <button disabled={busy} onClick={() => void save(false)} className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-surface-container-high px-5 py-3 text-label-lg text-on-surface hover:bg-surface-container-highest disabled:opacity-60">
                  <Icon name="save" size={19} /> Sauvegarder en brouillon
                </button>
              ) : <span />}
              <button disabled={busy} onClick={() => void save(!isEditing)} className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-primary px-8 py-3.5 text-headline-sm text-white hover:bg-primary-dark disabled:opacity-60">
                {busy ? <Loader2 size={20} className="animate-spin" /> : <Rocket size={20} />} {isEditing ? 'Enregistrer les modifications' : 'Publier mon annonce'}
              </button>
            </div>
          </div>

          {/* Sticky column */}
          <aside className={`flex flex-col gap-4 lg:sticky lg:top-2 ${only(4)}`}>
            {/* Nothing to earn on a priceless category (job offers). */}
            {requiresPrice && <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4">
              <div className="flex items-center justify-between">
                <span className="text-label-sm uppercase text-on-surface-variant">Vos gains réels</span>
                <span className="rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary">100% pour vous</span>
              </div>
              <div className="mt-3 rounded-xl bg-tertiary-soft p-3">
                <div className="text-body-sm text-on-surface-variant">Montant net perçu lors de la vente :</div>
                <div className="flex items-center justify-between">
                  <span className="text-headline-lg font-extrabold text-tertiary"><Price amount={priceNum} currency={form.currency} /></span>
                  <span className="flex items-center gap-1 text-label-sm text-tertiary"><CheckCircle2 size={13} /> Zéro frais</span>
                </div>
              </div>
              <dl className="m-0 mt-3 flex flex-col gap-2 text-body-sm">
                <div className="flex justify-between"><dt className="text-on-surface-variant">Prix de vente affiché</dt><dd className="m-0 font-semibold text-on-surface"><Price amount={priceNum} currency={form.currency} /></dd></div>
                <div className="flex justify-between"><dt className="text-on-surface-variant">Commission Dilchap</dt><dd className="m-0 font-semibold text-tertiary">0 F (gratuit)</dd></div>
                <div className="flex justify-between"><dt className="text-on-surface-variant">Frais de mise en relation</dt><dd className="m-0 font-semibold text-on-surface">0 F</dd></div>
              </dl>
              <p className="m-0 mt-3 flex items-start gap-1.5 text-body-sm text-on-surface-variant"><Handshake size={15} className="mt-0.5 shrink-0 text-primary" /> Paiement direct de la main à la main ou par mobile money entre particuliers.</p>
            </div>}

            <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4">
              <div className="mb-2 flex items-center justify-between text-label-sm uppercase">
                <span className="text-on-surface-variant">Aperçu en ligne</span><span className="text-primary">Vue acheteur</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-outline-variant">
                <div className="relative aspect-[4/3] bg-surface-container-low">
                  {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-outline"><Icon name="image" size={40} /></div>}
                  {form.condition && <span className="absolute left-2 top-2 rounded-md bg-tertiary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{form.condition}</span>}
                  {form.city && <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-surface-lowest/95 px-1.5 py-0.5 text-[10px] font-semibold text-on-surface"><MapPin size={11} /> {form.city}</span>}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-label-sm uppercase text-on-surface-variant">{form.brand || category?.name || 'Marque'}</span>
                    {requiresPrice && <span className="shrink-0 text-headline-sm font-extrabold text-primary"><Price amount={priceNum} currency={form.currency} /></span>}
                  </div>
                  <div className="truncate text-label-md text-on-surface">{form.title || 'Titre de votre annonce'}</div>
                  <div className="mt-1 flex items-center gap-1 text-body-sm text-on-surface-variant"><ShieldCheck size={13} className="text-tertiary" /> {currentUser?.fullName ?? 'Vous'} • Particulier</div>
                  <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-label-md text-white"><MessageSquare size={15} /> Contacter / Chat direct</div>
                </div>
              </div>
            </div>

            <div className="hidden rounded-2xl border border-outline-variant bg-surface-lowest p-4 lg:block">
              <div className="mb-2 flex items-center gap-1.5 text-label-md text-on-surface"><Icon name="verified" size={18} className="text-primary" /> Les engagements Dilchap</div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface-variant">
                {[
                  { icon: <Percent size={15} />, text: 'Plateforme 100% sans commission ni intermédiaire sur le paiement.' },
                  { icon: <MessageSquare size={15} />, text: 'Messagerie instantanée pour poser vos questions et négocier.' },
                  { icon: <Wallet size={15} />, text: 'Remise locale en main propre pour vérifier l’article avant de payer.' },
                ].map(e => <li key={e.text} className="flex items-start gap-2"><span className="mt-0.5 text-tertiary">{e.icon}</span> {e.text}</li>)}
              </ul>
            </div>
          </aside>
        </div>

        {/* Mobile wizard bar, above the account bottom tabs */}
        <div className="h-16 lg:hidden" />
        <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-40 border-0 border-t border-solid border-outline-variant bg-surface-lowest px-4 py-2.5 lg:hidden">
          {error && <p className="m-0 mb-2 rounded-lg bg-primary-fixed px-3 py-2 text-body-sm text-primary">{error}</p>}
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button type="button" onClick={() => backTo(step - 1)} className="flex h-12 cursor-pointer items-center gap-1 rounded-xl border-none bg-surface-container-high px-4 text-label-lg text-on-surface" aria-label="Étape précédente">
                <Icon name="arrow_back" size={20} />
              </button>
            ) : !isEditing && form.categoryId && (
              // A server draft needs a category; until then the local auto-save covers it.
              <button type="button" disabled={busy} onClick={() => void save(false)} className="flex h-12 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-surface-container-high px-4 text-label-md text-on-surface disabled:opacity-60">
                <Icon name="save" size={19} /> Brouillon
              </button>
            )}
            {step < MOBILE_STEPS.length - 1 ? (
              <button type="button" onClick={next} className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary text-label-lg text-white hover:bg-primary-dark">
                Suivant · {MOBILE_STEPS[step + 1]} <Icon name="arrow_forward" size={20} />
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => void save(!isEditing)} className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white hover:bg-primary-dark disabled:opacity-60">
                {busy ? <Loader2 size={20} className="animate-spin" /> : <Rocket size={20} />} {isEditing ? 'Enregistrer' : 'Publier mon annonce'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AccountLayout>
  )
}

