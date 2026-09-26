import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import Select from '../../components/Select'
import ConfirmSheet from '../../components/ConfirmSheet'
import PaymentSheet from '../../components/PaymentSheet'
import { PaymentLogos } from '../../components/PaymentLogo'
import { AccountLayout } from './AccountLayout'
import { CATEGORIES_QUERY } from '../../graphql/categories'
import {
  CREATE_SHOP_AISLE_MUTATION, DAYS, DELETE_SHOP_AISLE_MUTATION, MY_SHOP_LISTINGS_QUERY, MY_SHOP_QUERY, REJECT_LABELS,
  RENAME_SHOP_AISLE_MUTATION, REORDER_SHOP_AISLES_MUTATION, SET_LISTING_AISLE_MUTATION, SET_LISTING_FEATURED_MUTATION,
  SET_LISTING_QUANTITY_MUTATION, SUBMIT_SHOP_MUTATION, UPDATE_SHOP_PROFILE_MUTATION, shopUrl,
  type MyShop as MyShopT, type MyShopData, type OpeningHours, type ShopListing, type ShopPlan, type ShopRejectReason,
} from '../../graphql/shops'
import { uploadImages, uploadShopDocument } from '../../lib/upload'
import type { AuthUser } from '../../graphql/auth'

type Props = {
  onNavigate: (p: any) => void
  currentUser?: AuthUser | null
  onLogout: () => void
  onOpenShop: (slug: string) => void
}

const CITIES = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo', 'Man', 'Gagnoa']
const COMMUNES = ['Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon', 'Bingerville', 'Songon', 'Anyama']
const fdate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(iso).toLocaleDateString('fr-FR', opts)
const ref = (id: string) => `BTQ-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
const DOC_REASONS: ShopRejectReason[] = ['DOC_UNREADABLE', 'DOC_INVALID', 'NUMBER_MISMATCH', 'OWNER_MISMATCH']
const IDENTITY_REASONS: ShopRejectReason[] = ['NAME_MISMATCH', 'BRAND_MISUSE']

type Form = {
  name: string; categoryId: string; description: string; logoUrl: string; bannerUrl: string; city: string; commune: string
  address: string; phone: string; whatsapp: string; email: string; website: string; facebook: string; instagram: string; tiktok: string
  hours: (OpeningHours | null)[]
  legalIdType: 'RCCM' | 'NCC'; legalIdNumber: string; legalDocKey: string; legalDocName: string; consent: boolean
}
const DEFAULT_HOURS: (OpeningHours | null)[] = DAYS.map((_, day) => (day < 6 ? { day, open: day === 5 ? '10:00' : '09:00', close: day === 5 ? '20:00' : '19:30' } : null))
const formFrom = (s?: MyShopT | null): Form => ({
  name: s?.name ?? '', categoryId: s?.category?.id ?? '', description: s?.description ?? '', logoUrl: s?.logoUrl ?? '', bannerUrl: s?.bannerUrl ?? '',
  city: s?.city ?? 'Abidjan', commune: s?.commune ?? '', address: s?.address ?? '', phone: s?.phone ?? '', whatsapp: s?.whatsapp ?? '',
  email: s?.email ?? '', website: s?.website ?? '', facebook: s?.facebook ?? '', instagram: s?.instagram ?? '', tiktok: s?.tiktok ?? '',
  hours: s ? DAYS.map((_, day) => s.openingHours.find(h => h.day === day) ?? null) : DEFAULT_HOURS,
  legalIdType: s?.legalIdType ?? 'RCCM', legalIdNumber: s?.legalIdNumber ?? '', legalDocKey: '', legalDocName: '', consent: false,
})
const profileInput = (f: Form) => ({
  description: f.description, logoUrl: f.logoUrl, bannerUrl: f.bannerUrl, categoryId: f.categoryId || undefined, city: f.city, commune: f.commune,
  address: f.address, phone: f.phone, whatsapp: f.whatsapp, email: f.email.trim() || undefined, website: f.website.trim() || undefined,
  facebook: f.facebook, instagram: f.instagram, tiktok: f.tiktok,
  openingHours: f.hours.filter((h): h is OpeningHours => !!h).map(({ day, open, close }) => ({ day, open, close })),
})

const inputCls = 'h-12 w-full rounded-xl border-none bg-surface-lowest px-3 text-body-md text-on-surface shadow-sm outline-none focus:outline focus:outline-2 focus:outline-primary'

function Field({ label, children, hint, required }: { label: string, children: React.ReactNode, hint?: string, required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-label-md text-on-surface">
        <span>{label}{required && <span className="text-primary"> *</span>}</span>
        {hint && <span className="text-label-sm text-on-surface-variant">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function IconInput({ icon, ...p }: { icon: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="flex h-12 items-center gap-2 rounded-xl bg-surface-lowest px-3 shadow-sm focus-within:outline focus-within:outline-2 focus-within:outline-primary">
      <Icon name={icon} size={19} className="shrink-0 text-on-surface-variant" />
      <input {...p} className="h-full w-full min-w-0 border-none bg-transparent text-body-md text-on-surface outline-none" />
    </span>
  )
}

// Logo / banner picker (public images, like listing photos).
function ImagePick({ value, onChange, kind }: { value: string, onChange: (url: string) => void, kind: 'logo' | 'banner' }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pick = async (f?: File) => {
    if (!f) return
    setBusy(true); setError('')
    try { onChange((await uploadImages([f]))[0]) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <>
      <input ref={input} type="file" accept="image/*" hidden onChange={e => { void pick(e.target.files?.[0]); e.target.value = '' }} />
      <button type="button" onClick={() => input.current?.click()} className={`relative flex cursor-pointer items-center justify-center overflow-hidden border-none bg-surface-container p-0 text-on-surface-variant ${kind === 'logo' ? 'h-20 w-20 shrink-0 rounded-2xl border-4 border-solid border-surface-lowest shadow-sm' : 'h-32 w-full rounded-2xl md:h-40'}`}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : (
          <span className="flex flex-col items-center gap-1 px-2 text-center text-label-sm"><Icon name={kind === 'logo' ? 'add_photo_alternate' : 'panorama'} size={kind === 'logo' ? 24 : 28} />{kind === 'banner' && 'Bannière (format large)'}</span>
        )}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-black/40"><Icon name="progress_activity" size={26} className="animate-spin text-white" /></span>}
        {value && !busy && <span className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface-lowest/95 text-on-surface"><Icon name="edit" size={15} /></span>}
      </button>
      {error && <p className="m-0 mt-1 text-body-sm text-primary">{error}</p>}
    </>
  )
}

function HoursEditor({ hours, onChange }: { hours: (OpeningHours | null)[], onChange: (h: (OpeningHours | null)[]) => void }) {
  const set = (i: number, v: OpeningHours | null) => onChange(hours.map((h, j) => (j === i ? v : h)))
  return (
    <div className="flex flex-col gap-2">
      {DAYS.map((d, i) => {
        const h = hours[i]
        const bad = h && h.open >= h.close
        return (
          <div key={d} className="rounded-xl bg-surface-container-low p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-label-md text-on-surface">{d}</span>
              <button type="button" role="switch" aria-checked={!!h} aria-label={`${d} ouvert`} onClick={() => set(i, h ? null : { day: i, open: '09:00', close: '19:00' })} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-none transition-colors ${h ? 'bg-primary' : 'bg-outline-variant'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] ${h ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            {h ? (
              <div className="mt-2 flex items-center gap-2">
                <input type="time" value={h.open} onChange={e => set(i, { ...h, open: e.target.value })} className="h-10 min-w-0 flex-1 rounded-lg border-none bg-surface-lowest px-2 text-body-md text-on-surface outline-none" aria-label={`${d} ouverture`} />
                <span className="text-body-sm text-on-surface-variant">à</span>
                <input type="time" value={h.close} onChange={e => set(i, { ...h, close: e.target.value })} className="h-10 min-w-0 flex-1 rounded-lg border-none bg-surface-lowest px-2 text-body-md text-on-surface outline-none" aria-label={`${d} fermeture`} />
              </div>
            ) : <p className="m-0 mt-1 text-body-sm italic text-on-surface-variant">Fermé toute la journée</p>}
            {bad && <p className="m-0 mt-1 text-body-sm text-primary">L’heure de fermeture doit suivre l’ouverture.</p>}
          </div>
        )
      })}
    </div>
  )
}

function IdentityFields({ form, set, categories, withName }: { form: Form, set: (p: Partial<Form>) => void, categories: { id: string, name: string }[], withName: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-label-md text-on-surface">Habillage de votre vitrine <span className="text-label-sm text-on-surface-variant">Logo carré, bannière large</span></div>
        <div className="relative">
          <ImagePick kind="banner" value={form.bannerUrl} onChange={bannerUrl => set({ bannerUrl })} />
          <div className="-mt-10 ml-4 flex items-end gap-3">
            <ImagePick kind="logo" value={form.logoUrl} onChange={logoUrl => set({ logoUrl })} />
            <span className="pb-1 text-body-sm text-on-surface-variant">Logo de l’enseigne</span>
          </div>
        </div>
      </div>
      {withName && (
        <Field label="Nom commercial officiel" required hint="Tel qu’enregistré">
          <IconInput icon="storefront" value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Ex : Kicks Station Babi" maxLength={60} />
        </Field>
      )}
      <Field label="Secteur d’activité" required>
        <Select value={form.categoryId} onChange={e => set({ categoryId: e.target.value })} className={`${inputCls} cursor-pointer`}>
          <option value="">Sélectionnez un secteur</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Description de la boutique" required hint={`${form.description.length} / 1500`}>
        <textarea value={form.description} onChange={e => set({ description: e.target.value.slice(0, 1500) })} rows={4} placeholder="Présentez votre boutique, vos marques distribuées, vos engagements (garantie, service après-vente…)" className="w-full resize-y rounded-xl border-none bg-surface-lowest p-3 text-body-md text-on-surface shadow-sm outline-none focus:outline focus:outline-2 focus:outline-primary" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ville" required>
          <Select value={form.city} onChange={e => set({ city: e.target.value, commune: e.target.value === 'Abidjan' ? form.commune : '' })} className={`${inputCls} cursor-pointer`}>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label={form.city === 'Abidjan' ? 'Commune' : 'Quartier'}>
          {form.city === 'Abidjan' ? (
            <Select value={form.commune} onChange={e => set({ commune: e.target.value })} className={`${inputCls} cursor-pointer`}>
              <option value="">Choisir</option>
              {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          ) : <input value={form.commune} onChange={e => set({ commune: e.target.value })} className={inputCls} maxLength={60} />}
        </Field>
      </div>
    </div>
  )
}

function ContactFields({ form, set }: { form: Form, set: (p: Partial<Form>) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-2xl bg-surface-lowest/60 p-4 shadow-sm">
        <h3 className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><Icon name="storefront" size={19} className="text-primary" /> Coordonnées</h3>
        <Field label="Adresse du magasin / showroom"><IconInput icon="location_on" value={form.address} onChange={e => set({ address: e.target.value })} placeholder="Rue des Majorettes, Marcory Zone 4" maxLength={200} /></Field>
        <Field label="Téléphone"><IconInput icon="call" type="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} placeholder="07 00 00 00 00" maxLength={20} /></Field>
        <Field label="WhatsApp"><IconInput icon="chat" type="tel" value={form.whatsapp} onChange={e => set({ whatsapp: e.target.value })} placeholder="+225 07 00 00 00 00" maxLength={20} /></Field>
        <Field label="E-mail"><IconInput icon="mail" type="email" value={form.email} onChange={e => set({ email: e.target.value })} placeholder="contact@maboutique.ci" /></Field>
        <Field label="Site web" hint="Facultatif"><IconInput icon="language" value={form.website} onChange={e => set({ website: e.target.value })} placeholder="www.maboutique.ci" maxLength={200} /></Field>
      </section>
      <section className="flex flex-col gap-3 rounded-2xl bg-surface-lowest/60 p-4 shadow-sm">
        <h3 className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><Icon name="share" size={19} className="text-primary" /> Réseaux sociaux</h3>
        <Field label="Instagram"><IconInput icon="photo_camera" value={form.instagram} onChange={e => set({ instagram: e.target.value })} placeholder="@maboutique" maxLength={200} /></Field>
        <Field label="Facebook"><IconInput icon="public" value={form.facebook} onChange={e => set({ facebook: e.target.value })} placeholder="facebook.com/maboutique" maxLength={200} /></Field>
        <Field label="TikTok"><IconInput icon="music_note" value={form.tiktok} onChange={e => set({ tiktok: e.target.value })} placeholder="@maboutique" maxLength={200} /></Field>
      </section>
      <section className="rounded-2xl bg-surface-lowest/60 p-4 shadow-sm">
        <h3 className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><Icon name="schedule" size={19} className="text-primary" /> Horaires d’ouverture</h3>
        <p className="m-0 mb-3 mt-1 text-body-sm text-on-surface-variant">Affichés sur votre page et utilisés pour indiquer « Ouvert » ou « Fermé ».</p>
        <HoursEditor hours={form.hours} onChange={hours => set({ hours })} />
      </section>
    </div>
  )
}

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

function ShopSummary({ shop }: { shop: MyShopT }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-lowest text-headline-sm font-bold text-primary">{shop.logoUrl ? <img src={shop.logoUrl} alt="" className="h-full w-full object-cover" /> : <Icon name="storefront" size={26} />}</span>
      <div className="min-w-0">
        <div className="truncate text-label-lg text-on-surface">{shop.name}</div>
        {shop.category && <div className="truncate text-body-sm text-on-surface-variant">{shop.category.name}</div>}
        <div className="flex items-center gap-1 truncate text-body-sm text-primary"><Icon name="location_on" size={14} /> {[shop.commune, shop.city].filter(Boolean).join(', ')}</div>
      </div>
    </div>
  )
}

const BENEFITS: [string, string, string][] = [
  ['verified', 'Badge Boutique officielle', 'Distinct du badge Vendeur certifié, sur votre page et toutes vos annonces.'],
  ['storefront', 'Visibilité renforcée', 'Présence dans l’annuaire des boutiques et sur l’accueil.'],
  ['category', 'Rayons personnalisés', 'Organisez vos articles en rayons sur votre page.'],
  ['push_pin', 'Articles phares', 'Épinglez jusqu’à 8 articles en tête de votre vitrine.'],
  ['inventory_2', 'Gestion du stock', 'Plusieurs exemplaires par annonce, décomptés à chaque vente conclue.'],
  ['monitoring', 'Statistiques boutique', 'Visites de votre page, abonnés gagnés, articles les plus vus.'],
]

export default function MyShop({ onNavigate, currentUser, onLogout, onOpenShop }: Props) {
  const { data, loading, refetch } = useQuery<MyShopData>(MY_SHOP_QUERY, { fetchPolicy: 'cache-and-network' })
  const { data: cats } = useQuery<{ categories: { id: string, name: string }[] }>(CATEGORIES_QUERY)
  const [wizard, setWizard] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Form>(() => formFrom(null))
  const [error, setError] = useState('')
  const [docBusy, setDocBusy] = useState(false)
  const [paying, setPaying] = useState(false)
  const [paidMsg, setPaidMsg] = useState('')
  const [submit, { loading: sending }] = useMutation(SUBMIT_SHOP_MUTATION)
  const docInput = useRef<HTMLInputElement>(null)
  const top = useRef<HTMLDivElement>(null)
  useEffect(() => { top.current?.scrollIntoView({ block: 'start' }); window.scrollTo({ top: 0 }) }, [step, wizard])

  const me = data?.myShop
  const shop = me?.shop ?? null
  const plan = me?.plan
  const categories = cats?.categories ?? []
  const set = (p: Partial<Form>) => setForm(f => ({ ...f, ...p }))
  const start = () => { setForm(formFrom(shop)); setStep(0); setError(''); setWizard(true) }
  const back = () => (step === 0 ? setWizard(false) : setStep(s => s - 1))

  const layout = (children: React.ReactNode, opts: { hideNav?: boolean, wide?: boolean } = {}) => (
    <AccountLayout active="seller-shop" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title="Ma Boutique officielle" hideBottomNav={opts.hideNav} onBack={wizard ? back : undefined}>
      <div ref={top} className={`mx-auto pb-28 lg:pb-8 ${opts.wide ? 'max-w-[1200px]' : 'max-w-[760px]'}`}>{children}</div>
    </AccountLayout>
  )
  if (loading && !me) return layout(<p className="text-body-md text-on-surface-variant">Chargement…</p>)
  if (!me || !plan) return layout(<p className="text-body-md text-on-surface-variant">Impossible de charger votre boutique. Réessayez plus tard.</p>)

  const pay = (
    <PaymentSheet
      open={paying}
      title="Abonnement Boutique officielle"
      amount={plan.price}
      request={paying ? { kind: 'SHOP_SUBSCRIPTION', product: 'MONTHLY' } : null}
      onClose={() => setPaying(false)}
      onPaid={() => { setPaying(false); setPaidMsg(`Abonnement actif : ${plan.credits} crédits boost ajoutés à votre porte-monnaie.`); void refetch() }}
    />
  )

  // ─── Application wizard ───────────────────────────────────────────────
  if (wizard) {
    const stepOk = [
      form.name.trim().length >= 2 && !!form.categoryId && form.description.trim().length >= 20 && !!form.city,
      form.hours.every(h => !h || h.open < h.close) && (!form.email || /^\S+@\S+\.\S+$/.test(form.email)),
      form.legalIdNumber.trim().length >= 5 && !!form.legalDocKey && form.consent,
    ]
    const pickDoc = async (f?: File) => {
      if (!f) return
      if (f.size > 12 * 1024 * 1024) { setError('Fichier trop lourd (12 Mo maximum).'); return }
      setDocBusy(true); setError('')
      try { set({ legalDocKey: await uploadShopDocument(f), legalDocName: f.name }) } catch (e) { setError((e as Error).message) } finally { setDocBusy(false) }
    }
    const send = () => {
      setError('')
      void submit({
        variables: {
          input: {
            ...profileInput(form), name: form.name.trim(), city: form.city,
            legalIdType: form.legalIdType, legalIdNumber: form.legalIdNumber.trim(), legalDocKey: form.legalDocKey,
          },
        },
      }).then(() => { setWizard(false); void refetch() }).catch((e: Error) => setError(e.message))
    }
    const labels = ['Identité', 'Contacts & horaires', 'Document légal']
    return layout(<>
      <div className="mb-5 flex items-center">
        {labels.map((l, i) => (
          <div key={l} className={`flex items-center ${i < 2 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-label-lg ${i < step ? 'bg-tertiary text-white' : i === step ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>{i < step ? <Icon name="check" size={18} /> : i + 1}</span>
              <span className={`whitespace-nowrap text-[11px] font-semibold sm:text-label-sm ${i === step ? 'text-primary' : i < step ? 'text-tertiary' : 'text-on-surface-variant'}`}>{l}</span>
            </div>
            {i < 2 && <span className={`mx-1 mb-5 h-0.5 flex-1 rounded ${i < step ? 'bg-tertiary' : 'bg-surface-container-high'}`} />}
          </div>
        ))}
      </div>
      {step === 0 && <>
        <h1 className="m-0 text-headline-lg text-on-surface">Identité de la boutique</h1>
        <p className="m-0 mb-4 mt-1 text-body-md text-on-surface-variant">Ce que les acheteurs verront sur votre vitrine officielle.</p>
        <IdentityFields form={form} set={set} categories={categories} withName />
      </>}
      {step === 1 && <>
        <h1 className="m-0 text-headline-lg text-on-surface">Contacts & horaires</h1>
        <p className="m-0 mb-4 mt-1 text-body-md text-on-surface-variant">Coordonnées de votre point de vente, affichées sur votre page.</p>
        <ContactFields form={form} set={set} />
      </>}
      {step === 2 && <>
        <h1 className="m-0 text-headline-lg text-on-surface">Document légal d’entreprise</h1>
        <p className="m-0 mb-4 mt-1 text-body-md text-on-surface-variant">Le justificatif d’immatriculation de votre entreprise, vérifié par l’équipe Dilchap.</p>
        <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-container p-1">
          {(['RCCM', 'NCC'] as const).map(t => (
            <button key={t} role="radio" aria-checked={form.legalIdType === t} type="button" onClick={() => set({ legalIdType: t })} className={`flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-none text-label-lg ${form.legalIdType === t ? 'bg-surface-lowest text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>
              <Icon name={t === 'RCCM' ? 'description' : 'receipt_long'} size={18} /> {t}
            </button>
          ))}
        </div>
        <p className="m-0 mt-2 text-body-sm text-on-surface-variant">{form.legalIdType === 'RCCM' ? 'Registre du Commerce et du Crédit Mobilier (ex. CI-ABJ-2024-B-14892).' : 'Numéro de Compte Contribuable délivré par la DGI.'}</p>
        <div className="mt-4"><Field label={`Numéro ${form.legalIdType}`} required>
          <IconInput icon="badge" value={form.legalIdNumber} onChange={e => set({ legalIdNumber: e.target.value.toUpperCase() })} placeholder={form.legalIdType === 'RCCM' ? 'CI-ABJ-2024-B-14892' : '1234567 A'} maxLength={40} autoComplete="off" />
        </Field></div>
        <div className="mb-1.5 mt-4 flex items-center justify-between text-label-md text-on-surface">Justificatif <span className="flex items-center gap-1 text-label-sm text-tertiary"><Icon name="lock" size={14} /> Stockage privé</span></div>
        <input ref={docInput} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" hidden onChange={e => { void pickDoc(e.target.files?.[0]); e.target.value = '' }} />
        {form.legalDocKey ? (
          <div className="flex items-center gap-3 rounded-xl bg-surface-lowest p-3 shadow-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icon name={form.legalDocName.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'image'} size={22} /></span>
            <div className="min-w-0 flex-1"><div className="truncate text-label-md text-on-surface">{form.legalDocName}</div><div className="flex items-center gap-1 text-label-sm text-tertiary"><Icon name="check_circle" size={14} /> Fichier envoyé</div></div>
            <button type="button" onClick={() => docInput.current?.click()} className="flex h-9 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-container px-3 text-label-md text-on-surface">Remplacer</button>
          </div>
        ) : (
          <button type="button" disabled={docBusy} onClick={() => docInput.current?.click()} className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-lowest px-4 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name={docBusy ? 'progress_activity' : 'upload_file'} size={24} className={docBusy ? 'animate-spin' : ''} /></span>
            <span className="text-label-lg text-on-surface">{docBusy ? 'Envoi…' : 'Importer le document'}</span>
            <span className="text-body-sm text-on-surface-variant">PDF, JPG ou PNG — 12 Mo maximum. Tout le document, lisible.</span>
          </button>
        )}
        <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
          <div className="mb-3 text-label-sm uppercase text-on-surface-variant">Récapitulatif de votre demande</div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-lowest text-primary">{form.logoUrl ? <img src={form.logoUrl} alt="" className="h-full w-full object-cover" /> : <Icon name="storefront" size={24} />}</span>
            <div className="min-w-0"><div className="truncate text-label-lg text-on-surface">{form.name}</div><div className="truncate text-body-sm text-on-surface-variant">{categories.find(c => c.id === form.categoryId)?.name}</div></div>
          </div>
          <dl className="m-0 mt-3 flex flex-col gap-2 rounded-xl bg-surface-lowest p-3 text-body-sm">
            <div className="flex justify-between gap-3"><dt className="text-on-surface-variant">Emplacement</dt><dd className="m-0 text-right text-on-surface">{[form.commune, form.city].filter(Boolean).join(', ')}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-on-surface-variant">Abonnement</dt><dd className="m-0 whitespace-nowrap text-primary"><Price amount={plan.price} /> / mois</dd></div>
          </dl>
          <p className="m-0 mt-2 flex items-start gap-1.5 text-body-sm text-tertiary"><Icon name="verified_user" size={16} className="mt-0.5 shrink-0" /> Rien à payer maintenant : l’abonnement se règle une fois la boutique validée.</p>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <input type="checkbox" checked={form.consent} onChange={e => set({ consent: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
          <span className="text-body-sm text-on-surface">Je certifie sur l’honneur l’authenticité des informations et du document transmis, et être habilité(e) à représenter cette entreprise sur Dilchap.</span>
        </label>
      </>}
      {error && <p className="m-0 mt-4 flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-2 text-body-sm text-primary"><Icon name="error" size={17} /> {error}</p>}
      <div className="fixed inset-x-0 bottom-0 z-40 border-0 border-t border-solid border-outline-variant bg-surface-lowest/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:mt-6 lg:border-none lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-[760px] gap-3">
          <button onClick={back} className="flex h-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-surface-container px-5 text-label-md text-on-surface">{step === 0 ? 'Annuler' : 'Retour'}</button>
          {step < 2 ? (
            <button disabled={!stepOk[step]} onClick={() => setStep(s => s + 1)} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-4 text-label-lg text-white disabled:cursor-not-allowed disabled:opacity-45">
              <span className="truncate">Continuer</span> <Icon name="arrow_forward" size={19} />
            </button>
          ) : (
            <button disabled={!stepOk[2] || sending || docBusy} onClick={send} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-4 text-label-lg text-white disabled:cursor-not-allowed disabled:opacity-45">
              <span className="truncate">{sending ? 'Envoi…' : 'Envoyer ma demande'}</span> <Icon name="send" size={19} />
            </button>
          )}
        </div>
      </div>
    </>, { hideNav: true })
  }

  // ─── No shop yet: the offer ───────────────────────────────────────────
  if (!shop) {
    return layout(<>
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-tertiary-soft px-3 py-1 text-label-sm uppercase text-tertiary"><Icon name="verified" size={15} fill /> Boutique officielle</span>
        <h1 className="m-0 mt-3 text-headline-lg text-on-surface">Ouvrir ma Boutique officielle</h1>
        <p className="m-0 mx-auto mt-1 max-w-lg text-body-md text-on-surface-variant">Pour les entreprises et marques déclarées : une vitrine à votre nom, vérifiée par Dilchap.</p>
      </div>
      <PlanCard plan={plan} />
      <div className="mt-6 flex items-center justify-between"><h2 className="m-0 text-headline-sm text-on-surface">Ce que vous obtenez</h2></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {BENEFITS.map(([icon, t, d]) => (
          <div key={t} className="flex items-start gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name={icon} size={20} /></span>
            <div><div className="text-label-lg text-on-surface">{t}</div><div className="text-body-sm text-on-surface-variant">{d}</div></div>
          </div>
        ))}
      </div>
      <h2 className="m-0 mt-6 text-headline-sm text-on-surface">Prérequis</h2>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${me.identityVerified ? 'bg-tertiary text-white' : 'bg-primary-fixed text-primary'}`}><Icon name={me.identityVerified ? 'check' : 'badge'} size={20} /></span>
          <div className="min-w-0 flex-1"><div className="text-label-lg text-on-surface">Identité du gérant</div><div className={`text-body-sm ${me.identityVerified ? 'text-tertiary' : 'text-primary'}`}>{me.identityVerified ? 'Vérifiée' : 'Non vérifiée — à faire avant la demande'}</div></div>
          {!me.identityVerified && <button onClick={() => onNavigate('seller-kyc')} className="flex h-10 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-surface-container px-3 text-label-md text-on-surface">Vérifier</button>}
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"><Icon name="description" size={20} /></span>
          <div className="min-w-0 flex-1"><div className="text-label-lg text-on-surface">Document d’entreprise</div><div className="text-body-sm text-on-surface-variant">Extrait RCCM ou attestation NCC, à importer pendant la demande (PDF ou photo).</div></div>
        </div>
      </div>
      <button disabled={!me.identityVerified} onClick={start} className="mt-6 flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-label-lg text-white shadow-md disabled:cursor-not-allowed disabled:opacity-45">
        Commencer ma demande <Icon name="arrow_forward" size={19} />
      </button>
      {!me.identityVerified && <p className="m-0 mt-2 text-center text-body-sm text-on-surface-variant">Vérifiez d’abord votre identité : la boutique est rattachée à un gérant vérifié.</p>}
    </>)
  }

  // ─── Application states ───────────────────────────────────────────────
  if (shop.status === 'PENDING') {
    return layout(<>
      <StatusHero icon="pending_actions" tone="wait" badge="Dossier en traitement" title="Demande en cours d’examen" text="Votre dossier a bien été transmis. L’équipe Dilchap vérifie votre document légal et les informations de votre boutique." />
      <dl className="m-0 mt-5 flex flex-col gap-3 rounded-2xl bg-surface-lowest p-5 text-body-md shadow-sm">
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">Référence</dt><dd className="m-0 font-mono text-label-md text-on-surface">{ref(shop.id)}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">Envoyée le</dt><dd className="m-0 text-right text-on-surface">{new Date(shop.submittedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">Document</dt><dd className="m-0 text-on-surface">{shop.legalIdType} n° {shop.legalIdNumber}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-on-surface-variant">Statut</dt><dd className="m-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary-fixed/60 px-3 py-1 text-label-md text-primary"><Icon name="hourglass_top" size={16} /> En cours d’examen</dd></div>
      </dl>
      <div className="mt-4 rounded-2xl bg-surface-lowest p-5 shadow-sm">
        <div className="flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="task_alt" size={22} className="text-tertiary" /> Étapes de validation</div>
        <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
          {[
            ['check', 'Réception du dossier', 'Informations et document reçus.', 'Fait', 'done'],
            ['sync', 'Vérification', 'Contrôle du document d’immatriculation et du nom commercial.', 'En cours', 'now'],
            ['schedule', 'Activation de la vitrine', 'Après validation, réglez l’abonnement pour afficher le badge.', 'À venir', 'next'],
          ].map(([icon, t, d, s, k]) => (
            <li key={t} className="flex items-start gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${k === 'done' ? 'bg-tertiary text-white' : k === 'now' ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'}`}><Icon name={icon} size={17} /></span>
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-label-lg text-on-surface">{t}</span><span className={`whitespace-nowrap text-label-sm ${k === 'done' ? 'text-tertiary' : k === 'now' ? 'text-primary' : 'text-on-surface-variant'}`}>{s}</span></div><div className="text-body-sm text-on-surface-variant">{d}</div></div>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-4 rounded-2xl bg-surface-lowest p-5 shadow-sm"><div className="mb-3 text-label-lg text-on-surface">Boutique soumise</div><ShopSummary shop={shop} /></div>
      <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="notifications" size={18} className="mt-0.5 shrink-0" /> Aucune action requise : vous recevrez une notification dès la décision.</p>
      <button onClick={() => void refetch()} className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container text-label-lg text-on-surface"><Icon name="refresh" size={19} /> Actualiser le statut</button>
    </>)
  }

  if (shop.status === 'REJECTED') {
    const r = shop.rejectReason
    const parts: [string, string, string, boolean][] = [
      ['storefront', 'Identité de la boutique', 'Nom, secteur, description', !!r && IDENTITY_REASONS.includes(r)],
      ['location_on', 'Contacts & horaires', 'Adresse, téléphone, horaires', false],
      ['description', `Document légal (${shop.legalIdType})`, 'Numéro et justificatif', !!r && DOC_REASONS.includes(r)],
    ]
    const flagged = parts.some(p => p[3])
    return layout(<>
      <StatusHero icon="error" tone="bad" badge="Action requise" title="Demande à corriger" text="Des éléments de votre dossier doivent être mis à jour avant la validation de votre Boutique officielle." />
      <div className="mt-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
        <div className="flex items-center gap-2 text-label-md text-primary"><Icon name="warning" size={18} /> Motif signalé par l’équipe de vérification</div>
        <div className="mt-2 rounded-xl bg-surface-container-low p-3">
          <div className="text-label-lg text-on-surface">{r ? REJECT_LABELS[r] : 'Demande refusée'}</div>
          {shop.rejectComment && <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{shop.rejectComment}</p>}
        </div>
        {flagged && (
          <>
            <div className="mt-4 text-label-sm uppercase text-on-surface-variant">État des pièces du dossier</div>
            <div className="mt-2 flex flex-col gap-2">
              {parts.map(([icon, t, d, redo]) => (
                <div key={t} className={`flex items-center gap-3 rounded-xl p-3 ${redo ? 'bg-primary-fixed/50' : 'bg-surface-container-low'}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${redo ? 'bg-primary-fixed text-primary' : 'bg-tertiary-soft text-tertiary'}`}><Icon name={icon} size={19} /></span>
                  <div className="min-w-0 flex-1"><div className="text-label-md leading-tight text-on-surface">{t}</div><div className="text-body-sm text-on-surface-variant">{d}</div></div>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-label-sm ${redo ? 'bg-primary text-white' : 'bg-tertiary-soft text-tertiary'}`}>{redo ? 'À modifier' : 'Conforme'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="mt-4 rounded-2xl bg-surface-container-low p-5">
        <div className="flex items-center gap-2 text-label-lg text-on-surface"><Icon name="lightbulb" size={20} className="text-tertiary" /> Conseils pour votre renvoi</div>
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface">
          {['Importez le document complet (toutes les pages utiles), net et sans reflet.', 'Recopiez le numéro exactement comme sur le document.', 'Le nom commercial doit correspondre à celui de l’entreprise enregistrée.'].map(t => (
            <li key={t} className="flex items-start gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-tertiary" />{t}</li>
          ))}
        </ul>
      </div>
      <button onClick={start} className="mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="edit_note" size={20} /> Corriger et renvoyer</button>
    </>)
  }

  if (shop.status === 'SUSPENDED') {
    return layout(<>
      <StatusHero icon="block" tone="bad" badge="Boutique suspendue" title="Votre boutique est suspendue" text="Elle n’est plus visible dans l’annuaire ni sur l’accueil. Vos annonces restent gérables depuis « Mes annonces »." />
      {shop.rejectComment && <p className="m-0 mt-5 rounded-2xl bg-surface-lowest p-5 text-body-md text-on-surface shadow-sm"><b className="block text-label-sm uppercase text-primary">Motif</b>{shop.rejectComment}</p>}
    </>)
  }

  // APPROVED, never paid or lapsed: activation.
  const active = !!shop.paidUntil && new Date(shop.paidUntil) > new Date()
  if (!active) {
    const lapsed = !!shop.paidUntil
    return layout(<>
      <StatusHero icon="workspace_premium" tone="good" badge={lapsed ? 'Abonnement expiré' : 'Dossier vérifié'} title={lapsed ? 'Réactivez votre boutique' : 'Boutique officielle validée'} text={lapsed ? `Votre abonnement a pris fin le ${fdate(shop.paidUntil!)}. Renouvelez-le pour retrouver le badge et votre place dans l’annuaire.` : 'Félicitations, votre entreprise a été vérifiée. Activez l’abonnement pour mettre votre vitrine en ligne.'} />
      <div className="mt-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2"><span className="text-label-sm uppercase text-on-surface-variant">Aperçu de votre vitrine</span><span className="flex items-center gap-1 whitespace-nowrap text-label-sm text-tertiary"><Icon name="check_circle" size={15} /> Prête</span></div>
        <ShopSummary shop={shop} />
      </div>
      <PlanCard plan={plan} withMethods />
      <div className="mt-4 rounded-2xl bg-surface-lowest p-5 shadow-sm">
        <div className="text-headline-sm text-on-surface">Activé dès le paiement</div>
        <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
          {[['storefront', 'Votre vitrine officielle en ligne', 'Page boutique, rayons et articles phares.'], ['verified', 'Badge Boutique officielle', 'Sur votre page et toutes vos annonces.'], ['rocket_launch', `${plan.credits} crédits boost crédités`, 'Dans votre porte-monnaie, à utiliser sur vos annonces.']].map(([i, t, d]) => (
            <li key={t} className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name={i} size={18} /></span><div><div className="text-label-lg text-on-surface">{t}</div><div className="text-body-sm text-on-surface-variant">{d}</div></div></li>
          ))}
        </ul>
      </div>
      <button onClick={() => setPaying(true)} className="mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white shadow-md"><Icon name="payments" size={20} /> Activer l’abonnement — <Price amount={plan.price} /></button>
      <p className="m-0 mt-2 flex items-center justify-center gap-1.5 text-center text-body-sm text-on-surface-variant"><Icon name="lock" size={15} /> Paiement Mobile Money. Sans engagement : aucun renouvellement automatique.</p>
      {pay}
    </>)
  }

  return layout(<ShopManager shop={shop} plan={plan} categories={categories} onRenew={() => setPaying(true)} paidMsg={paidMsg} onNavigate={onNavigate} onOpenShop={onOpenShop} refetch={() => void refetch()} pay={pay} />, { wide: true })
}

function PlanCard({ plan, withMethods }: { plan: ShopPlan, withMethods?: boolean }) {
  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl bg-surface-lowest p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-label-sm uppercase text-primary">Abonnement Boutique officielle</div>
        <span className="whitespace-nowrap rounded-full bg-surface-container px-2.5 py-0.5 text-label-sm text-on-surface-variant">Sans engagement</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1"><span className="text-display font-extrabold text-on-surface"><Price amount={plan.price} /></span><span className="text-body-md text-on-surface-variant">/ mois</span></div>
      <p className="m-0 mt-1 flex items-center gap-1.5 text-label-md text-primary"><Icon name="bolt" size={17} /> {plan.credits} crédits boost inclus chaque mois</p>
      {withMethods && <div className="mt-3"><div className="mb-1.5 text-label-sm uppercase text-on-surface-variant">Moyens de paiement</div><PaymentLogos /></div>}
    </div>
  )
}

type Tab = 'profile' | 'aisles' | 'featured' | 'stock'

function ShopManager({ shop, plan, categories, onRenew, paidMsg, onNavigate, onOpenShop, refetch, pay }: {
  shop: MyShopT, plan: ShopPlan, categories: { id: string, name: string }[], onRenew: () => void, paidMsg: string
  onNavigate: (p: any) => void, onOpenShop: (slug: string) => void, refetch: () => void, pay: React.ReactNode
}) {
  const [tab, setTab] = useState<Tab>('stock')
  const daysLeft = Math.max(0, Math.ceil((new Date(shop.paidUntil!).getTime() - Date.now()) / 86_400_000))
  const { data: ld, refetch: refetchListings } = useQuery<{ myListings: { items: ShopListing[], totalCount: number } }>(MY_SHOP_LISTINGS_QUERY, { fetchPolicy: 'cache-and-network' })
  const listings = ld?.myListings.items ?? []
  const [copied, setCopied] = useState(false)
  const tabs: [Tab, string, string][] = [['stock', 'inventory_2', 'Stock'], ['aisles', 'category', 'Rayons'], ['featured', 'push_pin', 'Articles phares'], ['profile', 'storefront', 'Profil & infos']]

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h1 className="m-0 text-headline-lg text-on-surface">Ma Boutique officielle</h1><span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary"><Icon name="verified" size={14} fill /> Officielle</span></div>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">Organisez vos rayons, vos articles phares et votre stock.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <button onClick={() => onOpenShop(shop.slug)} className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-surface-lowest px-4 text-label-md text-on-surface shadow-sm"><Icon name="visibility" size={18} /> Voir ma page</button>
          <button onClick={() => onNavigate('seller-shop-stats')} className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-surface-lowest px-4 text-label-md text-on-surface shadow-sm"><Icon name="monitoring" size={18} /> Statistiques</button>
        </div>
      </div>

      {paidMsg && <p className="m-0 mt-4 flex items-center gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><Icon name="check_circle" size={18} /> {paidMsg}</p>}

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="workspace_premium" size={24} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-label-lg text-on-surface">Abonnement Boutique officielle</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary">Actif jusqu’au {fdate(shop.paidUntil!)}</span>
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${daysLeft <= 3 ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}</span>
            </div>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Aucun renouvellement automatique : prolongez de {plan.days} jours quand vous le souhaitez.</p>
          </div>
          <button onClick={onRenew} className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white"><Icon name="autorenew" size={18} /> Renouveler (<Price amount={plan.price} />)</button>
        </section>
        <section className="flex items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container text-primary">{shop.logoUrl ? <img src={shop.logoUrl} alt="" className="h-full w-full object-cover" /> : <Icon name="storefront" size={26} />}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-label-lg text-on-surface">{shop.name}</div>
            <div className="mt-1 grid grid-cols-3 gap-2 text-center">
              {[[shop.listingsCount, 'Articles'], [shop.followersCount, 'Abonnés'], [shop.reviewsCount ? shop.averageRating.toFixed(1) : '—', `${shop.reviewsCount} avis`]].map(([v, l]) => (
                <div key={String(l)} className="rounded-lg bg-surface-container-low px-1 py-1"><div className="text-label-lg text-on-surface">{v}</div><div className="truncate text-[11px] text-on-surface-variant">{l}</div></div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <button onClick={() => { void navigator.clipboard?.writeText(shopUrl(shop.slug)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }} className="mt-2 flex max-w-full cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-left text-body-sm text-on-surface-variant hover:text-primary">
        <Icon name={copied ? 'check' : 'link'} size={16} className="shrink-0" /> <span className="truncate">{copied ? 'Lien copié' : shopUrl(shop.slug)}</span>
      </button>

      <div className="relative mt-5">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-container p-1 pr-8 [scrollbar-width:none] md:pr-1">
          {tabs.map(([k, icon, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none px-3.5 text-label-md md:flex-1 md:justify-center ${tab === k ? 'bg-surface-lowest text-primary shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>
              <Icon name={icon} size={17} /> {label}{k === 'featured' && ` (${shop.featuredCount}/8)`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {tab === 'stock' && <StockTab shop={shop} listings={listings} onChanged={() => { void refetchListings(); refetch() }} onNavigate={onNavigate} />}
        {tab === 'aisles' && <AislesTab shop={shop} onChanged={() => { refetch(); void refetchListings() }} />}
        {tab === 'featured' && <FeaturedTab listings={listings} onChanged={() => { void refetchListings(); refetch() }} />}
        {tab === 'profile' && <ProfileTab shop={shop} categories={categories} onSaved={refetch} />}
      </div>
      {pay}
    </>
  )
}

function StockTab({ shop, listings, onChanged, onNavigate }: { shop: MyShopT, listings: ShopListing[], onChanged: () => void, onNavigate: (p: any) => void }) {
  const [q, setQ] = useState('')
  const [aisle, setAisle] = useState('')
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [setQty] = useMutation(SET_LISTING_QUANTITY_MUTATION)
  const [setAisleOf] = useMutation(SET_LISTING_AISLE_MUTATION)
  const rows = listings.filter(l => (!q || l.title.toLowerCase().includes(q.toLowerCase())) && (!aisle || (aisle === 'none' ? !l.aisleId : l.aisleId === aisle)))
  const qty = (l: ShopListing) => edits[l.id] ?? l.quantity
  const change = (l: ShopListing, v: number) => { setDone(false); setEdits(e => ({ ...e, [l.id]: Math.min(999, Math.max(1, v)) })) }
  const dirty = Object.entries(edits).filter(([id, v]) => listings.find(l => l.id === id)?.quantity !== v)
  const save = async () => {
    setSaving(true)
    try {
      for (const [id, quantity] of dirty) await setQty({ variables: { id, input: { quantity } } })
      setEdits({}); setDone(true); onChanged()
    } finally { setSaving(false) }
  }
  const status = (n: number) => n <= 1
    ? <span className="whitespace-nowrap rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">Dernier exemplaire</span>
    : <span className="whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary">{n} en stock</span>
  const stepper = (l: ShopListing) => (
    <div className="flex items-center gap-1">
      <button onClick={() => change(l, qty(l) - 1)} disabled={qty(l) <= 1} aria-label="Retirer un exemplaire" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-container text-on-surface disabled:opacity-40"><Icon name="remove" size={16} /></button>
      <input type="number" min={1} max={999} value={qty(l)} onChange={e => change(l, Number(e.target.value) || 1)} aria-label="Quantité" className="h-8 w-12 rounded-lg border-none bg-surface-container-low text-center text-label-md text-on-surface outline-none [appearance:textfield]" />
      <button onClick={() => change(l, qty(l) + 1)} aria-label="Ajouter un exemplaire" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-container text-on-surface"><Icon name="add" size={16} /></button>
    </div>
  )
  const aisleSelect = (l: ShopListing) => (
    <Select value={l.aisleId ?? ''} onChange={e => void setAisleOf({ variables: { listingId: l.id, aisleId: e.target.value || null } }).then(onChanged)} className="h-9 w-full min-w-0 cursor-pointer rounded-lg border-none bg-surface-container-low px-2 text-label-md text-on-surface outline-none" aria-label="Rayon">
      <option value="">Sans rayon</option>
      {shop.aisles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </Select>
  )

  return (
    <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0"><h2 className="m-0 text-headline-sm text-on-surface">Inventaire & stock</h2><p className="m-0 text-body-sm text-on-surface-variant">Chaque vente conclue retire les exemplaires vendus ; l’annonce passe « Vendue » à zéro.</p></div>
        <button disabled={!dirty.length || saving} onClick={() => void save()} className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-tertiary px-4 text-label-md text-white disabled:cursor-default disabled:opacity-45">
          <Icon name={done && !dirty.length ? 'check_circle' : 'save'} size={18} /> {saving ? 'Enregistrement…' : done && !dirty.length ? 'Stock enregistré' : `Enregistrer${dirty.length ? ` (${dirty.length})` : ''}`}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_200px]">
        <label className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-low px-3"><Icon name="search" size={18} className="text-outline" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un article…" className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" /></label>
        <Select value={aisle} onChange={e => setAisle(e.target.value)} className="h-10 cursor-pointer rounded-lg border-none bg-surface-container-low px-3 text-label-md text-on-surface outline-none">
          <option value="">Tous les rayons</option>
          <option value="none">Sans rayon</option>
          {shop.aisles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </div>
      {listings.length === 0 ? (
        <div className="mt-4 rounded-xl bg-surface-container-low p-5 text-center">
          <p className="m-0 text-body-md text-on-surface-variant">Aucune annonce en ligne pour l’instant.</p>
          <button onClick={() => onNavigate('seller-post')} className="mt-3 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-4 text-label-md text-white"><Icon name="add" size={18} /> Déposer une annonce</button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <table className="mt-3 hidden w-full border-collapse text-left lg:table">
            <thead><tr className="text-label-sm uppercase text-on-surface-variant">{['Article', 'Rayon', 'Prix', 'Quantité', 'Disponibilité'].map(h => <th key={h} className="whitespace-nowrap border-0 border-b border-solid border-outline-variant px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(l => (
                <tr key={l.id} className="border-0 border-b border-solid border-outline-variant/60">
                  <td className="w-full max-w-0 px-2 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">{l.coverImageUrl && <img src={l.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                      <div className="min-w-0"><div className="truncate text-label-md text-on-surface">{l.title}</div><div className="truncate text-body-sm text-on-surface-variant">{l.category.name}</div></div>
                    </div>
                  </td>
                  <td className="w-48 px-2 py-2.5">{aisleSelect(l)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-label-lg text-on-surface"><Price amount={l.price} /></td>
                  <td className="px-2 py-2.5">{stepper(l)}</td>
                  <td className="px-2 py-2.5">{status(qty(l))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Phone cards */}
          <div className="mt-3 flex flex-col gap-2 lg:hidden">
            {rows.map(l => (
              <div key={l.id} className="rounded-xl bg-surface-container-low p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container">{l.coverImageUrl && <img src={l.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-label-md text-on-surface">{l.title}</div><div className="text-label-md text-on-surface-variant"><Price amount={l.price} /></div></div>
                  {status(qty(l))}
                </div>
                <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">{aisleSelect(l)}{stepper(l)}</div>
              </div>
            ))}
          </div>
          {rows.length === 0 && <p className="m-0 mt-3 text-center text-body-sm text-on-surface-variant">Aucun article ne correspond.</p>}
        </>
      )}
    </section>
  )
}

function AislesTab({ shop, onChanged }: { shop: MyShopT, onChanged: () => void }) {
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: string, name: string } | null>(null)
  const [removing, setRemoving] = useState<{ id: string, name: string } | null>(null)
  const [error, setError] = useState('')
  const [create, { loading: creating }] = useMutation(CREATE_SHOP_AISLE_MUTATION)
  const [rename] = useMutation(RENAME_SHOP_AISLE_MUTATION)
  const [remove, { loading: deleting }] = useMutation(DELETE_SHOP_AISLE_MUTATION)
  const [reorder] = useMutation(REORDER_SHOP_AISLES_MUTATION)
  const run = (p: Promise<unknown>) => p.then(() => { setError(''); onChanged() }).catch((e: Error) => setError(e.message))
  const aisles = [...shop.aisles].sort((a, b) => a.position - b.position)
  const move = (i: number, d: number) => {
    const ids = aisles.map(a => a.id)
    const [x] = ids.splice(i, 1)
    ids.splice(i + d, 0, x)
    void run(reorder({ variables: { ids } }))
  }
  return (
    <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
      <h2 className="m-0 text-headline-sm text-on-surface">Rayons</h2>
      <p className="m-0 text-body-sm text-on-surface-variant">Les onglets de votre page boutique. Assignez un rayon à chaque article depuis l’onglet Stock.</p>
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) void run(create({ variables: { name: name.trim() } })).then(() => setName('')) }} className="mt-3 flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Nouveau rayon (ex : Smartphones)" className="h-11 min-w-0 flex-1 rounded-xl border-none bg-surface-container-low px-3 text-body-md text-on-surface outline-none" />
        <button disabled={!name.trim() || creating} className="flex h-11 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white disabled:opacity-45"><Icon name="add" size={18} /> Créer</button>
      </form>
      {error && <p className="m-0 mt-2 text-body-sm text-primary">{error}</p>}
      <div className="mt-3 flex flex-col gap-2">
        {aisles.length === 0 && <p className="m-0 rounded-xl bg-surface-container-low p-4 text-center text-body-sm text-on-surface-variant">Aucun rayon : vos articles s’affichent tous ensemble.</p>}
        {aisles.map((a, i) => (
          <div key={a.id} className="flex items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
            <div className="flex flex-col">
              <button disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter" className="flex h-6 w-7 cursor-pointer items-center justify-center rounded border-none bg-transparent text-on-surface-variant disabled:opacity-30"><Icon name="keyboard_arrow_up" size={18} /></button>
              <button disabled={i === aisles.length - 1} onClick={() => move(i, 1)} aria-label="Descendre" className="flex h-6 w-7 cursor-pointer items-center justify-center rounded border-none bg-transparent text-on-surface-variant disabled:opacity-30"><Icon name="keyboard_arrow_down" size={18} /></button>
            </div>
            {editing?.id === a.id ? (
              <form onSubmit={e => { e.preventDefault(); void run(rename({ variables: { id: a.id, name: editing.name.trim() } })).then(() => setEditing(null)) }} className="flex min-w-0 flex-1 gap-2">
                <input autoFocus value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} maxLength={40} className="h-9 min-w-0 flex-1 rounded-lg border-none bg-surface-lowest px-2 text-body-md text-on-surface outline-none" />
                <button className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-tertiary text-white" aria-label="Enregistrer"><Icon name="check" size={18} /></button>
              </form>
            ) : (
              <div className="min-w-0 flex-1"><div className="truncate text-label-lg text-on-surface">{a.name}</div><div className="text-body-sm text-on-surface-variant">{a.listingsCount} article{a.listingsCount > 1 ? 's' : ''} en ligne</div></div>
            )}
            {editing?.id !== a.id && (
              <>
                <button onClick={() => setEditing({ id: a.id, name: a.name })} aria-label={`Renommer ${a.name}`} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-on-surface"><Icon name="edit" size={17} /></button>
                <button onClick={() => setRemoving({ id: a.id, name: a.name })} aria-label={`Supprimer ${a.name}`} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-primary"><Icon name="delete" size={17} /></button>
              </>
            )}
          </div>
        ))}
      </div>
      <ConfirmSheet open={!!removing} title={`Supprimer le rayon « ${removing?.name ?? ''} » ?`} confirmLabel={deleting ? 'Suppression…' : 'Supprimer le rayon'} onConfirm={() => removing && void run(remove({ variables: { id: removing.id } })).then(() => setRemoving(null))} onClose={() => setRemoving(null)} loading={deleting}>
        <p className="m-0 text-body-sm text-on-surface-variant">Ses articles restent en ligne, simplement sans rayon.</p>
      </ConfirmSheet>
    </section>
  )
}

function FeaturedTab({ listings, onChanged }: { listings: ShopListing[], onChanged: () => void }) {
  const [pin, { loading }] = useMutation(SET_LISTING_FEATURED_MUTATION)
  const [error, setError] = useState('')
  const [picking, setPicking] = useState(false)
  const featured = listings.filter(l => l.featuredAt).sort((a, b) => a.featuredAt!.localeCompare(b.featuredAt!))
  const others = listings.filter(l => !l.featuredAt)
  const toggle = (l: ShopListing, featuredOn: boolean) => void pin({ variables: { listingId: l.id, featured: featuredOn } }).then(() => { setError(''); onChanged() }).catch((e: Error) => setError(e.message))
  return (
    <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="m-0 text-headline-sm text-on-surface">Articles phares</h2><p className="m-0 text-body-sm text-on-surface-variant">Mis en avant tout en haut de votre page ({featured.length} sur 8 épinglés).</p></div>
        {featured.length < 8 && others.length > 0 && <button onClick={() => setPicking(true)} className="flex h-10 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-none bg-primary px-3 text-label-md text-white"><Icon name="add" size={18} /> Ajouter</button>}
      </div>
      {error && <p className="m-0 mt-2 text-body-sm text-primary">{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {featured.map(l => (
          <div key={l.id} className="relative overflow-hidden rounded-xl bg-surface-container-low">
            <div className="aspect-square bg-surface-container">{l.coverImageUrl && <img src={l.coverImageUrl} alt="" className="h-full w-full object-cover" />}</div>
            <span className="absolute left-2 top-2 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">En vedette</span>
            <button disabled={loading} onClick={() => toggle(l, false)} aria-label={`Retirer ${l.title}`} className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest/95 text-on-surface"><Icon name="close" size={16} /></button>
            <div className="p-2"><div className="truncate text-label-md text-on-surface">{l.title}</div><div className="flex items-center justify-between gap-1"><span className="text-label-md text-primary"><Price amount={l.price} /></span><span className="whitespace-nowrap text-[11px] text-on-surface-variant">{l.quantity} dispo</span></div></div>
          </div>
        ))}
        {featured.length < 8 && others.length > 0 && (
          <button onClick={() => setPicking(true)} className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-outline-variant bg-transparent text-on-surface-variant">
            <Icon name="add_circle" size={28} /><span className="text-label-md">Ajouter un article</span><span className="text-body-sm">{8 - featured.length} place{8 - featured.length > 1 ? 's' : ''} restante{8 - featured.length > 1 ? 's' : ''}</span>
          </button>
        )}
      </div>
      {featured.length === 0 && others.length === 0 && <p className="m-0 mt-3 text-center text-body-sm text-on-surface-variant">Publiez des annonces pour pouvoir les épingler.</p>}
      <ConfirmSheet open={picking} title="Épingler un article" confirmLabel="Fermer" onConfirm={() => setPicking(false)} onClose={() => setPicking(false)}>
        <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
          {others.map(l => (
            <button key={l.id} disabled={loading} onClick={() => { toggle(l, true); setPicking(false) }} className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border-none bg-surface-container-low p-2 text-left">
              <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">{l.coverImageUrl && <img src={l.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-label-md text-on-surface">{l.title}</span><span className="block text-body-sm text-on-surface-variant"><Price amount={l.price} /></span></span>
              <Icon name="push_pin" size={18} className="shrink-0 text-primary" />
            </button>
          ))}
        </div>
      </ConfirmSheet>
    </section>
  )
}

function ProfileTab({ shop, categories, onSaved }: { shop: MyShopT, categories: { id: string, name: string }[], onSaved: () => void }) {
  const [form, setForm] = useState<Form>(() => formFrom(shop))
  const [save, { loading }] = useMutation(UPDATE_SHOP_PROFILE_MUTATION)
  const [msg, setMsg] = useState<{ ok: boolean, text: string } | null>(null)
  const set = (p: Partial<Form>) => { setMsg(null); setForm(f => ({ ...f, ...p })) }
  const ok = !!form.categoryId && form.description.trim().length >= 20 && form.hours.every(h => !h || h.open < h.close)
  return (
    <section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
          <h2 className="m-0 mb-1 text-headline-sm text-on-surface">Vitrine</h2>
          <p className="m-0 mb-3 text-body-sm text-on-surface-variant">Nom commercial et numéro {shop.legalIdType} vérifiés : pour les modifier, contactez l’équipe Dilchap.</p>
          <div className="mb-4 rounded-xl bg-surface-container-low px-3 py-2"><div className="text-label-sm text-on-surface-variant">Nom commercial</div><div className="text-label-lg text-on-surface">{shop.name}</div></div>
          <IdentityFields form={form} set={set} categories={categories} withName={false} />
        </div>
        <ContactFields form={form} set={set} />
      </div>
      {msg && <p className={`m-0 mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-body-sm ${msg.ok ? 'bg-tertiary-soft text-tertiary' : 'bg-primary-fixed text-primary'}`}><Icon name={msg.ok ? 'check_circle' : 'error'} size={17} /> {msg.text}</p>}
      <button disabled={!ok || loading} onClick={() => void save({ variables: { input: profileInput(form) } }).then(() => { setMsg({ ok: true, text: 'Profil de la boutique enregistré.' }); onSaved() }).catch((e: Error) => setMsg({ ok: false, text: e.message }))} className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-45 lg:ml-auto lg:w-72">
        <Icon name="save" size={19} /> {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
      </button>
    </section>
  )
}
